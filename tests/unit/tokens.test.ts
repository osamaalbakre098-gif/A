import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../src/core/contrast';
import { darkTokens, lightTokens } from '../../src/ui/tokens/tokens';

const css = ['light', 'dark', 'contrast']
  .map((t) => readFileSync(`src/styles/themes/${t}.css`, 'utf8'))
  .join('\n');

describe('Tokens', () => {
  it('Hell- und Dunkelwerte stehen in src/styles/themes', () => {
    for (const v of [...Object.values(lightTokens), ...Object.values(darkTokens)]) {
      expect(css.toLowerCase()).toContain(v);
    }
  });
  it('Kontrastberechnung: Schwarz auf Weiß = 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
});
