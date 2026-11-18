import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dayDiff } from '../../core/director/days';
import { learningDayKey } from '../../core/time';
import { systemNow } from '../../data/clock';
import { addExam } from '../../data/director-data';
import { newId } from '../../data/ids';
import { Button, ListGroup, ListRow, Sheet, Stack, TextField, useToast } from '../components';
import { useDb } from '../DbProvider';

/** Zeile für die Fachseite: „Prüfung eintragen" oder „Prüfung am 12.12. (in 24 Tagen)". Öffnet das Sheet. */
export function ExamRow({ subjectId, onOpen }: { subjectId: string; onOpen: () => void }) {
  const { t, i18n } = useTranslation();
  const db = useDb();
  const next = useLiveQuery(async () => {
    const today = learningDayKey(new Date(systemNow()));
    return (await db.exams.where('subjectId').equals(subjectId).toArray())
      .filter((e) => dayDiff(today, e.date) >= 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  }, [db, subjectId]);
  const today = learningDayKey(new Date(systemNow()));
  const date = next
    ? new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-u-nu-latn' : i18n.language, {
        day: 'numeric',
        month: 'numeric',
      }).format(new Date(`${next.date}T12:00:00`))
    : '';
  return (
    <ListRow
      title={next ? t('exam.rowSet', { date, days: dayDiff(today, next.date) }) : t('exam.add')}
      onClick={onOpen}
    />
  );
}

/** Prüfung eintragen oder verschieben (Sheet). Madar plant rückwärts davon, ohne Vorwurf bei Änderungen. */
export function ExamSheet({
  subjectId,
  open,
  onClose,
}: {
  subjectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const db = useDb();
  const toast = useToast();
  const exams = useLiveQuery(
    async () =>
      (await db.exams.where('subjectId').equals(subjectId).toArray()).sort((a, b) =>
        a.date < b.date ? -1 : 1,
      ),
    [db, subjectId],
  );
  const [date, setDate] = useState('');
  const fmt = (d: string) =>
    new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-u-nu-latn' : i18n.language, {
      dateStyle: 'full',
    }).format(new Date(`${d}T12:00:00`));
  const save = async () => {
    if (!date) return;
    await addExam(db, { id: newId(), subjectId, date });
    setDate('');
    onClose();
    toast.show({ text: t('exam.saved') });
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('exam.title')}
      size="md"
      footer={
        <Button size="l" fullWidth disabled={!date} onClick={() => void save()}>
          {t('common.save')}
        </Button>
      }
    >
      <Stack space="stack">
        {exams?.length ? (
          <ListGroup label={t('exam.title')}>
            {exams.map((e) => (
              <ListRow
                key={e.id}
                title={fmt(e.date)}
                trailing={
                  <TextField
                    label={t('exam.moveLabel', { date: fmt(e.date) })}
                    type="date"
                    value={e.date}
                    onChange={(ev) =>
                      ev.target.value && void db.exams.update(e.id, { date: ev.target.value })
                    }
                  />
                }
              />
            ))}
          </ListGroup>
        ) : (
          <p className="t-note">{t('exam.none')}</p>
        )}
        <TextField
          label={t('exam.dateLabel')}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <p className="t-note">{t('exam.note')}</p>
      </Stack>
    </Sheet>
  );
}

export default ExamSheet;
