import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'plain' | 'destructive' | 'quiet' | 'danger';
  /** m = 48 px, l = 52 px (Hauptaktion) */
  size?: 'm' | 'l';
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'm',
  fullWidth,
  loading,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`btn btn--${variant}${size === 'l' ? ' btn--l' : ''}${fullWidth ? ' btn--block' : ''} ${className ?? ''}`.trim()}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Icon-Knopf: rund, mindestens 44 px, immer mit Beschriftung für Screenreader. */
export function IconButton({
  label,
  icon,
  variant = 'tonal',
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  label: string;
  icon: LucideIcon;
  variant?: 'tonal' | 'primary' | 'quiet';
}) {
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      title={label}
      className={`iconbtn${variant === 'tonal' ? '' : ` iconbtn--${variant}`}`}
    >
      <Icon as={icon} />
    </button>
  );
}
