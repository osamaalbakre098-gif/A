import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toDisplay } from '../../core/model/mastery';
import { systemNow } from '../../data/clock';
import { appendEvent } from '../../data/events/events';
import { skillEvidence, skillInfos, type SkillInfo } from '../../data/progress';
import { Button, Cluster, ContentCard, Dialog, EmptyState, Stack, TextField } from '../components';
import { useDb } from '../DbProvider';
import { hrefTo } from '../useHashRoute';

const SYMBOL = { new: '○', building: '◐', sits: '●', refresh: '◌' } as const;

/** Könnensbaum als ausklappbare Liste (barrierefreie Ansicht, Schritt 6.5). Zustände stehen immer auch als Text da. */
export default function TreePage({ subjectId }: { subjectId: string }) {
  const { t, i18n } = useTranslation();
  const db = useDb();
  const subject = useLiveQuery(() => db.subjects.get(subjectId), [db, subjectId]);
  const data = useLiveQuery(async () => {
    const topics = (await db.topics.where('subjectId').equals(subjectId).toArray()).sort(
      (a, b) => a.order - b.order,
    );
    const infos = await skillInfos(db, systemNow());
    return topics.map((tp) => ({
      topic: tp,
      skills: [...infos.values()]
        .filter((i) => i.skill.topicId === tp.id)
        .sort((a, b) => a.skill.order - b.skill.order),
    }));
  }, [db, subjectId]);
  const [edit, setEdit] = useState(false);
  const [open, setOpen] = useState<SkillInfo | null>(null);
  const [name, setName] = useState('');
  const [undo, setUndo] = useState<{ id: string; title: string; hidden: boolean } | null>(null);
  const ev = useLiveQuery(() => (open ? skillEvidence(db, open.skill.id) : undefined), [db, open]);
  const src = useLiveQuery(async () => {
    const id = open?.skill.sourceChunkIds[0];
    const ch = id ? await db.chunks.get(id) : undefined;
    const doc = ch ? await db.documents.get(ch.documentId) : undefined;
    return ch && doc ? { name: doc.name, page: ch.page } : undefined;
  }, [db, open]);

  if (subject === undefined || data === undefined) return null;
  if (!subject) return <EmptyState title={t('subjects.notFound')} text="" />;
  const visible = data
    .map((d) => ({ ...d, skills: d.skills.filter((s) => edit || !s.skill.hidden) }))
    .filter((d) => d.skills.length > 0 && (edit || !d.topic.hidden));

  const change = async (
    info: SkillInfo,
    patch: { title?: string; hidden?: boolean },
    action: string,
  ) => {
    setUndo({ id: info.skill.id, title: info.skill.title, hidden: info.skill.hidden });
    await db.skills.update(info.skill.id, { ...patch, origin: 'user' });
    await appendEvent(
      db,
      { type: 'TreeEdited', payload: { target: 'skill', targetId: info.skill.id, action } },
      systemNow(),
    );
    setOpen(null);
  };
  const doUndo = async () => {
    if (!undo) return;
    await db.skills.update(undo.id, { title: undo.title, hidden: undo.hidden });
    await appendEvent(
      db,
      { type: 'TreeEdited', payload: { target: 'skill', targetId: undo.id, action: 'undo' } },
      systemNow(),
    );
    setUndo(null);
  };
  const date = (ts: number) =>
    new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'numeric' }).format(ts);

  return (
    <Stack space="section" className="view">
      <Stack space="tight">
        <a className="backlink" href={hrefTo('subject', subjectId)}>
          ← {t('tree.back')}
        </a>
        <h1>{t('tree.for', { subject: subject.name })}</h1>
      </Stack>
      <Cluster>
        <Button variant="secondary" aria-pressed={edit} onClick={() => setEdit(!edit)}>
          {edit ? t('tree.editDone') : t('tree.edit')}
        </Button>
        {undo && (
          <Button variant="quiet" onClick={() => void doUndo()}>
            {t('tree.undo')}
          </Button>
        )}
      </Cluster>
      {visible.length === 0 ? (
        <EmptyState title={t('tree.title')} text={t('tree.empty')} />
      ) : (
        visible.map(({ topic, skills }) => (
          <ContentCard key={topic.id} title={topic.title} accent="sage">
            <p className="t-note">{t('tree.count', { skills: skills.length })}</p>
            <ul className="plain doclist">
              {skills.map((i) => {
                const d = toDisplay(i.state);
                return (
                  <li key={i.skill.id}>
                    <button
                      type="button"
                      className="docrow treerow"
                      onClick={() => {
                        setName(i.skill.title);
                        setOpen(i);
                      }}
                    >
                      <span className="docrow__name">
                        <span aria-hidden="true">{SYMBOL[d]} </span>
                        {i.skill.title}
                        {i.skill.hidden ? ` (${t('tree.hiddenTitle')})` : ''}
                      </span>
                      <span className="t-note">
                        {t(`skillstate.${i.state}`)}
                        {i.skill.origin === 'fallback' ? ` · ${t('tree.simple')}` : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ContentCard>
        ))
      )}
      {data.some((d) => d.skills.some((s) => s.skill.origin === 'fallback' && !s.skill.hidden)) && (
        <p className="t-note">{t('tree.simpleNote')}</p>
      )}
      <Dialog open={!!open} onClose={() => setOpen(null)} title={open?.skill.title ?? ''}>
        {open && (
          <Stack space="stack">
            <p>{t('tree.stateLine', { state: t(`skillstate.${open.state}`) })}</p>
            {ev && (
              <p>
                {t('tree.evidence', {
                  unaided: ev.unaided,
                  withHelp: ev.withHelp,
                  when: ev.last ? t('tree.last', { date: date(ev.last) }) : '',
                })}
              </p>
            )}
            {src && <p className="t-note">{t('tree.source', src)}</p>}
            {edit && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim() && name.trim() !== open.skill.title)
                    void change(open, { title: name.trim() }, 'rename');
                }}
              >
                <Stack space="stack">
                  <TextField
                    label={t('tree.name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={90}
                  />
                  <Cluster>
                    <Button type="submit" variant="secondary">
                      {t('tree.save')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        void change(
                          open,
                          { hidden: !open.skill.hidden },
                          open.skill.hidden ? 'show' : 'hide',
                        )
                      }
                    >
                      {open.skill.hidden ? t('tree.show') : t('tree.hide')}
                    </Button>
                  </Cluster>
                </Stack>
              </form>
            )}
            <Cluster>
              <a className="btn" href={hrefTo('practice', open.skill.id)}>
                {t('tree.practice')}
              </a>
              <Button variant="quiet" onClick={() => setOpen(null)}>
                {t('tree.close')}
              </Button>
            </Cluster>
          </Stack>
        )}
      </Dialog>
    </Stack>
  );
}
