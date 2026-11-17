import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_NAMES, LANGUAGES, type Language } from '../../i18n';
import { Stack, Switch } from '../components';
import {
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  useSettings,
  type ThemeChoice,
} from '../settings/settings';

const THEMES: ThemeChoice[] = ['system', 'light', 'dark', 'contrast'];
const THEME_KEY: Record<ThemeChoice, string> = {
  system: 'settings.themeSystem',
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  contrast: 'settings.themeContrast',
};

export default function SettingsPanel({ hideTitle = false }: { hideTitle?: boolean }) {
  const { t } = useTranslation();
  const s = useSettings();
  const langId = useId();
  const themeId = useId();
  const sizeId = useId();
  return (
    <Stack
      as="section"
      space="group"
      aria-labelledby={hideTitle ? undefined : 'settings-title'}
      aria-label={hideTitle ? t('settings.title') : undefined}
      className="settings"
    >
      {!hideTitle && <h2 id="settings-title">{t('settings.title')}</h2>}
      <div className="field">
        <label className="field__label" htmlFor={langId}>
          {t('settings.language')}
        </label>
        <select
          id={langId}
          className="input"
          value={s.language}
          onChange={(e) => s.set({ language: e.target.value as Language })}
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l} lang={l}>
              {LANGUAGE_NAMES[l]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={themeId}>
          {t('settings.theme')}
        </label>
        <select
          id={themeId}
          className="input"
          value={s.theme}
          onChange={(e) => s.set({ theme: e.target.value as ThemeChoice })}
        >
          {THEMES.map((th) => (
            <option key={th} value={th}>
              {t(THEME_KEY[th])}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={sizeId}>
          {t('settings.textSize')}:{' '}
          <bdi className="tabular">{t('settings.textSizeValue', { percent: s.textScale })}</bdi>
        </label>
        <input
          id={sizeId}
          type="range"
          min={TEXT_SCALE_MIN}
          max={TEXT_SCALE_MAX}
          step={10}
          value={s.textScale}
          onChange={(e) => s.set({ textScale: Number(e.target.value) })}
        />
      </div>
      <Switch
        label={t('settings.reducedMotion')}
        checked={s.reducedMotion}
        onChange={(v) => s.set({ reducedMotion: v })}
      />
    </Stack>
  );
}
