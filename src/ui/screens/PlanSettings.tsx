import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { loadDirectorSettings, saveDirectorSettings } from '../../data/director-data';
import { ListGroup, ListRow, Stack, Stepper } from '../components';
import { useDb } from '../DbProvider';

/** Lernen: Zeiten für den Studienleiter. Stepper statt Tastatureingabe, wirkt sofort. */
export default function PlanSettings() {
  const { t } = useTranslation();
  const db = useDb();
  const s = useLiveQuery(() => loadDirectorSettings(db), [db]);
  if (!s) return null;
  const minus = t('settings.minus');
  const plus = t('settings.plus');
  return (
    <Stack space="tight">
      <ListGroup label={t('settings.sectionLearn')} footer={t('heute.settingsHint')}>
        <li className="listgroup__custom">
          <Stepper
            label={t('heute.dailyMinutes')}
            value={s.dailyMinutes}
            min={10}
            max={240}
            step={5}
            unit={t('settings.unitMin')}
            minusLabel={minus}
            plusLabel={plus}
            onChange={(v) => void saveDirectorSettings(db, { dailyMinutes: v })}
          />
        </li>
        <li className="listgroup__custom">
          <Stepper
            label={t('heute.latestHour')}
            value={s.latestHour}
            min={0}
            max={23}
            step={1}
            unit={t('settings.unitHour')}
            minusLabel={minus}
            plusLabel={plus}
            onChange={(v) => void saveDirectorSettings(db, { latestHour: v })}
          />
        </li>
        <li className="listgroup__custom">
          <Stepper
            label={t('heute.blockMinutes')}
            value={s.blockMinutes}
            min={15}
            max={50}
            step={5}
            unit={t('settings.unitMin')}
            minusLabel={minus}
            plusLabel={plus}
            onChange={(v) => void saveDirectorSettings(db, { blockMinutes: v })}
          />
        </li>
        <ListRow title={t('settings.dayStart')} value={<bdi className="tabular">04:00</bdi>} />
      </ListGroup>
    </Stack>
  );
}
