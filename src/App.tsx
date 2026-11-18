import { lazy, Suspense, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell, type NavId } from './ui/screens/AppShell';
import PwaBanner from './ui/screens/PwaBanner';
import SettingsPanel from './ui/screens/SettingsPanel';
import { EmptyState, Stack } from './ui/components';
import { DbProvider } from './ui/DbProvider';
import ErrorBoundary from './ui/ErrorBoundary';
import { useHashRoute, type RouteName } from './ui/useHashRoute';

// Datenbank und ZIP-Code erst laden, wenn „Deine Daten" geöffnet wird (kleineres Start-Bundle).
const DataPage = lazy(() => import('./ui/screens/DataPage'));
const SubjectsPage = lazy(() => import('./ui/screens/SubjectsPage'));
const SubjectPage = lazy(() => import('./ui/screens/SubjectPage'));
const ReaderPage = lazy(() => import('./ui/screens/ReaderPage'));
const SearchPage = lazy(() => import('./ui/screens/SearchPage'));
const JobsPage = lazy(() => import('./ui/screens/JobsPage'));
const PracticePage = lazy(() => import('./ui/screens/PracticePage'));
const PlanSettings = lazy(() => import('./ui/screens/PlanSettings'));
const TodayPage = lazy(() => import('./ui/screens/TodayPage'));
const SessionPage = lazy(() => import('./ui/screens/SessionPage'));
const TreePage = lazy(() => import('./ui/screens/TreePage'));

function Placeholder({ route }: { route: RouteName }) {
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
      <Suspense fallback={null}>
        <DbProvider>
          <PlanSettings />
        </DbProvider>
      </Suspense>
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
  const route = useHashRoute();

  // Beim Seitenwechsel Fokus auf den Inhalt (Screenreader, Tastatur) und nach oben scrollen.
  const previous = useRef(route.name + (route.id ?? ''));
  useEffect(() => {
    const key = route.name + (route.id ?? '');
    if (previous.current === key) return; // beim ersten Laden nichts verschieben
    previous.current = key;
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [route]);

  const active: NavId | null =
    route.name === 'subject' || route.name === 'doc' || route.name === 'tree'
      ? 'subjects'
      : route.name === 'settings' ||
          route.name === 'data' ||
          route.name === 'jobs' ||
          route.name === 'practice' ||
          route.name === 'session'
        ? null
        : route.name;
  const bleed = route.name === 'doc';
  return (
    <AppShell active={active} banner={<PwaBanner />} bleed={bleed}>
      {route.name === 'settings' && <SettingsPage />}
      <ErrorBoundary resetKey={route.name + (route.id ?? '')}>
        <Suspense fallback={null}>
          {route.name === 'data' && <DataPage />}
          {route.name === 'subjects' && (
            <DbProvider>
              <SubjectsPage />
            </DbProvider>
          )}
          {route.name === 'subject' && route.id && (
            <DbProvider>
              <SubjectPage id={route.id} key={route.id} />
            </DbProvider>
          )}
          {route.name === 'doc' && route.id && (
            <DbProvider>
              <ReaderPage
                id={route.id}
                key={route.id}
                page={Number(route.params.get('page')) || 1}
                query={route.params.get('q') ?? ''}
              />
            </DbProvider>
          )}
          {route.name === 'today' && (
            <DbProvider>
              <TodayPage />
            </DbProvider>
          )}
          {route.name === 'session' && (
            <DbProvider>
              <SessionPage />
            </DbProvider>
          )}
          {route.name === 'jobs' && (
            <DbProvider>
              <JobsPage />
            </DbProvider>
          )}
          {route.name === 'practice' && route.id && (
            <DbProvider>
              <PracticePage skillId={route.id} key={route.id} />
            </DbProvider>
          )}
          {route.name === 'tree' && route.id && (
            <DbProvider>
              <TreePage subjectId={route.id} key={route.id} />
            </DbProvider>
          )}
          {route.name === 'search' && (
            <DbProvider>
              <SearchPage />
            </DbProvider>
          )}
        </Suspense>
      </ErrorBoundary>
      {route.name === 'progress' && <Placeholder route={route.name} />}
    </AppShell>
  );
}
