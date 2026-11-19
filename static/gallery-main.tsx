import '../src/styles';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import '../src/i18n';
import '../src/index.css';
import Gallery from '../src/ui/screens/Gallery';

createRoot(document.getElementById('root')!).render(<Gallery />);
