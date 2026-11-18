import { House, Library, Search, Sprout } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppBar } from '../AppBar/AppBar';
import { Banner } from '../Banner/Banner';
import { Screen } from '../Screen/Screen';
import { TabBar, type NavItem } from '../TabBar/TabBar';
import './AppShell.css';

export type NavId = 'today' | 'subjects' | 'progress' | 'search';

const ITEMS: { id: NavId; icon: NavItem['icon'] }[] = [
  { id: 'today', icon: House },
  { id: 'subjects', icon: Library },
  { id: 'progress', icon: Sprout },
  { id: 'search', icon: Search },
];

/** Wahr, solange das Gerät online ist (Ereignisse des Browsers). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/**
 * App-Rahmen (docs/UI_VORGABE.md, Abschnitt 4): Safe Area, Kopfzeile, Inhalt im `Screen`, vier Ziele unten (bis 767 px)
 * oder links (ab 768 px). In der Lernsitzung (`immersive`) fehlen Kopfzeile und Navigation.
 */
export function AppShell({
  active,
  children,
  banner,
  bleed,
  immersive,
  onBack,
  wide,
  forceOffline,
  showSettings = true,
}: {
  active: NavId | null;
  children: ReactNode;
  banner?: ReactNode;
  /** Ohne Kopfzeile und Seitenrand (Leser) */
  bleed?: boolean;
  /** Vollbild ohne Navigation (Lernsitzung) */
  immersive?: boolean;
  onBack?: (() => void) | undefined;
  wide?: boolean;
  /** Für Galerie und Tests */
  forceOffline?: boolean;
  showSettings?: boolean;
}) {
  const { t } = useTranslation();
  const online = useOnline();
  const offline = forceOffline || !online;
  const items: NavItem[] = ITEMS.map(({ id, icon }) => ({
    id,
    icon,
    label: t(`nav.${id}`),
    href: `#${id}`,
  }));
  return (
    <div
      className="shell"
      data-nav={immersive ? 'hidden' : 'shown'}
      data-bleed={bleed ? '' : undefined}
    >
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
      <div className="shell__col">
        {!immersive && !bleed && <AppBar onBack={onBack} showSettings={showSettings} />}
        <main id="main" tabIndex={-1} className="shell__main">
          {bleed ? (
            children
          ) : (
            <Screen wide={wide}>
              {offline && <Banner tone="info">{t('banner.offline')}</Banner>}
              {banner}
              {children}
            </Screen>
          )}
        </main>
      </div>
      {!immersive && <TabBar items={items} active={active} label={t('nav.main')} />}
    </div>
  );
}
