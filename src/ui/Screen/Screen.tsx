import type { CSSProperties, ElementType, ReactNode } from 'react';
import './Screen.css';

/** Setzt Seitenrand, Safe Areas und Maximalbreite (640 px zum Lesen, 960 px für Raster). */
export function Screen({
  wide,
  as: Tag = 'div',
  className,
  children,
}: {
  wide?: boolean;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={['screen', wide && 'screen--wide', className].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  );
}

export type GapToken = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 14 | 18;

/** Raster aus gleich breiten Spalten, die umbrechen, bevor sie zu schmal werden. */
export function Grid({
  min = '16rem',
  gap = 4,
  className,
  children,
}: {
  min?: string;
  gap?: GapToken;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={['grid', className].filter(Boolean).join(' ')}
      style={
        {
          ['--grid-min' as string]: min,
          ['--grid-gap' as string]: `var(--space-${gap})`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/** Trennlinie (nur Anschauung; Bedeutung steckt nie allein darin). */
export function Divider({ inset }: { inset?: boolean }) {
  return <hr className={inset ? 'divider divider--inset' : 'divider'} />;
}

/** Leerer Abstand aus dem 4-px-Raster, nur wenn Stack/Cluster nicht reichen. */
export function Spacer({ size = 4 }: { size?: GapToken }) {
  return (
    <div
      aria-hidden="true"
      className="spacer"
      style={{ ['--spacer' as string]: `var(--space-${size})` } as CSSProperties}
    />
  );
}
