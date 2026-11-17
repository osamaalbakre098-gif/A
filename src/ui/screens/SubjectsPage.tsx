import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { systemNow } from '../../data/clock';
import { newId } from '../../data/ids';
import { Button, Cluster, ContentCard, Dialog, EmptyState, Stack, TextField } from '../components';
import { useDb } from '../DbProvider';
import { hrefTo } from '../useHashRoute';

export const SUBJECT_COLORS = [
  'sage',
  'ocean',
  'brick',
  'sand',
  'plum',
  'moss',
  'slate',
  'amber',
] as const;

export default function SubjectsPage() {
  const { t } = useTranslation();
  const db = useDb();
  const subjects = useLiveQuery(
    async () => (await db.subjects.toArray()).sort((a, b) => a.createdAt - b.createdAt),
    [db],
  );
  const counts = useLiveQuery(async () => {
    const c: Record<string, number> = {};
    await db.documents.each((d) => {
      c[d.subjectId] = (c[d.subjectId] ?? 0) + 1;
    });
    return c;
  }, [db]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await db.subjects.add({
      id: newId(),
      name: trimmed,
      colorKey: SUBJECT_COLORS[(subjects?.length ?? 0) % SUBJECT_COLORS.length]!,
      createdAt: systemNow(),
      archived: false,
    });
    setName('');
    setOpen(false);
  };

  return (
    <Stack space="section" className="view">
      <h1>{t('subjects.title')}</h1>
      {subjects && subjects.length === 0 ? (
        <EmptyState
          title={t('subjects.emptyTitle')}
          text={t('subjects.emptyText')}
          action={<Button onClick={() => setOpen(true)}>{t('subjects.add')}</Button>}
        />
      ) : (
        <>
          <div className="heute__grid">
            {subjects
              ?.filter((s) => !s.archived)
              .map((s) => (
                <a key={s.id} className="cardlink" href={hrefTo('subject', s.id)}>
                  <ContentCard title={s.name} accent={s.colorKey}>
                    <p className="t-note">{t('subjects.docs', { count: counts?.[s.id] ?? 0 })}</p>
                  </ContentCard>
                </a>
              ))}
          </div>
          <Cluster>
            <Button variant="secondary" onClick={() => setOpen(true)}>
              {t('subjects.add')}
            </Button>
          </Cluster>
        </>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={t('subjects.add')}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <Stack space="stack">
            <TextField
              label={t('subjects.nameLabel')}
              hint={t('subjects.nameHint')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={60}
            />
            <Cluster>
              <Button type="submit" disabled={!name.trim()}>
                {t('subjects.create')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
            </Cluster>
          </Stack>
        </form>
      </Dialog>
    </Stack>
  );
}
