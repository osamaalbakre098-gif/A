import { expect, test } from '@playwright/test';

test.use({ baseURL: 'http://localhost:5173' });

// Echte IndexedDB in echtem Chromium (nicht fake-indexeddb). Das ist NICHT Safari/iPhone.
test('App-Start mit 100 000 Ereignissen und Zwischenstand unter 1 Sekunde', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/dev/components');
  // Aufwärmen: Module einmal laden (der Dev-Server darf dabei neu laden).
  await page.evaluate(() => import('/src/data/db/db.ts')).catch(() => undefined);
  await page.goto('/dev/components');
  await page.evaluate(() => import('/src/data/db/db.ts'));
  const r = await page.evaluate(async () => {
    const { openDatabase } = await import('/src/data/db/db.ts');
    const { activityProjection, loadProjection, saveSnapshot } =
      await import('/src/data/events/projections.ts');
    const { BackupDB } = await import('/src/data/db/backups.ts');
    const name = `bench-${Math.random().toString(36).slice(2)}`;
    const store = new BackupDB(`${name}-bk`);
    let db = await openDatabase(name, { now: 0, backupStore: store });
    const N = 100_000;
    const types = ['AnswerSubmitted', 'HintUsed', 'CardReviewed', 'SessionStarted', 'BreakTaken'];
    for (let i = 0; i < N; i += 10_000) {
      await db.events.bulkAdd(
        Array.from({ length: 10_000 }, (_, j) => ({
          ts: i + j,
          type: types[(i + j) % 5]!,
          payload: { n: i + j },
          schemaVersion: 1,
        })),
      );
    }
    // Vollständige Neuberechnung (Referenz) und Zwischenstand speichern
    const t0 = performance.now();
    const full = await loadProjection(db, activityProjection);
    const fullMs = performance.now() - t0;
    await saveSnapshot(db, activityProjection, full.state, full.lastEventId, 1);
    // später kommen 500 neue Ereignisse dazu
    await db.events.bulkAdd(
      Array.from({ length: 500 }, (_, j) => ({
        ts: N + j,
        type: 'HintUsed',
        payload: {},
        schemaVersion: 1,
      })),
    );
    db.close();

    // „App-Start": Datenbank öffnen + Zustand laden (Zwischenstand + 500 neue)
    const s0 = performance.now();
    db = await openDatabase(name, { now: 1, backupStore: store });
    const start = await loadProjection(db, activityProjection);
    const startMs = performance.now() - s0;
    db.close();
    indexedDB.deleteDatabase(name);
    indexedDB.deleteDatabase(`${name}-bk`);
    return {
      fullMs,
      startMs,
      replayed: start.replayed,
      total: start.state.total,
      fromSnapshot: start.fromSnapshot,
    };
  });
  console.log(
    `Vollständig: ${r.fullMs.toFixed(0)} ms, Start mit Zwischenstand: ${r.startMs.toFixed(0)} ms`,
  );
  expect(r.fromSnapshot).toBe(true);
  expect(r.replayed).toBe(500);
  expect(r.total).toBe(100_500);
  expect(r.startMs).toBeLessThan(1000);
});
