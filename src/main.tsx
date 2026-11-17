import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './ui/tokens/tokens.css';
import './index.css';
import App from './App.tsx';

// Galerie nur in der Entwicklung erreichbar.
const Gallery = import.meta.env.DEV ? lazy(() => import('./ui/screens/Gallery')) : null;
const showGallery = import.meta.env.DEV && location.pathname === '/dev/components';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showGallery && Gallery ? (
      <Suspense fallback={null}>
        <Gallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
