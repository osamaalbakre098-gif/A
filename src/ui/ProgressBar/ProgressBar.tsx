import './ProgressBar.css';

/**
 * Fortschrittsbalken. Zahl und Text kommen immer von außen („62 Prozent, Mathematik"): `label` ist die gesprochene Beschreibung.
 * `percent` = null → unbestimmt (nur Text, kein Balken-Füllstand).
 */
export function ProgressBar({ percent, label }: { percent: number | null; label: string }) {
  const known = percent !== null;
  return (
    <div
      className="pbar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      {...(known ? { 'aria-valuenow': Math.round(percent) } : {})}
    >
      <span
        className="pbar__fill"
        style={{ ['--p' as string]: known ? Math.min(100, Math.max(0, percent)) / 100 : 0 }}
      />
    </div>
  );
}
