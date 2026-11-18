import { MODEL_CONFIG } from './config';

/** Erwartete Erfolgswahrscheinlichkeit: P = 1/(1+e^(−(θ−b))) */
export const expected = (theta: number, b: number) => 1 / (1 + Math.exp(-(theta - b)));

/** K sinkt mit der Zahl der Aktualisierungen von 0,4 auf 0,15. */
export const kFor = (updates: number) =>
  Math.max(
    MODEL_CONFIG.elo.kMin,
    MODEL_CONFIG.elo.kStart - updates * MODEL_CONFIG.elo.kDecayPerUpdate,
  );

export function updateTheta(theta: number, b: number, correct: boolean, updates: number): number {
  return theta + kFor(updates) * ((correct ? 1 : 0) - expected(theta, b));
}

/** Schwierigkeit einer Aufgabe (0–1 aus der Erzeugung) auf die θ-Skala (−2…+2). */
export const toB = (difficulty: number) => (difficulty - 0.5) * 4;

/** Wählt aus den Aufgaben die, deren Erfolgswahrscheinlichkeit am nächsten am Ziel (Standard 0,75) liegt. */
export function pickByTarget<T extends { difficulty: number }>(
  items: T[],
  theta: number,
  target = 0.75,
): T | undefined {
  let best: T | undefined;
  let bestGap = Infinity;
  for (const i of items) {
    const gap = Math.abs(expected(theta, toB(i.difficulty)) - target);
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  }
  return best;
}
