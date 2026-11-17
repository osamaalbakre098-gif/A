import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { z } from 'zod';
import { sha256Hex, stableStringify } from '../hash';
import { BackupDB, createBackup, type BackupRow } from './backups';
import type { MadarDB } from './db';
import { DataError, toDataError } from './errors';
import { latestVersion } from './migrations';
import { DATA_TABLES, TABLE_SCHEMAS, type DataTableName } from './schema';
import {
  checkStorage,
  getStorageEstimate,
  type StorageCheck,
  type StorageEstimateLike,
} from './storage';

export const EXPORT_FORMAT = 'madar-export';
/** Version des ZIP-Formats. Neuere Dateien werden abgelehnt, ältere müssen weiter lesbar bleiben. */
export const EXPORT_FORMAT_VERSION = 1;

const Manifest = z.object({
  format: z.literal(EXPORT_FORMAT),
  formatVersion: z.number().int().positive(),
  schemaVersion: z.number().int().positive(),
  createdAt: z.number().int(),
  counts: z.record(z.string(), z.number().int().nonnegative()),
  blobs: z.number().int().nonnegative(),
});
type Manifest = z.infer<typeof Manifest>;

// Feste Zeit für alle ZIP-Einträge: gleiche Daten ergeben gleiche Dateien.
const ZIP_MTIME = Date.UTC(1980, 0, 1);

/** Alle Daten als ZIP: `manifest.json`, `data/<tabelle>.json`, `files/<sha256>` (Originaldateien, unverändert). */
export async function exportZip(db: MadarDB, now: number): Promise<Uint8Array> {
  const files: Zippable = {};
  const counts: Record<string, number> = {};
  for (const t of DATA_TABLES) {
    const rows = await db.table(t).toArray();
    counts[t] = rows.length;
    files[`data/${t}.json`] = strToU8(stableStringify(rows));
  }
  let blobs = 0;
  await db.blobs.each((b) => {
    files[`files/${b.sha256}`] = new Uint8Array(b.data);
    blobs++;
  });
  const manifest: Manifest = {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: db.verno,
    createdAt: now,
    counts,
    blobs,
  };
  files['manifest.json'] = strToU8(stableStringify(manifest));
  return zipSync(files, { level: 1, mtime: ZIP_MTIME });
}

export interface ParsedExport {
  manifest: Manifest;
  tables: Record<DataTableName, unknown[]>;
  blobs: { sha256: string; data: ArrayBuffer }[];
  totalBytes: number;
}

const invalid = (msg: string, cause?: unknown) => new DataError('IMPORT_INVALID', msg, cause);

/** Liest und prüft eine Exportdatei vollständig, ohne die Datenbank anzufassen. */
export async function parseExport(
  bytes: Uint8Array,
  schemaLatest = latestVersion(),
): Promise<ParsedExport> {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch (e) {
    throw invalid('Die Datei ist kein gültiger Madar-Export.', e);
  }
  const mf = entries['manifest.json'];
  if (!mf) throw invalid('Die Datei enthält kein manifest.json.');
  let manifest: Manifest;
  try {
    manifest = Manifest.parse(JSON.parse(strFromU8(mf)));
  } catch (e) {
    throw invalid('Das Manifest ist ungültig.', e);
  }
  if (manifest.formatVersion > EXPORT_FORMAT_VERSION || manifest.schemaVersion > schemaLatest) {
    throw new DataError('IMPORT_TOO_NEW', 'Der Export stammt aus einer neueren Madar-Version.');
  }

  const tables = {} as Record<DataTableName, unknown[]>;
  for (const t of DATA_TABLES) {
    const f = entries[`data/${t}.json`];
    if (!f) throw invalid(`Es fehlt data/${t}.json.`);
    let raw: unknown;
    try {
      raw = JSON.parse(strFromU8(f));
    } catch (e) {
      throw invalid(`data/${t}.json ist kein gültiges JSON.`, e);
    }
    const rows = z.array(TABLE_SCHEMAS[t]).safeParse(raw);
    if (!rows.success) {
      const issue = rows.error.issues[0];
      throw invalid(
        `Ungültiger Datensatz in ${t} (${issue?.path.join('.') ?? ''}: ${issue?.message ?? ''}).`,
        rows.error,
      );
    }
    if (manifest.counts[t] !== rows.data.length)
      throw invalid(`Anzahl in ${t} stimmt nicht mit dem Manifest überein.`);
    tables[t] = rows.data;
  }

  const blobs: ParsedExport['blobs'] = [];
  let totalBytes = 0;
  for (const [name, data] of Object.entries(entries)) {
    totalBytes += data.byteLength;
    if (!name.startsWith('files/')) continue;
    const sha = name.slice('files/'.length);
    if ((await sha256Hex(data)) !== sha)
      throw invalid(`Die Datei ${sha} ist beschädigt (Prüfsumme stimmt nicht).`);
    blobs.push({ sha256: sha, data: data.slice().buffer });
  }
  if (blobs.length !== manifest.blobs)
    throw invalid('Die Anzahl der Dateien stimmt nicht mit dem Manifest überein.');
  const have = new Set(blobs.map((b) => b.sha256));
  for (const d of tables.documents as { blobRef: string; name: string }[]) {
    if (!have.has(d.blobRef)) throw invalid(`Die Originaldatei zu „${d.name}" fehlt im Export.`);
  }
  return { manifest, tables, blobs, totalBytes };
}

/** Ersetzt den gesamten Inhalt in EINER Transaktion: bei jedem Fehler bleibt alles wie vorher. */
async function replaceAll(
  db: MadarDB,
  tables: Record<string, unknown[]>,
  blobs: ParsedExport['blobs'] | null,
) {
  db.eventsUnlocked = true;
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const t of DATA_TABLES) {
        await db.table(t).clear();
        const rows = tables[t] ?? [];
        if (rows.length) await db.table(t).bulkAdd(rows);
      }
      if (blobs) {
        await db.blobs.clear();
        if (blobs.length) await db.blobs.bulkAdd(blobs);
      }
    });
  } catch (e) {
    throw toDataError(e);
  } finally {
    db.eventsUnlocked = false;
  }
}

async function hasData(db: MadarDB): Promise<boolean> {
  for (const t of DATA_TABLES) if ((await db.table(t).count()) > 0) return true;
  return (await db.blobs.count()) > 0;
}

export interface ImportOptions {
  now: number;
  estimate?: StorageEstimateLike;
  backupStore?: BackupDB;
}
export interface ImportResult {
  counts: Record<string, number>;
  blobs: number;
  /** Es gab vorher Daten; sie liegen als Sicherung vor. */
  backedUp: boolean;
  storage: StorageCheck;
}

/**
 * Stellt einen Export wieder her (ersetzt den aktuellen Inhalt). Ablauf: prüfen, Platz prüfen,
 * Sicherung des Bestehenden, dann alles in einer Transaktion. Nie halb gespeichert.
 */
export async function importZip(
  db: MadarDB,
  bytes: Uint8Array,
  opts: ImportOptions,
): Promise<ImportResult> {
  const parsed = await parseExport(bytes);
  const storage = checkStorage(opts.estimate ?? (await getStorageEstimate()), parsed.totalBytes);
  if (storage.level === 'insufficient') {
    throw new DataError('STORAGE_FULL', 'Auf dem Gerät ist nicht genug Platz für diesen Import.');
  }
  let backedUp = false;
  if (await hasData(db)) {
    const store = opts.backupStore ?? new BackupDB();
    try {
      await createBackup(db, store, {
        reason: 'import',
        fromVersion: db.verno,
        toVersion: db.verno,
        now: opts.now,
      });
    } catch (e) {
      throw toDataError(e);
    } finally {
      if (!opts.backupStore) store.close();
    }
    backedUp = true;
  }
  await replaceAll(db, parsed.tables, parsed.blobs);
  return { counts: parsed.manifest.counts, blobs: parsed.blobs.length, backedUp, storage };
}

/** Stellt eine automatische Sicherung wieder her (ohne Dateien; die bleiben, wie sie sind). */
export async function restoreBackup(db: MadarDB, backup: BackupRow): Promise<void> {
  const data = JSON.parse(backup.json) as { tables: Record<string, unknown[]> };
  const tables: Record<string, unknown[]> = {};
  for (const t of DATA_TABLES) {
    const rows = z.array(TABLE_SCHEMAS[t]).safeParse(data.tables[t] ?? []);
    if (!rows.success) throw invalid(`Die Sicherung ist beschädigt (${t}).`, rows.error);
    tables[t] = rows.data;
  }
  await replaceAll(db, tables, null);
}
