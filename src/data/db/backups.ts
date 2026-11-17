import Dexie, { type Table } from 'dexie';

export const KEEP_BACKUPS = 3;

export interface BackupRow {
  id?: number;
  createdAt: number;
  reason: 'migration' | 'import' | 'manual';
  fromVersion: number;
  toVersion: number;
  /** Anzahl Datensätze je Tabelle */
  counts: Record<string, number>;
  /** Alle Tabellen als JSON (ohne Dateiinhalte; die Dateien werden von Migrationen nie angefasst). */
  json: string;
  bytes: number;
}

/** Eigene, kleine Datenbank für Sicherungen: bleibt unberührt, wenn die Hauptdatenbank migriert wird. */
export class BackupDB extends Dexie {
  backups!: Table<BackupRow, number>;
  constructor(name = 'madar-backups') {
    super(name);
    this.version(1).stores({ backups: '++id, createdAt' });
  }
}

/** Liest alle Tabellen (außer Dateiinhalten) in ein Objekt. Funktioniert auch mit einer ohne Schema geöffneten Datenbank. */
export async function dumpTables(
  db: Dexie,
): Promise<{ tables: Record<string, unknown[]>; blobHashes: string[] }> {
  const tables: Record<string, unknown[]> = {};
  let blobHashes: string[] = [];
  for (const t of db.tables) {
    if (t.name === 'blobs') {
      blobHashes = (await t.toCollection().primaryKeys()) as string[];
      continue;
    }
    tables[t.name] = await t.toArray();
  }
  return { tables, blobHashes };
}

export async function createBackup(
  source: Dexie,
  store: BackupDB,
  meta: { reason: BackupRow['reason']; fromVersion: number; toVersion: number; now: number },
): Promise<BackupRow> {
  const { tables, blobHashes } = await dumpTables(source);
  const json = JSON.stringify({ tables, blobHashes });
  const row: BackupRow = {
    createdAt: meta.now,
    reason: meta.reason,
    fromVersion: meta.fromVersion,
    toVersion: meta.toVersion,
    counts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
    json,
    bytes: json.length,
  };
  row.id = await store.backups.add(row);
  await pruneBackups(store);
  return row;
}

/** Behält nur die letzten `keep` Sicherungen. */
export async function pruneBackups(store: BackupDB, keep = KEEP_BACKUPS): Promise<void> {
  const ids = (await store.backups.orderBy('createdAt').primaryKeys()) as number[];
  const excess = ids.slice(0, Math.max(0, ids.length - keep));
  if (excess.length) await store.backups.bulkDelete(excess);
}

export const listBackups = (store: BackupDB) =>
  store.backups.orderBy('createdAt').reverse().toArray();
