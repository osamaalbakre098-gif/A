/**
 * Zeit-Hilfen. Alle Kernfunktionen bekommen `now` als Parameter, nie `Date.now()`.
 * Ein „Lerntag" beginnt um 04:00 Uhr Ortszeit (Lernen nach Mitternacht zählt zum Vortag).
 */
export const LEARNING_DAY_START_HOUR = 4;

export interface LearningDay {
  year: number;
  month: number; // 1–12
  day: number;
}

/** Lerntag eines Zeitpunkts in Ortszeit (Zeitzone des Geräts bzw. `timeZone`). */
export function learningDayOf(now: Date, timeZone?: string): LearningDay {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  // Kalendertag um Stunden zurückrechnen, damit 00:00–03:59 zum Vortag zählt.
  const shifted = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour')));
  shifted.setUTCHours(shifted.getUTCHours() - LEARNING_DAY_START_HOUR);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** Lerntag als sortierbarer Text `YYYY-MM-DD`. */
export function learningDayKey(now: Date, timeZone?: string): string {
  const d = learningDayOf(now, timeZone);
  return `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

/** Ganze Lerntage zwischen zwei Zeitpunkten (b − a). */
export function learningDaysBetween(a: Date, b: Date, timeZone?: string): number {
  const toUtc = (d: LearningDay) => Date.UTC(d.year, d.month - 1, d.day);
  return Math.round(
    (toUtc(learningDayOf(b, timeZone)) - toUtc(learningDayOf(a, timeZone))) / 86_400_000,
  );
}
