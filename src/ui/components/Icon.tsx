import type { LucideIcon } from 'lucide-react';

/** Eine Icon-Familie (Lucide), überall gleiche Strichstärke und Größe. */
export const ICON_STROKE = 1.75;

export function Icon({
  as: Cmp,
  size = 24,
  filled,
}: {
  as: LucideIcon;
  size?: number;
  /** Getönte Füllung für den aktiven Zustand */
  filled?: boolean;
}) {
  return (
    <Cmp
      size={size}
      strokeWidth={filled ? 2.1 : ICON_STROKE}
      absoluteStrokeWidth
      aria-hidden="true"
      focusable="false"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.22 : undefined}
    />
  );
}
