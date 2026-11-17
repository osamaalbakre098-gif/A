/** Erzeugt kleine, gültige PDFs für Tests (Helvetica, WinAnsi). */
export interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
}

const latin1 = (s: string): Buffer => Buffer.from(s, 'latin1');

function esc(text: string): string {
  let out = '';
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (ch === '\\' || ch === '(' || ch === ')') out += `\\${ch}`;
    else if (c > 126)
      out += `\\${c.toString(8).padStart(3, '0')}`; // ä ö ü ß …
    else out += ch;
  }
  return out;
}

/** Jede Seite = Liste von Zeilen; `text: ''` ist ein Absatzabstand. */
export function makePdf(pages: PdfLine[][]): Uint8Array {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body) && objects.length;
  add('<< /Type /Catalog /Pages 2 0 R >>');
  const kids: number[] = [];
  const pageIds = pages.map((_, i) => 5 + i * 2);
  add(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  );
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  for (const lines of pages) {
    let y = 90;
    let stream = '';
    for (const l of lines) {
      const size = l.size ?? 12;
      if (l.text === '') {
        y += 14;
        continue;
      }
      stream += `BT /${l.bold ? 'F2' : 'F1'} ${size} Tf 60 ${842 - y} Td (${esc(l.text)}) Tj ET\n`;
      y += size * 1.3;
    }
    const pageId = objects.length + 1;
    kids.push(pageId);
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`,
    );
    add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  }
  const parts: Buffer[] = [latin1('%PDF-1.4\n')];
  const offsets: number[] = [];
  let pos = parts[0]!.length;
  objects.forEach((body, i) => {
    offsets.push(pos);
    const b = latin1(`${i + 1} 0 obj\n${body}\nendobj\n`);
    parts.push(b);
    pos += b.length;
  });
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  parts.push(
    latin1(
      `${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`,
    ),
  );
  return new Uint8Array(Buffer.concat(parts));
}

/** Zeilen à ~10 Wörter aus einem Satz-Muster */
export function paragraph(words: number, seed: string): PdfLine[] {
  const ws = Array.from({ length: words }, (_, i) => `${seed}${i}`);
  const out: PdfLine[] = [];
  for (let i = 0; i < ws.length; i += 9) out.push({ text: ws.slice(i, i + 9).join(' ') });
  return out;
}

/** Beispielskript: 3 Seiten Physik mit Überschriften */
export function physicsPdf(): Uint8Array {
  return makePdf([
    [
      { text: 'Physik Skript', size: 24 },
      { text: 'Vektoren', size: 16 },
      { text: 'Ein Vektor hat Betrag und Richtung. Die Geschwindigkeit ist ein Vektor.' },
      { text: 'Die Größe eines Vektors heißt Betrag.' },
      { text: '' },
      ...paragraph(60, 'alpha'),
    ],
    [
      { text: 'Addition von Vektoren', size: 16 },
      { text: 'Vektoren addiert man komponentenweise. Die Geschwindigkeit addiert sich ebenso.' },
      ...paragraph(60, 'beta'),
    ],
    [
      { text: 'Kräfte', size: 16 },
      { text: 'Kräfte sind Vektoren mit der Einheit Newton.' },
      ...paragraph(40, 'gamma'),
    ],
  ]);
}

/** Großes PDF: n Seiten, alle 10 Seiten eine Überschrift, auf jeder Seite ein eindeutiges Wort */
export function bigPdf(n: number): Uint8Array {
  return makePdf(
    Array.from({ length: n }, (_, i) => [
      ...(i % 10 === 0 ? [{ text: `Kapitel ${i / 10 + 1}`, size: 20 }] : []),
      { text: `Seite ${i + 1} Markierung seite${i + 1}x` },
      ...paragraph(120, `s${i}w`),
    ]),
  );
}
