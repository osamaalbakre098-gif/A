import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';
import { Icon } from '../components/Icon';
import './Stepper.css';

/** Zahl mit Minus/Plus (je 44 px) – ohne Tastatureingabe nutzbar, Zahl links (tabellarisch). */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 5,
  unit,
  onChange,
  minusLabel,
  plusLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  minusLabel: string;
  plusLabel: string;
}) {
  const id = useId();
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="stepper" role="group" aria-labelledby={id}>
      <span id={id} className="stepper__label">
        {label}
      </span>
      <span className="stepper__ctrl">
        <button
          type="button"
          className="stepper__btn"
          aria-label={minusLabel}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
        >
          <Icon as={Minus} size={20} />
        </button>
        <output className="stepper__value" aria-live="polite">
          {value}
          {unit && <span className="stepper__unit"> {unit}</span>}
        </output>
        <button
          type="button"
          className="stepper__btn"
          aria-label={plusLabel}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
        >
          <Icon as={Plus} size={20} />
        </button>
      </span>
    </div>
  );
}
