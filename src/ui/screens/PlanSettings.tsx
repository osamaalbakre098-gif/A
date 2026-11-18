import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { loadDirectorSettings, saveDirectorSettings } from '../../data/director-data';
import { ContentCard, Stack, TextField } from '../components';
import { useDb } from '../DbProvider';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Lernzeit-Einstellungen für den Studienleiter (Tageszeit, späteste Uhrzeit, Blockzeit). */
export default function PlanSettings() {
  const { t } = useTranslation();
  const db = useDb();
  const s = useLiveQuery(() => loadDirectorSettings(db), [db]);
  if (!s) return null;
  const num = (v: string, lo: number, hi: number, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && v !== '' ? clamp(Math.round(n), lo, hi) : fallback;
  };
  return (
    <ContentCard title={t('heute.settingsTitle')} accent="sage">
      <Stack space="stack">
        <p className="t-note">{t('heute.settingsHint')}</p>
        <TextField
          label={t('heute.dailyMinutes')}
          type="number"
          inputMode="numeric"
          min={10}
          max={240}
          value={s.dailyMinutes}
          onChange={(e) =>
            void saveDirectorSettings(db, {
              dailyMinutes: num(e.target.value, 10, 240, s.dailyMinutes),
            })
          }
        />
        <TextField
          label={t('heute.latestHour')}
          type="number"
          inputMode="numeric"
          min={0}
          max={23}
          value={s.latestHour}
          onChange={(e) =>
            void saveDirectorSettings(db, { latestHour: num(e.target.value, 0, 23, s.latestHour) })
          }
        />
        <TextField
          label={t('heute.blockMinutes')}
          type="number"
          inputMode="numeric"
          min={15}
          max={50}
          value={s.blockMinutes}
          onChange={(e) =>
            void saveDirectorSettings(db, {
              blockMinutes: num(e.target.value, 15, 50, s.blockMinutes),
            })
          }
        />
      </Stack>
    </ContentCard>
  );
}
