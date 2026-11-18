// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildSession } from '../../src/core/director/session';
import { planForNow } from '../../src/data/director-data';
import { openDatabase } from '../../src/data/db/db';
import type { Item } from '../../src/data/db/schema';
import { ensureCards, recordAnswer } from '../../src/data/learning';
import { buildQueue, endSession, startSession } from '../../src/data/session-queue';
import { newBackupStore, uniqueName } from './_db';

const T0 = Date.UTC(2026, 2, 2, 9);
const DAY = 86_400_000;

async function start() {
  const db = await openDatabase(uniqueName(), { now: 0, backupStore: newBackupStore() });
  await db.subjects.add({
    id: 's',
    name: 'Physik',
    colorKey: 'ocean',
    createdAt: 1,
    archived: false,
  });
  await db.topics.add({
    id: 't',
    subjectId: 's',
    title: 'Vektoren',
    order: 1,
    origin: 'auto',
    hidden: false,
  });
  const sk = (id: string, order: number) => ({
    id,
    topicId: 't',
    title: id,
    description: `Kern von ${id}`,
    kind: 'fakt' as const,
    bloom: 'erinnern' as const,
    order,
    origin: 'auto' as const,
    hidden: false,
    examRelevant: true,
    sourceChunkIds: [],
  });
  await db.skills.bulkAdd([sk('alt', 1), sk('neu', 2)]);
  const it = (id: string, skillId: string, d: number): Item => ({
    id,
    skillId,
    kind: 'karte',
    subtype: 'karte',
    prompt: id,
    answer: 'a',
    sourceRefs: [],
    bloom: 'erinnern',
    difficulty: d,
    status: 'active',
    createdBy: 'ai',
  });
  const items = [
    it('a1', 'alt', 0.2),
    it('a2', 'alt', 0.3),
    it('n1', 'neu', 0.2),
    it('n2', 'neu', 0.4),
    it('n3', 'neu', 0.5),
  ];
  await db.items.bulkAdd(items);
  await ensureCards(db, T0 - 30 * DAY);
  return { db, items };
}

describe('Sitzung aus dem Plan', () => {
  it('Aufwärmen mit fälligen Karten früherer Sitzungen, Kern mit neuer Fähigkeit, Abschluss; Sitzung wird protokolliert', async () => {
    const { db, items } = await start();
    // „alt" wurde vor 30 Tagen gelernt und ist jetzt fällig
    for (const i of items.slice(0, 2))
      await recordAnswer(db, {
        item: i,
        correct: true,
        partial: false,
        hintLevel: 0,
        latencyMs: 3000,
        gradedBy: 'rule',
        now: T0 - 30 * DAY,
      });
    const { plan } = await planForNow(db, T0);
    expect(plan.entries.map((e) => [e.skillId, e.role])).toEqual(
      expect.arrayContaining([
        ['alt', 'review'],
        ['neu', 'new'],
      ]),
    );
    const blocks = buildSession(plan);
    expect(blocks.map((b) => b.kind)).toEqual(['warmup', 'core', 'practice', 'closing']);
    const steps = await buildQueue(db, plan, blocks, T0);
    const warm = steps.filter((s) => s.type === 'item' && s.block === 'warmup');
    expect(warm.length).toBeGreaterThan(0);
    expect(warm.every((s) => s.type === 'item' && s.item.skillId === 'alt')).toBe(true);
    const core = steps.filter((s) => s.type === 'item' && s.block !== 'warmup');
    expect(core.every((s) => s.type === 'item' && s.item.skillId === 'neu')).toBe(true);
    expect(steps.at(-1)?.type).toBe('closing');
    // kein Item zweimal
    const ids = steps.flatMap((s) => (s.type === 'item' ? [s.item.id] : []));
    expect(new Set(ids).size).toBe(ids.length);

    const id = await startSession(db, plan, blocks, T0);
    await endSession(db, id, 'completed', plan, T0 + 60_000, ['neu']);
    expect((await db.sessions.get(id))!.endReason).toBe('completed');
    const types = (await db.events.toArray()).map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(['SessionStarted', 'SessionEnded']));
  });

  it('Planen ändert nie Lernstände oder Versuche (nur Lesen)', async () => {
    const { db } = await start();
    const before = [await db.attempts.count(), await db.cards.count(), await db.events.count()];
    await planForNow(db, T0);
    expect([await db.attempts.count(), await db.cards.count(), await db.events.count()]).toEqual(
      before,
    );
  });
});

describe('Anzahl der Schritte', () => {
  it('drei Aufgaben einer neuen Fähigkeit: alle drei kommen dran (Kern + Üben)', async () => {
    const db = await openDatabase(uniqueName(), { now: 0, backupStore: newBackupStore() });
    await db.subjects.add({ id: 's', name: 'P', colorKey: 'ocean', createdAt: 1, archived: false });
    await db.topics.add({
      id: 't',
      subjectId: 's',
      title: 'T',
      order: 1,
      origin: 'auto',
      hidden: false,
    });
    await db.skills.add({
      id: 'k',
      topicId: 't',
      title: 'k',
      description: '',
      kind: 'verstaendnis',
      bloom: 'erinnern',
      order: 1,
      origin: 'auto',
      hidden: false,
      examRelevant: false,
      sourceChunkIds: [],
    });
    await db.items.bulkAdd(
      [0, 1, 2].map((i) => ({
        id: `i${i}`,
        skillId: 'k',
        kind: 'karte',
        subtype: 'karte',
        prompt: 'p',
        answer: 'a',
        sourceRefs: [],
        bloom: 'erinnern' as const,
        difficulty: 0.2 + i / 10,
        status: 'active' as const,
        createdBy: 'ai' as const,
      })),
    );
    await ensureCards(db, T0);
    const { plan } = await planForNow(db, T0);
    const blocks = buildSession(plan);
    const steps = await buildQueue(db, plan, blocks, T0);
    expect(blocks.map((b) => b.kind)).toEqual(['core', 'practice', 'closing']);
    expect(steps.filter((s) => s.type === 'item')).toHaveLength(3);
  });
});
