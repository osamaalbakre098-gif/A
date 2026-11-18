/**
 * Einfache SVG-Illustrationen im Stil Kreis / Bogen / Schnittecke.
 * Keine Animation. Jede hat eine Textalternative (`label`), die die Information trägt.
 */
interface MotifProps {
  label: string;
  size?: number;
}

/** Geschlossener Kreis: der Tag ist rund. */
export function DoneMotif({ label, size = 96 }: MotifProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      style={{ inlineSize: '100%', maxInlineSize: size, blockSize: 'auto' }}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <circle cx="48" cy="48" r="38" fill="none" stroke="var(--primary)" strokeWidth="8" />
      <path
        d="M32 50 L44 62 L66 36"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Karte mit abgeschnittener Ecke, ein Kreis führt hinein. */
/** Leerzustand: Dokument mit Plus („Material hinzufügen"). */
export function EmptyMotif({ label, size = 96 }: MotifProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      style={{ inlineSize: '100%', maxInlineSize: size, blockSize: 'auto' }}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <path
        d="M26 10 H 56 L 74 28 V 80 A 6 6 0 0 1 68 86 H 26 A 6 6 0 0 1 20 80 V 16 A 6 6 0 0 1 26 10 Z"
        fill="var(--surface)"
        stroke="var(--border)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M56 10 V 28 H 74"
        fill="none"
        stroke="var(--border)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M47 46 V 72 M34 59 H 60"
        stroke="var(--primary)"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type SkillState = 'new' | 'building' | 'sits' | 'refresh';

/** Kleiner Baum: Stamm, drei Äste, Knoten. Zustände unterscheiden sich in der Form, nicht nur in der Farbe. */
export function TreeMotif({ label, nodes, size = 200 }: MotifProps & { nodes: SkillState[] }) {
  const pos: [number, number][] = [
    [40, 40],
    [40, 78],
    [100, 28],
    [100, 66],
    [160, 40],
    [160, 78],
  ];
  return (
    <svg
      viewBox="0 0 200 130"
      style={{ inlineSize: '100%', maxInlineSize: size, blockSize: 'auto' }}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <path
        d="M100 124 V 100 M100 100 Q 100 84 40 78 M100 100 Q 100 84 160 78 M100 100 V 66 M40 78 V 40 M160 78 V 40 M100 66 V 28"
        fill="none"
        stroke="var(--border)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {nodes.slice(0, pos.length).map((st, i) => {
        const [x, y] = pos[i] ?? [0, 0];
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle
              r="11"
              fill={st === 'new' ? 'var(--surface)' : 'var(--surface)'}
              stroke="var(--primary)"
              strokeWidth="3"
            />
            {st === 'building' && <path d="M0 -8 A 8 8 0 0 0 0 8 Z" fill="var(--primary)" />}
            {st === 'sits' && <circle r="8" fill="var(--primary)" />}
            {st === 'refresh' && (
              <>
                <circle r="8" fill="var(--primary)" />
                <circle r="3" fill="var(--surface)" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Drei Schritte „Zum Home-Bildschirm hinzufügen": Teilen, Zum Home-Bildschirm, Hinzufügen. */
export function InstallMotif({ label, size = 300 }: MotifProps) {
  const circle = (cx: number) => (
    <circle cx={cx} cy="40" r="30" fill="var(--tint)" stroke="var(--primary)" strokeWidth="3" />
  );
  return (
    <svg
      viewBox="0 0 300 80"
      style={{ inlineSize: '100%', maxInlineSize: size, blockSize: 'auto' }}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <path
        d="M80 40 H 110 M190 40 H 220"
        stroke="var(--border)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {circle(50)}
      {circle(150)}
      {circle(250)}
      {/* 1: Teilen (Quadrat mit Pfeil nach oben) */}
      <g
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M42 42 V 56 H 58 V 42" />
        <path d="M50 50 V 26 M43 33 L 50 26 L 57 33" />
        {/* 2: Quadrat mit Plus */}
        <rect x="136" y="26" width="28" height="28" rx="6" />
        <path d="M150 33 V 47 M143 40 H 157" />
        {/* 3: Haken */}
        <path d="M238 41 L 247 50 L 263 31" />
      </g>
    </svg>
  );
}
