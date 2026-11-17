import { countWords, splitLongParagraph } from './text';

/** Ein Textstück einer PDF-Seite. Koordinaten in PDF-Punkten, Ursprung oben links; `y` ist die Grundlinie. */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  bold?: boolean;
}
export interface PageInput {
  /** 0-basiert */
  page: number;
  width: number;
  height: number;
  items: TextItem[];
}

export interface Line {
  page: number;
  text: string;
  fontSize: number;
  bold: boolean;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  pageWidth: number;
  pageHeight: number;
}

export interface Paragraph {
  text: string;
  page: number;
  /** relativ zur Seite (0–1), Ursprung oben links */
  bbox?: [number, number, number, number];
  /** nur bei Überschriften */
  headingLevel?: number;
  headingPath: string[];
}

export interface ChunkDraft {
  page: number;
  bbox?: [number, number, number, number];
  text: string;
  headingPath: string[];
}
export interface OutlineEntry {
  level: number;
  title: string;
  page: number;
}
export interface Structured {
  chunks: ChunkDraft[];
  outline: OutlineEntry[];
  /** Seiten ohne nennenswerten Text (Abbildungen oder Scans) */
  textlessPages: number[];
}

export const CHUNK_MIN_WORDS = 150;
export const CHUNK_MAX_WORDS = 400;
/** Eine Seite mit weniger Zeichen gilt als „ohne Text". */
export const TEXTLESS_MAX_CHARS = 25;

const NUMBERED =
  /^(?:(\d{1,2}(?:\.\d{1,2}){0,3})\.?|(?:Kapitel|Abschnitt|Chapter|Section|Lektion|Teil)\s+\d+[.:]?)\s+\S/i;
const round = (n: number) => Math.round(n * 2) / 2;

/** Fasst die Textstücke einer Seite zu Zeilen zusammen (Lesereihenfolge). */
export function buildLines(p: PageInput): Line[] {
  const items = p.items
    .filter((i) => i.str.trim() !== '' || i.str === ' ')
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: TextItem[][] = [];
  for (const it of items) {
    const row = rows[rows.length - 1];
    const ref = row?.[0];
    if (row && ref && Math.abs(it.y - ref.y) <= 0.5 * Math.max(it.fontSize, ref.fontSize))
      row.push(it);
    else rows.push([it]);
  }
  const lines: Line[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let text = '';
    let prev: TextItem | undefined;
    for (const it of row) {
      if (prev) {
        const gap = it.x - (prev.x + prev.width);
        const needSpace =
          gap > 0.2 * Math.max(it.fontSize, 1) && !/\s$/.test(text) && !/^\s/.test(it.str);
        if (needSpace) text += ' ';
      }
      text += it.str;
      prev = it;
    }
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const real = row.filter((i) => i.str.trim());
    const size = Math.max(...real.map((i) => i.fontSize));
    lines.push({
      page: p.page,
      text,
      fontSize: round(size),
      bold: real.every((i) => i.bold === true),
      x0: Math.min(...real.map((i) => i.x)),
      x1: Math.max(...real.map((i) => i.x + i.width)),
      y0: Math.min(...real.map((i) => i.y - i.height)),
      y1: Math.max(...real.map((i) => i.y)),
      pageWidth: p.width,
      pageHeight: p.height,
    });
  }
  return lines;
}

/** Entfernt wiederkehrende Kopf-/Fußzeilen und Seitenzahlen. */
export function removeRunningHeaders(pages: Line[][]): Line[][] {
  const zone = (l: Line) =>
    l.y0 / l.pageHeight < 0.12 ? 'T' : l.y1 / l.pageHeight > 0.88 ? 'B' : 'M';
  const key = (l: Line) => `${l.text.replace(/\d+/g, '#')}|${zone(l)}`;
  const counts = new Map<string, number>();
  for (const lines of pages)
    for (const k of new Set(lines.filter((l) => zone(l) !== 'M').map(key)))
      counts.set(k, (counts.get(k) ?? 0) + 1);
  const threshold = Math.max(3, Math.ceil(pages.length * 0.4));
  return pages.map((lines) =>
    lines.filter((l) => {
      const z = zone(l);
      if (z === 'M') return true;
      if (/^[-–]?\s*\d{1,4}\s*[-–]?$/.test(l.text)) return false; // Seitenzahl
      return pages.length < 3 || (counts.get(key(l)) ?? 0) < threshold;
    }),
  );
}

/** Häufigste Schriftgröße, nach Zeichenzahl gewichtet = Fließtext. */
export function bodyFontSize(lines: Line[]): number {
  const w = new Map<number, number>();
  for (const l of lines) w.set(l.fontSize, (w.get(l.fontSize) ?? 0) + l.text.length);
  let best = 12;
  let max = -1;
  for (const [size, n] of w) if (n > max) [best, max] = [size, n];
  return best;
}

export function isHeadingLine(l: Line, body: number): boolean {
  const words = countWords(l.text);
  if (words === 0 || words > 14 || /^\d+$/.test(l.text)) return false;
  const endsPeriod = /[.!?]$/.test(l.text);
  const bigger = l.fontSize >= body * 1.18 && !(endsPeriod && words > 6);
  const numbered =
    NUMBERED.test(l.text) && words <= 10 && !endsPeriod && (l.fontSize >= body * 1.02 || l.bold);
  const boldShort = l.bold && l.fontSize >= body * 0.98 && words <= 8 && !/[.:;,]$/.test(l.text);
  return bigger || numbered || boldShort;
}

const depthOf = (t: string): number => {
  const m = NUMBERED.exec(t);
  return m?.[1] ? m[1].split('.').length : 1;
};

interface Tagged {
  line: Line;
  heading: boolean;
}

/** Aus allen Seiten werden Absätze und Überschriften (mit Gliederungspfad). */
export function paragraphsFromPages(pages: PageInput[]): {
  paragraphs: Paragraph[];
  textlessPages: number[];
} {
  const perPage = removeRunningHeaders(pages.map(buildLines));
  const all = perPage.flat();
  const body = bodyFontSize(all);
  const textlessPages = pages
    .filter((_, i) => perPage[i]!.reduce((n, l) => n + l.text.length, 0) < TEXTLESS_MAX_CHARS)
    .map((p) => p.page);

  // Überschriften erkennen und mehrzeilige zusammenfassen
  const tagged: Tagged[] = [];
  for (const line of all) {
    const heading = isHeadingLine(line, body);
    const prev = tagged[tagged.length - 1];
    if (
      heading &&
      prev?.heading &&
      prev.line.page === line.page &&
      prev.line.fontSize === line.fontSize &&
      line.y1 - prev.line.y1 < 1.8 * line.fontSize &&
      !NUMBERED.test(line.text)
    ) {
      prev.line = {
        ...prev.line,
        text: `${prev.line.text} ${line.text}`,
        y1: line.y1,
        x1: Math.max(prev.line.x1, line.x1),
      };
    } else tagged.push({ line, heading });
  }
  const sizes = [...new Set(tagged.filter((t) => t.heading).map((t) => t.line.fontSize))].sort(
    (a, b) => b - a,
  );
  const levelOf = (l: Line) =>
    Math.min(
      6,
      Math.max(sizes.indexOf(l.fontSize) + 1, NUMBERED.test(l.text) ? depthOf(l.text) : 1),
    );

  const out: Paragraph[] = [];
  const stack: { level: number; title: string }[] = [];
  const path = () => stack.map((s) => s.title);
  let cur: { texts: string[]; lines: Line[]; last: Line } | null = null;

  const rel = (ls: Line[]): [number, number, number, number] => {
    const first = ls[0]!;
    const same = ls.filter((l) => l.page === first.page);
    const c = (n: number) => Math.min(1, Math.max(0, n));
    return [
      c(Math.min(...same.map((l) => l.x0)) / first.pageWidth),
      c(Math.min(...same.map((l) => l.y0)) / first.pageHeight),
      c(Math.max(...same.map((l) => l.x1)) / first.pageWidth),
      c(Math.max(...same.map((l) => l.y1)) / first.pageHeight),
    ];
  };
  const flush = () => {
    if (!cur) return;
    out.push({
      text: cur.texts.join(' ').replace(/\s+/g, ' ').trim(),
      page: cur.lines[0]!.page,
      bbox: rel(cur.lines),
      headingPath: path(),
    });
    cur = null;
  };

  for (const { line, heading } of tagged) {
    if (heading) {
      flush();
      const level = levelOf(line);
      while (stack.length && stack[stack.length - 1]!.level >= level) stack.pop();
      stack.push({ level, title: line.text });
      out.push({
        text: line.text,
        page: line.page,
        bbox: rel([line]),
        headingLevel: level,
        headingPath: path(),
      });
      continue;
    }
    if (cur) {
      const last = cur.last;
      const sameDoc = true;
      const samePage = last.page === line.page;
      const gap = line.y1 - last.y1;
      const sentenceEnd = /[.!?:؟]$/.test(last.text);
      const bullet = /^([•·▪◦\-–]|\d{1,2}[.)])\s+/.test(line.text);
      const newPara = bullet || (samePage ? gap > 1.75 * line.fontSize : sentenceEnd) || !sameDoc;
      if (newPara) flush();
    }
    if (!cur) cur = { texts: [line.text], lines: [line], last: line };
    else {
      const prevText = cur.texts[cur.texts.length - 1]!;
      if (/[a-zäöüß]-$/.test(prevText) && /^[a-zäöüß]/.test(line.text))
        cur.texts[cur.texts.length - 1] = prevText.slice(0, -1) + line.text;
      else cur.texts.push(line.text);
      cur.lines.push(line);
      cur.last = line;
    }
  }
  flush();
  return { paragraphs: out.filter((p) => p.text), textlessPages };
}

/** Reiner Text (Einfügen, .txt, .md): Absätze durch Leerzeilen, Überschriften per `#` oder Nummerierung. */
export function paragraphsFromText(text: string): Paragraph[] {
  const out: Paragraph[] = [];
  const stack: { level: number; title: string }[] = [];
  for (const block of text.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    const md = lines.length === 1 ? /^(#{1,6})\s+(.+)$/.exec(lines[0]!) : null;
    const num =
      lines.length === 1 &&
      NUMBERED.test(lines[0]!) &&
      countWords(lines[0]!) <= 10 &&
      !/[.!?]$/.test(lines[0]!);
    if (md || num) {
      const title = md ? md[2]!.trim() : lines[0]!;
      const level = md ? md[1]!.length : Math.min(6, depthOf(title));
      while (stack.length && stack[stack.length - 1]!.level >= level) stack.pop();
      stack.push({ level, title });
      out.push({
        text: title,
        page: 0,
        headingLevel: level,
        headingPath: stack.map((s) => s.title),
      });
    } else {
      out.push({ text: lines.join(' '), page: 0, headingPath: stack.map((s) => s.title) });
    }
  }
  return out;
}

/**
 * Absätze → Abschnitte, an Absatz- und Überschriftsgrenzen: ein Abschnitt wird bis höchstens `max` Wörter gefüllt
 * (Standard 400), eine Überschrift beginnt immer einen neuen Abschnitt. Überschriften ohne Inhalt gehören zum nächsten.
 * Kürzere Abschnitte als 150 Wörter entstehen nur vor einer Überschrift und am Ende des Textes.
 */
export function chunkParagraphs(
  paras: Paragraph[],
  max = CHUNK_MAX_WORDS,
): { chunks: ChunkDraft[]; outline: OutlineEntry[] } {
  interface Cur {
    parts: string[];
    words: number;
    first: Paragraph;
    hasBody: boolean;
  }
  const chunks: ChunkDraft[] = [];
  const outline: OutlineEntry[] = [];
  const st: { cur: Cur | null; carry: Paragraph[] } = { cur: null, carry: [] };

  const emit = (c: Cur) =>
    chunks.push({
      page: c.first.page,
      bbox: c.first.bbox,
      text: c.parts.join('\n\n'),
      headingPath: c.first.headingPath,
    });

  /** Beginnt einen Abschnitt; wartende Überschriften ohne Inhalt kommen davor. */
  const begin = (p: Paragraph, withText: boolean) => {
    const carried = st.carry;
    st.carry = [];
    const parts = carried.map((c) => c.text);
    if (withText) parts.push(p.text);
    const origin = carried[0];
    const last = withText ? p : carried[carried.length - 1];
    st.cur = {
      parts,
      words: 0, // Überschriften zählen nicht mit
      first: origin ? { ...origin, headingPath: (last ?? p).headingPath } : p,
      hasBody: false,
    };
  };
  const close = () => {
    const c = st.cur;
    st.cur = null;
    if (!c) return;
    if (c.hasBody) emit(c);
    else st.carry.push({ ...c.first, text: c.parts.join('\n\n') });
  };

  for (const p of paras) {
    if (p.headingLevel) {
      outline.push({ level: p.headingLevel, title: p.text, page: p.page });
      close(); // Inhaltslose Überschrift wandert in `carry` und eröffnet den nächsten Abschnitt mit
      begin(p, true);
      continue;
    }
    for (const piece of splitLongParagraph(p.text, max)) {
      const w = countWords(piece);
      if (st.cur?.hasBody && st.cur.words + w > max) close();
      if (!st.cur) begin(p, false);
      const c = st.cur!;
      c.parts.push(piece);
      c.words += w;
      c.hasBody = true;
    }
  }
  const tail = st.cur as Cur | null;
  if (tail) emit(tail); // auch eine Schluss-Überschrift ohne Inhalt bleibt erhalten
  return { chunks, outline };
}

/** PDF-Seiten → Abschnitte, Gliederung und Seiten ohne Text. */
export function structurePdf(pages: PageInput[]): Structured {
  const { paragraphs, textlessPages } = paragraphsFromPages(pages);
  return { ...chunkParagraphs(paragraphs), textlessPages };
}

/** Reiner Text → Abschnitte und Gliederung. */
export function structureText(text: string): Structured {
  return { ...chunkParagraphs(paragraphsFromText(text)), textlessPages: [] };
}
