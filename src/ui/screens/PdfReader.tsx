import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { ChevronDown, ChevronUp, Minus, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { closePdf, openPdf, pdfjs } from '../../content/pdf';
import { findMatches } from '../../content/text';
import type { Annotation } from '../../data/db/schema';
import { Button, Cluster, Dialog, IconButton, Stack, TextArea } from '../components';

export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const;
const MAX_CANVAS_PIXELS = 16_000_000;

export interface NewAnnotation {
  page: number;
  rects: [number, number, number, number][];
  note?: string;
}

interface Match {
  page: number;
  /** n-ter Treffer auf der Seite */
  k: number;
}

interface PageProps {
  pdf: PDFDocumentProxy;
  pageNo: number;
  scale: number;
  size: { w: number; h: number };
  query: string;
  currentK: number | null;
  onSize: (pageNo: number, w: number, h: number) => void;
  onVisible: (pageNo: number, visible: boolean) => void;
  annotations: Annotation[];
  textless: boolean;
  root: HTMLElement | null;
}

/** Setzt Markierungen in die Textebene. Nur über `textContent` und DOM-Knoten, nie als HTML. */
function applyHighlights(
  layer: HTMLElement,
  query: string,
  currentK: number | null,
): HTMLElement | null {
  let k = 0;
  let current: HTMLElement | null = null;
  for (const span of Array.from(layer.querySelectorAll<HTMLElement>(':scope > span'))) {
    const orig = span.dataset.orig ?? span.textContent ?? '';
    span.dataset.orig = orig;
    const matches = query ? findMatches(orig, query) : [];
    if (!matches.length) {
      if (span.querySelector('mark')) span.textContent = orig;
      continue;
    }
    span.textContent = '';
    let at = 0;
    for (const m of matches) {
      if (m.start > at) span.append(document.createTextNode(orig.slice(at, m.start)));
      const mark = document.createElement('mark');
      mark.textContent = orig.slice(m.start, m.end);
      if (k === currentK) {
        mark.className = 'is-current';
        current = mark;
      }
      span.append(mark);
      at = m.end;
      k++;
    }
    if (at < orig.length) span.append(document.createTextNode(orig.slice(at)));
  }
  return current;
}

function PageView({
  pdf,
  pageNo,
  scale,
  size,
  query,
  currentK,
  onSize,
  onVisible,
  annotations,
  textless,
  root,
}: PageProps) {
  const { t } = useTranslation();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [renderTick, setRenderTick] = useState(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(!!e?.isIntersecting);
        onVisible(pageNo, !!e?.isIntersecting);
      },
      { root, rootMargin: '700px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [root, pageNo, onVisible]);

  // Rendern nur, wenn sichtbar; beim Zoomen neu (scharf), davor alte Aufgabe abbrechen.
  useEffect(() => {
    const cv = canvas.current;
    const tl = layer.current;
    if (!visible) {
      if (cv) cv.width = cv.height = 0;
      if (tl) tl.replaceChildren();
      return;
    }
    let cancelled = false;
    let task: RenderTask | null = null;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const page = await pdf.getPage(pageNo + 1);
          if (cancelled || !cv || !tl) return;
          const base = page.getViewport({ scale: 1 });
          onSize(pageNo, base.width, base.height);
          const vp = page.getViewport({ scale });
          let dpr = Math.min(window.devicePixelRatio || 1, 3);
          while (vp.width * dpr * vp.height * dpr > MAX_CANVAS_PIXELS && dpr > 0.5) dpr *= 0.85;
          cv.width = Math.floor(vp.width * dpr);
          cv.height = Math.floor(vp.height * dpr);
          cv.style.inlineSize = `${vp.width}px`;
          cv.style.blockSize = `${vp.height}px`;
          const ctx = cv.getContext('2d');
          if (!ctx) return;
          task = page.render({
            canvasContext: ctx,
            viewport: vp,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
            canvas: cv,
          });
          await task.promise;
          if (cancelled) return;
          tl.replaceChildren();
          const { TextLayer } = await pdfjs();
          await new TextLayer({
            textContentSource: page.streamTextContent(),
            container: tl,
            viewport: vp,
          }).render();
          if (!cancelled) setRenderTick((n) => n + 1);
        } catch (e) {
          if ((e as { name?: string }).name !== 'RenderingCancelledException')
            console.warn('Seite konnte nicht gezeichnet werden', e);
        }
      })();
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      task?.cancel();
    };
  }, [visible, scale, pdf, pageNo, onSize]);

  // Treffer markieren, sobald die Textebene steht (und bei neuer Suche)
  useEffect(() => {
    if (!renderTick || !layer.current) return;
    const cur = applyHighlights(layer.current, query, currentK);
    if (cur && currentK !== null) cur.scrollIntoView({ block: 'center', inline: 'center' });
  }, [renderTick, query, currentK]);

  const w = size.w * scale;
  const h = size.h * scale;
  return (
    <div
      className="pdfpage"
      data-page={pageNo}
      ref={wrap}
      style={{ inlineSize: w, blockSize: h, ['--total-scale-factor' as string]: scale }}
    >
      <canvas ref={canvas} aria-hidden="true" />
      <div className="textLayer" ref={layer} />
      {annotations.map((a) =>
        a.rects.map((r, i) => (
          <div
            key={`${a.id}-${i}`}
            className={`annot${a.note ? ' annot--note' : ''}`}
            title={a.note}
            style={{
              insetInlineStart: `${r[0] * 100}%`,
              insetBlockStart: `${r[1] * 100}%`,
              inlineSize: `${(r[2] - r[0]) * 100}%`,
              blockSize: `${(r[3] - r[1]) * 100}%`,
            }}
          />
        )),
      )}
      {textless && <p className="pdfpage__note t-note">{t('reader.textlessPage')}</p>}
    </div>
  );
}

export interface PdfReaderProps {
  bytes: Uint8Array;
  /** 0-basiert */
  initialPage: number;
  initialQuery: string;
  textlessPages: number[];
  annotations: Annotation[];
  onAnnotate: (a: NewAnnotation) => Promise<void>;
  /** Wird mit der Seitenzahl aufgerufen, sobald das Dokument offen ist */
  onOpened?: (numPages: number) => void;
}

export default function PdfReader({
  bytes,
  initialPage,
  initialQuery,
  textlessPages,
  annotations,
  onAnnotate,
  onOpened,
}: PdfReaderProps) {
  const { t } = useTranslation();
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [sizes, setSizes] = useState<Record<number, { w: number; h: number }>>({});
  const [width, setWidth] = useState(0);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const visible = useRef(new Set<number>());
  const [first, setFirst] = useState(initialPage);

  const [searchOpen, setSearchOpen] = useState(!!initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [committed, setCommitted] = useState(initialQuery);
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const [cur, setCur] = useState(0);

  const [selection, setSelection] = useState<NewAnnotation | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  /** Auswahl, die beim Öffnen des Notiz-Fensters festgehalten wird (der Dialog nimmt dem Text die Auswahl) */
  const [pending, setPending] = useState<NewAnnotation | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const jumped = useRef(false);

  // Dokument öffnen (pdf.js im Web Worker)
  useEffect(() => {
    let alive = true;
    let doc: PDFDocumentProxy | null = null;
    openPdf(bytes).then(
      async (d) => {
        doc = d;
        if (!alive) return void closePdf(d);
        const p1 = await d.getPage(1);
        const v = p1.getViewport({ scale: 1 });
        setSizes({ 0: { w: v.width, h: v.height } });
        setPdf(d);
        onOpened?.(d.numPages);
      },
      () => alive && setError(true),
    );
    return () => {
      alive = false;
      if (doc) void closePdf(doc);
    };
  }, [bytes, onOpened]);

  // Breite des Lesebereichs: 100 % Zoom = Seite füllt die Breite
  useEffect(() => {
    if (!scroller) return;
    const ro = new ResizeObserver(() => setWidth(scroller.clientWidth)); // meldet beim Start sofort die Größe
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [scroller]);

  const base = sizes[0];
  const fit = base && width ? Math.max(0.1, (width - 24) / base.w) : 1;
  const scale = fit * zoom;
  const sizeOf = useCallback((n: number) => sizes[n] ?? sizes[0] ?? { w: 595, h: 842 }, [sizes]);

  const onSize = useCallback((n: number, w: number, h: number) => {
    setSizes((s) => {
      const old = s[n];
      return old && Math.abs(old.w - w) < 1 && Math.abs(old.h - h) < 1
        ? s
        : { ...s, [n]: { w, h } };
    });
  }, []);
  const onVisible = useCallback((n: number, v: boolean) => {
    if (v) visible.current.add(n);
    else visible.current.delete(n);
    const min = Math.min(...visible.current);
    if (Number.isFinite(min)) setFirst(min);
  }, []);

  // Zur gewünschten Seite springen (einmal, wenn das Layout steht)
  useEffect(() => {
    if (!pdf || !scroller || jumped.current || !width) return;
    jumped.current = true;
    requestAnimationFrame(() =>
      scroller
        .querySelector(`[data-page="${Math.min(initialPage, pdf.numPages - 1)}"]`)
        ?.scrollIntoView({ block: 'start' }),
    );
  }, [pdf, scroller, width, initialPage]);

  // Suche über alle Seiten (nur Zählen; markiert wird in den sichtbaren Seiten)
  useEffect(() => {
    if (!pdf || !committed) return;
    let alive = true;
    void (async () => {
      setSearching(true);
      setMatches([]);
      const found: Match[] = [];
      for (let p = 0; p < pdf.numPages && alive; p++) {
        const page = await pdf.getPage(p + 1);
        const tc = await page.getTextContent();
        let k = 0;
        for (const it of tc.items) {
          if (!('str' in it) || !it.str) continue;
          for (let n = findMatches(it.str, committed).length; n > 0; n--)
            found.push({ page: p, k: k++ });
        }
        page.cleanup();
        if (p % 25 === 24 && alive) setMatches([...found]);
      }
      if (!alive) return;
      setMatches(found);
      setSearching(false);
      const start = found.findIndex((m) => m.page >= initialPage);
      setCur(start >= 0 ? start : 0);
    })();
    return () => {
      alive = false;
    };
  }, [pdf, committed, initialPage]);

  const goto = (i: number) => {
    if (!matches.length) return;
    const n = (i + matches.length) % matches.length;
    setCur(n);
    scroller
      ?.querySelector(`[data-page="${matches[n]!.page}"]`)
      ?.scrollIntoView({ block: 'start' });
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    setCommitted('');
  };

  // Ausgewählten Text erkennen (für „Markieren" und „Notiz")
  useEffect(() => {
    const onChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount || !scroller) return setSelection(null);
      const range = sel.getRangeAt(0);
      const startEl =
        range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer.parentElement;
      const pageEl = startEl?.closest<HTMLElement>('[data-page]');
      if (!pageEl || !scroller.contains(pageEl)) return setSelection(null);
      const box = pageEl.getBoundingClientRect();
      const rects = Array.from(range.getClientRects())
        .filter((r) => r.width > 1 && r.height > 1)
        .map((r): [number, number, number, number] => {
          const c = (n: number) => Math.min(1, Math.max(0, n));
          return [
            c((r.left - box.left) / box.width),
            c((r.top - box.top) / box.height),
            c((r.right - box.left) / box.width),
            c((r.bottom - box.top) / box.height),
          ];
        });
      setSelection(rects.length ? { page: Number(pageEl.dataset.page), rects } : null);
    };
    document.addEventListener('selectionchange', onChange);
    return () => document.removeEventListener('selectionchange', onChange);
  }, [scroller]);

  const save = async (withNote: boolean) => {
    const target = withNote ? (pending ?? selection) : selection;
    if (!target) return;
    await onAnnotate({ ...target, note: withNote ? note.trim() || undefined : undefined });
    setPending(null);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setNote('');
    setNoteOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const zi = ZOOM_LEVELS.indexOf(zoom as (typeof ZOOM_LEVELS)[number]);
  const shown = committed ? matches : []; // ohne Suchbegriff keine Treffer anzeigen
  const currentMatch = shown[cur];
  const textless = useMemo(() => new Set(textlessPages), [textlessPages]);
  const byPage = useMemo(() => {
    const m = new Map<number, Annotation[]>();
    for (const a of annotations) m.set(a.page, [...(m.get(a.page) ?? []), a]);
    return m;
  }, [annotations]);

  if (error)
    return (
      <p role="alert" className="msg msg--error">
        ⚠ {t('reader.openFailed')}
      </p>
    );

  return (
    <div className="pdfreader">
      <div className="reader__bar" role="toolbar" aria-label={t('reader.scroller')}>
        <Cluster space="tight">
          <IconButton
            label={t('reader.zoomOut')}
            icon={Minus}
            disabled={zi <= 0}
            onClick={() => setZoom(ZOOM_LEVELS[Math.max(0, zi - 1)]!)}
          />
          <span className="tabular reader__zoom" aria-live="polite">
            {t('reader.zoomValue', { percent: Math.round(zoom * 100) })}
          </span>
          <IconButton
            label={t('reader.zoomIn')}
            icon={Plus}
            disabled={zi >= ZOOM_LEVELS.length - 1}
            onClick={() => setZoom(ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, zi + 1)]!)}
          />
          <IconButton
            label={t('reader.searchOpen')}
            icon={Search}
            aria-pressed={searchOpen}
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          />
          {pdf && (
            <span className="t-note tabular">
              {t('reader.pageOf', { page: first + 1, total: pdf.numPages })}
            </span>
          )}
        </Cluster>
        {searchOpen && (
          <form
            className="reader__search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setCommitted(query.trim());
            }}
          >
            <input
              className="input"
              type="search"
              value={query}
              aria-label={t('reader.searchLabel')}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            <IconButton
              label={t('reader.prev')}
              icon={ChevronUp}
              type="button"
              disabled={!matches.length}
              onClick={() => goto(cur - 1)}
            />
            <IconButton
              label={t('reader.next')}
              icon={ChevronDown}
              type="button"
              disabled={!matches.length}
              onClick={() => goto(cur + 1)}
            />
            <IconButton
              label={t('reader.closeSearch')}
              icon={X}
              type="button"
              variant="quiet"
              onClick={closeSearch}
            />
            <span className="t-note reader__count" role="status">
              {searching
                ? t('reader.searching')
                : committed
                  ? matches.length
                    ? t('reader.searchCount', { current: cur + 1, count: matches.length })
                    : t('reader.searchNone')
                  : ''}
            </span>
          </form>
        )}
      </div>

      <div
        className="reader__scroll"
        ref={setScroller}
        tabIndex={0}
        aria-label={t('reader.scroller')}
        role="region"
      >
        {!pdf ? (
          <p className="t-note reader__loading">{t('reader.loading')}</p>
        ) : (
          Array.from({ length: pdf.numPages }, (_, n) => (
            <PageView
              key={n}
              pdf={pdf}
              pageNo={n}
              scale={scale}
              size={sizeOf(n)}
              query={committed}
              currentK={currentMatch && currentMatch.page === n ? currentMatch.k : null}
              onSize={onSize}
              onVisible={onVisible}
              annotations={byPage.get(n) ?? []}
              textless={textless.has(n)}
              root={scroller}
            />
          ))
        )}
      </div>

      {(selection || saved) && (
        <div
          className="reader__select"
          role="region"
          aria-label={t('reader.selection')}
          onPointerDown={(e) => e.preventDefault()}
        >
          {saved && !selection ? (
            <p role="status">{t('reader.saved')}</p>
          ) : (
            <Cluster>
              <Button onClick={() => void save(false)}>{t('reader.highlight')}</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPending(selection);
                  setNoteOpen(true);
                }}
              >
                {t('reader.note')}
              </Button>
            </Cluster>
          )}
        </div>
      )}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} title={t('reader.noteTitle')}>
        <Stack space="stack">
          <TextArea
            label={t('reader.noteLabel')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
          />
          <Cluster>
            <Button onClick={() => void save(true)}>{t('common.save')}</Button>
            <Button variant="secondary" onClick={() => setNoteOpen(false)}>
              {t('common.cancel')}
            </Button>
          </Cluster>
        </Stack>
      </Dialog>
    </div>
  );
}
