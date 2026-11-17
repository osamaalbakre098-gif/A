import { expect, test } from '@playwright/test';

test('leere App startet', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Madar', level: 1 })).toBeVisible();
});
