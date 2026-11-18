import { useId } from 'react';
import './SegmentedControl.css';

export interface Segment<T extends string> {
  id: T;
  label: string;
}

/** Wahl aus 2–4 Möglichkeiten als Radiogruppe (Pfeiltasten, Beschriftung, nicht nur Farbe). */
export function SegmentedControl<T extends string>({
  legend,
  segments,
  value,
  onChange,
}: {
  legend: string;
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="seg">
      <legend className="seg__legend">{legend}</legend>
      <div className="seg__track">
        {segments.map((s) => (
          <label key={s.id} className="seg__item">
            <input
              type="radio"
              name={name}
              className="seg__input"
              checked={value === s.id}
              onChange={() => onChange(s.id)}
            />
            <span className="seg__label">{s.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
