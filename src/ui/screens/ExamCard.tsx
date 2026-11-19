import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dayDiff } from '../../core/director/days';
import { learningDayKey } from '../../core/time';
import { systemNow } from '../../data/clock';
import { addExam } from '../../data/director-data';
import { newId } from '../../data/ids';
import { Button, DateFields, ListGroup, ListRow, Sheet, Stack, useToast } from '../components';
import { useDb } from '../DbProvider';
import { LOCALE } from '../../i18n';

/** Zeile für die Fachseite: „Prüfung eintragen" oder „Prüfung am 12.12. (in 24 Tagen)". Öffnet das Sheet. */
export function ExamRow({ subjectId, onOpen }: { subjectId: string; onOpen: () => void }) {
  const { t } = useTranslation();
  const db = useDb();
  const next = useLiveQuery(async () => {
    const today = learningDayKey(new Date(systemNow()));
    return (await db.exams.where('subjectId').equals(subjectId).toArray())
      .filter((e) => dayDiff(today, e.date) >= 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  }, [db, subjectId]);
  const today = learningDayKey(new Date(systemNow()));
  const date = next
    ? new Intl.DateTimeFormat(LOCALE, {
        day: 'numeric',
        month: 'numeric',
      }).format(new Date(`${next.date}T12:00:00`))
    : '';
  return (
    <ListRow
      icon={CalendarDays}
      title={next ? t('exam.rowSet', { date, days: dayDiff(today, next.date) }) : t('exam.add')}
      onClick={onOpen}
    />
  );
}

/** Prüfung eintragen oder verschieben (Sheet). Datum mit drei Feldern. Madar plant rückwärts davon, ohne Vorwurf bei Änderungen. */
export function ExamSheet({
  subjectId,
  open,
  onClose,
}: {
  subjectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
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
  const [editing, setEditing] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const fmt = (d: string) =>
    new Intl.DateTimeFormat(LOCALE, {
      dateStyle: 'full',
    }).format(new Date(`${d}T12:00:00`));
  const pick = (id: string | null, value: string) => {
    setEditing(id);
    setDate(value);
    setRound(round + 1); // Felder neu mit dem Datum füllen
  };
  const save = async () => {
    if (!date) return;
    if (editing) await db.exams.update(editing, { date });
    else await addExam(db, { id: newId(), subjectId, date });
    pick(null, '');
    onClose();
    toast.show({ text: t('exam.saved') });
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('exam.title')}
      size="lg"
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
                subtitle={t('exam.change')}
                state={editing === e.id ? 'selected' : 'default'}
                onClick={() => pick(e.id, e.date)}
              />
            ))}
          </ListGroup>
        ) : (
          <p className="t-note">{t('exam.none')}</p>
        )}
        <DateFields
          key={round}
          value={date}
          onChange={setDate}
          labels={{
            legend: editing ? t('exam.moveLegend') : t('exam.dateLabel'),
            day: t('exam.day'),
            month: t('exam.month'),
            year: t('exam.year'),
            invalid: t('exam.invalid'),
          }}
        />
        {editing && (
          <Button variant="quiet" onClick={() => pick(null, '')}>
            {t('exam.addAnother')}
          </Button>
        )}
        <p className="t-note">{t('exam.note')}</p>
      </Stack>
    </Sheet>
  );
}

export default ExamSheet;
