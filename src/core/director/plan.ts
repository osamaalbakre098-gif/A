import { recurringErrors } from '../model/errors';
import { DIRECTOR_CONFIG as C } from './config';
import { addDays, dayDiff } from './days';
import { relearnDue } from './exam';
import { chooseMethod } from './methods';
import type { DayPlan, ExamView, ReasonCode, Role, SkillView, Snapshot } from './types';

const AT_LEAST_HELP = new Set(['with_help', 'independent', 'mastered', 'review_due']);

/** Tage bis zur nächsten Prüfung, die diese Fähigkeit betrifft (`undefined` = keine). */
export function examDaysFor(s: SkillView, exams: ExamView[], today: string): number | undefined {
  let best: number | undefined;
  for (const e of exams) {
    if (e.subjectId !== s.subjectId) continue;
    if (e.skillIds.length && !e.skillIds.includes(s.id)) continue;
    const d = dayDiff(today, e.date);
    if (d < 0) continue;
    if (best === undefined || d < best) best = d;
  }
  return best;
}

export interface PriorityParts {
  due: number;
  exam: number;
  gap: number;
  errorPattern: number;
  novelty: number;
  practicedToday: number;
  total: number;
}

/** Priorität nach der Formel aus 9.1; die Teile sind einzeln sichtbar (für „Warum?"). */
export function priority(
  s: SkillView,
  all: Map<string, SkillView>,
  exams: ExamView[],
  today: string,
): PriorityParts {
  const w = C.weights;
  const due = s.cardsLearned ? Math.min(1, s.cardsDue / s.cardsLearned) : 0;
  const days = examDaysFor(s, exams, today);
  const exam = days === undefined ? 0 : Math.max(0, 1 - days / C.examHorizonDays);
  const pre = s.prereqIds.map((id) => all.get(id)).filter((x): x is SkillView => !!x);
  const gap = pre.length ? pre.filter((p) => !AT_LEAST_HELP.has(p.state)).length / pre.length : 0;
  const errorPattern = recurringErrors(s.recentErrors).length ? 1 : 0;
  const novelty = s.state === 'not_started' && pre.every((p) => AT_LEAST_HELP.has(p.state)) ? 1 : 0;
  const practicedToday = s.practicedToday ? 1 : 0;
  const total =
    w.due * due +
    w.exam * exam +
    w.gap * gap +
    w.errorPattern * errorPattern +
    w.novelty * novelty +
    w.practicedToday * practicedToday;
  return { due, exam, gap, errorPattern, novelty, practicedToday, total };
}

/** H1: Ist eine Voraussetzung noch nicht begonnen, wird stattdessen sie eingeplant (rekursiv, ohne Endlosschleife). */
export function resolvePrerequisite(
  s: SkillView,
  all: Map<string, SkillView>,
  seen = new Set<string>(),
): SkillView {
  if (seen.has(s.id)) return s;
  seen.add(s.id);
  for (const id of s.prereqIds) {
    const p = all.get(id);
    if (p && p.state === 'not_started') return resolvePrerequisite(p, all, seen);
  }
  return s;
}

/** Stunde (0–23) in der Zeitzone; `now` kommt von außen. */
export function hourOf(now: Date, timeZone?: string): number {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return Number(h);
}

/**
 * Tagesplaner: Was ist heute dran? Reiner Code, deterministisch.
 * Harte Regeln H1–H6 gelten immer; jede Einheit hat mindestens einen Begründungscode.
 */
export function planDay(snap: Snapshot, today: string, hour: number): DayPlan {
  const all = new Map(snap.skills.map((s) => [s.id, s]));
  const available = Math.max(
    0,
    Math.min(snap.settings.dailyMinutes, snap.settings.maxDailyMinutes) - snap.minutesDoneToday,
  );
  const plan: DayPlan = {
    entries: [],
    totalMinutes: 0,
    availableMinutes: available,
    reasons: [],
    needsPreparation: [],
    newCards: 0,
    subjects: [],
    dayKey: today,
  };
  const empty = (r: ReasonCode): DayPlan => ({ ...plan, reasons: [r], noNewBecause: r });
  if (!snap.skills.length) return empty('NOTHING_TO_DO');
  if (available <= 0) return empty('GOAL_REACHED');

  const late = hour >= snap.settings.latestHour || hour < 4;
  const prio = new Map(snap.skills.map((s) => [s.id, priority(s, all, snap.exams, today)]));
  const byPrio = (a: SkillView, b: SkillView) =>
    prio.get(b.id)!.total - prio.get(a.id)!.total || (a.id < b.id ? -1 : 1);
  const ov = snap.override;
  const allowed = (s: SkillView) =>
    !ov || (ov.skillId ? s.id === ov.skillId : ov.subjectId ? s.subjectId === ov.subjectId : true);

  const examNear = snap.skills.some((s) => {
    const d = examDaysFor(s, snap.exams, today);
    return d !== undefined && d <= C.examNoNewDays;
  });

  const subjects = new Set<string>();
  let used = 0;
  const add = (
    s: SkillView,
    role: Role,
    minutes: number,
    reasons: ReasonCode[],
    newCards = 0,
  ): boolean => {
    if (minutes <= 0) return false;
    if (!subjects.has(s.subjectId) && subjects.size >= C.maxSubjectsPerSession) return false; // H4
    if (used + minutes > available) {
      if (!plan.entries.length && minutes > available)
        minutes = available; // lieber kürzen als nichts
      else return false;
    }
    const exDays = examDaysFor(s, snap.exams, today);
    const rs: ReasonCode[] = [...reasons];
    if (exDays !== undefined && exDays <= 14 && !rs.includes('EXAM_PRESSURE'))
      rs.push('EXAM_PRESSURE');
    if (ov && !rs.includes('USER_OVERRIDE')) rs.push('USER_OVERRIDE');
    if (s.recentErrors.length && recurringErrors(s.recentErrors).length) rs.push('RECURRING_ERROR');
    subjects.add(s.subjectId);
    used += minutes;
    plan.entries.push({
      skillId: s.id,
      subjectId: s.subjectId,
      role,
      minutes,
      method: chooseMethod(s, { role }),
      reasons: rs.length ? rs : ['NEW_MATERIAL'],
      newCards,
    });
    return true;
  };

  // H2: fällige Wiederlern-Sitzungen kommen vor Neuem, danach fällige Wiederholungen.
  const relearn = snap.skills.filter((s) => relearnDueToday(s, snap.exams, today)).sort(byPrio);
  const due = snap.skills.filter((s) => s.cardsDue > 0 && !relearn.includes(s)).sort(byPrio);
  // Wiederholungen dürfen überhaupt nur den Anteil bekommen, den H3 erlaubt – sonst ist nie Platz für Neues.
  for (const s of relearn) {
    const m = Math.max(3, Math.round(s.cardsDue * C.minutesPerCard) || 3);
    add(s, 'relearn', m, ['RELEARN']);
  }
  for (const s of due) {
    if (!allowed(s) && used >= available * 0.25 && ov) continue; // „Heute nur X": fällige nur kurz mitnehmen
    const m = Math.max(2, Math.ceil(s.cardsDue * C.minutesPerCard));
    add(s, examDaysFor(s, snap.exams, today) !== undefined && examNear ? 'exam' : 'review', m, [
      'DUE_REVIEW',
    ]);
  }
  const totalDueMinutes = [...relearn, ...due].reduce(
    (a, s) => a + Math.max(2, Math.ceil(s.cardsDue * C.minutesPerCard)),
    0,
  );

  // Gründe, warum nichts Neues kommt
  if (totalDueMinutes > available * C.reviewShareLimit)
    plan.noNewBecause = 'REVIEW_LOAD'; // H3
  else if (examNear)
    plan.noNewBecause = 'EXAM_NEAR'; // H5
  else if (late) plan.noNewBecause = 'LATE_HOUR';
  else if (snap.newCardsToday >= C.maxNewCardsPerDay) plan.noNewBecause = 'DAILY_LIMIT'; // H6

  if (!plan.noNewBecause) {
    const cardCap =
      snap.load7d > C.maxLoad7d ? Math.floor(C.maxNewCardsPerDay / 2) : C.maxNewCardsPerDay;
    const newLeft = Math.max(0, cardCap - snap.newCardsToday);
    const cands = snap.skills
      .filter(
        (s) =>
          allowed(s) &&
          s.state !== 'mastered' &&
          s.state !== 'review_due' &&
          !plan.entries.some((e) => e.skillId === s.id),
      )
      .filter((s) => s.state === 'not_started' || s.state === 'started' || s.state === 'with_help')
      .sort(byPrio);
    for (const c of cands) {
      const s = resolvePrerequisite(c, all); // H1
      if (!allowed(s) && ov) continue;
      if (plan.entries.some((e) => e.skillId === s.id)) continue;
      const reasons: ReasonCode[] =
        s.id !== c.id ? ['PREREQ_GAP'] : s.state === 'not_started' ? ['NEW_MATERIAL'] : [];
      if (!reasons.length) reasons.push(s.recentErrors.length ? 'RECURRING_ERROR' : 'NEW_MATERIAL');
      if (s.itemsActive === 0 && s.cardsNew === 0) {
        if (!plan.needsPreparation.includes(s.id)) plan.needsPreparation.push(s.id);
        if (
          !add(
            s,
            s.state === 'not_started' ? 'new' : 'gap',
            C.minutesRead,
            reasons.concat('NO_AI_FALLBACK'),
          )
        )
          break;
        break; // Lesen im Material ersetzt hier eine volle Lerneinheit; mehr Neues kommt heute nicht dazu
      }
      const nc = Math.min(s.cardsNew, newLeft);
      if (!add(s, s.state === 'not_started' ? 'new' : 'gap', C.minutesPerNewSkill, reasons, nc))
        continue;
      plan.newCards += nc;
      break; // pro Tag eine neue Fähigkeit im Kern (Studienleiter 9.2: ein Kern)
    }
  }
  // Fähigkeiten ohne Aufgaben in den nächsten Tagen: für „vorbereiten" melden
  for (const e of plan.entries)
    if (all.get(e.skillId)!.itemsActive === 0 && !plan.needsPreparation.includes(e.skillId))
      plan.needsPreparation.push(e.skillId);

  plan.totalMinutes = used;
  plan.subjects = [...subjects];
  if (!plan.entries.length) {
    plan.reasons = [plan.noNewBecause ?? 'NOTHING_TO_DO'];
    if (used >= available) plan.reasons = ['TIME_BUDGET'];
  }
  if (late && plan.entries.length) plan.reasons.push('LATE_HOUR');
  return plan;
}

/** Ist heute eine Wiederlern-Sitzung fällig? (Termine: exam.ts) */
function relearnDueToday(s: SkillView, exams: ExamView[], today: string): boolean {
  const days = examDaysFor(s, exams, today);
  return days === undefined ? false : relearnDue(s, addDays(today, days), today);
}
export { relearnDueToday };
