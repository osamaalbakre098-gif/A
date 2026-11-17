import { expect, test } from '@playwright/test';

test('App startet mit Heute-Seite und Navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Guten (Morgen|Tag|Abend)/);
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  await page.getByRole('link', { name: 'Fortschritt' }).click();
  await expect(page.getByRole('heading', { name: 'Fortschritt', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Einstellungen' }).click();
  await expect(page.getByRole('heading', { name: 'Einstellungen', level: 1 })).toBeVisible();
});
