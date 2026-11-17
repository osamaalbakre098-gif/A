/**
 * Einziger Ort, an dem die Systemuhr gelesen wird (Composition Root).
 * Alles andere bekommt die Zeit als Parameter (siehe CLAUDE.md).
 */
export const systemNow = (): number => Date.now();
