import i18n from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';
import de from './de.json';

/** Madar gibt es nur auf Deutsch (Entscheidung vom 2026-11-19, siehe docs/ENTSCHEIDUNGEN.md). */
export const LANGUAGE = 'de';

/** Locale für Intl (Zahlen, Datum, Zeit): Deutsch, immer lateinische Ziffern (1234567890). */
export const LOCALE = 'de';

export const resources = {
  de: { translation: de },
};

void i18n
  .use(new ICU())
  // „|" in Übersetzungen markiert erlaubte Trennstellen langer Wörter (weiches Trennzeichen), siehe UI_DETAILS 3
  .use({
    type: 'postProcessor',
    name: 'softBreak',
    process: (v: string) => v.replace(/\|/g, '\u00AD'),
  })
  .use(initReactI18next)
  .init({
    resources,
    lng: LANGUAGE,
    fallbackLng: LANGUAGE,
    interpolation: { escapeValue: false },
    postProcess: ['softBreak'],
  });

export default i18n;
