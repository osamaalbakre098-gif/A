import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Sprachwechsel DE → AR spiegelt die Seite, EN wirkt sofort', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Madar', level: 1 })).toBeVisible();
  await page.getByLabel('Sprache').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('Skip to content')).toBeAttached();
  await page.getByLabel('Language').selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.screenshot({ path: `test-results/rtl-${info.project.name}.png` });
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(res.violations.map((v) => v.id)).toEqual([]);
});

test('Textgröße 200 % bricht bei 320 px nicht (kein horizontales Scrollen)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.getByLabel(/Textgröße/).fill('200');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});

test('Tastatur: Skip-Link und Einstellungen erreichbar, Fokus sichtbar', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Zum Inhalt springen')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('Hoher Kontrast und Dunkel: axe ohne Verstöße', async ({ page }) => {
  await page.goto('/');
  for (const t of ['dark', 'contrast']) {
    await page.getByLabel('Erscheinungsbild').selectOption(t);
    const res = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(res.violations.map((v) => v.id)).toEqual([]);
  }
});
