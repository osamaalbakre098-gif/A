import { describe, expect, it } from 'vitest';
import { calibration } from '../../src/core/model/calibration';
import { expected, kFor, pickByTarget, updateTheta } from '../../src/core/model/elo';
import { classifyError, recurringErrors } from '../../src/core/model/errors';
import { applyReview, skillState, toDisplay, type Evidence } from '../../src/core/model/mastery';
import { newCardData, retrievability, reviewCard } from '../../src/core/srs/fsrs';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 5, 9);
const ev = (o: Partial<Evidence> & { itemId: string; ts: number }): Evidence => ({
  subtype: 'kurz',
  correct: true,
  partial: false,
  hintLevel: 0,
  ...o,
});

describe('Zustandsübergänge (Tabelle 8.1)', () => {
  it('keine Versuche → Neu', () => expect(skillState([], 'verfahren')).toBe('not_started'));
  it('ein Versuch (auch falsch) → begonnen', () =>
    expect(skillState([ev({ itemId: 'a', ts: T0, correct: false })], 'verfahren')).toBe('started'));
  it('richtig mit Hinweisstufe 2 → mit Hilfe', () =>
    expect(skillState([ev({ itemId: 'a', ts: T0, hintLevel: 2 })], 'verfahren')).toBe('with_help'));
  it('zwei richtige ohne Hilfe an zwei Aufgaben → selbstständig', () =>
    expect(
      skillState([ev({ itemId: 'a', ts: T0 }), ev({ itemId: 'b', ts: T0 + 1 })], 'verfahren'),
    ).toBe('independent'));
  it('zwei Mal dieselbe Aufgabe reicht nicht', () =>
    expect(
      skillState([ev({ itemId: 'a', ts: T0 }), ev({ itemId: 'a', ts: T0 + 1 })], 'verfahren'),
    ).not.toBe('independent'));
  it('nur Multiple Choice reicht nicht für selbstständig', () =>
    expect(
      skillState(
        [
          ev({ itemId: 'a', ts: T0, subtype: 'mc' }),
          ev({ itemId: 'b', ts: T0 + 1, subtype: 'mc' }),
        ],
        'verfahren',
      ),
    ).not.toBe('independent'));
  it('Verfahren: selbstständig + Abruf nach ≥3 Tagen + Transfer → gemeistert', () => {
    const e = [
      ev({ itemId: 'a', ts: T0 }),
      ev({ itemId: 'b', ts: T0 + 4 * DAY, subtype: 'transfer' }),
    ];
    expect(skillState(e, 'verfahren')).toBe('mastered');
  });
  it('Verfahren ohne Transfer bleibt selbstständig', () => {
    const e = [ev({ itemId: 'a', ts: T0 }), ev({ itemId: 'b', ts: T0 + 4 * DAY })];
    expect(skillState(e, 'verfahren')).toBe('independent');
  });
  it('Fakt: zweiter Abruf nach ≥7 Tagen ersetzt Transfer', () => {
    const e = [ev({ itemId: 'a', ts: T0 }), ev({ itemId: 'b', ts: T0 + 8 * DAY })];
    expect(skillState(e, 'fakt')).toBe('mastered');
    expect(
      skillState([ev({ itemId: 'a', ts: T0 }), ev({ itemId: 'b', ts: T0 + 4 * DAY })], 'fakt'),
    ).toBe('independent');
  });
  it('vorläufige KI-Bewertung zählt nur halb', () =>
    expect(
      skillState(
        [
          ev({ itemId: 'a', ts: T0, provisional: true }),
          ev({ itemId: 'b', ts: T0 + 1, provisional: true }),
        ],
        'verfahren',
      ),
    ).toBe('started'));
});

describe('Auffrischen (review_due)', () => {
  const sig = { cardsTotal: 6, cardsDue: 0, coreDue: false, recent: [true, true] };
  it('nur aus „gemeistert"', () => {
    for (const s of ['not_started', 'started', 'with_help', 'independent'] as const)
      expect(applyReview(s, { ...sig, cardsDue: 6, coreDue: true })).toBe(s);
  });
  it('ein Drittel der Karten fällig', () => {
    expect(applyReview('mastered', { ...sig, cardsDue: 1 })).toBe('mastered');
    expect(applyReview('mastered', { ...sig, cardsDue: 2 })).toBe('review_due');
  });
  it('Kernkarte fällig oder zwei Fehler in Folge', () => {
    expect(applyReview('mastered', { ...sig, coreDue: true })).toBe('review_due');
    expect(applyReview('mastered', { ...sig, recent: [true, false, false] })).toBe('review_due');
  });
  it('geht zurück auf „gemeistert", wenn nichts mehr fällig ist (nie unter review_due)', () =>
    expect(applyReview('review_due', sig)).toBe('mastered'));
  it('Anzeige: 4 Zustände, review_due = Auffrischen', () => {
    expect(
      ['not_started', 'started', 'with_help', 'independent', 'mastered', 'review_due'].map((s) =>
        toDisplay(s as never),
      ),
    ).toEqual(['new', 'building', 'building', 'building', 'sits', 'refresh']);
  });
});

describe('Elo', () => {
  it('Erwartung bei gleichem θ und b ist 0,5', () => expect(expected(0, 0)).toBeCloseTo(0.5));
  it('K sinkt von 0,4 auf mindestens 0,15', () => {
    expect(kFor(0)).toBeCloseTo(0.4);
    expect(kFor(100)).toBeCloseTo(0.15);
  });
  it('richtig erhöht, falsch senkt θ', () => {
    expect(updateTheta(0, 0, true, 0)).toBeGreaterThan(0);
    expect(updateTheta(0, 0, false, 0)).toBeLessThan(0);
  });
  it('wählt die Aufgabe nahe am Ziel', () => {
    const items = [{ difficulty: 0.1 }, { difficulty: 0.5 }, { difficulty: 0.9 }];
    expect(pickByTarget(items, 0)).toBe(items[0]);
  });
});

describe('Fehlerarten, Heft, Kalibrierung', () => {
  const base = {
    correct: false,
    subtype: 'kurz',
    latencyMs: 8000,
    medianMs: 8000,
    solvedBefore: false,
    prerequisiteOpen: false,
    matchesMisconception: false,
    partial: false,
  };
  it('Reihenfolge der Regeln', () => {
    expect(classifyError({ ...base, correct: true })).toBeUndefined();
    expect(classifyError({ ...base, fromRecognition: true })).toBe('ocr_or_asr');
    expect(classifyError({ ...base, matchesMisconception: true, prerequisiteOpen: true })).toBe(
      'misconception',
    );
    expect(classifyError({ ...base, prerequisiteOpen: true })).toBe('prerequisite_gap');
    expect(classifyError({ ...base, partial: true })).toBe('procedural');
    expect(classifyError({ ...base, subtype: 'mc', latencyMs: 500 })).toBe('guess');
    expect(classifyError({ ...base, solvedBefore: true })).toBe('slip');
  });
  it('Fehlerheft: wiederkehrende Art, Technikfehler zählen nicht', () => {
    expect(recurringErrors(['slip', 'procedural', 'procedural'])).toEqual(['procedural']);
    expect(recurringErrors(['ocr_or_asr', 'ocr_or_asr', 'ocr_or_asr'])).toEqual([]);
  });
  it('Kalibrierung erst ab genug Antworten, erkennt Überschätzung', () => {
    expect(calibration([{ confidence: 3, correct: false }])).toBeNull();
    const over = Array.from({ length: 10 }, () => ({ confidence: 3 as const, correct: false }));
    expect(calibration(over)).toBe('over');
    const ok = Array.from({ length: 10 }, (_, i) => ({ confidence: 3 as const, correct: i < 9 }));
    expect(calibration(ok)).toBe('balanced');
  });
});

describe('FSRS: Abruf-Kurve', () => {
  it('bei t = Stabilität beträgt die Abrufwahrscheinlichkeit 90 %', () => {
    const c = reviewCard(newCardData(T0), 3, T0);
    expect(retrievability(c, c.last_review! + c.stability * DAY)).toBeCloseTo(0.9, 2);
  });
});
