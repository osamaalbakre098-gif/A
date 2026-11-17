import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  buildLines,
  chunkParagraphs,
  paragraphsFromText,
  structurePdf,
  structureText,
  type PageInput,
  type Paragraph,
  type TextItem,
} from '../../src/content/structure';
import { countWords, normalizeDe, splitLongParagraph } from '../../src/content/text';

const W = 595;
const H = 842;
const item = (str: string, x: number, y: number, size = 12, bold = false): TextItem => ({
  str,
  x,
  y,
  width: str.length * size * 0.5,
  height: size,
  fontSize: size,
  bold,
});
/** Eine Seite aus Zeilen [Text, Schriftgröße, fett]; Zeilenabstand 1,3 × Größe, Absatzlücke bei Text '' */
function page(
  n: number,
  rows: [string, number?, boolean?][],
  opts: { header?: string } = {},
): PageInput {
  const items: TextItem[] = [];
  let y = 90;
  for (const [text, size = 12, bold = false] of rows) {
    if (text === '') {
      y += 14;
      continue;
    }
    items.push(item(text, 60, y, size, bold));
    y += size * 1.3;
  }
  if (opts.header) items.push(item(opts.header, 60, 40));
  items.push(item(String(n + 1), 290, 800)); // Seitenzahl
  return { page: n, width: W, height: H, items };
}
const words = (n: number, w = 'wort') => Array.from({ length: n }, (_, i) => `${w}${i}`).join(' ');
/** Langer Text als Zeilen zu je 10 Wörtern */
const lines = (n: number, w = 'wort'): [string][] => {
  const ws = words(n, w).split(' ');
  const out: [string][] = [];
  for (let i = 0; i < ws.length; i += 10) out.push([ws.slice(i, i + 10).join(' ')]);
  return out;
};

describe('Zeilen', () => {
  it('fügt getrennte Wortteile zusammen und trennt Zeilen nach Höhe', () => {
    const p: PageInput = {
      page: 0,
      width: W,
      height: H,
      items: [
        { ...item('Vek', 60, 100), width: 18 },
        { ...item('toren', 78, 100), width: 30 }, // direkt anschließend
        { ...item('addieren', 120, 100), width: 48 }, // Lücke = Leerzeichen
        item('Zweite Zeile', 60, 130),
      ],
    };
    expect(buildLines(p).map((l) => l.text)).toEqual(['Vektoren addieren', 'Zweite Zeile']);
  });
});

describe('Überschriften', () => {
  it('erkennt Ebenen an der Schriftgröße', () => {
    const s = structurePdf([
      page(0, [
        ['Physik', 24],
        ['Vektoren', 16],
        ...lines(30),
        ['Addition', 16],
        ...lines(30, 'text'),
      ]),
    ]);
    expect(s.outline).toEqual([
      { level: 1, title: 'Physik', page: 0 },
      { level: 2, title: 'Vektoren', page: 0 },
      { level: 2, title: 'Addition', page: 0 },
    ]);
    expect(s.chunks[0]!.headingPath).toEqual(['Physik', 'Vektoren']);
    expect(s.chunks[1]!.headingPath).toEqual(['Physik', 'Addition']);
  });

  it('erkennt nummerierte Überschriften in Fließtextgröße (fett)', () => {
    const s = structurePdf([
      page(0, [
        ['1 Mechanik', 12, true],
        ...lines(20),
        ['1.2 Kräfte addieren', 12, true],
        ...lines(20, 'k'),
      ]),
    ]);
    expect(s.outline.map((o) => [o.level, o.title])).toEqual([
      [1, '1 Mechanik'],
      [2, '1.2 Kräfte addieren'],
    ]);
  });

  it('hält normale Sätze und Seitenzahlen nicht für Überschriften', () => {
    const s = structurePdf([page(0, [...lines(40)])]);
    expect(s.outline).toEqual([]);
  });

  it('mehrere Überschriften hintereinander gehen nicht verloren', () => {
    const s = structurePdf([page(0, [['Teil A', 24], ['Einführung', 16], ...lines(20)])]);
    expect(s.chunks).toHaveLength(1);
    expect(s.chunks[0]!.text.startsWith('Teil A\n\nEinführung\n\n')).toBe(true);
    expect(s.chunks[0]!.headingPath).toEqual(['Teil A', 'Einführung']);
  });
});

describe('Abschnitte', () => {
  it('teilt lange Texte in Abschnitte bis 400 Wörter an Absatzgrenzen', () => {
    const rows: [string, number?][] = [['Titel', 24]];
    for (let i = 0; i < 5; i++) {
      rows.push(...lines(180, `p${i}x`), ['']);
    }
    const s = structurePdf([page(0, rows)]);
    expect(s.chunks.length).toBeGreaterThan(1);
    for (const c of s.chunks)
      expect(countWords(c.text.replace(/^Titel\n\n/, ''))).toBeLessThanOrEqual(400);
    // Absätze werden nicht mitten im Absatz zerrissen: jeder Absatz (180 Wörter) steckt ganz in einem Abschnitt
    for (let i = 0; i < 5; i++) {
      const holder = s.chunks.filter(
        (c) => c.text.includes(`p${i}x0 `) || c.text.includes(`p${i}x179`),
      );
      expect(holder).toHaveLength(1);
    }
  });

  it('teilt einen einzelnen riesigen Absatz an Satzenden', () => {
    const sentence = (n: number) => `${words(40, `s${n}w`)}.`;
    const big = Array.from({ length: 30 }, (_, i) => sentence(i)).join(' '); // 1200 Wörter
    const pieces = splitLongParagraph(big, 400);
    expect(pieces.length).toBeGreaterThanOrEqual(3);
    for (const p of pieces) expect(countWords(p)).toBeLessThanOrEqual(400);
    expect(pieces.every((p) => /\.$/.test(p))).toBe(true);
  });

  it('jeder Abschnitt hat Seite und Position (relativ 0–1)', () => {
    const s = structurePdf([page(0, [['Titel', 24], ...lines(30)])]);
    const c = s.chunks[0]!;
    expect(c.page).toBe(0);
    expect(c.bbox!.every((n) => n >= 0 && n <= 1)).toBe(true);
    expect(c.bbox![0]).toBeLessThan(c.bbox![2]);
    expect(c.bbox![1]).toBeLessThan(c.bbox![3]);
  });

  it('Eigenschaft: es geht kein Wort verloren und kein Abschnitt ist zu lang oder leer', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 1, max: 700 }), fc.boolean()), {
          minLength: 1,
          maxLength: 8,
        }),
        (spec) => {
          const paras: Paragraph[] = spec.map(([n, heading], i) =>
            heading
              ? { text: `Kapitel ${i}`, page: 0, headingLevel: 1, headingPath: [`Kapitel ${i}`] }
              : { text: words(n, `a${i}_`), page: 0, headingPath: [] },
          );
          const { chunks } = chunkParagraphs(paras);
          const inWords = paras
            .filter((p) => !p.headingLevel)
            .reduce((n, p) => n + countWords(p.text), 0);
          const outBody = chunks.reduce(
            (n, c) =>
              n +
              countWords(
                c.text
                  .split('\n\n')
                  .filter((t) => !t.startsWith('Kapitel '))
                  .join(' '),
              ),
            0,
          );
          expect(outBody).toBe(inWords);
          for (const c of chunks) {
            expect(c.text.trim().length).toBeGreaterThan(0);
            expect(
              countWords(
                c.text
                  .split('\n\n')
                  .filter((t) => !t.startsWith('Kapitel '))
                  .join(' '),
              ),
            ).toBeLessThanOrEqual(400);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Seiten', () => {
  it('entfernt wiederkehrende Kopfzeilen und Seitenzahlen', () => {
    const pages = [0, 1, 2, 3].map((n) =>
      page(n, [...lines(30, `s${n}_`)], { header: 'Skript Physik 2025' }),
    );
    const s = structurePdf(pages);
    const all = s.chunks.map((c) => c.text).join(' ');
    expect(all).not.toContain('Skript Physik');
    expect(all).not.toMatch(/\b[1-4]\b\s*$/);
  });

  it('erkennt Seiten ohne Text (Abbildungen/Scans)', () => {
    const empty: PageInput = { page: 1, width: W, height: H, items: [] };
    const s = structurePdf([page(0, [...lines(30)]), empty, page(2, [...lines(30, 'z')])]);
    expect(s.textlessPages).toEqual([1]);
  });

  it('verbindet Silbentrennung am Zeilenende', () => {
    const s = structurePdf([
      page(0, [['Das Verfah-'], ['ren ist einfach und klar.'], ...lines(10)]),
    ]);
    expect(s.chunks[0]!.text).toContain('Verfahren ist einfach');
  });
});

describe('Reiner Text', () => {
  it('Markdown-Überschriften und Absätze', () => {
    const s = structureText(
      '# Vektoren\n\nEin Vektor hat Betrag und Richtung.\n\n## Addition\n\nMan addiert komponentenweise.\n',
    );
    expect(s.outline).toEqual([
      { level: 1, title: 'Vektoren', page: 0 },
      { level: 2, title: 'Addition', page: 0 },
    ]);
    expect(s.chunks.map((c) => c.headingPath)).toEqual([['Vektoren'], ['Vektoren', 'Addition']]);
  });
  it('nummerierte Zeile ist Überschrift, normaler Satz nicht', () => {
    const p = paragraphsFromText('1.2 Kräfte\n\n1. Das ist ein ganzer Satz, der mit Punkt endet.');
    expect(p[0]!.headingLevel).toBe(2);
    expect(p[1]!.headingLevel).toBeUndefined();
  });
  it('leerer Text ergibt nichts', () => {
    expect(structureText('  \n\n ').chunks).toEqual([]);
  });
});

describe('Normalisierung (Suche)', () => {
  it('ä=ae, ö=oe, ü=ue, ß=ss, Großschreibung egal, Akzente weg', () => {
    expect(normalizeDe('Größe Übung Äpfel ÖL Fuß Café')).toBe(
      'groesse uebung aepfel oel fuss cafe',
    );
    expect(normalizeDe('Strasse')).toBe(normalizeDe('Straße'));
  });
});
