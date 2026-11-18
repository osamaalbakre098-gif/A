import { DIRECTOR_CONFIG as C } from '../core/director/config';
import { hourOf, planDay } from '../core/director/plan';
import type {
  DayPlan,
  DirectorSettings,
  ExamView,
  SkillView,
  Snapshot,
} from '../core/director/types';
import { learningDayKey } from '../core/time';
import type { MadarDB } from './db/db';
import { skillInfos } from './progress';

const ONE_DAY = 86_400_000;
const GAP_MS = 5 * 60_000;

export const DEFAULT_SETTINGS: DirectorSettings = { ...C.defaults };

async function getSetting<T>(db: MadarDB, key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined;
}

export async function loadDirectorSettings(db: MadarDB): Promise<DirectorSettings> {
  const s = await getSetting<Partial<DirectorSettings>>(db, 'plan');
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}
export async function saveDirectorSettings(
  db: MadarDB,
  s: Partial<DirectorSettings>,
): Promise<void> {
  const cur = await loadDirectorSettings(db);
  await db.settings.put({ key: 'plan', value: { ...cur, ...s } });
}

interface RelearnState {
  [skillId: string]: { done: number; last: string };
}
export async function markRelearn(db: MadarDB, skillId: string, day: string): Promise<void> {
  const cur = (await getSetting<RelearnState>(db, 'relearn')) ?? {};
  cur[skillId] = { done: (cur[skillId]?.done ?? 0) + 1, last: day };
  await db.settings.put({ key: 'relearn', value: cur });
}

export interface Override {
  day: string;
  skillId?: string;
  subjectId?: string;
}
export async function setOverride(db: MadarDB, o: Override | null): Promise<void> {
  if (o) await db.settings.put({ key: 'override', value: o });
  else await db.settings.delete('override');
}

/** Aktive Lernminuten heute: Abstände zwischen Antworten bis 5 Minuten zählen als Lernzeit. */
export function activeMinutes(timestamps: number[], latencies: number[] = []): number {
  const ts = [...timestamps].sort((a, b) => a - b);
  let ms = latencies.length ? Math.min(latencies[0] ?? 0, GAP_MS) : 0;
  for (let i = 1; i < ts.length; i++) {
    const gap = ts[i]! - ts[i - 1]!;
    ms += Math.min(gap, GAP_MS);
  }
  return ms / 60_000;
}

/** Baut den Lernstand für den Studienleiter (nur Lesen; berechnet alles aus Versuchen und Karten). */
export async function loadSnapshot(db: MadarDB, now: number, timeZone?: string): Promise<Snapshot> {
  const today = learningDayKey(new Date(now), timeZone);
  const [
    infos,
    topics,
    subjects,
    requires,
    lessons,
    attempts,
    items,
    cards,
    exams,
    settings,
    relearn,
    override,
  ] = await Promise.all([
    skillInfos(db, now),
    db.topics.toArray(),
    db.subjects.toArray(),
    db.requires.toArray(),
    db.lessons.toArray(),
    db.attempts.toArray(),
    db.items.toArray(),
    db.cards.toArray(),
    db.exams.toArray(),
    loadDirectorSettings(db),
    getSetting<RelearnState>(db, 'relearn'),
    getSetting<Override>(db, 'override'),
  ]);
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const activeSubjects = new Set(subjects.filter((s) => !s.archived).map((s) => s.id));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const lessonSkills = new Set(lessons.map((l) => l.skillId));
  const prereq = new Map<string, string[]>();
  for (const r of requires)
    prereq.set(r.skillId, [...(prereq.get(r.skillId) ?? []), r.requiresSkillId]);

  const bySkill = new Map<string, typeof attempts>();
  for (const a of [...attempts].sort((x, y) => x.ts - y.ts)) {
    const sid = itemById.get(a.itemId)?.skillId;
    if (sid) bySkill.set(sid, [...(bySkill.get(sid) ?? []), a]);
  }
  const dayOf = (ts: number) => learningDayKey(new Date(ts), timeZone);
  const todays = attempts.filter((a) => dayOf(a.ts) === today);
  const firstSeen = new Map<string, number>();
  for (const a of attempts)
    firstSeen.set(a.itemId, Math.min(firstSeen.get(a.itemId) ?? Infinity, a.ts));
  const newCardsToday = [...firstSeen].filter(
    ([id, ts]) => itemById.get(id)?.kind === 'karte' && dayOf(ts) === today,
  ).length;
  const horizon = now + 7 * ONE_DAY;
  const load7d = cards.filter((c) => c.fsrs.reps > 0 && c.due <= horizon).length;

  const skills: SkillView[] = [];
  for (const info of infos.values()) {
    const s = info.skill;
    const topic = topicById.get(s.topicId);
    if (s.hidden || !topic || topic.hidden || !activeSubjects.has(topic.subjectId)) continue;
    const own = bySkill.get(s.id) ?? [];
    const practicedToday = own.some((a) => dayOf(a.ts) === today);
    skills.push({
      id: s.id,
      subjectId: topic.subjectId,
      title: s.title,
      order: topic.order * 1000 + s.order,
      kind: s.kind,
      state: info.state,
      examRelevant: s.examRelevant,
      prereqIds: prereq.get(s.id) ?? [],
      cardsLearned: info.cardsTotal - info.cardsNew,
      cardsDue: info.cardsDue,
      cardsNew: info.cardsNew,
      itemsActive: info.items,
      hasLesson: lessonSkills.has(s.id),
      recentErrors: own.flatMap((a) => (a.errorType ? [a.errorType] : [])).slice(-5),
      practicedToday,
      learnedDay: own[0] ? dayOf(own[0].ts) : undefined,
      relearnDone: relearn?.[s.id]?.done ?? 0,
      lastRelearnDay: relearn?.[s.id]?.last,
      confusableWith: [],
    });
  }
  const examViews: ExamView[] = exams.map((e) => ({
    id: e.id,
    subjectId: e.subjectId,
    date: e.date,
    skillIds: e.skillIds,
  }));
  return {
    skills,
    exams: examViews,
    settings,
    newCardsToday,
    load7d,
    minutesDoneToday: activeMinutes(
      todays.map((a) => a.ts),
      todays.map((a) => a.latencyMs),
    ),
    override: override && override.day === today ? override : undefined,
  };
}

export async function planForNow(db: MadarDB, now: number, timeZone?: string) {
  const snapshot = await loadSnapshot(db, now, timeZone);
  const today = learningDayKey(new Date(now), timeZone);
  const hour = hourOf(new Date(now), timeZone);
  const plan: DayPlan = planDay(snapshot, today, hour);
  return { snapshot, plan, today, hour };
}

/** Karten, die nach jetzt und innerhalb der nächsten 36 Stunden fällig werden (Näherung für „Für morgen bereit"). */
export async function cardsDueTomorrow(db: MadarDB, now: number): Promise<number> {
  const end = now + 36 * 3_600_000;
  return (await db.cards.toArray()).filter((c) => c.fsrs.reps > 0 && c.due > now && c.due <= end)
    .length;
}

export async function addExam(
  db: MadarDB,
  e: { id: string; subjectId: string; date: string },
): Promise<void> {
  await db.exams.add({ id: e.id, subjectId: e.subjectId, date: e.date, skillIds: [] });
}
