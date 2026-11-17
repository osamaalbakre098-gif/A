import { describe, expect, it } from 'vitest';
import {
  applySettings,
  clampScale,
  DEFAULT_SETTINGS,
  parseSettings,
} from '../../src/ui/settings/settings';

describe('Einstellungen', () => {
  it('Textgröße wird auf 90–200 % begrenzt', () => {
    expect(clampScale(10)).toBe(90);
    expect(clampScale(999)).toBe(200);
    expect(clampScale(130)).toBe(130);
  });
  it('kaputte gespeicherte Werte fallen auf Standard zurück', () => {
    expect(parseSettings('{kaputt')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"language":"xx","theme":"neon","textScale":"groß"}')).toEqual(
      DEFAULT_SETTINGS,
    );
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
  it('Arabisch setzt dir=rtl und lang=ar', () => {
    const root = document.createElement('html');
    applySettings({ ...DEFAULT_SETTINGS, language: 'ar' }, root);
    expect(root.dir).toBe('rtl');
    expect(root.lang).toBe('ar');
  });
  it('Textgröße 200 % ergibt 34 px Grundgröße, Hoher Kontrast setzt Theme', () => {
    const root = document.createElement('html');
    applySettings({ ...DEFAULT_SETTINGS, textScale: 200, theme: 'contrast' }, root);
    expect(root.style.getPropertyValue('--fs-base')).toBe('34px');
    expect(root.dataset.theme).toBe('contrast');
  });
});
