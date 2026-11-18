import { useTranslation } from 'react-i18next';
import './Skeleton.css';

/**
 * Platzhalter in Form des späteren Inhalts statt Drehkreis. Wird erst nach 300 ms sichtbar, damit nichts flackert.
 * Die Blöcke sind für Screenreader unsichtbar; stattdessen sagt ein Text „Wird geladen …".
 */
export function Skeleton({
  lines = 3,
  variant = 'lines',
}: {
  lines?: number;
  variant?: 'lines' | 'card' | 'rows';
}) {
  const { t } = useTranslation();
  return (
    <div className={`skeleton skeleton--${variant}`} role="status" aria-busy="true">
      <span className="visually-hidden">{t('ui.loading')}</span>
      <div aria-hidden="true" className="skeleton__blocks">
        {variant === 'card' && <span className="skeleton__block skeleton__block--card" />}
        {variant !== 'card' &&
          Array.from({ length: lines }, (_, i) => (
            <span
              key={i}
              className={`skeleton__block${variant === 'rows' ? ' skeleton__block--row' : ''}${i === lines - 1 && variant === 'lines' ? ' skeleton__block--short' : ''}`}
            />
          ))}
      </div>
    </div>
  );
}
