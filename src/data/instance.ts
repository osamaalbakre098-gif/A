import { systemNow } from './clock';
import { openDatabase, type MadarDB } from './db/db';

export const DB_NAME = 'madar';
let opened: Promise<MadarDB> | null = null;

/** Die eine App-Datenbank (öffnet beim ersten Aufruf, migriert bei Bedarf mit vorheriger Sicherung). */
export function getDb(): Promise<MadarDB> {
  opened ??= openDatabase(DB_NAME, { now: systemNow() }).catch((e) => {
    opened = null; // nächster Aufruf darf es erneut versuchen
    throw e;
  });
  return opened;
}
