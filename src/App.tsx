import { useTranslation } from 'react-i18next';
import SettingsPanel from './ui/screens/SettingsPanel';

export default function App() {
  const { t } = useTranslation();
  return (
    <>
      <a className="skip-link" href="#main">
        {t('nav.skipToContent')}
      </a>
      <header className="app-header">
        <h1>{t('app.name')}</h1>
      </header>
      <nav aria-label={t('settings.title')} className="app-nav">
        <a href="#settings">{t('nav.settings')}</a>
      </nav>
      <main id="main" tabIndex={-1}>
        <p>{t('app.tagline')}</p>
        <p>
          {t('lichtung.greeting')} {t('lichtung.dueToday', { count: 12 })}
        </p>
        <div id="settings">
          <SettingsPanel />
        </div>
      </main>
    </>
  );
}
