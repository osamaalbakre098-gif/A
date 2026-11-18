import { lazy, Suspense, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell, type NavId } from './ui/screens/AppShell';
import PwaNotices from './ui/screens/PwaNotices';
import SettingsPanel from './ui/screens/SettingsPanel';
import { Lock, Sparkles } from 'lucide-react';
import {
  EmptyState,
  LargeTitle,
  ListGroup,
  ListRow,
  SectionHeader,
  Skeleton,
  Stack,
  ToastProvider,
} from './ui/components';
import { DbProvider } from './ui/DbProvider';
import ErrorBoundary from './ui/ErrorBoundary';
import { hrefTo, useHashRoute, type RouteName } from './ui/useHashRoute';

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
    <>
      <LargeTitle>{t('settings.title')}</LargeTitle>
      <Suspense fallback={null}>
        <DbProvider>
          <PlanSettings />
        </DbProvider>
      </Suspense>
      <Stack space="tight">
        <SectionHeader>{t('settings.sectionLook')}</SectionHeader>
        <SettingsPanel hideTitle />
      </Stack>
      <Stack space="tight">
        <SectionHeader>{t('settings.sectionClaude')}</SectionHeader>
        <ListGroup label={t('settings.sectionClaude')}>
          <ListRow icon={Sparkles} title={t('settings.connection')} href="#jobs" />
        </ListGroup>
      </Stack>
      <Stack space="tight">
        <SectionHeader>{t('settings.sectionData')}</SectionHeader>
        <ListGroup label={t('settings.sectionData')}>
          <ListRow
            icon={Lock}
            title={t('settings.dataRow')}
            subtitle={t('settings.dataSub')}
            href="#data"
          />
        </ListGroup>
      </Stack>
      <Stack space="tight">
        <SectionHeader>{t('settings.sectionAbout')}</SectionHeader>
        <ListGroup label={t('settings.sectionAbout')}>
          <ListRow title={t('settings.version', { id: __BUILD_ID__ })} />
        </ListGroup>
      </Stack>
    </>
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
  const immersive = route.name === 'session';
  const main =
    route.name === 'today' ||
    route.name === 'subjects' ||
    route.name === 'progress' ||
    route.name === 'search';
  // Zurück: eine Stufe in der Verlaufsliste, sonst zur übergeordneten Seite
  const parent =
    route.name === 'tree' && route.id
      ? hrefTo('subject', route.id)
      : route.name === 'jobs' || route.name === 'data'
        ? '#settings'
        : route.name === 'settings'
          ? '#today'
          : '#subjects';
  const onBack = main
    ? undefined
    : () => {
        if (history.length > 1) history.back();
        else location.hash = parent;
      };
  return (
    <ToastProvider>
      <PwaNotices quiet={immersive} />
      <AppShell
        active={active}
        bleed={bleed}
        immersive={immersive}
        onBack={onBack}
        showSettings={route.name !== 'settings'}
      >
        {route.name === 'settings' && <SettingsPage />}
        <ErrorBoundary resetKey={route.name + (route.id ?? '')}>
          <Suspense fallback={<Skeleton variant="rows" lines={3} />}>
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
    </ToastProvider>
  );
}
