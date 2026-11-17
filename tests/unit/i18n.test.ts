import { describe, expect, it } from 'vitest';
import ar from '../../src/i18n/ar.json';
import de from '../../src/i18n/de.json';
import en from '../../src/i18n/en.json';
import i18n from '../../src/i18n';

function keys(o: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? keys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe('Übersetzungen', () => {
  const ref = keys(de).sort();
  it('en.json hat genau die Schlüssel von de.json', () => expect(keys(en).sort()).toEqual(ref));
  it('ar.json hat genau die Schlüssel von de.json', () => expect(keys(ar).sort()).toEqual(ref));
  it('ICU-Plural Deutsch', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('lichtung.dueToday', { count: 1 })).toBe('1 Wiederholung ist heute fällig.');
    expect(i18n.t('lichtung.dueToday', { count: 12 })).toBe('12 Wiederholungen sind heute fällig.');
    expect(i18n.t('lichtung.dueToday', { count: 0 })).toBe('Heute ist nichts fällig.');
  });
  it('ICU-Plural Arabisch hat Dual', async () => {
    await i18n.changeLanguage('ar');
    expect(i18n.t('lichtung.dueToday', { count: 2 })).toContain('مراجعتان');
    await i18n.changeLanguage('de');
  });
});
