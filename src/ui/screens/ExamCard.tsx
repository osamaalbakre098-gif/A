import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addExam } from '../../data/director-data';
import { newId } from '../../data/ids';
import { Button, ContentCard, Stack, TextField } from '../components';
import { useDb } from '../DbProvider';

/** Prüfung eintragen oder verschieben. Madar plant rückwärts davon (ohne Vorwurf bei Änderungen). */
export default function ExamCard({ subjectId }: { subjectId: string }) {
  const { t, i18n } = useTranslation();
  const db = useDb();
  const exams = useLiveQuery(
    async () =>
      (await db.exams.where('subjectId').equals(subjectId).toArray()).sort((a, b) =>
        a.date < b.date ? -1 : 1,
      ),
    [db, subjectId],
  );
  const [date, setDate] = useState('');
  const fmt = (d: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' }).format(new Date(`${d}T12:00:00`));
  return (
    <ContentCard title={t('exam.title')} accent="amber">
      <Stack space="stack">
        {exams?.length ? (
          <ul className="plain">
            {exams.map((e) => (
              <li key={e.id}>
                <TextField
                  label={t('exam.moveLabel', { date: fmt(e.date) })}
                  type="date"
                  value={e.date}
                  onChange={(ev) =>
                    ev.target.value && void db.exams.update(e.id, { date: ev.target.value })
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-note">{t('exam.none')}</p>
        )}
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!date) return;
            void addExam(db, { id: newId(), subjectId, date }).then(() => setDate(''));
          }}
        >
          <Stack space="stack">
            <TextField
              label={t('exam.dateLabel')}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={!date}>
              {t('exam.add')}
            </Button>
          </Stack>
        </form>
        <p className="t-note">{t('exam.note')}</p>
      </Stack>
    </ContentCard>
  );
}
