import { useId, useState } from 'react';
import './DateFields.css';

/** Gültiges Datum? (Schaltjahre inklusive, Jahr 2000–2100) */
export function toIso(day: string, month: string, year: string): string {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return '';
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1) return '';
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > days) return '';
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export interface DateFieldsLabels {
  legend: string;
  day: string;
  month: string;
  year: string;
  invalid: string;
}

/**
 * Datum mit drei Zahlenfeldern (Tag, Monat, Jahr) statt nativer Auswahl (UI_VORGABE 6.14).
 * Immer lateinische Ziffern, auch auf Arabisch. Meldet `''`, solange das Datum nicht stimmt.
 */
export function DateFields({
  labels,
  value,
  onChange,
}: {
  labels: DateFieldsLabels;
  /** ISO `JJJJ-MM-TT` oder leer */
  value: string;
  onChange: (iso: string) => void;
}) {
  const id = useId();
  const [y0 = '', m0 = '', d0 = ''] = value.split('-');
  const [day, setDay] = useState(d0.replace(/^0/, ''));
  const [month, setMonth] = useState(m0.replace(/^0/, ''));
  const [year, setYear] = useState(y0);
  const filled = day !== '' && month !== '' && year.length === 4;
  const iso = toIso(day, month, year);
  const invalid = filled && iso === '';
  const set = (d: string, m: string, y: string) => {
    setDay(d);
    setMonth(m);
    setYear(y);
    onChange(toIso(d, m, y));
  };
  const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);
  return (
    <fieldset className="datefields" aria-describedby={invalid ? `${id}-err` : undefined}>
      <legend className="datefields__legend">{labels.legend}</legend>
      <div className="datefields__row" dir="ltr">
        {(
          [
            ['day', labels.day, day, 2, (v: string) => set(digits(v, 2), month, year)],
            ['month', labels.month, month, 2, (v: string) => set(day, digits(v, 2), year)],
            ['year', labels.year, year, 4, (v: string) => set(day, month, digits(v, 4))],
          ] as const
        ).map(([key, label, val, max, change]) => (
          <label key={key} className={`datefields__item datefields__item--${key}`}>
            <span className="datefields__label">{label}</span>
            <input
              className="input datefields__input"
              inputMode="numeric"
              autoComplete="off"
              maxLength={max}
              value={val}
              aria-invalid={invalid || undefined}
              onChange={(e) => change(e.target.value)}
            />
          </label>
        ))}
      </div>
      {invalid && (
        <p id={`${id}-err`} role="alert" className="datefields__error">
          {labels.invalid}
        </p>
      )}
    </fieldset>
  );
}
