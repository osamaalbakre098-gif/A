// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/data/db/db';
import { DataError } from '../../src/data/db/errors';
import { appendEvent } from '../../src/data/events/events';
import { newBackupStore, uniqueName } from './_db';

const open = () => openDatabase(uniqueName(), { now: 0, backupStore: newBackupStore() });
const answer = {
  type: 'AnswerSubmitted' as const,
  payload: {
    attemptId: 'a',
    itemId: 'i',
    skillId: 's',
    correct: true,
    partial: false,
    hintLevel: 0,
    latencyMs: 1000,
  },
};

describe('Ereignisprotokoll', () => {
  it('hängt Ereignisse mit steigender Nummer, Zeit und Version an', async () => {
    const db = await open();
    const a = await appendEvent(db, answer, 1000);
    const b = await appendEvent(db, { type: 'SessionStarted', payload: { sessionId: 'x' } }, 2000);
    expect(b).toBeGreaterThan(a);
    const rows = await db.events.toArray();
    expect(rows.map((r) => [r.type, r.ts, r.schemaVersion])).toEqual([
      ['AnswerSubmitted', 1000, 1],
      ['SessionStarted', 2000, 1],
    ]);
    db.close();
  });

  it('lehnt ungültige Nutzdaten ab, ohne etwas zu speichern', async () => {
    const db = await open();
    await expect(
      appendEvent(db, { type: 'AnswerSubmitted', payload: { ...answer.payload, hintLevel: 9 } }, 1),
    ).rejects.toThrow();
    expect(await db.events.count()).toBe(0);
    db.close();
  });

  it('Ereignisse sind unveränderlich: ändern und löschen schlagen immer fehl', async () => {
    const db = await open();
    const id = await appendEvent(db, answer, 1);
    const attempts: [string, () => Promise<unknown>][] = [
      ['update', () => db.events.update(id, { type: 'Hack' })],
      ['put', () => db.events.put({ id, ts: 5, type: 'Hack', payload: {}, schemaVersion: 1 })],
      ['delete', () => db.events.delete(id)],
      ['bulkDelete', () => db.events.bulkDelete([id])],
      ['where.delete', () => db.events.where('id').equals(id).delete()],
      ['modify', () => db.events.toCollection().modify({ type: 'Hack' })],
      ['clear', () => db.events.clear()],
    ];
    for (const [name, fn] of attempts) {
      const err = await fn().then(
        () => null,
        (e: unknown) => e,
      );
      expect(err, name).not.toBeNull();
      expect(
        (err as { code?: string; inner?: { code?: string } }).code ??
          (err as { inner?: { code?: string } }).inner?.code,
        name,
      ).toBe('EVENTS_IMMUTABLE');
    }
    const [row] = await db.events.toArray();
    expect(row).toMatchObject({ id, type: 'AnswerSubmitted', ts: 1 });
    expect(await db.events.count()).toBe(1);
    expect(new DataError('EVENTS_IMMUTABLE', 'x').code).toBe('EVENTS_IMMUTABLE');
    db.close();
  });
});
