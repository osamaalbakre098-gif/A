import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test.use({ baseURL: 'http://localhost:5173' });

async function open(page: Page, opts: { ios?: boolean; theme?: string; lang?: string } = {}) {
  await page.goto('/dev/daten');
  await page.getByRole('heading', { name: /Deine Daten|Your data|بياناتك/, level: 1 }).waitFor();
  if (opts.ios) await page.getByLabel(/iPhone im Safari-Tab/).check();
  if (opts.theme || opts.lang) {
    await page.getByText('Ansicht einstellen').click();
    const sel = page.locator('.settings select');
    if (opts.lang) await sel.nth(0).selectOption(opts.lang);
    if (opts.theme) await sel.nth(1).selectOption(opts.theme);
  }
}

// Playwright setzt Dateien mit Nicht-ASCII-Zeichen im Pfad (z. B. „ä" im Testnamen) still nicht: ASCII-Pfad verwenden.
const tempFile = (name: string) => join(mkdtempSync(join(tmpdir(), 'madar-e2e-')), name);

const seed = (page: Page) =>
  page.evaluate(async () => {
    const { getDb } = await import('/src/data/instance.ts');
    const db = await getDb();
    await db.subjects.put({
      id: 'e2e',
      name: 'E2E-Fach',
      colorKey: 'sage',
      createdAt: 1,
      archived: false,
    });
    await db.events.add({
      ts: 1,
      type: 'SessionStarted',
      payload: { sessionId: 'x' },
      schemaVersion: 1,
    });
  });
const subjectNames = (page: Page) =>
  page.evaluate(async () => {
    const { getDb } = await import('/src/data/instance.ts');
    return (await (await getDb()).subjects.toArray()).map((s) => s.name);
  });

for (const [theme, lang] of [
  ['light', 'de'],
  ['dark', 'de'],
  ['contrast', 'de'],
  ['light', 'ar'],
] as const) {
  test(`axe Deine Daten (mit iPhone-Hinweis): ${theme}/${lang}`, async ({ page }) => {
    await open(page, { ios: true, theme, lang });
    const res = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(res.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 90)}`)).toEqual([]);
  });
}

test('Speicher-Selbsttest besteht im echten Browser', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Test starten' }).click();
  await expect(page.getByText(/In Ordnung: Speichern, Exportieren/)).toBeVisible({
    timeout: 20_000,
  });
});

test('Export lädt eine gültige ZIP herunter, Import stellt wieder her und sichert vorher', async ({
  page,
}) => {
  await open(page);
  await seed(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Alles exportieren/ }).click(),
  ]);
  const path = tempFile('export.zip');
  await download.saveAs(path);
  expect(download.suggestedFilename()).toMatch(/^madar-export-\d{4}-\d{2}-\d{2}\.zip$/);
  const files = unzipSync(new Uint8Array(readFileSync(path)));
  expect(Object.keys(files)).toEqual(
    expect.arrayContaining(['manifest.json', 'data/subjects.json', 'data/events.json']),
  );
  await expect(page.getByText(/Export fertig/)).toBeVisible();

  // „Unfall": Daten ändern, dann aus dem Export wiederherstellen
  await page.evaluate(async () => {
    const { getDb } = await import('/src/data/instance.ts');
    const db = await getDb();
    await db.subjects.clear();
    await db.subjects.add({
      id: 'neu',
      name: 'Anderes Fach',
      colorKey: 'brick',
      createdAt: 2,
      archived: false,
    });
  });
  expect(await subjectNames(page)).toEqual(['Anderes Fach']);
  await page.locator('input[type=file]').setInputFiles(path);
  await page.getByRole('dialog').getByRole('button', { name: 'Ersetzen' }).click();
  await expect(page.getByText(/Eingespielt:/)).toBeVisible();
  expect(await subjectNames(page)).toEqual(['E2E-Fach']);
  // der Stand vor dem Einspielen liegt als Sicherung vor
  await expect(page.getByText(/vor Einspielen/)).toBeVisible();
});

test('defekte Datei: verständliche Fehlermeldung, nichts verändert', async ({ page }) => {
  await open(page);
  await seed(page);
  const bad = tempFile('kaputt.zip');
  writeFileSync(bad, 'das ist kein zip');
  await page.locator('input[type=file]').setInputFiles(bad);
  await page.getByRole('dialog').getByRole('button', { name: 'Ersetzen' }).click();
  await expect(page.getByRole('alert')).toContainText('beschädigt');
  await expect(page.getByRole('alert')).toContainText('nichts verändert');
  expect(await subjectNames(page)).toEqual(['E2E-Fach']);
});

test('Deine Daten bei 320 px und 200 % Text ohne waagerechtes Scrollen (mit iPhone-Hinweis)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await open(page, { ios: true });
  await page.getByText('Ansicht einstellen').click();
  await page.locator('.settings input[type=range]').fill('200');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('Screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 900 });
  await open(page, { ios: true });
  await page.screenshot({ path: 'test-results/daten-ios.png', fullPage: true });
});
