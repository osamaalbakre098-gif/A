import { expect, test } from '@playwright/test';

// Läuft gegen die gebaute App (Port 4173), weil nur sie einen Service Worker hat.

test('Manifest und Icons sind erreichbar', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = (await (await request.get(href!)).json()) as {
    display: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const res = await request.get(`/${icon.src}`);
    expect(res.status(), icon.src).toBe(200);
  }
  const apple = await page.locator('link[rel=apple-touch-icon]').getAttribute('href');
  expect((await request.get(apple!)).status()).toBe(200);
});

test('Offline-Betrieb: nach dem ersten Laden läuft die App im Flugmodus weiter', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Warten, bis der Service Worker die Seite verwaltet (nach dem ersten Besuch ab dem nächsten Laden)
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Guten/);

  // Seitenwechsel und gespeicherte Daten funktionieren ohne Netz
  await page.goto('/#data');
  await expect(page.getByRole('heading', { name: 'Deine Daten', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Test starten' }).click();
  await expect(page.getByText(/In Ordnung: Speichern, Exportieren/)).toBeVisible({
    timeout: 20_000,
  });
  await context.setOffline(false);
});

const readSetting = (page: import('@playwright/test').Page, key: string) =>
  page.evaluate(
    (k) =>
      new Promise<string | null>((resolve) => {
        const open = indexedDB.open('madar');
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('settings')) return resolve(null);
          const req = db.transaction('settings').objectStore('settings').get(k);
          req.onsuccess = () =>
            resolve((req.result as { value: string } | undefined)?.value ?? null);
          req.onerror = () => resolve(null);
        };
        open.onerror = () => resolve(null);
      }),
    key,
  );

test('Einstellungen bleiben nach dem Neuladen erhalten und liegen in der Datenbank', async ({
  page,
}) => {
  await page.goto('/#settings');
  await page.getByLabel('Erscheinungsbild').selectOption('dark');
  // Zuerst warten, bis die Datenbank-Kopie geschrieben ist (für Export und Sicherung) ...
  await expect.poll(() => readSetting(page, 'theme')).toBe('dark');
  // ... dann Neuladen: die Einstellung ist weiterhin aktiv.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
