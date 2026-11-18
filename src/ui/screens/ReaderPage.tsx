import { useLiveQuery } from 'dexie-react-hooks';
import type React from 'react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { newId } from '../../data/ids';
import { findMatches } from '../../content/text';
import { EmptyState, SegmentedControl, Stack } from '../components';
import { useDb } from '../DbProvider';
import { hrefTo } from '../useHashRoute';

// pdf.js ist groß: erst laden, wenn ein PDF geöffnet wird.
const PdfReader = lazy(() => import('./PdfReader'));

function Reflow({ docId, query }: { docId: string; query: string }) {
  const { t } = useTranslation();
  const db = useDb();
  const chunks = useLiveQuery(
    () => db.chunks.where('documentId').equals(docId).toArray(),
    [db, docId],
  );
  if (!chunks) return null;
  if (chunks.length === 0) return <p className="t-note">{t('reader.reflowEmpty')}</p>;
  const sorted = [...chunks].sort((a, b) => (a.id < b.id ? -1 : 1)); // ID = Dokument + laufende Nummer
  return (
    <div className="reflow">
      {sorted.map((c) => (
        <section key={c.id} className="reflow__chunk">
          <p className="t-note">
            {[...(c.headingPath ?? []), t('search.page', { page: c.page + 1 })].join(' › ')}
          </p>
          {c.text.split('\n\n').map((para, i) => (
            <p key={i}>{highlight(para, query)}</p>
          ))}
        </section>
      ))}
    </div>
  );
}

/** Text mit markierten Treffern, ausschließlich als Textknoten (nie als HTML). */
function highlight(text: string, query: string) {
  const ms = query ? findMatches(text, query) : [];
  if (!ms.length) return text;
  const out: (string | React.ReactElement)[] = [];
  let at = 0;
  ms.forEach((m, i) => {
    if (m.start > at) out.push(text.slice(at, m.start));
    out.push(<mark key={i}>{text.slice(m.start, m.end)}</mark>);
    at = m.end;
  });
  if (at < text.length) out.push(text.slice(at));
  return out;
}

export default function ReaderPage({
  id,
  page,
  query,
}: {
  id: string;
  page: number;
  query: string;
}) {
  const { t } = useTranslation();
  const db = useDb();
  const doc = useLiveQuery(() => db.documents.get(id), [db, id]);
  const blob = useLiveQuery(
    async () => (doc ? db.blobs.get(doc.blobRef) : undefined),
    [db, doc?.blobRef],
  );
  const annotations =
    useLiveQuery(() => db.annotations.where('documentId').equals(id).toArray(), [db, id]) ?? [];
  const [mode, setMode] = useState<'page' | 'reflow'>('page');
  const bytes = useMemo(() => (blob ? new Uint8Array(blob.data) : null), [blob]);
  const imageUrl = useMemo(
    () =>
      doc && blob && doc.type.startsWith('image/')
        ? URL.createObjectURL(new Blob([blob.data], { type: doc.type }))
        : null,
    [doc, blob],
  );
  useEffect(() => () => void (imageUrl && URL.revokeObjectURL(imageUrl)), [imageUrl]);

  const onAnnotate = useCallback(
    async (a: { page: number; rects: [number, number, number, number][]; note?: string }) => {
      await db.annotations.add({
        id: newId(),
        documentId: id,
        page: a.page,
        rects: a.rects,
        color: 'yellow',
        ...(a.note ? { note: a.note } : {}),
      });
    },
    [db, id],
  );

  if (doc === undefined) return null;
  if (!doc)
    return (
      <EmptyState
        title={t('reader.notFound')}
        text=""
        action={
          <a className="btn btn--secondary" href="#subjects">
            {t('subjects.back')}
          </a>
        }
      />
    );
  const isPdf = doc.type === 'application/pdf';

  return (
    <div className="reader view">
      <div className="reader__head">
        <a className="backlink" href={hrefTo('subject', doc.subjectId)}>
          ← {t('reader.back')}
        </a>
        <h1 className="reader__title" title={doc.name}>
          <bdi dir="auto">{doc.name}</bdi>
        </h1>
        <SegmentedControl
          legend={t('reader.modeLegend')}
          segments={[
            { id: 'page' as const, label: t('reader.modePage') },
            { id: 'reflow' as const, label: t('reader.modeReflow') },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>

      {mode === 'reflow' ? (
        <div
          className="reader__scroll reader__scroll--reflow"
          tabIndex={0}
          role="region"
          aria-label={t('reader.scroller')}
        >
          <Reflow docId={id} query={query} />
        </div>
      ) : isPdf ? (
        bytes ? (
          <Suspense fallback={<p className="t-note">{t('reader.loading')}</p>}>
            <PdfReader
              bytes={bytes}
              initialPage={Math.max(0, page - 1)}
              initialQuery={query}
              textlessPages={doc.textlessPages ?? []}
              annotations={annotations}
              onAnnotate={onAnnotate}
            />
          </Suspense>
        ) : (
          <p className="t-note">{t('reader.loading')}</p>
        )
      ) : imageUrl ? (
        <Stack space="stack" className="reader__scroll">
          <img className="reader__image" src={imageUrl} alt={doc.name} />
          <p className="t-note">{t('reader.imageNote')}</p>
        </Stack>
      ) : (
        <div
          className="reader__scroll reader__scroll--reflow"
          tabIndex={0}
          role="region"
          aria-label={t('reader.scroller')}
        >
          <Reflow docId={id} query={query} />
        </div>
      )}
    </div>
  );
}
