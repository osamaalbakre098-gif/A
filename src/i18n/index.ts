import i18n from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import de from './de.json';
import en from './en.json';

export const LANGUAGES = ['de', 'en', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_NAMES: Record<Language, string> = {
  de: 'Deutsch',
  en: 'English',
  ar: 'العربية',
};
export const isRtl = (l: Language) => l === 'ar';

export const resources = {
  de: { translation: de },
  en: { translation: en },
  ar: { translation: ar },
};

void i18n
  .use(new ICU())
  .use(initReactI18next)
  .init({
    resources,
    lng: 'de',
    fallbackLng: 'de',
    interpolation: { escapeValue: false },
  });

export default i18n;
