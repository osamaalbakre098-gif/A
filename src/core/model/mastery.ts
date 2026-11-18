import { learningDaysBetween } from '../time';

/**
 * Fähigkeitsstand nur aus Belegen (Versuchen), nach den Regeln aus Schritt 8.1.
 * VORLÄUFIG: Wiederholungsplan (FSRS, „Auffrischen") und Raten-Erkennung folgen in Schritt 8.
 */
export type SkillState = 'not_started' | 'started' | 'with_help' | 'independent' | 'mastered';
export type SkillKind = 'fakt' | 'verfahren' | 'verstaendnis';

export interface Evidence {
  itemId: string;
  subtype: string;
  /** Millisekunden */
  ts: number;
  correct: boolean;
  partial: boolean;
  /** 0–5; ab 2 zählt eine richtige Antwort als „mit Hilfe" */
  hintLevel: number;
  /** Vorläufige KI-Bewertung (Sicherheit unter 0,7): zählt nur halb */
  provisional?: boolean;
}

export function skillState(evidence: Evidence[], kind: SkillKind, timeZone?: string): SkillState {
  if (evidence.length === 0) return 'not_started';
  const unaided = evidence
    .filter((e) => e.correct && !e.partial && e.hintLevel <= 1)
    .sort((a, b) => a.ts - b.ts);
  const weight = unaided.reduce((n, e) => n + (e.provisional ? 0.5 : 1), 0);
  const items = new Set(unaided.map((e) => e.itemId));
  // Mindestens eine der Antworten ist kein Multiple Choice (MC lässt sich raten).
  const notMc = unaided.some((e) => e.subtype !== 'mc');
  const independent = weight >= 2 && items.size >= 2 && notMc;

  if (independent) {
    const first = unaided[0]!;
    const gap = (days: number) =>
      unaided.some(
        (e) => learningDaysBetween(new Date(first.ts), new Date(e.ts), timeZone) >= days,
      );
    const delayed = gap(3);
    const second =
      kind === 'fakt'
        ? gap(7) // bei Fakten ersetzt ein zweiter verzögerter Abruf die Transferaufgabe
        : unaided.some((e) => e.subtype === 'transfer');
    if (delayed && second) return 'mastered';
    return 'independent';
  }
  if (evidence.some((e) => e.correct && e.hintLevel >= 2)) return 'with_help';
  return 'started';
}

/** Gewichte nur für die Fortschrittsanzeige (Anteil des Könnens), keine Studienwerte. */
export const STATE_WEIGHT: Record<SkillState, number> = {
  not_started: 0,
  started: 0.1,
  with_help: 0.4,
  independent: 0.75,
  mastered: 1,
};
/** Eine Prozentzahl erscheint erst ab so vielen Belegen (Regel 2: keine Scheingenauigkeit). */
export const MIN_EVIDENCE_FOR_PERCENT = 5;

export interface Progress {
  /** Auf 5 % gerundet; `null`, solange zu wenig Belege vorliegen */
  percent: number | null;
  skills: number;
  sits: number;
  evidence: number;
  counts: Record<SkillState, number>;
}

export function documentProgress(states: SkillState[], evidenceCount: number): Progress {
  const counts: Record<SkillState, number> = {
    not_started: 0,
    started: 0,
    with_help: 0,
    independent: 0,
    mastered: 0,
  };
  for (const s of states) counts[s]++;
  const n = states.length;
  const raw = n ? (states.reduce((a, s) => a + STATE_WEIGHT[s], 0) / n) * 100 : 0;
  return {
    percent: n && evidenceCount >= MIN_EVIDENCE_FOR_PERCENT ? Math.round(raw / 5) * 5 : null,
    skills: n,
    sits: counts.mastered,
    evidence: evidenceCount,
    counts,
  };
}
