import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import './List.css';

/** Abschnittsüberschrift über einer Gruppe: Abstand zur Gruppe 8 px (Token). */
export function SectionHeader({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 className="section-header" id={id}>
      {children}
    </h2>
  );
}

/** Gruppierte Liste im iOS-Stil: eine abgerundete Fläche, Zeilen durch feine Linien getrennt. */
export function ListGroup({
  children,
  label,
  footer,
}: {
  children: ReactNode;
  /** Beschriftung für Screenreader (z. B. die Abschnittsüberschrift) */
  label?: string;
  footer?: ReactNode;
}) {
  return (
    <div className="listgroup">
      <ul className="listgroup__list" aria-label={label}>
        {children}
      </ul>
      {footer && <p className="listgroup__footer t-note">{footer}</p>}
    </div>
  );
}

export interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Symbol vorne (feste Spalte 28 px) */
  icon?: LucideIcon;
  /** Fachpunkt statt Symbol: Farbe aus `--subj-*` */
  dot?: string;
  /** Wert rechts (z. B. „12 Min.") */
  value?: ReactNode;
  /** Eigenes Element hinten (z. B. Schalter) */
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Pfeil hinten (Standard bei href/onClick) */
  chevron?: boolean;
  disabled?: boolean;
  /** Fortschritt o. Ä. unter dem Text */
  extra?: ReactNode;
  /** Titel in Dateinamen-Schreibweise (bricht an `- / _ .`) */
  state?: 'default' | 'selected';
}

/** Eine Zeile: Symbolspalte fest, Titel und Zusatztext fluchten in jeder Zeile an derselben Kante. */
export function ListRow({
  title,
  subtitle,
  icon,
  dot,
  value,
  trailing,
  href,
  onClick,
  chevron,
  disabled,
  extra,
  state = 'default',
}: ListRowProps) {
  const interactive = !!(href || onClick) && !disabled;
  const body = (
    <>
      {(icon || dot) && (
        <span className="listrow__lead" aria-hidden="true">
          {icon && <Icon as={icon} size={20} />}
          {dot && <span className="listrow__dot" style={{ background: `var(--subj-${dot})` }} />}
        </span>
      )}
      <span className="listrow__text">
        <span className="listrow__title">{title}</span>
        {subtitle && <span className="listrow__sub">{subtitle}</span>}
        {extra}
      </span>
      {value && <span className="listrow__value">{value}</span>}
      {trailing}
      {(chevron ?? interactive) && interactive && (
        <span className="listrow__chev" aria-hidden="true">
          <Icon as={ChevronRight} size={20} mirror />
        </span>
      )}
    </>
  );
  const cls = `listrow${icon || dot ? '' : ' listrow--nolead'}${interactive ? ' listrow--tap' : ''}${state === 'selected' ? ' listrow--selected' : ''}`;
  return (
    <li className="listrow-item">
      {href && interactive ? (
        <a className={cls} href={href}>
          {body}
        </a>
      ) : onClick && interactive ? (
        <button type="button" className={cls} onClick={onClick}>
          {body}
        </button>
      ) : (
        <div className={cls} aria-disabled={disabled || undefined}>
          {body}
        </div>
      )}
    </li>
  );
}
