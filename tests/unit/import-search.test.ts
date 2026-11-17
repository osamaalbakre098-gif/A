// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { importMaterial, detectKind, type ImportDeps } from '../../src/content/import';
import { buildIndex, search } from '../../src/content/search';
import { findMatches } from '../../src/content/text';
import { openDatabase } from '../../src/data/db/db';
import { DataError } from '../../src/data/db/errors';
import { sha256Hex } from '../../src/data/hash';
import { newBackupStore, uniqueName } from './_db';

const open = () => openDatabase(uniqueName(), { now: 0, backupStore: newBackupStore() });
const enc = (s: string) => new TextEncoder().encode(s);
const OK = { usage: 0, quota: 1e12 };
const noPdf: ImportDeps = {
  extractPdf: async () => {
    throw new Error('kein PDF erwartet');
  },
  estimate: OK,
};

async function subject(db: Awaited<ReturnType<typeof open>>, name: string) {
  const id = `s-${name}`;
  await db.subjects.add({ id, name, colorKey: 'sage', createdAt: 1, archived: false });
  return id;
}

describe('Import', () => {
  it('Text: Dokument, Abschnitte, Datei und Ereignis werden gespeichert; Original unverändert', async () => {
    const db = await open();
    const s = await subject(db, 'Physik');
    const bytes = enc('# Vektoren\n\nEin Vektor hat Betrag und Richtung.\n');
    const phases: string[] = [];
    const r = await importMaterial(
      db,
      { subjectId: s, name: 'skript.md', type: 'text/markdown', bytes },
      noPdf,
      5,
      (p) => phases.push(p),
    );
    expect(r.status).toBe('imported');
    expect(phases).toEqual(['reading', 'structuring', 'saving']);
    const doc = (await db.documents.toArray())[0]!;
    expect(doc).toMatchObject({
      subjectId: s,
      name: 'skript.md',
      ocrStatus: 'none',
      pageCount: 1,
      importedAt: 5,
    });
    expect(doc.outline).toEqual([{ level: 1, title: 'Vektoren', page: 0 }]);
    const chunks = await db.chunks.toArray();
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.headingPath).toEqual(['Vektoren']);
    const blob = await db.blobs.get(doc.sha256);
    expect(await sha256Hex(blob!.data)).toBe(await sha256Hex(bytes)); // Hash des Originals unverändert
    expect((await db.events.toArray()).map((e) => e.type)).toEqual(['FileImported']);
  });

  it('dieselbe Datei im selben Fach nur einmal; in einem anderen Fach erlaubt (Datei nur einmal gespeichert)', async () => {
    const db = await open();
    const a = await subject(db, 'A');
    const b = await subject(db, 'B');
    const bytes = enc('Ein Satz.');
    const input = (subjectId: string) => ({ subjectId, name: 'x.txt', type: 'text/plain', bytes });
    const first = await importMaterial(db, input(a), noPdf, 1);
    const dup = await importMaterial(db, input(a), noPdf, 2);
    expect(dup).toEqual({
      status: 'duplicate',
      documentId: (first as { documentId: string }).documentId,
    });
    expect(await db.documents.count()).toBe(1);
    const other = await importMaterial(db, input(b), noPdf, 3);
    expect(other.status).toBe('imported');
    expect(await db.documents.count()).toBe(2);
    expect(await db.blobs.count()).toBe(1);
    expect(await db.events.count()).toBe(2); // das Duplikat erzeugt kein Ereignis
  });

  it('Foto: wird gespeichert, ohne Abschnitte, Texterkennung ausstehend', async () => {
    const db = await open();
    const s = await subject(db, 'Bio');
    const r = await importMaterial(
      db,
      { subjectId: s, name: 'heft.jpg', type: 'image/jpeg', bytes: new Uint8Array([1, 2, 3, 4]) },
      noPdf,
      1,
    );
    expect(r).toMatchObject({ status: 'imported', kind: 'image', needsOcr: true, chunks: 0 });
    expect((await db.documents.toArray())[0]!.ocrStatus).toBe('pending');
  });

  it('PDF (Ersatz-Extraktor): Seiten ohne Text werden vermerkt, überwiegend Scan → Texterkennung ausstehend', async () => {
    const db = await open();
    const s = await subject(db, 'Mathe');
    const deps: ImportDeps = {
      estimate: OK,
      extractPdf: async (_b, onPage) => {
        onPage?.(2, 2);
        return [
          { page: 0, width: 600, height: 800, items: [] },
          { page: 1, width: 600, height: 800, items: [] },
        ];
      },
    };
    const r = await importMaterial(
      db,
      { subjectId: s, name: 'scan.pdf', type: 'application/pdf', bytes: enc('%PDF-fake') },
      deps,
      1,
    );
    expect(r).toMatchObject({ status: 'imported', pages: 2, textlessPages: 2, needsOcr: true });
    expect((await db.documents.toArray())[0]!.textlessPages).toEqual([0, 1]);
  });

  it('unbekanntes Format, defektes PDF, zu wenig Platz: Fehler mit Code, nichts gespeichert', async () => {
    const db = await open();
    const s = await subject(db, 'X');
    const bad = await importMaterial(
      db,
      { subjectId: s, name: 'a.exe', type: 'application/x-msdownload', bytes: enc('x') },
      noPdf,
      1,
    ).catch((e) => e);
    expect((bad as DataError).code).toBe('IMPORT_INVALID');
    const broken: ImportDeps = {
      estimate: OK,
      extractPdf: async () => {
        throw new DataError('IMPORT_INVALID', 'defekt');
      },
    };
    const e2 = await importMaterial(
      db,
      { subjectId: s, name: 'b.pdf', type: 'application/pdf', bytes: enc('x') },
      broken,
      1,
    ).catch((e) => e);
    expect((e2 as DataError).code).toBe('IMPORT_INVALID');
    const e3 = await importMaterial(
      db,
      { subjectId: s, name: 'c.txt', type: 'text/plain', bytes: enc('x') },
      { ...noPdf, estimate: { usage: 100, quota: 100 } },
      1,
    ).catch((e) => e);
    expect((e3 as DataError).code).toBe('STORAGE_FULL');
    expect(await db.documents.count()).toBe(0);
    expect(await db.blobs.count()).toBe(0);
    expect(await db.events.count()).toBe(0);
  });

  it('detectKind', () => {
    expect(detectKind('a.PDF', '')).toBe('pdf');
    expect(detectKind('foto', 'image/heic')).toBe('image');
    expect(detectKind('notiz.md', '')).toBe('text');
    expect(detectKind('x.docx', 'application/vnd.openxmlformats')).toBeNull();
  });
});

describe('Suche', () => {
  async function fixture() {
    const db = await open();
    const s = await subject(db, 'Physik');
    await importMaterial(
      db,
      {
        subjectId: s,
        name: 'Skript.txt',
        type: 'text/plain',
        bytes: enc(
          '# Größen und Einheiten\n\nDie Geschwindigkeit wird in Metern pro Sekunde gemessen.\n',
        ),
      },
      noPdf,
      1,
    );
    await importMaterial(
      db,
      {
        subjectId: s,
        name: 'Optik.txt',
        type: 'text/plain',
        bytes: enc(
          '# Licht\n\nLicht breitet sich geradlinig aus. Die Lichtgeschwindigkeit ist sehr groß.\n',
        ),
      },
      noPdf,
      2,
    );
    const doc = (await db.documents.toArray())[0]!;
    await db.annotations.add({
      id: 'n1',
      documentId: doc.id,
      page: 0,
      rects: [[0, 0, 1, 1]],
      color: 'yellow',
      note: 'Das muss ich für die Klausur wiederholen',
    });
    return { db, index: await buildIndex(db) };
  }

  it('findet über Umlaute, ß und Groß-/Kleinschreibung', async () => {
    const { index } = await fixture();
    expect(search(index, 'GROESSEN').some((h) => h.kind === 'chunk')).toBe(true);
    expect(search(index, 'größen').some((h) => h.kind === 'chunk')).toBe(true);
    expect(search(index, 'groß').length).toBeGreaterThan(0);
  });

  it('Wortanfang und kleine Tippfehler', async () => {
    const { index } = await fixture();
    expect(search(index, 'geschwind').length).toBeGreaterThan(0);
    expect(search(index, 'geschwindikeit').length).toBeGreaterThan(0);
  });

  it('findet Fächer, Dateien und Notizen und nennt die Quelle', async () => {
    const { index } = await fixture();
    expect(search(index, 'physik')[0]!.kind).toBe('subject');
    expect(search(index, 'optik')[0]!.kind).toBe('document');
    const note = search(index, 'Klausur').find((h) => h.kind === 'note')!;
    expect(note.where).toMatchObject({ subject: 'Physik', page: 0 });
    const chunk = search(index, 'Sekunde').find((h) => h.kind === 'chunk')!;
    expect(chunk.where.subject).toBe('Physik');
    expect(chunk.target).toMatchObject({ route: 'doc', page: 0 });
    expect(chunk.snippet).toContain('Metern pro Sekunde');
  });

  it('leere Suche und kein Treffer', async () => {
    const { index } = await fixture();
    expect(search(index, '   ')).toEqual([]);
    expect(search(index, 'xyzxyz')).toEqual([]);
  });

  it('Positionen beziehen sich auf den Originaltext (zum Markieren)', () => {
    const t = 'Die Größe ist groß.';
    const m = findMatches(t, 'GROESSE');
    expect(m).toEqual([{ start: 4, end: 9 }]);
    expect(t.slice(m[0]!.start, m[0]!.end)).toBe('Größe');
    expect(findMatches(t, 'ß').map((x) => t.slice(x.start, x.end))).toEqual(['ß', 'ß']); // „ß" steckt in „Größe" und „groß"
    expect(findMatches('Fuß und Fuss', 'fuss').map((x) => [x.start, x.end])).toEqual([
      [0, 3],
      [8, 12],
    ]);
  });
});
