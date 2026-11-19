import '../src/styles';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import '../src/i18n';
import '../src/index.css';
import App from '../src/App';
import { initSettings } from '../src/ui/settings/settings';

initSettings();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
