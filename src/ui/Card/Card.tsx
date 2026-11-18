import type { ElementType, ReactNode } from 'react';
import './Card.css';

/** Karte: `plain` (flach), `raised` (Schatten), `hero` (Hauptkarte), `tinted` (Hinweiskarte). */
export function Card({
  variant = 'raised',
  as: Tag = 'div',
  className,
  children,
  ...rest
}: {
  variant?: 'plain' | 'raised' | 'hero' | 'tinted';
  as?: ElementType;
  className?: string;
  children: ReactNode;
  [k: string]: unknown;
}) {
  return (
    <Tag className={['card', `card--${variant}`, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  );
}
