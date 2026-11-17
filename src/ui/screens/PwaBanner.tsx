import { useTranslation } from 'react-i18next';
import { usePwa } from '../../pwa/pwa';
import { Button, Cluster } from '../components';

/** Ruhige Hinweise zu Updates und Offline-Betrieb. Nie ein automatischer Neustart. */
export default function PwaBanner() {
  const { t } = useTranslation();
  const { needRefresh, offlineReady, update, dismissOffline } = usePwa();
  if (!needRefresh && !offlineReady) return null;
  return (
    <div className="pwa-banner" role="status">
      {needRefresh ? (
        <>
          <p>{t('pwa.updateReady')}</p>
          <Cluster>
            <Button onClick={() => void update?.()}>{t('pwa.reload')}</Button>
          </Cluster>
        </>
      ) : (
        <>
          <p>{t('pwa.offlineReady')}</p>
          <Cluster>
            <Button variant="secondary" onClick={dismissOffline}>
              {t('pwa.ok')}
            </Button>
          </Cluster>
        </>
      )}
    </div>
  );
}
