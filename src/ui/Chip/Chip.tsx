import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import './Chip.css';

/** Kleine Pille. Zustand immer mit Symbol UND Text, nie nur Farbe. */
export function Chip({
  children,
  icon,
  tone = 'neutral',
}: {
  children: ReactNode;
  icon?: LucideIcon;
  tone?: 'neutral' | 'accent' | 'warning' | 'success';
}) {
  return (
    <span className={`chip2 chip2--${tone}`}>
      {icon && <Icon as={icon} size={16} />}
      {children}
    </span>
  );
}
