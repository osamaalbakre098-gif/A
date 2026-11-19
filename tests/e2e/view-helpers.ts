import type { Page } from '@playwright/test';

const THEMES = ['light', 'dark', 'contrast', 'system'];

/** Stellt das Erscheinungsbild im geöffneten Einstellungsbereich ein (nach Position der Segmente). */
export async function setView(page: Page, theme: string) {
  const group = page.locator('.settings fieldset').first();
  await group.locator('input[type=radio]').nth(THEMES.indexOf(theme)).check({ force: true });
}
