import type { ErrorType } from '../model/errors';
import type { SkillKind, SkillState } from '../model/mastery';
import type { RetentionWord } from '../srs/config';

export const REASON_CODES = [
  'DUE_REVIEW',
  'EXAM_PRESSURE',
  'PREREQ_GAP',
  'RECURRING_ERROR',
  'NEW_MATERIAL',
  'INTERLEAVE_CONFUSABLE',
  'FATIGUE',
  'GOAL_REACHED',
  'USER_OVERRIDE',
  'RELEARN',
  'LATE_HOUR',
  'PRETEST',
  'NO_AI_FALLBACK',
  'REVIEW_LOAD',
  'EXAM_NEAR',
  'DAILY_LIMIT',
  'TIME_BUDGET',
  'BLOCK_TIME',
  'WRONG_IN_ROW',
  'NOTHING_TO_DO',
  'WORKED_EXAMPLE',
  'FADING_HELP',
  'RETRIEVAL',
  'WHY_QUESTION',
  'TASKS_ONLY',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export interface Decision<T> {
  value: T;
  reasons: ReasonCode[];
  overridable: true;
}

export type Method =
  | 'worked_example' // M1: Lösungsbeispiel → ähnliche Aufgabe → Hilfe ausblenden
  | 'fading' // M2
  | 'tasks_only' // M3
  | 'retrieval' // M4: Abrufkarten + Wiederlernen
  | 'why_question' // M5
  | 'pretest' // M6
  | 'interleaved' // I
  | 'read'; // ohne Aufgaben: im Material lesen

export interface SkillView {
  id: string;
  subjectId: string;
  title: string;
  /** Lernreihenfolge im Material (Thema vor Fähigkeit); kleiner = früher */
  order?: number;
  kind: SkillKind;
  state: SkillState;
  examRelevant: boolean;
  prereqIds: string[];
  /** Schon gelernte Karten */
  cardsLearned: number;
  cardsDue: number;
  cardsNew: number;
  itemsActive: number;
  hasLesson: boolean;
  recentErrors: ErrorType[];
  practicedToday: boolean;
  /** Lerntag (YYYY-MM-DD), an dem die Fähigkeit zuerst gelernt wurde */
  learnedDay?: string | undefined;
  /** Wie viele Wiederlern-Sitzungen schon stattfanden und wann die letzte war */
  relearnDone: number;
  lastRelearnDay?: string | undefined;
  /** Mehrere Aufgabentypen, die sich verwechseln lassen, jeder mindestens „mit Hilfe" */
  confusableWith: string[];
}

export interface ExamView {
  id: string;
  subjectId: string;
  /** YYYY-MM-DD */
  date: string;
  /** Leer = ganzes Fach */
  skillIds: string[];
}

export interface DirectorSettings {
  dailyMinutes: number;
  maxDailyMinutes: number;
  latestHour: number;
  blockMinutes: number;
  retention: RetentionWord;
}

export interface Snapshot {
  skills: SkillView[];
  exams: ExamView[];
  settings: DirectorSettings;
  newCardsToday: number;
  /** Erwartete Wiederholungen der nächsten 7 Tage */
  load7d: number;
  minutesDoneToday: number;
  /** „Heute nur …" */
  override?: { skillId?: string; subjectId?: string } | undefined;
}

export type Role = 'relearn' | 'review' | 'gap' | 'new' | 'exam';

export interface PlanEntry {
  skillId: string;
  subjectId: string;
  role: Role;
  minutes: number;
  method: Decision<Method>;
  reasons: ReasonCode[];
  /** Wie viele neue Karten diese Einheit einführt (für H6) */
  newCards: number;
}

export interface DayPlan {
  entries: PlanEntry[];
  totalMinutes: number;
  availableMinutes: number;
  /** Gründe für den ganzen Plan (z. B. GOAL_REACHED) */
  reasons: ReasonCode[];
  /** Warum es heute nichts Neues gibt (falls so) */
  noNewBecause?: ReasonCode | undefined;
  /** Fähigkeiten, die der Plan braucht, für die es aber noch keine Aufgaben gibt (für Aufträge „vorbereiten") */
  needsPreparation: string[];
  newCards: number;
  subjects: string[];
  dayKey: string;
}
