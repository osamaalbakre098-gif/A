import { DIRECTOR_CONFIG as C } from './config';
import { addDays, dayDiff } from './days';
import type { ExamView, SkillView } from './types';

/**
 * Wiederlern-Termine (9.6): bis zu 3 Sitzungen zwischen Lernen und Prüfung.
 * Abstand 10–20 % der Zeit bis zur Prüfung, mindestens 1, höchstens 21 Tage;
 * bei weniger als 7 Tagen: 1-Tages-Abstände und mindestens 2 Sitzungen (wenn Zeit dafür da ist).
 * Die Sitzungen liegen immer vor dem Prüfungstag.
 */
export function relearnSchedule(learnedDay: string, examDay: string): string[] {
  const total = dayDiff(learnedDay, examDay);
  if (total < 2) return [];
  const near = total < C.relearn.nearExamDays;
  let spacing = near
    ? C.relearn.nearSpacingDays[0]
    : Math.min(
        C.relearn.maxDays,
        Math.max(
          C.relearn.minDays,
          Math.round(total * ((C.relearn.spacingMin + C.relearn.spacingMax) / 2)),
        ),
      );
  const n = Math.min(C.relearn.sessions, total - 1);
  if (spacing * n > total - 1) spacing = Math.max(1, Math.floor((total - 1) / n));
  return Array.from({ length: n }, (_, k) => addDays(learnedDay, spacing * (k + 1)));
}

/** Ist heute eine Wiederlern-Sitzung dran? Verpasste Termine werden nachgeholt (ohne Vorwurf). */
export function relearnDue(s: SkillView, examDay: string | undefined, today: string): boolean {
  if (!examDay || !s.examRelevant || !s.learnedDay) return false;
  if (dayDiff(today, examDay) < 0) return false;
  const next = relearnSchedule(s.learnedDay, examDay)[s.relearnDone];
  if (!next || dayDiff(today, next) > 0) return false;
  // höchstens eine Wiederlern-Sitzung je Tag
  return s.lastRelearnDay !== today;
}

export type ExamStatus = 'reachable' | 'tight' | 'overload';

export interface ExamPlan {
  daysLeft: number;
  /** Letzter Tag mit neuem Stoff (Prüfungstag minus max(3 Tage, 20 % der Restzeit)) */
  newUntil: string;
  /** Ab hier nur noch Wiederholung und leichte Probeprüfung */
  reviewOnlyFrom: string;
  probes: string[];
  /** Fähigkeiten in Lernreihenfolge, die sicher geschafft werden */
  safe: string[];
  /** Fähigkeiten, die nur in den Grundlagen drankommen */
  basicsOnly: string[];
  status: ExamStatus;
}

/**
 * Prüfungsplanung rückwärts (9.7). `skills` sind in Lernreihenfolge (Voraussetzungen zuerst) und noch nicht „gemeistert".
 * Wir gehen von `minutesPerDay` Lernzeit aus, davon bleibt 15 % Puffer frei.
 */
export function planExam(
  exam: ExamView,
  skills: SkillView[],
  today: string,
  minutesPerDay: number,
): ExamPlan {
  const left = Math.max(0, dayDiff(today, exam.date));
  const noNew = Math.max(C.exam.noNewMinDays, Math.ceil(left * C.exam.noNewShare));
  const newUntilDays = Math.max(0, left - noNew);
  const open = skills.filter((s) => s.state !== 'mastered' && s.state !== 'review_due');
  const capacity = Math.floor(
    (newUntilDays * minutesPerDay * (1 - C.exam.bufferShare)) / C.minutesPerNewSkill,
  );
  const safe = open.slice(0, capacity).map((s) => s.id);
  const basicsOnly = open.slice(capacity).map((s) => s.id);
  const status: ExamStatus =
    basicsOnly.length === 0 ? (capacity - open.length <= 1 ? 'tight' : 'reachable') : 'overload';
  return {
    daysLeft: left,
    newUntil: addDays(today, newUntilDays),
    reviewOnlyFrom: addDays(exam.date, -C.exam.lastReviewOnlyDays),
    probes: C.exam.probeShares.map((p) => addDays(today, Math.round(left * p))),
    safe,
    basicsOnly,
    status,
  };
}
