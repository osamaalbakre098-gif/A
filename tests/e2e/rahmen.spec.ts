import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Phase A: App-Rahmen (docs/UI_VORGABE.md Abschnitt 4 und 10)
test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' });

const ROUTES = ['#today', '#subjects', '#progress', '#search', '#settings'];

test.describe('Rahmen 320 pt', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  for (const theme of ['light', 'dark', 'contrast']) {
    test(`axe ohne Verstöße im Rahmen (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => {
        localStorage.setItem(
          'madar.settings.v1',
          JSON.stringify({ language: 'de', theme: t, textScale: 100, reducedMotion: true }),
        );
      }, theme);
      for (const r of ROUTES) {
        await page.goto(`/${r}`);
        await expect(page.locator('#main')).toBeVisible();
        await expect(page.locator('.skeleton')).toHaveCount(0); // Inhalt ist geladen
        await page.waitForTimeout(300);
        const res = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
          .analyze();
        expect(res.violations, `${r} ${theme}`).toEqual([]);
      }
    });
  }

  test('Tippflächen der Rahmen-Bedienelemente sind mindestens 44×44 px', async ({ page }) => {
    await page.goto('/#today');
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll('.appbar a, .appbar button, .tabbar a')].map((e) => {
        const r = e.getBoundingClientRect();
        return [
          e.getAttribute('aria-label') ?? e.textContent ?? '',
          Math.round(r.width),
          Math.round(r.height),
        ] as const;
      }),
    );
    expect(sizes.length).toBeGreaterThanOrEqual(5);
    for (const [name, w, h] of sizes) {
      expect(w, name).toBeGreaterThanOrEqual(44);
      expect(h, name).toBeGreaterThanOrEqual(44);
    }
  });

  test('Genau eine h1; kleiner Titel erscheint erst beim Scrollen; Zurück führt eine Ebene hoch', async ({
    page,
  }) => {
    await page.goto('/#subjects');
    await page.getByRole('button', { name: 'Fach anlegen' }).click();
    await page.getByLabel('Name des Fachs').fill('Physik');
    await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await page.getByRole('link', { name: /Physik/ }).click();
    await expect(page.getByRole('heading', { name: 'Physik', level: 1 })).toBeVisible();
    // Unterebene: Zurück-Knopf in der Kopfzeile, Titel anfangs unsichtbar
    const title = page.locator('.appbar__title');
    await expect(title).toHaveCSS('opacity', '0');
    await page.setViewportSize({ width: 320, height: 300 }); // kurze Ansicht, damit die Seite scrollt
    await page.evaluate(() => window.scrollBy(0, 600));
    await expect(page.locator('.appbar')).toHaveClass(/appbar--scrolled/);
    await expect(title).toHaveCSS('opacity', '1');
    await expect(title).toHaveText('Physik');
    await page.getByRole('button', { name: 'Zurück' }).click();
    await expect(page).toHaveURL(/#subjects$/);
    // Hauptebene hat keinen Zurück-Knopf
    await expect(page.getByRole('button', { name: 'Zurück' })).toHaveCount(0);
  });

  test('Lernsitzung ist Vollbild: keine Navigation, keine Kopfzeile', async ({ page }) => {
    await page.goto('/#session');
    await expect(page.locator('.tabbar')).toHaveCount(0);
    await expect(page.locator('.appbar')).toHaveCount(0);
  });

  test('Offline: ruhiges Banner, Rahmen bleibt bedienbar', async ({ page, context }) => {
    await page.goto('/#today');
    await context.setOffline(true);
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Du bist offline. Alles Gelernte bleibt gespeichert.' }),
    ).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText('Du bist offline.')).toHaveCount(0);
  });
});

test.describe('Rahmen 768 pt: Seitenleiste', () => {
  test.use({ viewport: { width: 768, height: 1024 } });
  test('Navigation steht als Seitenleiste (280 px) neben dem Inhalt, nicht unten', async ({
    page,
  }) => {
    await page.goto('/#today');
    const nav = (await page.locator('.tabbar').boundingBox())!;
    expect(Math.round(nav.width)).toBe(280);
    expect(nav.y).toBeLessThan(10);
    const main = (await page.locator('#main').boundingBox())!;
    expect(main.x).toBeGreaterThanOrEqual(nav.x + nav.width - 1);
  });
});

test.describe('Rahmen RTL', () => {
  test.use({ viewport: { width: 320, height: 568 } });
  test('Arabisch: Zurück-Pfeil gespiegelt, Navigation bleibt einzeilig', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'madar.settings.v1',
        JSON.stringify({ language: 'ar', theme: 'light', textScale: 100, reducedMotion: true }),
      );
    });
    await page.goto('/#settings');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const ys = await page
      .locator('.tabbar .tabbar__link')
      .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(ys).size).toBe(1);
    const svgTransform = await page
      .locator('.appbar__btn svg')
      .first()
      .evaluate((e) => getComputedStyle(e).transform);
    expect(svgTransform).not.toBe('none');
  });
});

test('Hauptaktion auf „Heute" (leer) ist bei 320×568 ohne Scrollen sichtbar', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/#today');
  const cta = page.getByRole('link', { name: 'Material hinzufügen' });
  await expect(cta).toBeVisible();
  const box = (await cta.boundingBox())!;
  const nav = (await page.locator('.tabbar').boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(nav.y + 1);
});
