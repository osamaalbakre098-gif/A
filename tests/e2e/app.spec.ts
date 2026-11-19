import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Textgröße 200 % bricht bei 320 px nicht (kein horizontales Scrollen)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/#settings');
  await page.getByLabel(/Textgröße/).fill('200');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});

test('Tastatur: Skip-Link und Einstellungen erreichbar, Fokus sichtbar', async ({ page }) => {
  await page.goto('/#settings');
  await page.getByRole('heading', { name: 'Einstellungen', level: 1 }).waitFor();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Zum Inhalt springen')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('Hoher Kontrast und Dunkel: axe ohne Verstöße', async ({ page }) => {
  await page.goto('/#settings');
  for (const t of ['dark', 'contrast']) {
    await page
      .getByRole('radio', { name: t === 'dark' ? 'Dunkel' : 'Hoher Kontrast', exact: true })
      .check({ force: true });
    const res = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(res.violations.map((v) => v.id)).toEqual([]);
  }
});
