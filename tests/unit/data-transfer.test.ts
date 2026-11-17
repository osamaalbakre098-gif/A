// @vitest-environment node
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { listBackups } from '../../src/data/db/backups';
import { MadarDB, openDatabase } from '../../src/data/db/db';
import { DataError } from '../../src/data/db/errors';
import { DATA_TABLES } from '../../src/data/db/schema';
import { exportZip, importZip, parseExport } from '../../src/data/db/transfer';
import { sha256Hex } from '../../src/data/hash';
import { createV1Database, fixtureV1, newBackupStore, uniqueName } from './_db';

const GB = 1e9;
const OK = { usage: 0, quota: 100 * GB };

async function seeded(): Promise<MadarDB> {
  const name = uniqueName();
  await createV1Database(name);
  return openDatabase(name, { now: 1, backupStore: newBackupStore() });
}
const fresh = () => openDatabase(uniqueName(), { now: 1, backupStore: newBackupStore() });

/** Alle ZIP-Einträge außer dem Manifest-Zeitstempel. */
function normalized(zip: Uint8Array): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(unzipSync(zip))) {
    out[k] =
      k === 'manifest.json'
        ? strFromU8(v).replace(/"createdAt":\d+/, '"createdAt":0')
        : Buffer.from(v).toString('base64');
  }
  return out;
}
async function counts(db: MadarDB) {
  const o: Record<string, number> = {};
  for (const t of DATA_TABLES) o[t] = await db.table(t).count();
  o.blobs = await db.blobs.count();
  return o;
}

describe('Export und Import', () => {
  it('Rundlauf: Export → Import → Export ergibt identische Daten', async () => {
    const a = await seeded();
    const zip1 = await exportZip(a, 111);
    const b = await fresh();
    const r = await importZip(b, zip1, { now: 222, estimate: OK, backupStore: newBackupStore() });
    expect(r.backedUp).toBe(false);
    const zip2 = await exportZip(b, 333);
    expect(normalized(zip2)).toEqual(normalized(zip1));
    expect(await counts(b)).toEqual(await counts(a));
    a.close();
    b.close();
  });

  it('der Export enthält Daten und Originaldateien unverändert', async () => {
    const a = await seeded();
    const files = unzipSync(await exportZip(a, 1));
    const fx = fixtureV1().blobs[0]!;
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        'manifest.json',
        `files/${fx.sha256}`,
        ...DATA_TABLES.map((t) => `data/${t}.json`),
      ]),
    );
    expect(await sha256Hex(files[`files/${fx.sha256}`]!)).toBe(fx.sha256);
    a.close();
  });

  it('der Export ist deterministisch (gleiche Daten, gleiche Datei)', async () => {
    const a = await seeded();
    const [x, y] = [await exportZip(a, 5), await exportZip(a, 5)];
    expect(Buffer.from(x).equals(Buffer.from(y))).toBe(true);
    a.close();
  });

  it('Import in eine Datenbank mit Daten sichert den Bestand zuerst und ersetzt ihn dann', async () => {
    const source = await seeded();
    const zip = await exportZip(source, 1);
    const target = await fresh();
    await target.subjects.add({
      id: 'alt',
      name: 'Alt',
      colorKey: 'sage',
      createdAt: 1,
      archived: false,
    });
    await target.events.add({
      ts: 1,
      type: 'SessionStarted',
      payload: { sessionId: 'alt' },
      schemaVersion: 1,
    });
    const store = newBackupStore();
    const r = await importZip(target, zip, { now: 9, estimate: OK, backupStore: store });
    expect(r.backedUp).toBe(true);
    const backups = await listBackups(store);
    expect(backups).toHaveLength(1);
    expect(backups[0]!.reason).toBe('import');
    expect(backups[0]!.counts.subjects).toBe(1); // der alte Bestand liegt in der Sicherung
    expect(await target.subjects.count()).toBe(2); // jetzt die importierten
    expect(await target.subjects.get('alt')).toBeUndefined();
    // Sperre für Ereignisse ist nach dem Import wieder aktiv
    await expect(target.events.clear()).rejects.toMatchObject({ code: 'EVENTS_IMMUTABLE' });
    source.close();
    target.close();
  });
});

describe('Ein Import wird nie halb gespeichert', () => {
  async function expectUntouched(db: MadarDB, bytes: Uint8Array, code: string, estimate = OK) {
    const before = await counts(db);
    const err = await importZip(db, bytes, {
      now: 1,
      estimate,
      backupStore: newBackupStore(),
    }).catch((e) => e);
    expect(err).toBeInstanceOf(DataError);
    expect((err as DataError).code).toBe(code);
    expect(await counts(db)).toEqual(before);
  }

  it('kein ZIP / abgeschnittene Datei', async () => {
    const db = await seeded();
    const zip = await exportZip(db, 1);
    await expectUntouched(db, strToU8('das ist kein zip'), 'IMPORT_INVALID');
    await expectUntouched(db, zip.slice(0, Math.floor(zip.length / 2)), 'IMPORT_INVALID');
    db.close();
  });

  it('beschädigte Originaldatei (Prüfsumme)', async () => {
    const db = await seeded();
    const files = unzipSync(await exportZip(db, 1));
    const key = Object.keys(files).find((k) => k.startsWith('files/'))!;
    files[key] = strToU8('manipuliert');
    await expectUntouched(db, zipSync(files), 'IMPORT_INVALID');
    db.close();
  });

  it('Datensatz verletzt das Schema', async () => {
    const db = await seeded();
    const files = unzipSync(await exportZip(db, 1));
    const rows = JSON.parse(strFromU8(files['data/subjects.json']!)) as Record<string, unknown>[];
    delete rows[0]!.name;
    files['data/subjects.json'] = strToU8(JSON.stringify(rows));
    await expectUntouched(db, zipSync(files), 'IMPORT_INVALID');
    db.close();
  });

  it('Verweis auf eine fehlende Originaldatei', async () => {
    const db = await seeded();
    const files = unzipSync(await exportZip(db, 1));
    const manifest = JSON.parse(strFromU8(files['manifest.json']!)) as { blobs: number };
    for (const k of Object.keys(files)) if (k.startsWith('files/')) delete files[k];
    manifest.blobs = 0;
    files['manifest.json'] = strToU8(JSON.stringify(manifest));
    await expectUntouched(db, zipSync(files), 'IMPORT_INVALID');
    db.close();
  });

  it('Export aus einer neueren Version', async () => {
    const db = await seeded();
    const files = unzipSync(await exportZip(db, 1));
    const manifest = JSON.parse(strFromU8(files['manifest.json']!)) as { formatVersion: number };
    manifest.formatVersion = 99;
    files['manifest.json'] = strToU8(JSON.stringify(manifest));
    await expectUntouched(db, zipSync(files), 'IMPORT_TOO_NEW');
    db.close();
  });

  it('nicht genug Platz', async () => {
    const db = await seeded();
    const zip = await exportZip(db, 1);
    await expectUntouched(db, zip, 'STORAGE_FULL', { usage: 100 * GB - 10, quota: 100 * GB });
    db.close();
  });

  it('Fehler mitten im Schreiben: alles wird zurückgerollt (Transaktion)', async () => {
    const target = await seeded();
    const source = await seeded();
    const files = unzipSync(await exportZip(source, 1));
    // Zwei Dokumente mit gleicher Datei im selben Fach verletzen den eindeutigen Index erst beim Schreiben,
    // also nachdem schon andere Tabellen ersetzt wurden.
    const docs = JSON.parse(strFromU8(files['data/documents.json']!)) as Record<string, unknown>[];
    docs.push({ ...docs[0]!, id: 'd-doppelt' });
    files['data/documents.json'] = strToU8(JSON.stringify(docs));
    const manifest = JSON.parse(strFromU8(files['manifest.json']!)) as {
      counts: Record<string, number>;
    };
    manifest.counts.documents = docs.length;
    files['manifest.json'] = strToU8(JSON.stringify(manifest));
    const before = await counts(target);
    const err = await importZip(target, zipSync(files), {
      now: 1,
      estimate: OK,
      backupStore: newBackupStore(),
    }).catch((e) => e);
    // Der Fehler kommt vom Schreiben (Index-Verletzung), nicht von der Vorprüfung:
    expect(err).not.toBeInstanceOf(DataError);
    expect((err as Error).name).toMatch(/Constraint|Bulk/);
    expect(await counts(target)).toEqual(before);
    expect(await target.subjects.count()).toBe(2);
    target.close();
    source.close();
  });

  it('parseExport prüft ohne Datenbank', async () => {
    const db = await seeded();
    const parsed = await parseExport(await exportZip(db, 1));
    expect(parsed.manifest.counts.events).toBe(5);
    expect(parsed.blobs).toHaveLength(1);
    db.close();
  });
});
