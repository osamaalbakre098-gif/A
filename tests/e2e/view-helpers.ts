import type { Page } from '@playwright/test';

const THEME_LABEL: Record<string, string> = {
  light: 'Hell',
  dark: 'Dunkel',
  contrast: 'Hoher Kontrast',
  system: 'System',
};
const LANG_LABEL: Record<string, string> = { de: 'Deutsch', en: 'English', ar: 'العربية' };

/** Stellt Erscheinungsbild und Sprache im geöffneten Einstellungsbereich ein (erst Erscheinungsbild: Beschriftung ist deutsch). */
export async function setView(page: Page, lang: string, theme: string) {
  const root = page.locator('.settings');
  await root.getByText(THEME_LABEL[theme]!, { exact: true }).click();
  await root.getByText(LANG_LABEL[lang]!, { exact: true }).click();
}
