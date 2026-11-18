// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/data/db/db';
import type { Item } from '../../src/data/db/schema';
import { createOwnCard, ensureCards, recordAnswer, reportItem } from '../../src/data/learning';
import { skillEvidence, skillInfos } from '../../src/data/progress';
import { newBackupStore, uniqueName } from './_db';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 5, 9);

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
  await db.skills.add({
    id: 'k',
    topicId: 't',
    title: 'Vektoren addieren',
    description: '',
    kind: 'fakt',
    bloom: 'erinnern',
    order: 1,
    origin: 'auto',
    hidden: false,
    examRelevant: true,
    sourceChunkIds: [],
  });
  const mk = (id: string, kind: string, subtype: string): Item => ({
    id,
    skillId: 'k',
    kind,
    subtype,
    prompt: id,
    answer: 'a',
    sourceRefs: [],
    bloom: 'erinnern',
    difficulty: 0.4,
    status: 'active',
    createdBy: 'ai',
  });
  const items = [
    mk('c1', 'karte', 'karte'),
    mk('c2', 'karte', 'karte'),
    mk('c3', 'karte', 'karte'),
    mk('q', 'aufgabe', 'kurz'),
  ];
  await db.items.bulkAdd(items);
  return { db, items };
}
const base = { partial: false, hintLevel: 0, latencyMs: 4000, gradedBy: 'rule' as const };

describe('Antworten, Karten, Auffrischen', () => {
  it('Karten entstehen für aktive Karten-Items, nur einmal', async () => {
    const { db } = await start();
    expect(await ensureCards(db, T0)).toBe(3);
    expect(await ensureCards(db, T0)).toBe(0);
  });

  it('richtige Antwort auf Karte: FSRS plant später, Ereignisse stehen im Protokoll', async () => {
    const { db, items } = await start();
    await ensureCards(db, T0);
    const r = await recordAnswer(db, { ...base, item: items[0]!, correct: true, now: T0 });
    expect(r.nextDue).toBeGreaterThan(T0);
    expect((await db.cards.get('c1'))!.due).toBe(r.nextDue);
    const types = (await db.events.toArray()).map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(['AnswerSubmitted', 'CardReviewed']));
  });

  it('Aufgabe (keine Karte) bekommt keine FSRS-Bewertung; falsche Antwort bekommt eine Fehlerart', async () => {
    const { db, items } = await start();
    await recordAnswer(db, { ...base, item: items[3]!, correct: false, now: T0 });
    expect(await db.cards.count()).toBe(0);
    expect((await db.attempts.toArray())[0]!.errorType).toBeDefined();
  });

  it('„Sitzt" wird nach der Fälligkeit zu „Auffrischen" und fällt nie auf „Neu" zurück', async () => {
    const { db, items } = await start();
    await ensureCards(db, T0);
    // Fakt: zwei richtige Abrufe ohne Hilfe an zwei Aufgaben, einer nach ≥ 8 Tagen
    await recordAnswer(db, { ...base, item: items[0]!, correct: true, now: T0 });
    await recordAnswer(db, { ...base, item: items[1]!, correct: true, now: T0 + 9 * DAY });
    await recordAnswer(db, { ...base, item: items[0]!, correct: true, now: T0 + 9 * DAY }); // Kernkarte wiederholt
    expect((await skillInfos(db, T0 + 9 * DAY)).get('k')!.state).toBe('mastered');
    const later = T0 + 400 * DAY;
    const info = (await skillInfos(db, later)).get('k')!;
    expect(info.state).toBe('review_due');
    expect(info.cardsDue).toBeGreaterThanOrEqual(1);
  });

  it('Fehler melden setzt das Item aus, löscht nichts', async () => {
    const { db } = await start();
    await reportItem(db, 'q', T0);
    expect((await db.items.get('q'))!.status).toBe('retired');
    expect(await db.items.count()).toBe(4);
  });

  it('eigene Karte (ohne KI) hat Beleg-Platz, FSRS-Zustand und ist sofort fällig', async () => {
    const { db } = await start();
    const id = await createOwnCard(db, {
      skillId: 'k',
      question: ' Was ist ein Vektor? ',
      answer: 'Betrag und Richtung',
      now: T0,
    });
    expect((await db.items.get(id))!.prompt).toBe('Was ist ein Vektor?');
    expect((await db.cards.get(id))!.due).toBeLessThanOrEqual(T0);
  });

  it('Belege in Worten zählbar', async () => {
    const { db, items } = await start();
    await recordAnswer(db, { ...base, item: items[3]!, correct: true, now: T0 });
    await recordAnswer(db, { ...base, item: items[3]!, correct: true, hintLevel: 3, now: T0 + 1 });
    expect(await skillEvidence(db, 'k')).toMatchObject({
      unaided: 1,
      withHelp: 1,
      wrong: 0,
      last: T0 + 1,
    });
  });
});
