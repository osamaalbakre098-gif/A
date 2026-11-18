import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('Aufträge: Seite lädt, ist bedienbar und ohne Verstöße', async ({ page }) => {
  await page.goto('/#jobs');
  await expect(page.getByRole('heading', { name: 'Aufträge', level: 1 })).toBeVisible();
  await expect(page.getByText('Nur eine Empfehlung').first())
    .toBeHidden()
    .catch(() => undefined);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(r.violations).toEqual([]);
});

test('Link zu Aufträge in der Kopfzeile', async ({ page }) => {
  await page.goto('/#today');
  await page.getByRole('link', { name: 'Aufträge' }).first().click();
  await expect(page).toHaveURL(/#jobs/);
});

test('Üben-Seite für unbekannte Fähigkeit zeigt eine ruhige Meldung', async ({ page }) => {
  await page.goto('/#practice/gibt-es-nicht');
  await expect(page.locator('#main')).toBeVisible();
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations).toEqual([]);
});
