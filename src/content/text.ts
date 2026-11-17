/** Gemeinsame Textwerkzeuge (rein, ohne Browser). */

/** Deutsche Normalisierung für die Suche: klein, ä=ae, ö=oe, ü=ue, ß=ss, ohne Akzente. */
export function normalizeDe(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟ]/g, ''); // arabische Vokalzeichen
}

export const countWords = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** Teilt einen langen Absatz an Satzenden in Stücke von höchstens `max` Wörtern. */
export function splitLongParagraph(text: string, max: number): string[] {
  if (countWords(text) <= max) return [text];
  const sentences = text.match(/[^.!?؟]+[.!?؟]+["»“)]*\s*|[^.!?؟]+$/g) ?? [text];
  const out: string[] = [];
  let cur: string[] = [];
  let n = 0;
  const flush = () => {
    if (cur.length) out.push(cur.join('').trim());
    cur = [];
    n = 0;
  };
  for (const raw of sentences) {
    let sent = raw;
    // Ein einzelner Satz über dem Limit wird hart nach Wörtern geteilt.
    while (countWords(sent) > max) {
      flush();
      const words = sent.trim().split(/\s+/);
      out.push(words.slice(0, max).join(' '));
      sent = words.slice(max).join(' ') + ' ';
    }
    const w = countWords(sent);
    if (n + w > max) flush();
    cur.push(sent);
    n += w;
  }
  flush();
  return out.filter(Boolean);
}

/**
 * Findet `query` in `text`, ohne Rücksicht auf Groß-/Kleinschreibung, Umlaute (ä=ae …) und Akzente.
 * Die Positionen beziehen sich auf den ORIGINAL-Text (wichtig zum Markieren).
 */
export function findMatches(text: string, query: string): { start: number; end: number }[] {
  const q = normalizeDe(query).trim();
  if (!q) return [];
  let norm = '';
  const origin: number[] = []; // Position im Original für jedes normalisierte Zeichen
  for (let i = 0; i < text.length; i++) {
    const n = normalizeDe(text[i]!);
    for (let k = 0; k < n.length; k++) {
      norm += n[k];
      origin.push(i);
    }
  }
  const out: { start: number; end: number }[] = [];
  for (let at = norm.indexOf(q); at !== -1; at = norm.indexOf(q, at + q.length)) {
    out.push({ start: origin[at]!, end: origin[at + q.length - 1]! + 1 });
  }
  return out;
}
