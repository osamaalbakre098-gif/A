import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
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
      className={`btn btn--${variant} ${className ?? ''}`.trim()}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Icon-Knopf: Beschriftung ist Pflicht (Screenreader). */
export function IconButton({
  label,
  icon,
  variant = 'quiet',
  ...rest
}: Omit<ButtonProps, 'children' | 'aria-label'> & { label: string; icon: ReactNode }) {
  return (
    <Button {...rest} variant={variant} aria-label={label} title={label} className="btn--icon">
      {icon}
    </Button>
  );
}
