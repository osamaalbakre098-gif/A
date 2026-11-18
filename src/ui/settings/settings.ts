import { create } from 'zustand';
import { loadSettingsFromDb, saveSettingsToDb } from '../../data/settingsDb';
import i18n, { isRtl, LANGUAGES, type Language } from '../../i18n';

export type ThemeChoice = 'system' | 'light' | 'dark' | 'contrast';
export const TEXT_SCALE_MIN = 90;
export const TEXT_SCALE_MAX = 200;
const BASE_FONT_PX = 16;
const KEY = 'madar.settings.v1';

export interface Settings {
  language: Language;
  theme: ThemeChoice;
  /** Textgröße in Prozent (90–200), unabhängig vom System. */
  textScale: number;
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'de',
  theme: 'system',
  textScale: 100,
  reducedMotion: false,
};

export function clampScale(v: number): number {
  return Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Math.round(v)));
}

/** Liest gespeicherte Einstellungen defensiv (kaputte Werte → Standard). */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const o = JSON.parse(raw) as Partial<Settings>;
    return {
      language: LANGUAGES.includes(o.language as Language) ? (o.language as Language) : 'de',
      theme: ['system', 'light', 'dark', 'contrast'].includes(o.theme as string)
        ? (o.theme as ThemeChoice)
        : 'system',
      textScale: typeof o.textScale === 'number' ? clampScale(o.textScale) : 100,
      reducedMotion: o.reducedMotion === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function load(): Settings {
  try {
    return parseSettings(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Wendet Einstellungen auf <html> an: Sprache, Richtung, Theme, Textgröße. */
export function applySettings(
  s: Settings,
  root: HTMLElement = document.documentElement,
  prefersDark = false,
) {
  root.lang = s.language;
  root.dir = isRtl(s.language) ? 'rtl' : 'ltr';
  const theme = s.theme === 'system' ? (prefersDark ? 'dark' : 'light') : s.theme;
  if (theme === 'light') root.removeAttribute('data-theme');
  else root.dataset.theme = theme;
  root.style.setProperty('--fs-base', `${(BASE_FONT_PX * s.textScale) / 100}px`);
  if (s.reducedMotion) root.dataset.motion = 'reduce';
  else delete root.dataset.motion;
}

interface Store extends Settings {
  set: (patch: Partial<Settings>) => void;
}

export const useSettings = create<Store>((set, get) => ({
  ...load(),
  set: (patch) => {
    const { set: _s, ...cur } = get();
    void _s;
    const next: Settings = {
      ...cur,
      ...patch,
      textScale: clampScale(patch.textScale ?? cur.textScale),
    };
    set(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* Speicher nicht verfügbar: Einstellung gilt nur für diese Sitzung */
    }
    void saveSettingsToDb({ ...next });
    void i18n.changeLanguage(next.language);
    applySettings(
      next,
      document.documentElement,
      matchMedia('(prefers-color-scheme: dark)').matches,
    );
  },
}));

export function initSettings() {
  const s = useSettings.getState();
  // Fehlt der lokale Eintrag (z. B. vom Browser gelöscht), holen wir die Werte aus der Datenbank.
  let hadLocal = false;
  try {
    hadLocal = localStorage.getItem(KEY) !== null;
  } catch {
    /* ignorieren */
  }
  if (!hadLocal) {
    void loadSettingsFromDb().then((v) => {
      if (v) useSettings.getState().set(parseSettings(JSON.stringify(v)));
    });
  }
  void i18n.changeLanguage(s.language);
  applySettings(s, document.documentElement, matchMedia('(prefers-color-scheme: dark)').matches);
}
