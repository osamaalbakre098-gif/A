import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { BackupDB } from '../../src/data/db/backups';
import { MadarDB } from '../../src/data/db/db';
import { MIGRATIONS, V1_STORES, type Migration } from '../../src/data/db/migrations';

let n = 0;
export const uniqueName = (p = 'db') => `${p}-${++n}-${Math.random().toString(36).slice(2, 8)}`;
export const newBackupStore = () => new BackupDB(uniqueName('bk'));

export const V1_ONLY: Migration[] = [{ version: 1, stores: V1_STORES }];
export { MIGRATIONS };

interface Fixture {
  tables: Record<string, Record<string, unknown>[]>;
  blobs: { sha256: string; base64: string }[];
}
export const fixtureV1 = (): Fixture =>
  JSON.parse(readFileSync('tests/fixtures/db-v1.json', 'utf8')) as Fixture;

/** Lädt die Fixture-Datenbank (Version 1) und schließt sie wieder, wie eine App, die lange nicht geöffnet wurde. */
export async function createV1Database(name: string): Promise<void> {
  const fx = fixtureV1();
  const db = new MadarDB(name, V1_ONLY);
  await db.open();
  db.eventsUnlocked = true;
  for (const [t, rows] of Object.entries(fx.tables)) await db.table(t).bulkAdd(rows);
  await db.blobs.bulkAdd(
    fx.blobs.map((b) => ({
      sha256: b.sha256,
      data: Uint8Array.from(Buffer.from(b.base64, 'base64')).buffer,
    })),
  );
  db.eventsUnlocked = false;
  db.close();
}

export const TOTAL_FIXTURE_ROWS = () =>
  Object.values(fixtureV1().tables).reduce((a, rows) => a + rows.length, 0);
