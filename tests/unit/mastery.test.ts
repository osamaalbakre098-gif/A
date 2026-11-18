import { describe, expect, it } from 'vitest';
import { documentProgress, skillState, type Evidence } from '../../src/core/model/mastery';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 5, 12);
const ev = (o: Partial<Evidence> & { day?: number }): Evidence => ({
  itemId: 'i1',
  subtype: 'kurz',
  ts: T0 + (o.day ?? 0) * DAY,
  correct: true,
  partial: false,
  hintLevel: 0,
  ...o,
});

describe('Fähigkeitsstand (Regeln aus 8.1)', () => {
  it('ohne Versuche: nicht begonnen', () =>
    expect(skillState([], 'verfahren', 'UTC')).toBe('not_started'));
  it('falsche Antwort: begonnen', () =>
    expect(skillState([ev({ correct: false })], 'verfahren', 'UTC')).toBe('started'));
  it('richtig mit Hinweisstufe ≥ 2: mit Hilfe', () =>
    expect(skillState([ev({ hintLevel: 2 })], 'verfahren', 'UTC')).toBe('with_help'));
  it('eine richtige Antwort ohne Hilfe reicht noch nicht für selbstständig', () =>
    expect(skillState([ev({})], 'verfahren', 'UTC')).toBe('started'));
  it('zwei richtige ohne Hilfe an zwei Aufgaben: selbstständig', () =>
    expect(skillState([ev({ itemId: 'a' }), ev({ itemId: 'b' })], 'verfahren', 'UTC')).toBe(
      'independent',
    ));
  it('dieselbe Aufgabe zweimal zählt nicht', () =>
    expect(skillState([ev({ itemId: 'a' }), ev({ itemId: 'a', day: 1 })], 'verfahren', 'UTC')).toBe(
      'started',
    ));
  it('nur Multiple Choice reicht nicht (Raten)', () =>
    expect(
      skillState(
        [ev({ itemId: 'a', subtype: 'mc' }), ev({ itemId: 'b', subtype: 'mc' })],
        'verfahren',
        'UTC',
      ),
    ).toBe('started'));
  it('vorläufige KI-Bewertungen zählen nur halb', () =>
    expect(
      skillState(
        [ev({ itemId: 'a', provisional: true }), ev({ itemId: 'b', provisional: true })],
        'verfahren',
        'UTC',
      ),
    ).toBe('started'));
  it('Verfahren: gemeistert braucht verzögerten Abruf nach ≥ 3 Tagen und eine Transferaufgabe', () => {
    const basis = [ev({ itemId: 'a' }), ev({ itemId: 'b', day: 3 })];
    expect(skillState(basis, 'verfahren', 'UTC')).toBe('independent');
    expect(
      skillState([...basis, ev({ itemId: 'c', subtype: 'transfer', day: 3 })], 'verfahren', 'UTC'),
    ).toBe('mastered');
  });
  it('Fakt: ersetzt die Transferaufgabe durch einen zweiten Abruf nach ≥ 7 Tagen', () => {
    const e = [ev({ itemId: 'a' }), ev({ itemId: 'b', day: 3 })];
    expect(skillState(e, 'fakt', 'UTC')).toBe('independent');
    expect(skillState([...e, ev({ itemId: 'c', day: 8 })], 'fakt', 'UTC')).toBe('mastered');
  });
});

describe('Fortschritt je Datei', () => {
  it('Prozent erst ab 5 Belegen, auf 5 % gerundet', () => {
    expect(documentProgress(['started', 'started'], 4).percent).toBeNull();
    const p = documentProgress(['mastered', 'independent', 'not_started', 'started'], 9);
    expect(p.percent).toBe(45); // (1+.75+0+.1)/4 = 46,25 → 45
    expect(p.sits).toBe(1);
    expect(p.skills).toBe(4);
  });
  it('ohne Fähigkeiten: kein Prozentwert', () =>
    expect(documentProgress([], 10).percent).toBeNull());
});
