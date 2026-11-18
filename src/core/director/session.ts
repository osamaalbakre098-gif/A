import { DIRECTOR_CONFIG as C } from './config';
import type { DayPlan, Decision, DirectorSettings, ReasonCode } from './types';

export interface Block {
  kind: 'warmup' | 'core' | 'practice' | 'closing';
  minutes: number;
  skillIds: string[];
  reasons: ReasonCode[];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Sitzungsbauer (9.2): 1 Aufwärmen (fällige Abrufkarten aus früheren Sitzungen) → 2 Kern (eine Fähigkeit) →
 * 3 Üben → 4 Abschluss. Passt immer in die Zeit des Tagesplans.
 */
export function buildSession(plan: DayPlan): Block[] {
  if (!plan.entries.length) return [];
  const reviews = plan.entries.filter(
    (e) => e.role === 'review' || e.role === 'relearn' || e.role === 'exam',
  );
  const core = plan.entries.find((e) => e.role === 'new' || e.role === 'gap') ?? reviews[0]!;
  const blocks: Block[] = [];
  let left = Math.max(plan.availableMinutes, 1);
  const take = (min: number, max: number, want: number) => {
    const m = clamp(want, Math.min(min, left), Math.min(max, left));
    left -= m;
    return m;
  };
  const closing = Math.min(C.blocks.closing.min, left);
  left -= closing;
  const warmSkills = reviews.filter((e) => e.skillId !== core.skillId);
  if (warmSkills.length) {
    const m = take(
      C.blocks.warmup.min,
      C.blocks.warmup.max,
      warmSkills.reduce((a, e) => a + e.minutes, 0),
    );
    if (m > 0)
      blocks.push({
        kind: 'warmup',
        minutes: m,
        skillIds: warmSkills.map((e) => e.skillId),
        reasons: ['DUE_REVIEW'],
      });
  }
  const coreMin = take(C.blocks.core.min, C.blocks.core.max, core.minutes);
  if (coreMin > 0)
    blocks.push({
      kind: 'core',
      minutes: coreMin,
      skillIds: [core.skillId],
      reasons: core.reasons,
    });
  if (core.role === 'new' || core.role === 'gap') {
    const pm = take(C.blocks.practice.min, C.blocks.practice.max, C.blocks.practice.max);
    if (pm > 0)
      blocks.push({
        kind: 'practice',
        minutes: pm,
        skillIds: [core.skillId],
        reasons: core.method.reasons,
      });
  }
  blocks.push({
    kind: 'closing',
    minutes: Math.max(closing, 1),
    skillIds: [core.skillId],
    reasons: ['GOAL_REACHED'],
  });
  return blocks;
}

export interface AnswerStat {
  correct: boolean;
  latencyMs: number;
  /** Diese Aufgabe war früher schon sicher richtig (für „Fehler bei Sicherem") */
  wasSecure?: boolean;
}

export interface SessionStats {
  /** Minuten seit der letzten Pause */
  blockMinutes: number;
  todayMinutes: number;
  goalMinutes: number;
  answers: AnswerStat[];
  /** Eigener Median der Antwortzeit (ms), falls bekannt */
  medianMs?: number | undefined;
  /** Bereits gemeldete Ermüdungssignale in dieser Sitzung */
  fatigueSignals: number;
  hour: number;
}

export type Advice = Decision<{ action: 'continue' | 'break' | 'end'; minutes?: number }>;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};
const rate = (xs: AnswerStat[]) => (xs.length ? xs.filter((a) => a.correct).length / xs.length : 0);

/** Erkennt ein neues Ermüdungssignal (Antwortzeit stark gestiegen UND Trefferquote deutlich gefallen, oder 3 Fehler in Folge bei Sicherem). */
export function fatigueSignal(s: SessionStats): ReasonCode | undefined {
  const w = C.fatigue.window;
  const a = s.answers;
  const last = a.slice(-C.fatigue.wrongInRow);
  if (last.length === C.fatigue.wrongInRow && last.every((x) => !x.correct && x.wasSecure))
    return 'WRONG_IN_ROW';
  if (a.length >= w * 2 && s.medianMs) {
    const recent = a.slice(-w);
    const slow = median(recent.map((x) => x.latencyMs)) > C.fatigue.latencyFactor * s.medianMs;
    const drop = (rate(a.slice(0, w)) - rate(recent)) * 100 >= C.fatigue.accuracyDropPoints;
    if (slow && drop) return 'FATIGUE';
  }
  return undefined;
}

/** Pause- und Schluss-Vorschläge (9.5). Nur Vorschläge: der Schüler darf weitermachen. */
export function sessionAdvice(s: SessionStats, settings: DirectorSettings): Advice {
  const d = (
    action: 'continue' | 'break' | 'end',
    reasons: ReasonCode[],
    minutes?: number,
  ): Advice => ({
    value: { action, ...(minutes !== undefined ? { minutes } : {}) },
    reasons,
    overridable: true,
  });
  if (s.hour >= settings.latestHour || s.hour < 4) return d('end', ['LATE_HOUR']);
  if (s.todayMinutes >= settings.maxDailyMinutes) return d('end', ['DAILY_LIMIT']);
  if (s.todayMinutes >= s.goalMinutes) return d('end', ['GOAL_REACHED']);
  const sig = fatigueSignal(s);
  const signals = s.fatigueSignals + (sig ? 1 : 0);
  if (signals >= C.fatigue.signalsToEnd) return d('end', [sig ?? 'FATIGUE']);
  if (sig) return d('break', [sig], C.pause.long);
  if (s.blockMinutes >= settings.blockMinutes) return d('break', ['BLOCK_TIME'], C.pause.normal);
  return d('continue', []);
}
