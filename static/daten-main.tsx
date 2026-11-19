import '../src/styles';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import '../src/i18n';
import '../src/ui/components/components.css';
import '../src/index.css';
import DatenPreview from '../src/ui/screens/DatenPreview';
import { initSettings } from '../src/ui/settings/settings';

initSettings();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DatenPreview sandbox />
  </StrictMode>,
);
