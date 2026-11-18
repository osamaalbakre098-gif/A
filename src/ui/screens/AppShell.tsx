import { CircleUser, House, Library, Search, Sprout } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon as NavIcon } from '../components';

export type NavId = 'today' | 'subjects' | 'progress' | 'search';

const ITEMS: { id: NavId; icon: typeof House }[] = [
  { id: 'today', icon: House },
  { id: 'subjects', icon: Library },
  { id: 'progress', icon: Sprout },
  { id: 'search', icon: Search },
];

/** Rahmen: Handy = Navigation unten, ab 1024 px links. Vier Punkte, immer mit Beschriftung. */
export function AppShell({
  active,
  children,
  banner,
  bleed,
}: {
  active: NavId | null;
  children: ReactNode;
  banner?: ReactNode;
  /** Ohne Innenabstand und Kopfzeile (Leser) */
  bleed?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          // Kein Adresswechsel (die Adresse steuert die Seite), nur Fokus auf den Inhalt.
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t('nav.skipToContent')}
      </a>
      <main id="main" tabIndex={-1} className={`shell__main${bleed ? ' shell__main--bleed' : ''}`}>
        <div className="shell__top">
          <span className="shell__brand">Madar</span>
          <a
            className="iconbtn"
            href="#settings"
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
          >
            <NavIcon as={CircleUser} size={24} />
          </a>
        </div>
        {banner}
        {children}
      </main>
      <nav aria-label={t('nav.main')} className="shell__nav">
        <ul>
          {ITEMS.map(({ id, icon: Icon }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={id === active ? 'page' : undefined}
                className="navlink"
              >
                <span className="navlink__icon">
                  <NavIcon as={Icon} filled={id === active} />
                </span>
                <span>{t(`nav.${id}`)}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
