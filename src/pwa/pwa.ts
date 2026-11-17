import { create } from 'zustand';

interface PwaState {
  /** Eine neue App-Version liegt bereit. */
  needRefresh: boolean;
  /** Alles ist für den Betrieb ohne Internet zwischengespeichert. */
  offlineReady: boolean;
  update: (() => Promise<void>) | null;
  dismissOffline: () => void;
}

export const usePwa = create<PwaState>((set) => ({
  needRefresh: false,
  offlineReady: false,
  update: null,
  dismissOffline: () => set({ offlineReady: false }),
}));

/**
 * Meldet den Service Worker an (nur in der gebauten App). Eine neue Version wird NIE von selbst aktiviert,
 * sondern erst, wenn der Nutzer „Jetzt neu laden" wählt (kein Wechsel mitten in einer Lernsitzung).
 */
export async function setupPwa(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const { registerSW } = await import('virtual:pwa-register');
  const update = registerSW({
    onNeedRefresh: () => usePwa.setState({ needRefresh: true }),
    onOfflineReady: () => usePwa.setState({ offlineReady: true }),
  });
  usePwa.setState({ update });
}
