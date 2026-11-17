import Dexie, { type Table } from 'dexie';
import { BackupDB, createBackup } from './backups';
import { DataError } from './errors';
import { latestVersion, MIGRATIONS, type Migration } from './migrations';
import type * as S from './schema';

export class MadarDB extends Dexie {
  subjects!: Table<S.Subject, string>;
  documents!: Table<S.DocumentRow, string>;
  blobs!: Table<S.BlobRow, string>;
  chunks!: Table<S.Chunk, string>;
  topics!: Table<S.Topic, string>;
  skills!: Table<S.Skill, string>;
  requires!: Table<S.Requires, [string, string]>;
  items!: Table<S.Item, string>;
  lessons!: Table<S.Lesson, string>;
  misconceptions!: Table<S.Misconception, string>;
  cards!: Table<S.CardRow, string>;
  attempts!: Table<S.Attempt, string>;
  exams!: Table<S.Exam, string>;
  sessions!: Table<S.Session, string>;
  events!: Table<S.EventRow, number, Omit<S.EventRow, 'id'> & { id?: number }>;
  annotations!: Table<S.Annotation, string>;
  jobs!: Table<S.Job, string>;
  snapshots!: Table<S.Snapshot, string>;
  settings!: Table<S.Setting, string>;

  /** Nur der Import darf das Ereignisprotokoll austauschen (siehe transfer.ts). */
  eventsUnlocked = false;

  constructor(name: string, migrations: Migration[] = MIGRATIONS) {
    super(name);
    for (const m of [...migrations].sort((a, b) => a.version - b.version)) {
      const v = this.version(m.version).stores(m.stores);
      if (m.upgrade) v.upgrade(m.upgrade);
    }
    // Ereignisse sind unveränderlich: kein Ändern, kein Löschen.
    const guard = () => {
      if (!this.eventsUnlocked)
        throw new DataError('EVENTS_IMMUTABLE', 'Ereignisse sind unveränderlich.');
    };
    this.events.hook('updating', guard);
    this.events.hook('deleting', guard);
    // `clear()` löst keine Löschen-Hooks aus, deshalb zusätzlich absichern.
    const clear = this.events.clear.bind(this.events);
    this.events.clear = () => {
      if (this.eventsUnlocked) return clear();
      return Promise.reject(
        new DataError('EVENTS_IMMUTABLE', 'Ereignisse sind unveränderlich.'),
      ) as unknown as ReturnType<typeof clear>;
    };
  }
}

export interface OpenOptions {
  now: number;
  migrations?: Migration[];
  backupStore?: BackupDB;
}

/**
 * Öffnet die Datenbank. Liegt eine ältere Version vor, wird VOR der Migration eine
 * JSON-Sicherung angelegt (die letzten drei bleiben erhalten). Eine neuere Version
 * (Daten einer neueren App) wird nie angefasst.
 */
export async function openDatabase(name: string, opts: OpenOptions): Promise<MadarDB> {
  const migrations = opts.migrations ?? MIGRATIONS;
  const target = latestVersion(migrations);
  if (await Dexie.exists(name)) {
    const probe = new Dexie(name);
    try {
      await probe.open();
      const current = probe.verno;
      if (current > target) {
        throw new DataError(
          'DB_TOO_NEW',
          `Die Daten stammen aus einer neueren Version (${current}).`,
        );
      }
      if (current < target) {
        const store = opts.backupStore ?? new BackupDB();
        await createBackup(probe, store, {
          reason: 'migration',
          fromVersion: current,
          toVersion: target,
          now: opts.now,
        });
        if (!opts.backupStore) store.close();
      }
    } finally {
      probe.close();
    }
  }
  const db = new MadarDB(name, migrations);
  await db.open();
  return db;
}
