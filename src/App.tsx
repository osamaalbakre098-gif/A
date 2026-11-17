import { lazy, Suspense, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell, type NavId } from './ui/screens/AppShell';
import { DEMO_TODAY } from './ui/screens/demoData';
import Heute from './ui/screens/Heute';
import PwaBanner from './ui/screens/PwaBanner';
import SettingsPanel from './ui/screens/SettingsPanel';
import { EmptyState, Stack } from './ui/components';
import { useHashRoute, type Route } from './ui/useHashRoute';

// Datenbank und ZIP-Code erst laden, wenn „Deine Daten" geöffnet wird (kleineres Start-Bundle).
const DataPage = lazy(() => import('./ui/screens/DataPage'));

function Placeholder({ route }: { route: Route }) {
  const { t } = useTranslation();
  return (
    <Stack space="section" className="view">
      <h1>{t(`nav.${route}`)}</h1>
      <EmptyState title={t('app.comingSoonTitle')} text={t('app.comingSoonText')} />
    </Stack>
  );
}

function SettingsPage() {
  const { t } = useTranslation();
  return (
    <Stack space="section" className="view">
      <h1>{t('settings.title')}</h1>
      <SettingsPanel hideTitle />
      <Stack space="tight">
        <a className="btn btn--secondary" href="#data">
          {t('settings.dataLink')}
        </a>
        <p className="t-note">{t('settings.version', { id: __BUILD_ID__ })}</p>
      </Stack>
    </Stack>
  );
}

export default function App() {
  const { t } = useTranslation();
  const route = useHashRoute();

  // Beim Seitenwechsel Fokus auf den Inhalt (Screenreader, Tastatur) und nach oben scrollen.
  const previous = useRef(route);
  useEffect(() => {
    if (previous.current === route) return; // beim ersten Laden nichts verschieben
    previous.current = route;
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [route]);

  const active: NavId | null = route === 'settings' || route === 'data' ? null : route;
  return (
    <AppShell active={active} banner={<PwaBanner />}>
      {route === 'today' && (
        <Stack space="section">
          <p className="t-note demo-note">{t('app.demoNote')}</p>
          <Heute data={{ ...DEMO_TODAY, state: 'plan' }} />
        </Stack>
      )}
      {route === 'settings' && <SettingsPage />}
      {route === 'data' && (
        <Suspense fallback={null}>
          <DataPage />
        </Suspense>
      )}
      {(route === 'subjects' || route === 'progress' || route === 'search') && (
        <Placeholder route={route} />
      )}
    </AppShell>
  );
}
