import { describe, expect, it } from 'vitest';
import { middleEllipsis, softBreak } from './text';

describe('softBreak', () => {
  it('setzt weiche Trennstriche nur an markierten Stellen', () => {
    expect(softBreak('Vektor|addition')).toBe('Vektor­addition');
    expect(softBreak('Vektoraddition')).toBe('Vektoraddition');
  });
  it('erlaubt Umbruch nach Bindestrich, Schrägstrich, Unterstrich und Punkt', () => {
    expect(softBreak('Physik/Skript_2024.pdf')).toBe('Physik/​Skript_​2024.​pdf');
  });
});

describe('middleEllipsis', () => {
  it('kurze Namen bleiben', () => expect(middleEllipsis('skript.pdf')).toBe('skript.pdf'));
  it('lange Namen behalten die Endung', () => {
    const r = middleEllipsis('Ein_sehr_langer_Dateiname_aus_dem_Seminar_Mechanik.pdf', 24);
    expect(r.endsWith('.pdf')).toBe(true);
    expect(r).toContain('…');
    expect(r.length).toBe(24);
  });
});
