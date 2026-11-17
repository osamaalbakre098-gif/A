import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import './i18n';
import { initSettings } from './ui/settings/settings';
import './ui/tokens/tokens.css';
import './index.css';
import App from './App.tsx';

initSettings();

// Galerie nur in der Entwicklung erreichbar.
const Gallery = import.meta.env.DEV ? lazy(() => import('./ui/screens/Gallery')) : null;
const HeutePreview = import.meta.env.DEV ? lazy(() => import('./ui/screens/HeutePreview')) : null;
const showHeute = import.meta.env.DEV && location.pathname === '/dev/heute';
const showGallery = import.meta.env.DEV && location.pathname === '/dev/components';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showHeute && HeutePreview ? (
      <Suspense fallback={null}>
        <HeutePreview />
      </Suspense>
    ) : showGallery && Gallery ? (
      <Suspense fallback={null}>
        <Gallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
