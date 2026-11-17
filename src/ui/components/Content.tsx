import { useId, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Cluster, Stack } from './Layout';

export function ContentCard({
  title,
  accent,
  hero,
  children,
}: {
  title?: string;
  accent?: string;
  hero?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`card${hero ? ' card--hero' : ''}`}
      style={accent ? ({ '--card-accent': `var(--subj-${accent})` } as CSSProperties) : undefined}
    >
      <Stack space="group">
        {title && <h2 className="card__title">{title}</h2>}
        {children}
      </Stack>
    </section>
  );
}

/** Lernkarte: erst Antwort versuchen (Pflicht), dann aufdecken. */
export function Flashcard({
  front,
  back,
  labels,
}: {
  front: string;
  back: string;
  labels: { answer: string; reveal: string; dontKnow: string };
}) {
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const id = useId();
  return (
    <Stack space="stack" className="flashcard">
      <div className="flashcard__face" key={revealed ? 'b' : 'f'} aria-live="polite">
        {revealed ? back : front}
      </div>
      {!revealed && (
        <div className="field">
          <label className="field__label" htmlFor={id}>
            {labels.answer}
          </label>
          <input
            id={id}
            className="input"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <Cluster>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!answer.trim()}
              onClick={() => setRevealed(true)}
            >
              {labels.reveal}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setRevealed(true)}>
              {labels.dontKnow}
            </button>
          </Cluster>
        </div>
      )}
    </Stack>
  );
}

export interface Choice {
  id: string;
  text: string;
}

export function ChoiceList({
  legend,
  choices,
  value,
  onChange,
  result,
}: {
  legend: string;
  choices: Choice[];
  value: string | null;
  onChange: (id: string) => void;
  result?: { correctId: string };
}) {
  const name = useId();
  return (
    <fieldset className="choices">
      <legend>{legend}</legend>
      {choices.map((c) => {
        const state = result
          ? c.id === result.correctId
            ? 'right'
            : c.id === value
              ? 'wrong'
              : ''
          : '';
        return (
          <label key={c.id} className={`choice${state ? ` choice--${state}` : ''}`}>
            <input
              type="radio"
              name={name}
              checked={value === c.id}
              disabled={!!result}
              onChange={() => onChange(c.id)}
            />
            <span>{c.text}</span>
            {state === 'right' && <span className="choice__mark">✓</span>}
            {state === 'wrong' && <span className="choice__mark">✗</span>}
          </label>
        );
      })}
    </fieldset>
  );
}

/** Hinweisleiter: Stufe für Stufe, nie zuerst die Lösung. */
export function HintLadder({
  hints,
  labels,
}: {
  hints: string[];
  labels: { next: string; title: string };
}) {
  const [shown, setShown] = useState(0);
  return (
    <Stack space="tight" className="hints">
      {shown > 0 && (
        <div role="region" aria-label={labels.title} aria-live="polite">
          <ol>
            {hints.slice(0, shown).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
        </div>
      )}
      {shown < hints.length && (
        <button type="button" className="btn btn--secondary" onClick={() => setShown(shown + 1)}>
          {labels.next}
        </button>
      )}
    </Stack>
  );
}
