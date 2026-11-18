/** Einstellwerte für die Wiederholung (Schritt 8.3). Nie im Code verstreut. */
export const RETENTION = { entspannt: 0.85, normal: 0.9, gruendlich: 0.93 } as const;
export type RetentionWord = keyof typeof RETENTION;
export const SRS_CONFIG = {
  maximumInterval: 36500,
  enableFuzz: true,
  enableShortTerm: true,
  /** „Richtig + schnell + sicher" gilt als Easy ab dieser Antwortzeit relativ zum eigenen Median */
  fastFactor: 0.6,
} as const;
