import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Die Galerie gibt es nur im Dev-Server (Port 5173).
test.use({ baseURL: 'http://localhost:5173' });

for (const theme of ['light', 'dark', 'contrast']) {
  for (const dir of ['ltr', 'rtl']) {
    test(`axe: Galerie ${theme}/${dir}`, async ({ page }) => {
      await page.goto('/dev/components');
      await page.getByRole('button', { name: theme, exact: true }).click();
      if (dir === 'rtl') await page.getByRole('button', { name: 'ltr', exact: true }).click();
      const res = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();
      expect(res.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
    });
  }
}

test('kein horizontales Scrollen bei 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/dev/components');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});
