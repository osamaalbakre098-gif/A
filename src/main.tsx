// Die Schichten (layers.css) müssen als Allererstes geladen werden, sonst gilt die Reihenfolge der ersten Verwendung.
import './styles';
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import './i18n';
import { setupPwa } from './pwa/pwa';
import { initSettings } from './ui/settings/settings';
import './index.css';
import App from './App.tsx';
import { RootErrorBoundary } from './ui/ErrorBoundary';

initSettings();
void setupPwa();

// Galerie nur in der Entwicklung erreichbar.
const Gallery = import.meta.env.DEV ? lazy(() => import('./ui/screens/Gallery')) : null;
const HeutePreview = import.meta.env.DEV ? lazy(() => import('./ui/screens/HeutePreview')) : null;
const showHeute = import.meta.env.DEV && location.pathname === '/dev/heute';
const DatenPreview = import.meta.env.DEV ? lazy(() => import('./ui/screens/DatenPreview')) : null;
const showDaten = import.meta.env.DEV && location.pathname === '/dev/daten';
const showGallery = import.meta.env.DEV && location.pathname === '/dev/components';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showDaten && DatenPreview ? (
      <Suspense fallback={null}>
        <DatenPreview />
      </Suspense>
    ) : showHeute && HeutePreview ? (
      <Suspense fallback={null}>
        <HeutePreview />
      </Suspense>
    ) : showGallery && Gallery ? (
      <Suspense fallback={null}>
        <Gallery />
      </Suspense>
    ) : (
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    )}
  </StrictMode>,
);
