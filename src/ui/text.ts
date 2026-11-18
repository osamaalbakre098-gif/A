const SHY = '­';
const ZWSP = '​';

/**
 * Erlaubt Umbrüche in langen Namen an definierten Stellen (UI_DETAILS 3), nie mitten im Wort an beliebiger Stelle:
 * - `|` im Text markiert eine Trennstelle (wird zu einem weichen Trennstrich), z. B. „Vektor|addition"
 * - nach `-`, `/`, `_`, `.` (Dateinamen, Pfade) darf ohne Trennstrich umbrochen werden
 */
export function softBreak(text: string): string {
  return text.replace(/\|/g, SHY).replace(/([-/_.])(?=\S)/g, `$1${ZWSP}`);
}

/**
 * Kürzt Dateinamen in der Mitte, damit die Endung sichtbar bleibt („Ein_sehr_lan…ript.pdf").
 * Nur für Dateinamen und Pfade; alles andere bricht um.
 */
export function middleEllipsis(name: string, max = 32): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 && name.length - dot <= 6 ? name.slice(dot) : '';
  const keep = max - 1 - ext.length;
  const head = Math.ceil(keep * 0.6);
  const tail = keep - head;
  const base = ext ? name.slice(0, dot) : name;
  return `${base.slice(0, head)}…${base.slice(base.length - tail)}${ext}`;
}
