import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, FilePlus, FileText } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { importMaterial, type ImportDeps, type ImportPhase } from '../../content/import';
import { systemNow } from '../../data/clock';
import { DataError } from '../../data/db/errors';
import { buildFallbackTree } from '../../content/tree-builder/fallback';
import { fileProgress, skillInfos } from '../../data/progress';
import type { DocumentRow } from '../../data/db/schema';
import {
  Button,
  Cluster,
  ContentCard,
  Dialog,
  EmptyState,
  Icon,
  Stack,
  TextArea,
  TextField,
} from '../components';
import { useDb } from '../DbProvider';
import { hrefTo } from '../useHashRoute';

/** pdf.js erst laden, wenn wirklich ein PDF kommt. */
const deps: ImportDeps = {
  extractPdf: async (bytes, onPage) => {
    const { openPdf, extractPages, closePdf } = await import('../../content/pdf');
    const doc = await openPdf(bytes);
    try {
      return await extractPages(doc, onPage);
    } finally {
      void closePdf(doc);
    }
  },
};

interface Status {
  key: number;
  name: string;
  kind: 'busy' | 'ok' | 'error';
  text: string;
}

function DocRow({ d }: { d: DocumentRow }) {
  const { t, i18n } = useTranslation();
  const kind =
    d.type === 'application/pdf'
      ? 'kindPdf'
      : d.type.startsWith('image/')
        ? 'kindImage'
        : 'kindText';
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(d.importedAt);
  const db = useDb();
  const progress = useLiveQuery(() => fileProgress(db, d.id), [db, d.id]);
  return (
    <li>
      <a className="docrow" href={hrefTo('doc', d.id)}>
        <span className="docrow__name">{d.name}</span>
        <span className="t-note">
          {[t(`material.${kind}`), t('material.pages', { count: d.pageCount ?? 1 }), date].join(
            ' · ',
          )}
        </span>
        {progress && (
          <span className="t-note" data-testid="file-progress">
            {progress.percent === null
              ? progress.skills === 0
                ? t('progress.noSkills')
                : t('progress.few')
              : t('progress.percent', {
                  percent: progress.percent,
                  sits: progress.sits,
                  skills: progress.skills,
                })}
          </span>
        )}
        {d.ocrStatus === 'pending' && <span className="chip">{t('material.statusOcr')}</span>}
        {!!d.textlessPages?.length && d.ocrStatus !== 'pending' && (
          <span className="chip">{t('material.textless', { count: d.textlessPages.length })}</span>
        )}
      </a>
    </li>
  );
}

export default function SubjectPage({ id }: { id: string }) {
  const { t } = useTranslation();
  const db = useDb();
  const subject = useLiveQuery(() => db.subjects.get(id), [db, id]);
  const docs = useLiveQuery(
    () => db.documents.where('subjectId').equals(id).reverse().sortBy('importedAt'),
    [db, id],
  );
  const skillRows = useLiveQuery(async () => {
    const topics = await db.topics.where('subjectId').equals(id).toArray();
    const ids = new Set(topics.map((x) => x.id));
    const infos = await skillInfos(db, systemNow());
    return [...infos.values()].filter((i) => ids.has(i.skill.topicId) && !i.skill.hidden);
  }, [db, id]);
  const [status, setStatus] = useState<Status[]>([]);
  const [paste, setPaste] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const counter = useRef(0);

  const setOne = (key: number, patch: Partial<Status>) =>
    setStatus((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const phaseText = (p: ImportPhase, d?: { done: number; total: number }) =>
    p === 'extracting' && d && d.total > 0
      ? t('material.phaseExtractingPage', d)
      : t(`material.phase${p[0]!.toUpperCase()}${p.slice(1)}`);

  async function run(name: string, type: string, bytes: Uint8Array) {
    const key = ++counter.current;
    setStatus((s) => [...s, { key, name, kind: 'busy', text: t('material.phaseReading') }]);
    try {
      const r = await importMaterial(
        db,
        { subjectId: id, name, type, bytes },
        deps,
        systemNow(),
        (p, d) => setOne(key, { text: phaseText(p, d) }),
      );
      if (r.status === 'imported' && r.kind !== 'image')
        await buildFallbackTree(db, r.documentId, systemNow()).catch(() => undefined);
      if (r.status === 'duplicate')
        setOne(key, { kind: 'ok', text: t('material.duplicate', { name }) });
      else if (r.kind === 'image')
        setOne(key, { kind: 'ok', text: t('material.imageSaved', { name }) });
      else if (r.needsOcr) setOne(key, { kind: 'ok', text: t('material.scanNote', { name }) });
      else setOne(key, { kind: 'ok', text: t('material.imported', { name, chunks: r.chunks }) });
    } catch (e) {
      const text =
        e instanceof DataError && e.code === 'STORAGE_FULL'
          ? t('data.errorSTORAGE_FULL')
          : e instanceof DataError
            ? t('material.errorInvalid', { name })
            : t('data.errorUnknown');
      setOne(key, { kind: 'error', text });
    }
  }

  async function onFiles(files: FileList | File[] | null) {
    if (!files) return;
    for (const f of Array.from(files))
      await run(f.name, f.type, new Uint8Array(await f.arrayBuffer()));
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void onFiles(e.dataTransfer.files);
  };

  const savePaste = async () => {
    const text = body.trim();
    if (!text) return;
    setPaste(false);
    const name = title.trim() || t('material.pasteDefaultName');
    setTitle('');
    setBody('');
    await run(name, 'text/plain', new TextEncoder().encode(text));
  };

  if (subject === undefined) return null;
  if (!subject)
    return (
      <EmptyState
        title={t('subjects.notFound')}
        text=""
        action={
          <a className="btn btn--secondary" href="#subjects">
            {t('subjects.back')}
          </a>
        }
      />
    );

  return (
    <Stack space="section" className="view">
      <Stack space="tight">
        <a className="backlink" href="#subjects">
          ← {t('subjects.back')}
        </a>
        <h1>{subject.name}</h1>
      </Stack>

      <ContentCard title={t('material.add')} accent={subject.colorKey}>
        <div
          className={`dropzone${drag ? ' dropzone--over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <Cluster>
            <Button onClick={() => fileRef.current?.click()}>
              <Icon as={FilePlus} size={20} />
              {t('material.addFile')}
            </Button>
            <Button variant="secondary" onClick={() => photoRef.current?.click()}>
              <Icon as={Camera} size={20} />
              {t('material.takePhoto')}
            </Button>
            <Button variant="secondary" onClick={() => setPaste(true)}>
              <Icon as={FileText} size={20} />
              {t('material.pasteText')}
            </Button>
          </Cluster>
          <p className="t-note">
            {t('material.accepted')}
            <span className="dropzone__hint"> · {t('material.dropHint')}</span>
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          hidden
          multiple
          accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown,image/*"
          aria-label={t('material.addFile')}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={photoRef}
          type="file"
          hidden
          accept="image/*"
          capture="environment"
          aria-label={t('material.takePhoto')}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div aria-live="polite" className="importlog">
          {status.map((s) => (
            <p
              key={s.key}
              role={s.kind === 'error' ? 'alert' : 'status'}
              className={s.kind === 'error' ? 'msg msg--error' : 'msg'}
            >
              {s.kind === 'error' ? '⚠ ' : s.kind === 'ok' ? '✓ ' : ''}
              {s.kind === 'busy' ? `${s.name}: ${s.text}` : s.text}
            </p>
          ))}
        </div>
      </ContentCard>

      <Stack space="stack">
        <h2>{t('material.title')}</h2>
        {docs && docs.length === 0 ? (
          <p className="t-note">{t('material.empty')}</p>
        ) : (
          <ul className="plain doclist">
            {docs?.map((d) => (
              <DocRow key={d.id} d={d} />
            ))}
          </ul>
        )}
      </Stack>

      <Stack space="stack">
        <h2>{t('skills.title')}</h2>
        <Cluster>
          <a className="btn btn--secondary" href={hrefTo('tree', id)}>
            {t('tree.openTree')}
          </a>
        </Cluster>
        {skillRows && skillRows.length === 0 ? (
          <p className="t-note">{t('skills.none')}</p>
        ) : (
          <ul className="plain doclist">
            {skillRows?.map((r) => (
              <li key={r.skill.id}>
                <a className="docrow" href={hrefTo('practice', r.skill.id)}>
                  <span className="docrow__name">{r.skill.title}</span>
                  <span className="t-note">
                    {[
                      t(`skillstate.${r.state}`),
                      r.items > 0
                        ? t('skills.items', { count: r.items })
                        : t('skills.itemsMissing'),
                    ].join(' · ')}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Stack>

      <Dialog open={paste} onClose={() => setPaste(false)} title={t('material.pasteTitle')}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void savePaste();
          }}
        >
          <Stack space="stack">
            <TextField
              label={t('material.pasteName')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
            <TextArea
              label={t('material.pasteBody')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
            />
            <Cluster>
              <Button type="submit" disabled={!body.trim()}>
                {t('common.save')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setPaste(false)}>
                {t('common.cancel')}
              </Button>
            </Cluster>
          </Stack>
        </form>
      </Dialog>
    </Stack>
  );
}
