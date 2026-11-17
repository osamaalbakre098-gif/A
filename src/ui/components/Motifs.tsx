/**
 * Einfache SVG-Illustrationen im Stil Kreis / Bogen / Schnittecke.
 * Keine Animation. Jede hat eine Textalternative (`label`), die die Information trägt.
 */
interface MotifProps {
  label: string;
  size?: number;
}

const CARD_CUT = 'M8 8 H 62 L 80 26 V 72 H 8 Z';

/** Sitzung als Bogen aus vier Blöcken, der erste ist gefüllt. */
export function SessionMotif({ label, size = 120 }: MotifProps) {
  const seg = 38;
  const gap = 8;
  const pt = (deg: number) => {
    const a = (Math.PI * (180 + deg)) / 180;
    return `${60 + 46 * Math.cos(a)} ${64 + 46 * Math.sin(a)}`;
  };
  return (
    <svg viewBox="0 0 120 72" width={size} role="img" aria-label={label} focusable="false">
      {[0, 1, 2, 3].map((i) => {
        const s = i * (seg + gap) + 3;
        return (
          <path
            key={i}
            d={`M ${pt(s)} A 46 46 0 0 1 ${pt(s + seg)}`}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke={i === 0 ? 'var(--primary)' : 'var(--arc-off)'}
          />
        );
      })}
      <circle cx="60" cy="58" r="6" fill="var(--primary)" />
    </svg>
  );
}

/** Geschlossener Kreis: der Tag ist rund. */
export function DoneMotif({ label, size = 96 }: MotifProps) {
  return (
    <svg viewBox="0 0 96 96" width={size} role="img" aria-label={label} focusable="false">
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
export function EmptyMotif({ label, size = 120 }: MotifProps) {
  return (
    <svg viewBox="0 0 120 90" width={size} role="img" aria-label={label} focusable="false">
      <g transform="translate(30 6)">
        <path
          d={CARD_CUT}
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M62 8 V 26 H 80" fill="none" stroke="var(--border)" strokeWidth="3" />
      </g>
      <circle cx="26" cy="62" r="12" fill="none" stroke="var(--primary)" strokeWidth="6" />
      <path d="M40 62 H 66" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" />
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
    <svg viewBox="0 0 200 130" width={size} role="img" aria-label={label} focusable="false">
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
