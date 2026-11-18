import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import './StepList.css';

export interface Step {
  title: string;
  done?: boolean;
  children?: ReactNode;
}

/** Nummerierte Schritte; erledigte zeigen Haken UND „erledigt" für Screenreader. */
export function StepList({ steps, doneLabel }: { steps: Step[]; doneLabel: string }) {
  return (
    <ol className="steps2">
      {steps.map((s, i) => (
        <li key={s.title} className={`steps2__item${s.done ? ' steps2__item--done' : ''}`}>
          <span className="steps2__num" aria-hidden="true">
            {s.done ? <Icon as={Check} size={20} /> : i + 1}
          </span>
          <div className="steps2__body">
            <h3 className="steps2__title">
              {s.title}
              {s.done && <span className="visually-hidden"> ({doneLabel})</span>}
            </h3>
            {s.children}
          </div>
        </li>
      ))}
    </ol>
  );
}
