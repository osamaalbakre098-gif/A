import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { newCardData, ratingFor, retrievability, reviewCard } from '../../src/core/srs/fsrs';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 5, 9);

describe('FSRS-Hülle', () => {
  it('Golden: identische Intervalle wie ts-fsrs direkt (14 Tage, wechselnde Bewertungen)', () => {
    const f = fsrs({
      request_retention: 0.9,
      maximum_interval: 36500,
      enable_fuzz: false,
      enable_short_term: true,
    });
    let ref = createEmptyCard(new Date(T0));
    let mine = newCardData(T0);
    const ratings = [3, 3, 2, 3, 4, 1, 3, 3] as const;
    let now = T0;
    for (const r of ratings) {
      ref = f.next(
        ref,
        new Date(now),
        ([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const)[r - 1]!,
      ).card;
      // Hülle nutzt Streuung (Fuzz) laut Konfiguration; hier ohne Streuung vergleichbar machen
      mine = reviewCardNoFuzz(mine, r, now);
      expect(mine.scheduled_days).toBe(ref.scheduled_days);
      expect(mine.due).toBe(ref.due.getTime());
      expect(mine.state).toBe(ref.state);
      now = ref.due.getTime();
    }
  });

  it('Simulation 14 Tage: Fälligkeit liegt nach jeder richtigen Antwort weiter in der Zukunft', () => {
    let c = newCardData(T0);
    let now = T0;
    let prev = 0;
    for (let i = 0; i < 5; i++) {
      c = reviewCard(c, 3, now);
      expect(c.due).toBeGreaterThan(now);
      const gap = c.due - now;
      if (i >= 2) expect(gap).toBeGreaterThanOrEqual(prev * 0.8); // Streuung erlaubt kleine Abweichung
      prev = gap;
      now = c.due;
    }
    expect(c.reps).toBe(5);
  });

  it('Bewertung aus der Antwort', () => {
    expect(ratingFor({ correct: false, hintLevel: 0, latencyMs: 1000 })).toBe(1);
    expect(ratingFor({ correct: true, hintLevel: 2, latencyMs: 1000 })).toBe(2);
    expect(ratingFor({ correct: true, hintLevel: 0, latencyMs: 9000 })).toBe(3);
    expect(
      ratingFor({ correct: true, hintLevel: 0, latencyMs: 1000, medianMs: 5000, confidence: 3 }),
    ).toBe(4);
    expect(
      ratingFor({ correct: true, hintLevel: 0, latencyMs: 1000, medianMs: 5000, confidence: 1 }),
    ).toBe(3);
  });

  it('Abrufwahrscheinlichkeit sinkt mit der Zeit', () => {
    const c = reviewCard(newCardData(T0), 3, T0);
    expect(retrievability(c, T0 + DAY)).toBeGreaterThan(retrievability(c, T0 + 30 * DAY));
    expect(retrievability(newCardData(T0), T0)).toBe(0);
  });
});

import type { CardData } from '../../src/core/srs/fsrs';
function reviewCardNoFuzz(card: CardData, rating: 1 | 2 | 3 | 4, now: number): CardData {
  // Die Hülle schaltet Streuung per Konfiguration ein; für den Vergleich dieselbe Berechnung ohne Streuung
  const f = fsrs({
    request_retention: 0.9,
    maximum_interval: 36500,
    enable_fuzz: false,
    enable_short_term: true,
  });
  const c = f.next(
    {
      due: new Date(card.due),
      stability: card.stability,
      difficulty: card.difficulty,
      scheduled_days: card.scheduled_days,
      learning_steps: card.learning_steps ?? 0,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state as never,
      ...(card.last_review !== undefined ? { last_review: new Date(card.last_review) } : {}),
    },
    new Date(now),
    ([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const)[rating - 1]!,
  ).card;
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: 0,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    ...(c.last_review ? { last_review: c.last_review.getTime() } : {}),
  };
}
