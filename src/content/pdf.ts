import type { PDFDocumentProxy } from 'pdfjs-dist';
import { DataError } from '../data/db/errors';
import type { PageInput, TextItem } from './structure';

type PdfJs = typeof import('pdfjs-dist');
let lib: Promise<PdfJs> | null = null;

/** Lädt pdf.js erst bei Bedarf (groß) und richtet den Web Worker ein. */
export function pdfjs(): Promise<PdfJs> {
  lib ??= import('pdfjs-dist').then((m) => {
    m.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
    return m;
  });
  return lib;
}

/** Öffnet ein PDF aus Bytes. Die Originalbytes werden nie verändert (pdf.js bekommt eine Kopie). */
export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const m = await pdfjs();
  try {
    return await m.getDocument({ data: bytes.slice() }).promise;
  } catch (e) {
    throw new DataError(
      'IMPORT_INVALID',
      'Die PDF-Datei lässt sich nicht öffnen (beschädigt oder passwortgeschützt).',
      e,
    );
  }
}

/** Textstücke aller Seiten, Koordinaten oben links (PDF-Punkte). */
export async function extractPages(
  doc: PDFDocumentProxy,
  onPage?: (done: number, total: number) => void,
): Promise<PageInput[]> {
  const pages: PageInput[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items: TextItem[] = [];
    for (const it of tc.items) {
      if (!('str' in it)) continue;
      const [a, b, , d, e, f] = it.transform as number[];
      const fontSize = Math.hypot(a ?? 0, b ?? 0) || Math.abs(d ?? 0) || 12;
      items.push({
        str: it.str,
        x: e ?? 0,
        y: vp.height - (f ?? 0),
        width: it.width,
        height: it.height || fontSize,
        fontSize,
      });
    }
    pages.push({ page: n - 1, width: vp.width, height: vp.height, items });
    page.cleanup();
    onPage?.(n, doc.numPages);
  }
  return pages;
}

/** Schließt ein PDF und gibt den Worker frei. */
export function closePdf(doc: PDFDocumentProxy): Promise<void> {
  return doc.loadingTask.destroy();
}
