import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePwa } from '../../pwa/pwa';
import { useToast } from '../Toast/Toast';

/**
 * Ruhige Hinweise zu Updates und Offline-Betrieb als Toast. Nie ein automatischer Neustart,
 * und mitten in der Lernsitzung (`quiet`) erscheint nichts.
 */
export default function PwaNotices({ quiet }: { quiet?: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { needRefresh, offlineReady, update, dismissOffline } = usePwa();
  useEffect(() => {
    if (quiet || !needRefresh) return;
    const id = toast.show({
      text: t('toast.updateReady'),
      sticky: true,
      action: { label: t('toast.updateAction'), onClick: () => void update?.() },
    });
    return () => toast.dismiss(id);
  }, [quiet, needRefresh, toast, t, update]);
  useEffect(() => {
    if (quiet || !offlineReady) return;
    toast.show({ text: t('toast.offlineReady') });
    dismissOffline();
  }, [quiet, offlineReady, toast, t, dismissOffline]);
  return null;
}
