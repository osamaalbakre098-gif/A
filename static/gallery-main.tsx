import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '../src/i18n';
import '../src/ui/tokens/tokens.css';
import '../src/index.css';
import Gallery from '../src/ui/screens/Gallery';

createRoot(document.getElementById('root')!).render(<Gallery />);
