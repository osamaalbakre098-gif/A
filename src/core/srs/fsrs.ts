import {
  createEmptyCard,
  FSRS6_DEFAULT_DECAY,
  fsrs,
  Rating,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs';
import { RETENTION, SRS_CONFIG, type RetentionWord } from './config';

/** Gespeicherter FSRS-Zustand (Zeiten in Millisekunden, damit der JSON-Export verlustfrei bleibt). */
export interface CardData {
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps?: number | undefined;
  reps: number;
  lapses: number;
  state: number;
  last_review?: number | undefined;
}

const scheduler = (word: RetentionWord = 'normal') =>
  fsrs({
    request_retention: RETENTION[word],
    maximum_interval: SRS_CONFIG.maximumInterval,
    enable_fuzz: SRS_CONFIG.enableFuzz,
    enable_short_term: SRS_CONFIG.enableShortTerm,
  });

const toCard = (d: CardData): Card => ({
  due: new Date(d.due),
  stability: d.stability,
  difficulty: d.difficulty,
  scheduled_days: d.scheduled_days,
  learning_steps: d.learning_steps ?? 0,
  reps: d.reps,
  lapses: d.lapses,
  state: d.state as State,
  ...(d.last_review !== undefined ? { last_review: new Date(d.last_review) } : {}),
});
const fromCard = (c: Card): CardData => ({
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
});

export const newCardData = (now: number): CardData => fromCard(createEmptyCard(new Date(now)));

/** Wendet eine Bewertung (1 Again … 4 Easy) an und gibt den neuen Zustand zurück. */
export function reviewCard(
  card: CardData,
  rating: 1 | 2 | 3 | 4,
  now: number,
  word: RetentionWord = 'normal',
): CardData {
  const grade = ([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[])[rating - 1]!;
  return fromCard(scheduler(word).next(toCard(card), new Date(now), grade).card);
}

export interface RatingInput {
  correct: boolean;
  /** 0–5 */
  hintLevel: number;
  latencyMs: number;
  /** Eigener Median in ms (falls bekannt) */
  medianMs?: number | undefined;
  /** 1–3; nur gesetzt, wenn abgefragt */
  confidence?: number | undefined;
}

/** Bewertung aus der Antwort (der Schüler drückt keine vier Knöpfe): falsch → Again, mit Hinweis → Hard, richtig → Good, schnell und sicher → Easy. */
export function ratingFor(i: RatingInput): 1 | 2 | 3 | 4 {
  if (!i.correct) return 1;
  if (i.hintLevel >= 1) return 2;
  const fast = i.medianMs !== undefined && i.latencyMs <= i.medianMs * SRS_CONFIG.fastFactor;
  const sure = i.confidence === undefined ? true : i.confidence >= 3;
  return fast && sure && i.confidence !== undefined ? 4 : 3;
}

/** Abrufwahrscheinlichkeit jetzt (FSRS-6-Vergessenskurve: R = (1 + F·t/S)^−decay mit R(S)=90 %). */
export function retrievability(card: CardData, now: number): number {
  if (card.state === 0 || card.last_review === undefined || card.stability <= 0) return 0;
  const t = Math.max(0, (now - card.last_review) / 86_400_000);
  const decay = -FSRS6_DEFAULT_DECAY;
  const factor = Math.pow(0.9, 1 / decay) - 1;
  return Math.pow(1 + (factor * t) / card.stability, decay);
}
