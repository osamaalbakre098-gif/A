import { MODEL_CONFIG } from './config';

export interface Calibrated {
  confidence: 1 | 2 | 3;
  correct: boolean;
}

/**
 * Selbsteinschätzung: Vergleicht „Wie sicher bist du?" (1–3) mit dem Ergebnis.
 * Gibt `null` zurück, solange zu wenig Antworten da sind (keine Scheingenauigkeit).
 */
export function calibration(samples: Calibrated[]): 'over' | 'under' | 'balanced' | null {
  if (samples.length < MODEL_CONFIG.calibration.minSamples) return null;
  const conf = samples.reduce((a, s) => a + (s.confidence - 1) / 2, 0) / samples.length; // 0–1
  const acc = samples.filter((s) => s.correct).length / samples.length;
  const gap = conf - acc;
  const t = MODEL_CONFIG.calibration.gapThreshold;
  return gap > t ? 'over' : gap < -t ? 'under' : 'balanced';
}
