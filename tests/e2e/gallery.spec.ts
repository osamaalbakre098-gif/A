import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Die Galerie gibt es nur im Dev-Server (Port 5173).
test.use({ baseURL: 'http://localhost:5173' });

for (const theme of ['light', 'dark', 'contrast']) {
  {
    test(`axe: Galerie ${theme}`, async ({ page }) => {
      await page.goto('/dev/components');
      await page.getByRole('button', { name: theme, exact: true }).click();
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

test('Galerie: Sheet öffnet, schließt per Knopf, Escape und Hintergrund; Toast wird angekündigt', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/dev/components');
  const open = page.getByRole('button', { name: 'Sheet md' });
  await open.click();
  const sheet = page.getByRole('dialog', { name: 'Warum jetzt?' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Schließen' }).click();
  await expect(sheet).toBeHidden();
  await expect(open).toBeFocused(); // Fokus kehrt zurück
  await open.click();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await open.click();
  await page.mouse.click(160, 20); // Hintergrund über dem Sheet
  await expect(sheet).toBeHidden();
  await page.getByRole('button', { name: 'Toast', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Gespeichert. Madar plant rückwärts.' }),
  ).toBeVisible();
});

test('Galerie bei 320 px und 200 % Text: nichts läuft seitlich über', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/dev/components');
  await page.locator('#g-scale').fill('200');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
