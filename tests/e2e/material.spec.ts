import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bigPdf, physicsPdf } from '../fixtures/makePdf';

// Läuft gegen die gebaute App (Port 4173): so wird auch der Worker-Pfad von pdf.js im Build geprüft.

// Playwright setzt Dateien mit Nicht-ASCII-Zeichen im Pfad still nicht: ASCII-Temp-Pfad verwenden.
function tempFile(name: string, bytes: Uint8Array | string): string {
  const p = join(mkdtempSync(join(tmpdir(), 'madar-e2e-')), name);
  writeFileSync(p, bytes);
  return p;
}

async function createSubject(page: Page, name: string) {
  await page.goto('/#subjects');
  await page.getByRole('button', { name: 'Fach anlegen' }).click();
  await page.getByLabel('Name des Fachs').fill(name);
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await page.getByRole('link', { name: new RegExp(name) }).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
}

const fileInput = (page: Page) => page.locator('input[type=file]:not([capture])');

async function idbAll<T = Record<string, unknown>>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(
    (s) =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open('madar');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction(s).objectStore(s).getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        };
      }),
    store,
  ) as Promise<T[]>;
}

async function openFirstDoc(page: Page) {
  await page.locator('a.listrow[href^="#doc/"]').first().click();
  await expect(page.locator('.pdfpage').first()).toBeVisible();
}

const renderedCanvases = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLCanvasElement>('.pdfpage canvas')].filter(
        (c) => c.width > 0,
      ).length,
  );

test('PDF importieren, Struktur erkennen, Original unverändert, doppelt verhindert', async ({
  page,
}) => {
  const pdf = physicsPdf();
  const path = tempFile('skript.pdf', pdf);
  await createSubject(page, 'Physik');
  await fileInput(page).setInputFiles(path);
  await expect(page.getByText(/„skript.pdf" ist bereit/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('a.listrow[href^="#doc/"]')).toHaveCount(1);

  const [doc] = await idbAll<{
    sha256: string;
    outline: { level: number; title: string }[];
    pageCount: number;
    ocrStatus: string;
  }>(page, 'documents');
  expect(doc!.pageCount).toBe(3);
  expect(doc!.ocrStatus).toBe('none');
  expect(doc!.outline.map((o) => [o.level, o.title])).toEqual([
    [1, 'Physik Skript'],
    [2, 'Vektoren'],
    [2, 'Addition von Vektoren'],
    [2, 'Kräfte'],
  ]);

  const chunks = await idbAll<{
    text: string;
    page: number;
    bbox: number[];
    headingPath: string[];
  }>(page, 'chunks');
  expect(chunks.length).toBeGreaterThanOrEqual(3);
  expect(chunks.every((c) => c.bbox.length === 4 && c.bbox.every((n) => n >= 0 && n <= 1))).toBe(
    true,
  );
  expect(chunks[0]!.headingPath).toEqual(['Physik Skript', 'Vektoren']); // IDs sind fortlaufend: Reihenfolge bleibt erhalten
  expect(chunks.map((c) => c.page)).toEqual([...chunks.map((c) => c.page)].sort((a, b) => a - b));
  expect(chunks.some((c) => c.text.includes('Größe eines Vektors'))).toBe(true);

  // Original unverändert: Prüfsumme der gespeicherten Datei = Prüfsumme der Quelldatei
  const expected = createHash('sha256').update(pdf).digest('hex');
  expect(doc!.sha256).toBe(expected);
  const stored = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const open = indexedDB.open('madar');
        open.onsuccess = () => {
          const req = open.result.transaction('blobs').objectStore('blobs').getAll();
          req.onsuccess = async () => {
            const out: string[] = [];
            for (const b of req.result as { data: ArrayBuffer }[]) {
              const h = await crypto.subtle.digest('SHA-256', b.data);
              out.push([...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join(''));
            }
            resolve(out);
          };
        };
      }),
  );
  expect(stored).toEqual([expected]);

  // dieselbe Datei im selben Fach: nur einmal
  await fileInput(page).setInputFiles(path);
  await expect(page.getByText(/„skript.pdf" ist in diesem Fach schon vorhanden/)).toBeVisible();
  await expect(page.locator('a.listrow[href^="#doc/"]')).toHaveCount(1);
});

test('PDF lesen: Seiten, Zoom bis 400 %, Suche mit Markierung, Umfließen, Markieren', async ({
  page,
}) => {
  await createSubject(page, 'Physik');
  await fileInput(page).setInputFiles(tempFile('skript.pdf', physicsPdf()));
  await expect(page.getByText(/ist bereit/)).toBeVisible({ timeout: 30_000 });
  await openFirstDoc(page);

  // Seite wird scharf gezeichnet, Text ist auswählbar
  await expect.poll(() => renderedCanvases(page)).toBeGreaterThan(0);
  await expect(page.locator('.pdfpage .textLayer span').first()).toBeAttached();
  await expect(page.getByText('Seite 1 von 3')).toBeVisible();

  // Zoom bis 400 %: scrollt im Lesebereich, die Seite selbst bleibt ohne waagerechtes Scrollen
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Vergrößern' }).click();
  await expect(page.getByText('400 %')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vergrößern' })).toBeDisabled();
  const dims = await page.evaluate(() => {
    const s = document.querySelector<HTMLElement>('.reader__scroll')!;
    return {
      inner: s.scrollWidth > s.clientWidth,
      doc: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(dims).toEqual({ inner: true, doc: false });
  await expect.poll(() => renderedCanvases(page)).toBeGreaterThan(0); // nach dem Zoomen neu gezeichnet
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Verkleinern' }).click();

  // Suche: Treffer werden auf der Seite markiert, mit vorherigem/nächstem Treffer
  await page.getByRole('button', { name: 'Im Dokument suchen' }).click();
  await page.getByRole('searchbox', { name: 'Suchbegriff' }).fill('geschwindigkeit');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^1 von 2$/)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.textLayer mark.is-current').first()).toBeVisible();
  await page.getByRole('button', { name: 'Nächster Treffer' }).click();
  await expect(page.getByText(/^2 von 2$/)).toBeVisible();
  await expect.poll(() => page.locator('.textLayer mark.is-current').count()).toBeGreaterThan(0);
  // Umlaute: „groesse" findet „Größe"
  await page.getByRole('searchbox', { name: 'Suchbegriff' }).fill('groesse');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^1 von 1$/)).toBeVisible({ timeout: 15_000 });
  // Beim Schließen verschwinden die Markierungen
  await page.getByRole('button', { name: 'Suche schließen' }).click();
  await expect(page.locator('.textLayer mark')).toHaveCount(0);

  // Text auswählen → Markieren → wird getrennt in `annotations` gespeichert
  await page.evaluate(() => {
    const span = [...document.querySelectorAll('.pdfpage .textLayer span')].find((s) =>
      s.textContent?.includes('Vektor'),
    )!;
    const range = document.createRange();
    range.selectNodeContents(span);
    const sel = getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await page.getByRole('button', { name: 'Markieren' }).click();
  await expect(page.locator('.annot').first()).toBeAttached();
  const annotations = await idbAll<{ page: number; rects: number[][]; documentId: string }>(
    page,
    'annotations',
  );
  expect(annotations).toHaveLength(1);
  expect(annotations[0]!.rects[0]!.every((n) => n >= 0 && n <= 1)).toBe(true);

  // Umfließen: Text als normaler Text in großer Schrift
  await page.getByRole('radio', { name: 'Umfließen' }).check({ force: true });
  await expect(page.locator('.reflow')).toContainText('Die Größe eines Vektors heißt Betrag.');
  await expect(page.locator('.reflow')).toContainText('Physik Skript › Vektoren');
});

test('Suche über alles: Treffer nennt die Quelle und springt auf die Seite mit Markierung', async ({
  page,
}) => {
  await createSubject(page, 'Physik');
  await fileInput(page).setInputFiles(tempFile('skript.pdf', physicsPdf()));
  await expect(page.getByText(/ist bereit/)).toBeVisible({ timeout: 30_000 });
  await page.goto('/#search');
  await page.getByLabel('Suche in allem').fill('Newton');
  const hit = page.locator('.hit').first();
  await expect(hit).toContainText('Newton');
  await expect(hit).toContainText('Physik › skript.pdf › Seite 3');
  await hit.click();
  await expect(page).toHaveURL(/#doc\/.+page=3.*q=Newton|#doc\/.+q=Newton.*page=3/);
  await expect
    .poll(() => page.locator('.textLayer mark').count(), { timeout: 15_000 })
    .toBeGreaterThan(0);
  // Seite 3 ist im Bild
  const inView = await page.evaluate(() => {
    const s = document.querySelector('.reader__scroll')!.getBoundingClientRect();
    const p = document.querySelector('[data-page="2"]')!.getBoundingClientRect();
    return p.bottom > s.top && p.top < s.bottom;
  });
  expect(inView).toBe(true);
  // Fach und Datei lassen sich ebenfalls finden
  await page.goto('/#search');
  await page.getByLabel('Suche in allem').fill('skript');
  await expect(page.locator('.hit', { hasText: 'Datei' }).first()).toBeVisible();
});

test('Text einfügen und Foto: gespeichert, lesbar, ehrlicher Hinweis zur Texterkennung', async ({
  page,
}) => {
  await createSubject(page, 'Bio');
  await page.getByRole('button', { name: 'Material hinzufügen' }).click();
  await page.getByRole('button', { name: 'Text einfügen' }).click();
  await page.getByLabel('Titel').fill('Zelle');
  await page
    .getByLabel('Text', { exact: true })
    .fill(
      '# Zelle\n\nDie Zelle ist die kleinste Einheit des Lebens.\n\n## Zellkern\n\nDer Zellkern enthält die Erbinformation.',
    );
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText(/„Zelle" ist bereit: 2 Abschnitte/)).toBeVisible();
  await page.locator('a.listrow[href^="#doc/"]', { hasText: 'Zelle' }).click();
  await expect(page.locator('.reflow')).toContainText('Der Zellkern enthält die Erbinformation.');

  await page.goBack();
  // 1×1-PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  await fileInput(page).setInputFiles(tempFile('heft.png', png));
  await expect(page.getByText(/Foto „heft.png" ist gespeichert\. Die Texterkennung/)).toBeVisible();
  await expect(page.locator('.chip2', { hasText: 'Texterkennung folgt' })).toBeVisible();
  await page.locator('a.listrow[href^="#doc/"]', { hasText: 'heft.png' }).click();
  await expect(page.locator('img.reader__image')).toBeVisible();
  await expect(page.getByText('Foto: Die Texterkennung folgt später.')).toBeVisible();
});

test('defekte Datei und unbekanntes Format: verständliche Meldung, nichts gespeichert', async ({
  page,
}) => {
  await createSubject(page, 'Test');
  await fileInput(page).setInputFiles(tempFile('kaputt.pdf', 'das ist kein pdf'));
  await expect(page.getByRole('alert')).toContainText(
    '„kaputt.pdf" lässt sich nicht lesen. Es wurde nichts gespeichert.',
  );
  await fileInput(page).setInputFiles(tempFile('programm.exe', 'MZ'));
  await expect(page.getByRole('alert').nth(1)).toContainText('programm.exe');
  expect(await idbAll(page, 'documents')).toHaveLength(0);
  expect(await idbAll(page, 'blobs')).toHaveLength(0);
});

test('300 Seiten: öffnet zügig, rendert nur sichtbare Seiten, springt direkt zur Seite', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await createSubject(page, 'Buch');
  const t0 = Date.now();
  await fileInput(page).setInputFiles(tempFile('buch.pdf', bigPdf(300)));
  await expect(page.getByText(/„buch.pdf" ist bereit/)).toBeVisible({ timeout: 120_000 });
  console.log(`Import 300 Seiten: ${Date.now() - t0} ms`);
  const [doc] = await idbAll<{ pageCount: number; outline: unknown[] }>(page, 'documents');
  expect(doc!.pageCount).toBe(300);
  expect(doc!.outline).toHaveLength(30); // je 10 Seiten eine Überschrift

  const t1 = Date.now();
  await page.locator('a.listrow[href^="#doc/"]').first().click();
  await expect.poll(() => renderedCanvases(page), { timeout: 15_000 }).toBeGreaterThan(0);
  const firstMs = Date.now() - t1;
  console.log(`Erste Seite sichtbar nach ${firstMs} ms`);
  expect(firstMs).toBeLessThan(5000);
  await expect(page.locator('.pdfpage')).toHaveCount(300);
  await page.waitForTimeout(500);
  expect(await renderedCanvases(page)).toBeLessThan(15); // nur sichtbare Seiten (plus Rand)

  // ans Ende scrollen: letzte Seite wird gezeichnet, die erste wieder freigegeben
  await page.evaluate(() => {
    const s = document.querySelector('.reader__scroll')!;
    s.scrollTop = s.scrollHeight;
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.querySelector<HTMLCanvasElement>('[data-page="299"] canvas')!.width,
        ),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector<HTMLCanvasElement>('[data-page="0"] canvas')!.width,
      ),
    )
    .toBe(0);
  expect(await renderedCanvases(page)).toBeLessThan(15);

  // direkt zu Seite 250
  const id = new URL(page.url()).hash.match(/#doc\/([^?]+)/)![1]!;
  await page.goto(`/#doc/${id}?page=250`);
  await page.reload();
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const s = document.querySelector('.reader__scroll')?.getBoundingClientRect();
          const p = document.querySelector('[data-page="249"]')?.getBoundingClientRect();
          return !!s && !!p && p.bottom > s.top && p.top < s.bottom;
        }),
      { timeout: 15_000 },
    )
    .toBe(true);
  // Suche im großen Dokument: eindeutiges Wort von Seite 123
  await page.getByRole('button', { name: 'Im Dokument suchen' }).click();
  await page.getByRole('searchbox', { name: 'Suchbegriff' }).fill('seite123x');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^1 von 1$/)).toBeVisible({ timeout: 60_000 });
});

for (const theme of ['light', 'dark', 'contrast'] as const) {
  test(`axe: Fächer, Material, Leser, Suche (${theme})`, async ({ page }) => {
    await page.addInitScript(
      ([t]) =>
        localStorage.setItem(
          'madar.settings.v1',
          JSON.stringify({ theme: t, textScale: 100, reducedMotion: true }),
        ),
      [theme],
    );
    const scan = async (label: string) => {
      const res = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();
      expect(
        res.violations.map((v) => `${label} ${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`),
      ).toEqual([]);
    };
    await page.goto('/#subjects');
    await page
      .getByRole('button')
      .filter({ hasText: /Fach anlegen/ })
      .first()
      .click();
    await page.locator('dialog input').fill('Physik');
    await page.locator('dialog form').evaluate((f) => (f as HTMLFormElement).requestSubmit());
    await page.locator('a.listrow[href^="#subject/"]').first().click();
    await fileInput(page).setInputFiles(tempFile('skript.pdf', physicsPdf()));
    await expect(page.locator('a.listrow[href^="#doc/"]')).toHaveCount(1, { timeout: 30_000 });
    await scan('Fach');
    await page.locator('a.listrow[href^="#doc/"]').first().click();
    await expect.poll(() => renderedCanvases(page)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Im Dokument suchen' }).click();
    await scan('Leser');
    await page.getByRole('radio', { name: 'Umfließen' }).check({ force: true });
    await scan('Umfließen');
    await page.goto('/#search');
    await page.getByRole('searchbox').fill('Vektor');
    await expect(page.locator('.hit').first()).toBeVisible();
    await scan('Suche');
  });
}

test('Fächer, Material und Leser bei 320 px und 200 % Text ohne waagerechtes Scrollen', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'madar.settings.v1',
      JSON.stringify({ theme: 'light', textScale: 200, reducedMotion: false }),
    ),
  );
  await page.setViewportSize({ width: 320, height: 640 });
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  await createSubject(page, 'Physik');
  expect(await noOverflow()).toBe(true);
  await fileInput(page).setInputFiles(tempFile('skript.pdf', physicsPdf()));
  await expect(page.locator('a.listrow[href^="#doc/"]')).toHaveCount(1, { timeout: 30_000 });
  expect(await noOverflow()).toBe(true);
  await page.locator('a.listrow[href^="#doc/"]').first().click();
  await expect.poll(() => renderedCanvases(page)).toBeGreaterThan(0);
  expect(await noOverflow()).toBe(true);
  await page.goto('/#search');
  expect(await noOverflow()).toBe(true);
});
