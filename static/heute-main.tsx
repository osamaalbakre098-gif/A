import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '../src/i18n';
import '../src/ui/tokens/tokens.css';
import '../src/ui/components/components.css';
import '../src/index.css';
import HeutePreview from '../src/ui/screens/HeutePreview';
import { initSettings } from '../src/ui/settings/settings';

initSettings();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HeutePreview />
  </StrictMode>,
);
