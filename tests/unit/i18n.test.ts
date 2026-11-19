import { describe, expect, it } from 'vitest';
import de from '../../src/i18n/de.json';
import i18n from '../../src/i18n';

function keys(o: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? keys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe('Übersetzungen (nur Deutsch)', () => {
  it('Madar kennt nur die Sprache Deutsch', () => {
    expect(Object.keys(i18n.options.resources ?? {})).toEqual(['de']);
    expect(i18n.language).toBe('de');
  });
  it('de.json hat keine doppelten oder leeren Schlüssel', () => {
    const k = keys(de);
    expect(new Set(k).size).toBe(k.length);
    for (const key of k) expect(i18n.t(key), key).not.toBe('');
  });
  it('ICU-Plural Deutsch', () => {
    expect(i18n.t('lichtung.dueToday', { count: 1 })).toBe('1 Wiederholung ist heute fällig.');
    expect(i18n.t('lichtung.dueToday', { count: 12 })).toBe('12 Wiederholungen sind heute fällig.');
    expect(i18n.t('lichtung.dueToday', { count: 0 })).toBe('Heute ist nichts fällig.');
  });
});
