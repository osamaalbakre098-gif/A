import type { Page } from '@playwright/test';

const THEMES = ['light', 'dark', 'contrast', 'system'];
const LANGS = ['de', 'en', 'ar'];

/** Stellt Erscheinungsbild und Sprache im geöffneten Einstellungsbereich ein (nach Position, unabhängig von der Sprache der Beschriftung). */
export async function setView(page: Page, lang: string, theme: string) {
  const groups = page.locator('.settings fieldset');
  await groups
    .nth(0)
    .locator('input[type=radio]')
    .nth(THEMES.indexOf(theme))
    .check({ force: true });
  await groups.nth(1).locator('input[type=radio]').nth(LANGS.indexOf(lang)).check({ force: true });
}
