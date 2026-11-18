import { CircleCheck, Info, OctagonAlert, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import './Banner.css';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';
const ICONS: Record<BannerTone, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: OctagonAlert,
};

/** Ruhiger Hinweis. Zustand steht immer als Symbol UND Text da, nie nur als Farbe. */
export function Banner({
  tone = 'info',
  children,
  action,
  onDismiss,
}: {
  tone?: BannerTone;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={`banner banner--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="banner__icon">
        <Icon as={ICONS[tone]} />
      </span>
      <div className="banner__body">
        <p>{children}</p>
        {action && <div className="banner__action">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          className="banner__close"
          aria-label={t('ui.dismiss')}
          onClick={onDismiss}
        >
          <Icon as={X} size={20} />
        </button>
      )}
    </div>
  );
}
