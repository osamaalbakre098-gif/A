import { useId } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface Common {
  label: string;
  hint?: string;
  error?: string;
}

function useIds() {
  const id = useId();
  return { id, hintId: `${id}-h`, errId: `${id}-e` };
}

export function TextField({
  label,
  hint,
  error,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const { id, hintId, errId } = useIds();
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      )}
      <input
        id={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint && hintId, error && errId].filter(Boolean).join(' ') || undefined}
        {...rest}
      />
      {error && (
        <span className="field__error" id={errId} role="alert">
          ⚠ {error}
        </span>
      )}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  error,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { id, hintId, errId } = useIds();
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      )}
      <textarea
        id={id}
        className="input"
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint && hintId, error && errId].filter(Boolean).join(' ') || undefined}
        {...rest}
      />
      {error && (
        <span className="field__error" id={errId} role="alert">
          ⚠ {error}
        </span>
      )}
    </div>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        role="switch"
        className="switch__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span>{label}</span>
    </label>
  );
}
