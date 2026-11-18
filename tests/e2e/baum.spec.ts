import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('Text einfügen → Könnensbaum entsteht von selbst, Liste ist bedienbar und barrierefrei', async ({
  page,
}) => {
  await page.goto('/#subjects');
  await page.getByRole('button', { name: 'Fach anlegen' }).click();
  await page.getByLabel('Name des Fachs').fill('Physik');
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await page.getByRole('link', { name: /Physik/ }).click();
  await page.getByRole('button', { name: 'Text einfügen' }).click();
  const text = `# Vektoren\n\nEin Vektor hat Betrag und Richtung. ${'Die Geschwindigkeit ist ein Vektor. '.repeat(8)}\n\n## Addition\n\nVektoren addiert man komponentenweise. ${'Kräfte addiert man ebenso. '.repeat(8)}\n`;
  await page.getByLabel(/Text/).last().fill(text);
  await page
    .getByRole('button', { name: /Speichern|Hinzufügen/ })
    .first()
    .click();
  await expect(page.getByText('Addition verstehen').first()).toBeVisible();
  await page.getByRole('link', { name: 'Könnensbaum ansehen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Könnensbaum/ })).toBeVisible();
  await page.getByRole('button', { name: /Addition verstehen/ }).click();
  await expect(page.getByText('Zustand: Neu')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Jetzt üben' })).toBeVisible();
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(r.violations).toEqual([]);
});
