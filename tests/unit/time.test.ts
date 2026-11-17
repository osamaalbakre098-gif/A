import { describe, expect, it } from 'vitest';
import { learningDayKey, learningDaysBetween } from '../../src/core/time';

const TZ = 'Europe/Berlin';

describe('Lerntag (Beginn 04:00 Ortszeit)', () => {
  it('Lernen um 01:30 zählt zum Vortag', () => {
    // 2026-03-10 01:30 Berlin = 00:30 UTC (MET)
    expect(learningDayKey(new Date('2026-03-10T00:30:00Z'), TZ)).toBe('2026-03-09');
  });
  it('um 04:00 beginnt der neue Tag', () => {
    expect(learningDayKey(new Date('2026-03-10T03:00:00Z'), TZ)).toBe('2026-03-10');
  });
  it('um 03:59 gilt noch der Vortag', () => {
    expect(learningDayKey(new Date('2026-03-10T02:59:00Z'), TZ)).toBe('2026-03-09');
  });
  it('funktioniert über die Sommerzeit-Umstellung', () => {
    expect(
      learningDaysBetween(new Date('2026-03-28T12:00:00Z'), new Date('2026-03-30T12:00:00Z'), TZ),
    ).toBe(2);
  });
  it('Monats- und Jahreswechsel', () => {
    expect(learningDayKey(new Date('2027-01-01T01:00:00Z'), TZ)).toBe('2026-12-31');
  });
});
