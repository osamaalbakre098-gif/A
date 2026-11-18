export type ErrorType =
  'slip' | 'prerequisite_gap' | 'misconception' | 'procedural' | 'reading' | 'guess' | 'ocr_or_asr';

export interface ErrorContext {
  correct: boolean;
  subtype: string;
  latencyMs: number;
  medianMs?: number | undefined;
  /** Dieselbe Aufgabe wurde früher schon richtig gelöst */
  solvedBefore: boolean;
  /** Eine Voraussetzung dieser Fähigkeit ist noch nicht begonnen */
  prerequisiteOpen: boolean;
  /** Der Antworttext enthält ein bekanntes Fehlvorstellungs-Muster */
  matchesMisconception: boolean;
  /** Antwort richtiger Ansatz, aber falscher Schritt (Teilpunkte) */
  partial: boolean;
  /** Die Antwort kam aus Spracherkennung oder Texterkennung */
  fromRecognition?: boolean;
}

/**
 * Ordnet eine falsche Antwort einer Fehlerart zu (einfache, erklärbare Regeln, in dieser Reihenfolge).
 * `ocr_or_asr` wird dem Schüler nie angelastet. Gibt `undefined` zurück bei richtiger Antwort.
 */
export function classifyError(c: ErrorContext): ErrorType | undefined {
  if (c.correct) return undefined;
  if (c.fromRecognition) return 'ocr_or_asr';
  if (c.matchesMisconception) return 'misconception';
  if (c.prerequisiteOpen) return 'prerequisite_gap';
  if (c.partial) return 'procedural';
  if (c.medianMs !== undefined && c.latencyMs < c.medianMs * 0.25 && c.subtype === 'mc')
    return 'guess';
  if (c.solvedBefore) return 'slip';
  if (c.medianMs !== undefined && c.latencyMs < c.medianMs * 0.4) return 'reading';
  return 'procedural';
}

/** Fehlerheft: Fehlerarten, die in den letzten `window` Fehlern mindestens `min`-mal vorkamen (ohne Technikfehler). */
export function recurringErrors(types: ErrorType[], window = 5, min = 2): ErrorType[] {
  const recent = types.slice(-window).filter((t) => t !== 'ocr_or_asr');
  const n = new Map<ErrorType, number>();
  for (const t of recent) n.set(t, (n.get(t) ?? 0) + 1);
  return [...n].filter(([, k]) => k >= min).map(([t]) => t);
}
