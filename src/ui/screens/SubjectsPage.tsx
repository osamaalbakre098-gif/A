import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { systemNow } from '../../data/clock';
import { newId } from '../../data/ids';
import { Plus } from 'lucide-react';
import {
  Button,
  EmptyState,
  LargeTitle,
  ListGroup,
  ListRow,
  Sheet,
  Stack,
  TextField,
} from '../components';
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

  const visible = subjects?.filter((s) => !s.archived) ?? [];
  return (
    <>
      <LargeTitle>{t('subjects.title')}</LargeTitle>
      {subjects && visible.length === 0 ? (
        <EmptyState
          title={t('subjects.emptyTitle')}
          text={t('subjects.emptyText')}
          action={
            <Button size="l" onClick={() => setOpen(true)}>
              {t('subjects.add')}
            </Button>
          }
        />
      ) : (
        <ListGroup label={t('subjects.title')}>
          {visible.map((s) => (
            <ListRow
              key={s.id}
              dot={s.colorKey}
              title={<bdi dir="auto">{s.name}</bdi>}
              subtitle={t('subjects.docs', { count: counts?.[s.id] ?? 0 })}
              href={hrefTo('subject', s.id)}
            />
          ))}
          <ListRow icon={Plus} title={t('subjects.add')} onClick={() => setOpen(true)} />
        </ListGroup>
      )}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('subjects.add')}
        size="sm"
        footer={
          <Button size="l" fullWidth disabled={!name.trim()} onClick={() => void create()}>
            {t('subjects.create')}
          </Button>
        }
      >
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
              enterKeyHint="done"
              autoComplete="off"
            />
          </Stack>
        </form>
      </Sheet>
    </>
  );
}
