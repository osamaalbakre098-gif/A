import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LOCALE } from './index';

describe('Ziffern: immer lateinisch (1234567890)', () => {
  it('Zahlen und Datum laufen über das deutsche Locale', () => {
    expect(LOCALE).toBe('de');
    expect(new Intl.NumberFormat(LOCALE).format(1234567890)).toBe('1.234.567.890');
    expect(
      new Intl.DateTimeFormat(LOCALE, { dateStyle: 'short' }).format(new Date(2026, 2, 5)),
    ).toMatch(/^[0-9.]+$/);
  });
  it('keine arabisch-indischen Ziffern in den Übersetzungen', () => {
    expect(readFileSync('src/i18n/de.json', 'utf8')).not.toMatch(/[٠-٩۰-۹]/);
  });
});
