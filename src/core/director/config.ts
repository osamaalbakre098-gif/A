/** Startwerte des Studienleiters (Schritt 9). Stehen hier, nie verstreut im Code; später an echten Daten anzupassen. */
export const DIRECTOR_CONFIG = {
  weights: {
    due: 0.3,
    exam: 0.25,
    gap: 0.2,
    errorPattern: 0.15,
    novelty: 0.1,
    practicedToday: -0.15,
  },
  /** Minuten je fälliger Karte (grobe Schätzung) */
  minutesPerCard: 0.6,
  /** Minuten für eine neue Fähigkeit (Erklärung + Üben) */
  minutesPerNewSkill: 25,
  /** Minuten für Lesen im Material, wenn es noch keine Aufgaben gibt */
  minutesRead: 10,
  /** H3: brauchen Wiederholungen mehr als diesen Anteil der Zeit, gibt es nichts Neues */
  reviewShareLimit: 0.6,
  /** H4 */
  maxSubjectsPerSession: 3,
  /** H5: so nah vor einer Prüfung gibt es nichts Neues mehr */
  examNoNewDays: 2,
  /** H6 */
  maxNewCardsPerDay: 20,
  /** Ist die erwartete Last der nächsten 7 Tage höher, wird Neues halbiert */
  maxLoad7d: 250,
  /** Aufwärmen: so viele fällige Karten aus früheren Sitzungen */
  warmupCards: { min: 3, max: 6 },
  blocks: {
    warmup: { min: 3, max: 5 },
    core: { min: 10, max: 20 },
    practice: { min: 8, max: 15 },
    closing: { min: 2, max: 4 },
  },
  /** Prüfungsdruck wächst, je näher die Prüfung ist (ab so vielen Tagen null) */
  examHorizonDays: 60,
  fatigue: {
    /** Antwortzeit-Median der letzten 6 Aufgaben im Vergleich zum eigenen Median */
    latencyFactor: 1.6,
    /** Trefferquote muss so viele Prozentpunkte unter dem Sitzungsbeginn liegen */
    accuracyDropPoints: 20,
    window: 6,
    wrongInRow: 3,
    signalsToEnd: 2,
  },
  pause: { normal: 5, long: 12 },
  defaults: {
    dailyMinutes: 45,
    maxDailyMinutes: 90,
    latestHour: 22,
    blockMinutes: 25,
    retention: 'normal' as const,
  },
  relearn: {
    firstSessionCorrect: 3,
    otherSessionsCorrect: 1,
    spacingMin: 0.1,
    spacingMax: 0.2,
    minDays: 1,
    maxDays: 21,
    nearExamDays: 7,
    nearSpacingDays: [1, 2] as const,
    sessions: 3,
    nearMinSessions: 2,
  },
  exam: {
    lastReviewOnlyDays: 2,
    noNewMinDays: 3,
    noNewShare: 0.2,
    bufferShare: 0.15,
    probeShares: [0.6, 0.85] as const,
  },
} as const;
