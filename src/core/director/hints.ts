import { normalizeLoose } from './normalize';

/** Hinweisleiter (9.4). Stufe 0: eigener Versuch; 1 Orientierung; 2 Strategie; 3 nächster Schritt; 4 ähnliches Beispiel; 5 Lösung. */
export const HINT_LEVELS = [1, 2, 3, 4] as const;

/** Hinweise gibt es erst nach einem eigenen Versuch oder 45 Sekunden. */
export const canRevealHint = (attempts: number, elapsedMs: number) =>
  attempts >= 1 || elapsedMs >= 45_000;

/** Die Lösung (Stufe 5) ist erst nach allen vorbereiteten Hinweisen erlaubt. */
export const canRevealSolution = (hintsAvailable: number, hintsUsed: number) =>
  hintsUsed >= hintsAvailable;

/**
 * Lösungs-Leck-Prüfung: Enthält ein Hinweis das Endergebnis, wird er verworfen.
 * Zahlen und Wörter ab 4 Buchstaben der Lösung zählen.
 */
export function leaksSolution(hint: string, solution: string[]): boolean {
  const h = normalizeLoose(hint);
  return solution.some((sol) => {
    const n = normalizeLoose(sol);
    if (!n) return false;
    if (/^[\d.,\s-]+$/.test(n))
      return new RegExp(`(^|[^\\d.,])${n.replace(/[.,]/g, '[.,]')}($|[^\\d])`).test(h);
    return n.length >= 4 && h.includes(n);
  });
}
