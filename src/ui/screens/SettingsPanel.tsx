import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_NAMES, LANGUAGES, type Language } from '../../i18n';
import { SegmentedControl, Stack, Switch } from '../components';
import {
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  useSettings,
  type ThemeChoice,
} from '../settings/settings';
import './Settings.css';

const THEMES: ThemeChoice[] = ['light', 'dark', 'contrast', 'system'];
const THEME_KEY: Record<ThemeChoice, string> = {
  system: 'settings.themeSystem',
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  contrast: 'settings.themeContrast',
};

/** Darstellung: Erscheinungsbild, Textgröße mit Vorschau-Satz, Bewegung, Sprache. Wirkt sofort. */
export default function SettingsPanel({ hideTitle = false }: { hideTitle?: boolean }) {
  const { t } = useTranslation();
  const s = useSettings();
  const sizeId = useId();
  return (
    <Stack
      as="section"
      space="group"
      aria-labelledby={hideTitle ? undefined : 'settings-title'}
      aria-label={hideTitle ? t('settings.look') : undefined}
      className="settings"
    >
      {!hideTitle && <h2 id="settings-title">{t('settings.title')}</h2>}
      <SegmentedControl
        legend={t('settings.theme')}
        segments={THEMES.map((th) => ({ id: th, label: t(THEME_KEY[th]) }))}
        value={s.theme}
        onChange={(theme) => s.set({ theme })}
      />
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
        <p className="settings__preview" aria-hidden="true">
          {t('settings.textPreview')}
        </p>
      </div>
      <Switch
        label={t('settings.reducedMotion')}
        checked={s.reducedMotion}
        onChange={(v) => s.set({ reducedMotion: v })}
      />
      <SegmentedControl
        legend={t('settings.language')}
        segments={LANGUAGES.map((l) => ({ id: l, label: LANGUAGE_NAMES[l] }))}
        value={s.language}
        onChange={(language) => s.set({ language: language as Language })}
      />
    </Stack>
  );
}
