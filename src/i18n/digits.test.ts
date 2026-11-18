import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { intlLocale } from './index';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory()
      ? files(p)
      : /\.(ts|tsx)$/.test(n) && !/\.test\./.test(n)
        ? [p]
        : [];
  });
}

describe('Ziffern: immer lateinisch (1234567890), auch auf Arabisch', () => {
  it('intlLocale erzwingt lateinische Ziffern für Arabisch', () => {
    expect(intlLocale('ar')).toBe('ar-u-nu-latn');
    expect(new Intl.NumberFormat(intlLocale('ar')).format(1234567890)).toBe('1,234,567,890');
    expect(
      new Intl.DateTimeFormat(intlLocale('ar'), { dateStyle: 'short' }).format(
        new Date(2026, 2, 5),
      ),
    ).not.toMatch(/[٠-٩]/);
  });
  it('kein Intl.NumberFormat/DateTimeFormat in der Oberfläche mit der rohen App-Sprache', () => {
    const bad = files('src/ui').filter((f) =>
      /Intl\.(DateTimeFormat|NumberFormat)\(\s*i18n\.language/.test(readFileSync(f, 'utf8')),
    );
    expect(bad).toEqual([]);
  });
  it('keine arabisch-indischen Ziffern in den Übersetzungen', () => {
    for (const l of ['de', 'en', 'ar'])
      expect(readFileSync(`src/i18n/${l}.json`, 'utf8')).not.toMatch(/[٠-٩۰-۹]/);
  });
});
