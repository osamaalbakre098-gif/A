// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/data/db/db';
import {
  activityProjection,
  loadProjection,
  loadWithSnapshot,
  saveSnapshot,
  SNAPSHOT_EVERY,
  type Projection,
} from '../../src/data/events/projections';
import { newBackupStore, uniqueName } from './_db';

const open = () => openDatabase(uniqueName(), { now: 0, backupStore: newBackupStore() });

async function fill(db: Awaited<ReturnType<typeof open>>, from: number, to: number) {
  await db.events.bulkAdd(
    Array.from({ length: to - from }, (_, i) => ({
      ts: 1000 + from + i,
      type: i % 3 === 0 ? 'HintUsed' : 'CardReviewed',
      payload: {},
      schemaVersion: 1,
    })),
  );
}

describe('Projektionen und Zwischenstände', () => {
  it('Zwischenstand + neue Ereignisse = vollständige Neuberechnung', async () => {
    const db = await open();
    await fill(db, 0, 1200);
    const half = await loadProjection(db, activityProjection);
    expect(half.replayed).toBe(1200);
    expect(half.fromSnapshot).toBe(false);
    await saveSnapshot(db, activityProjection, half.state, half.lastEventId, 1);
    await fill(db, 1200, 1500);

    const fast = await loadProjection(db, activityProjection);
    expect(fast.fromSnapshot).toBe(true);
    expect(fast.replayed).toBe(300); // nur die neuen

    await db.snapshots.clear();
    const full = await loadProjection(db, activityProjection);
    expect(full.replayed).toBe(1500);
    expect(fast.state).toEqual(full.state);
    expect(full.state.total).toBe(1500);
    db.close();
  });

  it('speichert erst ab SNAPSHOT_EVERY neuen Ereignissen einen Zwischenstand', async () => {
    const db = await open();
    await fill(db, 0, SNAPSHOT_EVERY - 1);
    await loadWithSnapshot(db, activityProjection, 5);
    expect(await db.snapshots.count()).toBe(0);
    await fill(db, SNAPSHOT_EVERY - 1, SNAPSHOT_EVERY + 5);
    await loadWithSnapshot(db, activityProjection, 6);
    expect((await db.snapshots.get('activity'))?.lastEventId).toBe(SNAPSHOT_EVERY + 5);
    db.close();
  });

  it('eine neue Projektionsversion verwirft den alten Zwischenstand', async () => {
    const db = await open();
    await fill(db, 0, 50);
    const first = await loadProjection(db, activityProjection);
    await saveSnapshot(db, activityProjection, first.state, first.lastEventId, 1);
    const v2: Projection<typeof first.state> = { ...activityProjection, version: 2 };
    const r = await loadProjection(db, v2);
    expect(r.fromSnapshot).toBe(false);
    expect(r.replayed).toBe(50);
    db.close();
  });
});
