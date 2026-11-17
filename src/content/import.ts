import type { MadarDB } from '../data/db/db';
import { DataError, toDataError } from '../data/db/errors';
import type { Chunk, DocumentRow } from '../data/db/schema';
import { checkStorage, getStorageEstimate, type StorageEstimateLike } from '../data/db/storage';
import { appendEvent } from '../data/events/events';
import { sha256Hex } from '../data/hash';
import { newId } from '../data/ids';
import { structurePdf, structureText, type PageInput, type Structured } from './structure';

export type ImportPhase = 'reading' | 'extracting' | 'structuring' | 'saving';

export interface ImportInput {
  subjectId: string;
  name: string;
  /** MIME-Typ, falls bekannt */
  type: string;
  bytes: Uint8Array;
}

export interface ImportDeps {
  /** PDF → Textstücke je Seite (pdf.js im Browser; in Tests ein Ersatz) */
  extractPdf: (
    bytes: Uint8Array,
    onPage?: (done: number, total: number) => void,
  ) => Promise<PageInput[]>;
  estimate?: StorageEstimateLike;
}

export type ImportResult =
  | {
      status: 'imported';
      documentId: string;
      chunks: number;
      pages: number;
      textlessPages: number;
      kind: Kind;
      needsOcr: boolean;
    }
  | { status: 'duplicate'; documentId: string };

export type Kind = 'pdf' | 'text' | 'image';

export function detectKind(name: string, type: string): Kind | null {
  const n = name.toLowerCase();
  if (type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (type.startsWith('image/') || /\.(png|jpe?g|heic|heif|webp|gif)$/.test(n)) return 'image';
  if (type.startsWith('text/') || /\.(txt|md|markdown)$/.test(n)) return 'text';
  return null;
}

/**
 * Importiert Material in ein Fach. Die Originaldatei wird unverändert als Datei gespeichert (nur einmal je Prüfsumme),
 * alles andere (Dokument, Abschnitte, Ereignis) in EINER Transaktion: bei einem Fehler wird nichts gespeichert.
 */
export async function importMaterial(
  db: MadarDB,
  input: ImportInput,
  deps: ImportDeps,
  now: number,
  onPhase?: (phase: ImportPhase, detail?: { done: number; total: number }) => void,
): Promise<ImportResult> {
  const kind = detectKind(input.name, input.type);
  if (!kind)
    throw new DataError(
      'IMPORT_INVALID',
      'Dieses Dateiformat kann Madar noch nicht lesen (PDF, Text oder Foto).',
    );

  onPhase?.('reading');
  const sha = await sha256Hex(input.bytes);
  const existing = await db.documents
    .where('[sha256+subjectId]')
    .equals([sha, input.subjectId])
    .first();
  if (existing) return { status: 'duplicate', documentId: existing.id };

  const storage = checkStorage(
    deps.estimate ?? (await getStorageEstimate()),
    input.bytes.byteLength * 1.2,
  );
  if (storage.level === 'insufficient')
    throw new DataError('STORAGE_FULL', 'Auf dem Gerät ist nicht genug Platz für diese Datei.');

  let structured: Structured = { chunks: [], outline: [], textlessPages: [] };
  let pageCount = 1;
  if (kind === 'pdf') {
    onPhase?.('extracting', { done: 0, total: 0 });
    const pages = await deps.extractPdf(input.bytes, (done, total) =>
      onPhase?.('extracting', { done, total }),
    );
    onPhase?.('structuring');
    pageCount = pages.length;
    structured = structurePdf(pages);
  } else if (kind === 'text') {
    onPhase?.('structuring');
    structured = structureText(new TextDecoder('utf-8').decode(input.bytes));
  }

  const textless = structured.textlessPages;
  const needsOcr =
    kind === 'image' || (kind === 'pdf' && pageCount > 0 && textless.length / pageCount >= 0.5);
  const documentId = newId();
  const doc: DocumentRow = {
    id: documentId,
    sha256: sha,
    subjectId: input.subjectId,
    name: input.name,
    type:
      input.type ||
      (kind === 'pdf' ? 'application/pdf' : kind === 'text' ? 'text/plain' : 'image/*'),
    blobRef: sha,
    pageCount,
    ocrStatus: needsOcr ? 'pending' : 'none',
    importedAt: now,
    ...(structured.outline.length ? { outline: structured.outline } : {}),
    ...(textless.length ? { textlessPages: textless } : {}),
  };
  // Die ID enthält die laufende Nummer: so bleibt die Reihenfolge der Abschnitte in der Datenbank erhalten.
  const chunks: Chunk[] = structured.chunks.map((c, i) => ({
    id: `${documentId}:${String(i).padStart(5, '0')}`,
    documentId,
    page: c.page,
    text: c.text,
    origin: 'text',
    ...(c.bbox ? { bbox: c.bbox } : {}),
    ...(c.headingPath.length ? { headingPath: c.headingPath } : {}),
  }));

  onPhase?.('saving');
  try {
    await db.transaction('rw', [db.blobs, db.documents, db.chunks, db.events], async () => {
      if (!(await db.blobs.get(sha)))
        await db.blobs.add({ sha256: sha, data: input.bytes.slice().buffer });
      await db.documents.add(doc);
      if (chunks.length) await db.chunks.bulkAdd(chunks);
      await appendEvent(
        db,
        {
          type: 'FileImported',
          payload: { documentId, subjectId: input.subjectId, sha256: sha, name: input.name },
        },
        now,
      );
    });
  } catch (e) {
    throw toDataError(e);
  }
  return {
    status: 'imported',
    documentId,
    chunks: chunks.length,
    pages: pageCount,
    textlessPages: textless.length,
    kind,
    needsOcr,
  };
}
