/** Schwellen und Gewichte des Lernermodells (Schritt 8). Startwerte, später an echten Daten anzupassen. */
export const MODEL_CONFIG = {
  elo: { kStart: 0.4, kMin: 0.15, kDecayPerUpdate: 0.02 },
  /** Eine richtige MC-Antwort schneller als dieser Anteil des eigenen Medians gilt als Raten */
  guessFactor: 0.25,
  /** Mindestzahl Antworten, bevor ein eigener Median gilt */
  medianMinSamples: 5,
  /** Fähigkeit ist „Auffrischen", wenn mindestens dieser Anteil ihrer aktiven Karten fällig ist */
  reviewDueFraction: 1 / 3,
  /** Ziel-Behaltensrate: Fähigkeit mit Abrufwahrscheinlichkeit darunter ist fällig */
  reviewDueRecall: 0.9,
  consecutiveWrongForReview: 2,
  calibration: { minSamples: 8, gapThreshold: 0.2 },
} as const;
