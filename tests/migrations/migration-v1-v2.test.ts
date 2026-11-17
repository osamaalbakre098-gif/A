// @vitest-environment node
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { listBackups } from '../../src/data/db/backups';
import { MadarDB, openDatabase } from '../../src/data/db/db';
import { DataError } from '../../src/data/db/errors';
import { V1_STORES, type Migration } from '../../src/data/db/migrations';
import { restoreBackup } from '../../src/data/db/transfer';
import { DATA_TABLES } from '../../src/data/db/schema';
import { sha256Hex, stableStringify } from '../../src/data/hash';
import {
  createV1Database,
  fixtureV1,
  newBackupStore,
  TOTAL_FIXTURE_ROWS,
  uniqueName,
  V1_ONLY,
} from '../unit/_db';

/** Simulierte Version 2: neues Feld `tags` an Fächern (mit Standardwert) und neuer Index auf `name`. */
const V2: Migration = {
  version: 2,
  stores: { subjects: 'id, archived, name' },
  upgrade: (tx) =>
    tx
      .table('subjects')
      .toCollection()
      .modify((s: { tags?: string[] }) => {
        s.tags = [];
      }),
};
const V1_V2 = [...V1_ONLY, V2];

async function snapshotHashes(db: Dexie, strip: Record<string, string[]> = {}) {
  const out: Record<string, { count: number; hash: string }> = {};
  for (const t of DATA_TABLES) {
    const rows = (await db.table(t).toArray()) as Record<string, unknown>[];
    const cleaned = rows.map((r) => {
      const c = { ...r };
      for (const k of strip[t] ?? []) delete c[k];
      return c;
    });
    out[t] = {
      count: rows.length,
      hash: await sha256Hex(new TextEncoder().encode(stableStringify(cleaned))),
    };
  }
  return out;
}

describe('Migration v1 → v2 (Fixture-Datenbank)', () => {
  it('verliert keinen Datensatz und verändert nichts außer dem neuen Feld', async () => {
    const name = uniqueName();
    await createV1Database(name);
    const store = newBackupStore();

    const before = new MadarDB(name, V1_ONLY);
    await before.open();
    const hashesBefore = await snapshotHashes(before);
    const totalBefore = Object.values(hashesBefore).reduce((a, x) => a + x.count, 0);
    expect(totalBefore).toBe(TOTAL_FIXTURE_ROWS());
    before.close();

    const db = await openDatabase(name, {
      now: 1_800_000_000_000,
      migrations: V1_V2,
      backupStore: store,
    });
    expect(db.verno).toBe(2);
    const after = await snapshotHashes(db, { subjects: ['tags'] });
    expect(after).toEqual(hashesBefore); // Anzahl UND Inhalt je Tabelle gleich
    const subjects = await db.subjects.toArray();
    expect(subjects.every((s) => Array.isArray((s as unknown as { tags: string[] }).tags))).toBe(
      true,
    );

    // Originaldatei unverändert
    const fx = fixtureV1().blobs[0]!;
    const blob = await db.blobs.get(fx.sha256);
    expect(await sha256Hex(blob!.data)).toBe(fx.sha256);
    db.close();
  });

  it('legt vor der Migration eine Sicherung an (mit Anzahl je Tabelle)', async () => {
    const name = uniqueName();
    await createV1Database(name);
    const store = newBackupStore();
    const db = await openDatabase(name, {
      now: 1_800_000_000_000,
      migrations: V1_V2,
      backupStore: store,
    });
    const backups = await listBackups(store);
    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatchObject({
      reason: 'migration',
      fromVersion: 1,
      toVersion: 2,
      createdAt: 1_800_000_000_000,
    });
    expect(backups[0]!.counts.subjects).toBe(2);
    expect(backups[0]!.counts.events).toBe(5);
    db.close();
  });

  it('behält nur die letzten drei Sicherungen', async () => {
    const name = uniqueName();
    await createV1Database(name);
    const store = newBackupStore();
    const chain: Migration[] = [...V1_V2];
    let db = await openDatabase(name, { now: 1, migrations: chain, backupStore: store });
    db.close();
    for (let v = 3; v <= 6; v++) {
      chain.push({ version: v, stores: {} });
      db = await openDatabase(name, { now: v, migrations: chain, backupStore: store });
      db.close();
    }
    const backups = await listBackups(store);
    expect(backups).toHaveLength(3);
    expect(backups.map((b) => b.toVersion)).toEqual([6, 5, 4]); // neueste zuerst
  });

  it('bei einer fehlgeschlagenen Migration bleibt die alte Version unverändert', async () => {
    const name = uniqueName();
    await createV1Database(name);
    const store = newBackupStore();
    const broken: Migration = {
      version: 2,
      stores: { subjects: 'id, archived, name' },
      upgrade: async (tx) => {
        await tx.table('subjects').clear(); // halb durchgeführt …
        throw new Error('kaputt'); // … dann Fehler
      },
    };
    await expect(
      openDatabase(name, { now: 1, migrations: [...V1_ONLY, broken], backupStore: store }),
    ).rejects.toThrow();
    const check = new MadarDB(name, V1_ONLY);
    await check.open();
    expect(check.verno).toBe(1);
    expect(await check.subjects.count()).toBe(2); // nichts verloren
    expect(await check.events.count()).toBe(5);
    check.close();
    expect(await listBackups(store)).toHaveLength(1); // Sicherung wurde vorher angelegt
  });

  it('Daten einer neueren App werden nie angefasst', async () => {
    const name = uniqueName();
    await createV1Database(name);
    const newer = await openDatabase(name, {
      now: 1,
      migrations: V1_V2,
      backupStore: newBackupStore(),
    });
    newer.close();
    const err = await openDatabase(name, {
      now: 2,
      migrations: V1_ONLY,
      backupStore: newBackupStore(),
    }).catch((e) => e);
    expect(err).toBeInstanceOf(DataError);
    expect((err as DataError).code).toBe('DB_TOO_NEW');
    const check = new MadarDB(name, V1_V2);
    await check.open();
    expect(await check.subjects.count()).toBe(2);
    check.close();
  });

  it('eine frische Datenbank braucht keine Sicherung', async () => {
    const store = newBackupStore();
    const db = await openDatabase(uniqueName(), { now: 1, backupStore: store });
    expect(await listBackups(store)).toHaveLength(0);
    expect(db.verno).toBe(1);
    db.close();
  });

  it('eine Sicherung lässt sich wiederherstellen', async () => {
    const name = uniqueName();
    await createV1Database(name);
    const store = newBackupStore();
    const db = await openDatabase(name, { now: 5, migrations: V1_V2, backupStore: store });
    await db.subjects.clear(); // „Unfall"
    await db.settings.clear();
    expect(await db.subjects.count()).toBe(0);
    const [backup] = await listBackups(store);
    await restoreBackup(db, backup!);
    expect(await db.subjects.count()).toBe(2);
    expect(await db.settings.count()).toBe(2);
    expect(await db.events.count()).toBe(5);
    db.close();
  });
});

describe('Schema Version 1', () => {
  it('Tabellenliste stimmt mit dem Prompt (3.2) überein', () => {
    expect(Object.keys(V1_STORES).sort()).toEqual([...DATA_TABLES, 'blobs'].sort());
  });
});
