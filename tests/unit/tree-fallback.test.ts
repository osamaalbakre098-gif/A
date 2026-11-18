// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { importAntwort } from '../../src/ai/jobs/import';
import { requestBaum } from '../../src/ai/jobs/build';
import { AuftragsAustauschProvider } from '../../src/ai/provider';
import type { JobPayload } from '../../src/ai/jobs/types';
import { cleanHeading, draftFromOutline } from '../../src/content/tree-builder/fallback';
import { buildFallbackTree } from '../../src/content/tree-builder/fallback';
import { importMaterial } from '../../src/content/import';
import { openDatabase } from '../../src/data/db/db';
import { baumAntwort } from '../fixtures/auftraege';
import { newBackupStore, uniqueName } from './_db';

const OK = { usage: 0, quota: 1e12 };
const enc = (s: string) => new TextEncoder().encode(s);
const noPdf = { extractPdf: async () => [], estimate: OK };
const SKRIPT = `# Vektoren

Ein Vektor hat Betrag und Richtung. ${'Die Geschwindigkeit ist ein Vektor. '.repeat(10)}

## Addition

Vektoren addiert man komponentenweise. ${'Kräfte addiert man ebenso. '.repeat(10)}

## Subtraktion

Vektoren subtrahiert man komponentenweise. ${'Das ist die Umkehrung. '.repeat(10)}
`;

async function start(text: string, name = 'skript.md') {
  const db = await openDatabase(uniqueName(), { now: 0, backupStore: newBackupStore() });
  await db.subjects.add({
    id: 's1',
    name: 'Physik',
    colorKey: 'ocean',
    createdAt: 1,
    archived: false,
  });
  const r = await importMaterial(
    db,
    { subjectId: 's1', name, type: 'text/markdown', bytes: enc(text) },
    noPdf,
    1,
  );
  if (r.status !== 'imported') throw new Error('Import');
  return { db, docId: r.documentId };
}

describe('Baum aus Überschriften (Fallback ohne KI)', () => {
  it('Kapitel → Thema, Unterüberschriften → Fähigkeiten, jede mit Beleg', async () => {
    const { db, docId } = await start(SKRIPT);
    const r = await buildFallbackTree(db, docId, 10);
    expect(r).toMatchObject({ topics: 1, unchanged: false });
    const topics = await db.topics.toArray();
    expect(topics.map((t) => t.title)).toEqual(['Vektoren']);
    const skills = await db.skills.toArray();
    expect(skills.map((s) => s.title).sort()).toEqual(
      ['Addition verstehen', 'Subtraktion verstehen', 'Vektoren verstehen'].sort(),
    );
    for (const s of skills) {
      expect(s.origin).toBe('fallback');
      expect(s.sourceChunkIds.length).toBeGreaterThan(0);
      expect(await db.chunks.bulkGet(s.sourceChunkIds)).not.toContain(undefined);
    }
    expect((await db.events.toArray()).some((e) => e.type === 'TreeBuilt')).toBe(true);
  });

  it('zweimal aufgerufen: keine Doppelungen', async () => {
    const { db, docId } = await start(SKRIPT);
    await buildFallbackTree(db, docId, 10);
    const again = await buildFallbackTree(db, docId, 11);
    expect(again.unchanged).toBe(true);
    expect(await db.skills.count()).toBe(3);
    expect(await db.topics.count()).toBe(1);
  });

  it('ohne Überschriften: Block aus Seiten, eine Fähigkeit', async () => {
    const { db, docId } = await start('Nur Fließtext ohne Gliederung. '.repeat(40), 'notiz.txt');
    await buildFallbackTree(db, docId, 10);
    expect(await db.topics.count()).toBe(1);
    expect(await db.skills.count()).toBe(1);
  });

  it('mehr als 8 Fähigkeiten werden in Teile geteilt', () => {
    const chunks = Array.from({ length: 10 }, (_, i) => ({
      id: `d:${String(i).padStart(5, '0')}`,
      documentId: 'd',
      page: 1,
      text: 'x',
      position: 0,
      origin: 'text' as const,
      headingPath: ['Kapitel 1: Mechanik', `${i + 1}.1 Thema ${i}`],
    }));
    const d = draftFromOutline(
      [{ level: 1, title: 'Kapitel 1: Mechanik', page: 1 }],
      chunks as never,
      'x.pdf',
    );
    expect(d.map((t) => [t.topic, t.skills.length])).toEqual([
      ['Mechanik I', 8],
      ['Mechanik II', 2],
    ]);
  });

  it('cleanHeading entfernt Nummerierung', () => {
    expect(cleanHeading('2.3 Vektoraddition')).toBe('Vektoraddition');
    expect(cleanHeading('Kapitel 3: Kräfte')).toBe('Kräfte');
  });

  it('KI-Baum löst den einfachen Baum ab: ausgeblendet, nichts gelöscht; geübte bleiben', async () => {
    const { db, docId } = await start(SKRIPT);
    await buildFallbackTree(db, docId, 10);
    const geuebt = (await db.skills.toArray())[0]!;
    await db.items.add({
      id: 'i1',
      skillId: geuebt.id,
      kind: 'karte',
      subtype: 'karte',
      prompt: 'p',
      answer: 'a',
      sourceRefs: [],
      bloom: 'erinnern',
      difficulty: 0.3,
      status: 'active',
      createdBy: 'ai',
    });
    await db.attempts.add({
      id: 'a1',
      itemId: 'i1',
      ts: 5,
      correct: true,
      partial: false,
      hintLevel: 0,
      latencyMs: 1,
      gradedBy: 'rule',
    });
    const before = await db.skills.count();
    const prov = new AuftragsAustauschProvider(db, 20);
    const { jobIds } = await requestBaum(db, prov, docId, 20);
    const paket = ((await db.jobs.get(jobIds[0]!))!.payload as JobPayload).paket;
    const res = await importAntwort(db, jobIds[0]!, JSON.stringify(baumAntwort(paket)), 20);
    expect(res.status).toBe('ok');
    const all = await db.skills.toArray();
    expect(all.length).toBeGreaterThan(before); // nichts gelöscht
    const fb = all.filter((s) => s.origin === 'fallback');
    expect(fb.filter((s) => !s.hidden).map((s) => s.id)).toEqual([geuebt.id]);
    // Danach erzeugt der Fallback nichts mehr
    expect((await buildFallbackTree(db, docId, 30)).unchanged).toBe(true);
  });
});
