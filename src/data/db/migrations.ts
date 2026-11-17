import type { Transaction } from 'dexie';

export interface Migration {
  version: number;
  /** Nur geänderte oder neue Tabellen müssen stehen; `null` entfernt eine Tabelle. */
  stores: Record<string, string | null>;
  /** Läuft einmal beim Wechsel auf diese Version, in der Upgrade-Transaktion (bei Fehler bleibt die alte Version unverändert). */
  upgrade?: (tx: Transaction) => PromiseLike<unknown> | void;
}

/** Version 1: alle Tabellen nach Prompt 3.2. */
export const V1_STORES: Record<string, string> = {
  subjects: 'id, archived',
  documents: 'id, &[sha256+subjectId], subjectId, sha256',
  blobs: 'sha256',
  chunks: 'id, documentId, [documentId+page]',
  topics: 'id, subjectId, [subjectId+order]',
  skills: 'id, topicId, hidden',
  requires: '[skillId+requiresSkillId], skillId, requiresSkillId',
  items: 'id, skillId, status',
  lessons: 'skillId',
  misconceptions: 'id, skillId',
  cards: 'itemId, due',
  attempts: 'id, itemId, ts',
  exams: 'id, subjectId, date',
  sessions: 'id, startedAt',
  events: '++id, ts, type',
  annotations: 'id, documentId, [documentId+page]',
  jobs: 'id, status, type',
  snapshots: 'projection',
  settings: 'key',
};

/**
 * Alle Schema-Versionen, aufsteigend. REGEL: Alte Einträge nie ändern, nur anhängen.
 * Jede neue Version braucht einen Migrationstest (tests/migrations).
 */
export const MIGRATIONS: Migration[] = [{ version: 1, stores: V1_STORES }];

export const latestVersion = (m: Migration[] = MIGRATIONS): number =>
  Math.max(...m.map((x) => x.version));
