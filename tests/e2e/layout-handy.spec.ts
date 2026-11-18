import { expect, test } from '@playwright/test';

// Zuerst für kleine Anzeigen gestalten: 320×568 (Displayzoom, Normalfall), 375×667, 390×844, mit großer Schrift.
const SIZES = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
];
const ROUTES = ['#today', '#subjects', '#settings', '#jobs', '#data', '#search'];
const STATUS_BAR = 47; // iPhone mit Notch/Dynamic Island

test.use({ reducedMotion: 'reduce' });

for (const size of SIZES) {
  test.describe(`${size.width}×${size.height}, Schrift 150 %`, () => {
    test.use({ viewport: size });
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          'madar.settings.v1',
          JSON.stringify({ language: 'de', theme: 'light', textScale: 150, reducedMotion: true }),
        );
      });
    });

    for (const route of ROUTES) {
      test(`${route}: Navigation einzeilig, nichts unter der Statusleiste, kein Seitwärts-Scrollen`, async ({
        page,
      }) => {
        await page.goto(`/${route}`);
        await page.addStyleTag({ content: `:root{--sat:${STATUS_BAR}px}` });
        await expect(page.locator('#main')).toBeVisible();

        // Navigation: alle vier Einträge in EINER Zeile, Beschriftung ohne Umbruch
        const links = page.locator('.tabbar .tabbar__link');
        await expect(links).toHaveCount(4);
        const boxes = await links.evaluateAll((els) =>
          els.map((e) => {
            const r = e.getBoundingClientRect();
            const label = e.lastElementChild ?? e;
            const lh = parseFloat(getComputedStyle(label).lineHeight);
            return {
              y: Math.round(r.top),
              h: r.height,
              labelH: label.getBoundingClientRect().height,
              lh,
            };
          }),
        );
        expect(new Set(boxes.map((b) => b.y)).size, JSON.stringify(boxes)).toBe(1);
        for (const b of boxes) expect(b.labelH).toBeLessThan(b.lh * 1.6); // eine Zeile

        // Obere Kante: nichts Bedienbares liegt unter der Statusleiste (bei Scroll 0)
        const tops = await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              '#main a, #main button, #main input, #main select, #main textarea',
            ),
          ]
            .filter((e) => (e as HTMLElement).offsetParent !== null)
            .map((e) => e.getBoundingClientRect())
            .filter((r) => r.height > 0 && r.top < 200 && window.scrollY === 0)
            .map((r) => Math.round(r.top)),
        );
        for (const t of tops) expect(t).toBeGreaterThanOrEqual(STATUS_BAR);
        const settingsBtn = page.locator('.appbar a[href="#settings"]');
        const bb = (await settingsBtn.boundingBox())!;
        expect(bb.y).toBeGreaterThanOrEqual(STATUS_BAR);
        expect(bb.width).toBeGreaterThanOrEqual(44);
        expect(bb.height).toBeGreaterThanOrEqual(44);

        // Kein seitliches Scrollen, Überschriften ohne Silbentrennung
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        const hy = await page
          .locator('h1')
          .first()
          .evaluate((e) => getComputedStyle(e).hyphens);
        expect(hy).toBe('none');
      });
    }
  });
}

test.describe('Heute, leer, 320 pt', () => {
  test.use({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
  test('Hauptaktion ist ein gefüllter, voller Breite, mindestens 48 px hoher Knopf; Links haben Token-Farben', async ({
    page,
  }) => {
    await page.goto('/#today');
    const cta = page.getByRole('link', { name: 'Material hinzufügen' });
    await expect(cta).toBeVisible();
    const box = (await cta.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(48);
    const main = (await page.locator('#main').boundingBox())!;
    expect(box.width).toBeGreaterThan(main.width * 0.7);
    const bg = await cta.evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    // besuchter Link behält die Token-Farbe (nicht das Browser-Violett)
    const color = await page
      .locator('.tabbar__link')
      .first()
      .evaluate((e) => getComputedStyle(e).color);
    expect(color).not.toBe('rgb(85, 26, 139)');
  });
});
