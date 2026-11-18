import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, FilePlus, FileText, Plus, Sprout } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildFallbackTree } from '../../content/tree-builder/fallback';
import { importMaterial, type ImportDeps, type ImportPhase } from '../../content/import';
import { systemNow } from '../../data/clock';
import { DataError } from '../../data/db/errors';
import type { DocumentRow } from '../../data/db/schema';
import { fileProgress, skillInfos } from '../../data/progress';
import {
  Banner,
  Button,
  Card,
  Chip,
  EmptyState,
  LargeTitle,
  ListGroup,
  ListRow,
  ProgressArc,
  ProgressBar,
  SectionHeader,
  Sheet,
  Stack,
  TextArea,
  TextField,
} from '../components';
import { useDb } from '../DbProvider';
import { hrefTo } from '../useHashRoute';
import { ExamRow, ExamSheet } from './ExamCard';
import './Fach.css';

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

function FileRow({ d }: { d: DocumentRow }) {
  const { t, i18n } = useTranslation();
  const db = useDb();
  const kind =
    d.type === 'application/pdf'
      ? 'kindPdf'
      : d.type.startsWith('image/')
        ? 'kindImage'
        : 'kindText';
  const date = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-u-nu-latn' : i18n.language, {
    dateStyle: 'medium',
  }).format(d.importedAt);
  const progress = useLiveQuery(() => fileProgress(db, d.id), [db, d.id]);
  const label =
    progress?.percent == null
      ? progress && progress.skills > 0
        ? t('progress.few')
        : t('progress.noSkills')
      : t('progress.percent', {
          percent: progress.percent,
          sits: progress.sits,
          skills: progress.skills,
        });
  return (
    <ListRow
      icon={FileText}
      title={<bdi dir="auto">{d.name}</bdi>}
      subtitle={[
        t(`material.${kind}`),
        t('material.pages', { count: d.pageCount ?? 1 }),
        date,
      ].join(' · ')}
      href={hrefTo('doc', d.id)}
      extra={
        <>
          <ProgressBar percent={progress?.percent ?? null} label={`${d.name}: ${label}`} />
          <span className="listrow__sub" data-testid="file-progress">
            {label}
          </span>
          {!!d.textlessPages?.length && d.ocrStatus !== 'pending' && (
            <span className="listrow__sub">
              {t('material.textless', { count: d.textlessPages.length })}
            </span>
          )}
          {d.ocrStatus === 'pending' && <Chip tone="warning">{t('material.statusOcr')}</Chip>}
        </>
      }
    />
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
  const skillSummary = useLiveQuery(async () => {
    const topics = await db.topics.where('subjectId').equals(id).toArray();
    const ids = new Set(topics.map((x) => x.id));
    const infos = [...(await skillInfos(db, systemNow())).values()].filter(
      (i) => ids.has(i.skill.topicId) && !i.skill.hidden,
    );
    return {
      total: infos.length,
      sits: infos.filter((i) => i.state === 'mastered' || i.state === 'review_due').length,
    };
  }, [db, id]);
  const [status, setStatus] = useState<Status[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [paste, setPaste] = useState(false);
  const [exam, setExam] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
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

  const sum = skillSummary ?? { total: 0, sits: 0 };
  return (
    <>
      <LargeTitle>{subject.name}</LargeTitle>

      {status.length > 0 && (
        <Stack space="tight">
          {status.map((s) => (
            <Banner
              key={s.key}
              tone={s.kind === 'error' ? 'danger' : s.kind === 'ok' ? 'success' : 'info'}
            >
              {s.kind === 'busy' ? `${s.name}: ${s.text}` : s.text}
            </Banner>
          ))}
        </Stack>
      )}

      <Card aria-label={t('fach.progressTitle')}>
        <div className="fach__head">
          <ProgressArc
            done={sum.sits}
            total={Math.max(sum.total, 1)}
            label={t('fach.progressLine', { sits: sum.sits, total: sum.total })}
          />
          <p className="fach__line">
            {sum.total
              ? t('fach.progressLine', { sits: sum.sits, total: sum.total })
              : t('progress.noSkills')}
          </p>
        </div>
      </Card>

      <ListGroup>
        <ExamRow subjectId={id} onOpen={() => setExam(true)} />
        <ListRow icon={Sprout} title={t('heute.treeRowTitle')} href={hrefTo('tree', id)} />
      </ListGroup>

      <Stack space="tight">
        <SectionHeader>{t('fach.filesTitle')}</SectionHeader>
        <ListGroup label={t('fach.filesTitle')}>
          {docs?.map((d) => (
            <FileRow key={d.id} d={d} />
          ))}
          <ListRow icon={Plus} title={t('material.add')} onClick={() => setAddOpen(true)} />
        </ListGroup>
        {docs && docs.length === 0 && <p className="t-note">{t('material.empty')}</p>}
      </Stack>

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

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={t('material.add')} size="sm">
        <Stack space="stack">
          <ListGroup>
            <ListRow
              icon={FilePlus}
              title={t('material.addFile')}
              subtitle={t('material.accepted')}
              onClick={() => {
                setAddOpen(false);
                fileRef.current?.click();
              }}
            />
            <ListRow
              icon={Camera}
              title={t('material.takePhoto')}
              onClick={() => {
                setAddOpen(false);
                photoRef.current?.click();
              }}
            />
            <ListRow
              icon={FileText}
              title={t('material.pasteText')}
              onClick={() => {
                setAddOpen(false);
                setPaste(true);
              }}
            />
          </ListGroup>
        </Stack>
      </Sheet>

      <Sheet
        open={paste}
        onClose={() => setPaste(false)}
        title={t('material.pasteTitle')}
        size="lg"
        footer={
          <Button size="l" fullWidth disabled={!body.trim()} onClick={() => void savePaste()}>
            {t('common.save')}
          </Button>
        }
      >
        <Stack space="stack">
          <TextField
            label={t('material.pasteName')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            enterKeyHint="next"
            autoComplete="off"
          />
          <TextArea
            label={t('material.pasteBody')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
          />
        </Stack>
      </Sheet>

      <ExamSheet subjectId={id} open={exam} onClose={() => setExam(false)} />
    </>
  );
}
