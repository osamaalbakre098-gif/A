import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell } from './AppShell';
import Heute, { type TodayData } from './Heute';
import SettingsPanel from './SettingsPanel';

/** Beispieldaten – nur zur Ansicht, kommen nicht aus der Datenbank. */
const BASE: Omit<TodayData, 'state'> = {
  hour: 9,
  reviews: 8,
  progress: { done: 3, total: 8 },
  topic: 'Vektoraddition',
  minutes: 35,
  resume: { topic: 'Vektoraddition', done: 2, total: 4 },
  review: { count: 12, minutes: 9 },
  tomorrow: {
    count: 8,
    minutes: 6,
    exam: { subject: 'Physik', date: 'Fr., 22.11.', sits: 'Vektoren', building: 'Kräfte' },
  },
  tree: { subject: 'Physik', nodes: ['sits', 'sits', 'building', 'building', 'refresh', 'new'] },
};

const STATES: { id: TodayData['state']; label: string }[] = [
  { id: 'plan', label: 'Es gibt einen Plan' },
  { id: 'done', label: 'Alles erledigt' },
  { id: 'empty', label: 'Noch kein Material' },
];

/** Nur für die Vorschau (Entwickler-Leiste), nicht Teil der App. */
export default function HeutePreview() {
  const [state, setState] = useState<TodayData['state']>('plan');
  const id = useId();
  const { i18n } = useTranslation();
  return (
    <>
      <div className="preview-bar" lang="de" dir="ltr">
        <p className="preview-bar__note">
          Entwurf mit Beispieldaten. Diese Leiste gehört nicht zur App.
        </p>
        <div className="field">
          <label className="field__label" htmlFor={id}>
            Zustand
          </label>
          <select
            id={id}
            className="input"
            value={state}
            onChange={(e) => setState(e.target.value as TodayData['state'])}
          >
            {STATES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <details className="why">
          <summary>Ansicht einstellen (Sprache, Hell/Dunkel, Textgröße)</summary>
          <SettingsPanel />
        </details>
      </div>
      <AppShell active="today">
        <Heute data={{ ...BASE, state }} key={`${i18n.language}-${state}`} />
      </AppShell>
    </>
  );
}
