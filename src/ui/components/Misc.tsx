import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Stack } from './Layout';

/** Kreis für Zeit/Fokus. Zeigt Minuten als Text, nie Prozent. */
export function FocusCircle({
  remainingSec,
  totalSec,
  label,
}: {
  remainingSec: number;
  totalSec: number;
  label: string;
}) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const frac = totalSec > 0 ? Math.max(0, Math.min(1, remainingSec / totalSec)) : 0;
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const ss = String(Math.floor(remainingSec % 60)).padStart(2, '0');
  return (
    <svg
      viewBox="0 0 100 100"
      width="120"
      height="120"
      role="img"
      aria-label={`${label}: ${mm}:${ss}`}
    >
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--arc-off)" strokeWidth="6" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset var(--t-slow) var(--ease)' }}
      />
      <text x="50" y="56" textAnchor="middle" fontSize="18" className="arc-label">
        {mm}:{ss}
      </text>
    </svg>
  );
}

/** Bogen für Fortschritt in Schritten (z. B. 4 Blöcke), nie als Prozentzahl. */
export function ProgressArc({
  done,
  total,
  label,
}: {
  done: number;
  total: number;
  label: string;
}) {
  const segs = Array.from({ length: total }, (_, i) => i);
  const gap = 4;
  const seg = (180 - gap * (total - 1)) / total;
  const pt = (deg: number) => {
    const a = (Math.PI * (180 + deg)) / 180;
    return `${50 + 44 * Math.cos(a)} ${50 + 44 * Math.sin(a)}`;
  };
  return (
    <svg viewBox="0 0 100 56" width="160" role="img" aria-label={`${label}: ${done}/${total}`}>
      {segs.map((i) => {
        const s = i * (seg + gap);
        return (
          <path
            key={i}
            d={`M ${pt(s)} A 44 44 0 0 1 ${pt(s + seg)}`}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            stroke={i < done ? 'var(--primary)' : 'var(--arc-off)'}
          />
        );
      })}
    </svg>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <Stack space="stack" className="empty">
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </Stack>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" aria-labelledby="dlg-title" onClose={onClose}>
      <Stack space="stack">
        <h2 id="dlg-title">{title}</h2>
        {children}
      </Stack>
    </dialog>
  );
}

/** Fortschritt in Schritten („3 von 8"), nie als Prozentzahl. Der Text steht daneben, die Leiste ist nur Anschauung. */
export function SegmentBar({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <div className="segbar" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < done ? 'segbar__seg segbar__seg--on' : 'segbar__seg'} />
      ))}
    </div>
  );
}
