export interface StorageEstimateLike {
  usage?: number;
  quota?: number;
}

export type StorageLevel = 'ok' | 'tight' | 'insufficient' | 'unknown';

/** Unter diesem freien Anteil (nach dem Speichern) erscheint ein ruhiger Hinweis. */
export const TIGHT_FREE_FRACTION = 0.15;

export interface StorageCheck {
  level: StorageLevel;
  freeBytes: number;
  /** Freier Anteil am Gesamtplatz nach dem Speichern (0–1); bei „unknown" = 1. */
  freeFractionAfter: number;
}

/** Reine Prüfung: reicht der Platz für `requiredBytes`? */
export function checkStorage(est: StorageEstimateLike, requiredBytes: number): StorageCheck {
  const quota = est.quota ?? 0;
  if (!quota) return { level: 'unknown', freeBytes: Infinity, freeFractionAfter: 1 };
  const free = quota - (est.usage ?? 0);
  const after = free - requiredBytes;
  const fraction = after / quota;
  const level: StorageLevel =
    after < 0 ? 'insufficient' : fraction < TIGHT_FREE_FRACTION ? 'tight' : 'ok';
  return { level, freeBytes: free, freeFractionAfter: Math.max(0, fraction) };
}

export async function getStorageEstimate(
  nav: Pick<Navigator, 'storage'> = navigator,
): Promise<StorageEstimateLike> {
  try {
    return (await nav.storage?.estimate?.()) ?? {};
  } catch {
    return {};
  }
}

export interface Persistence {
  supported: boolean;
  persisted: boolean;
}

/** Bittet den Browser, die Daten dauerhaft zu behalten (`navigator.storage.persist()`). Das Ergebnis gehört auf die Datenschutzseite. */
export async function requestPersistence(
  nav: Pick<Navigator, 'storage'> = navigator,
): Promise<Persistence> {
  const s = nav.storage;
  if (!s?.persist) return { supported: false, persisted: false };
  try {
    if (s.persisted && (await s.persisted())) return { supported: true, persisted: true };
    return { supported: true, persisted: await s.persist() };
  } catch {
    return { supported: true, persisted: false };
  }
}

export interface PlatformInfo {
  isIOS: boolean;
  isStandalone: boolean;
  /** iPhone/iPad im normalen Safari-Tab: Safari kann Daten nach 7 Tagen ohne Nutzung löschen. */
  needsInstallHint: boolean;
}

export function detectPlatform(env: {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  displayModeStandalone?: boolean;
}): PlatformInfo {
  // iPadOS meldet sich als „Macintosh", hat aber Touch.
  const isIOS =
    /iPad|iPhone|iPod/.test(env.userAgent) ||
    (env.platform === 'MacIntel' && (env.maxTouchPoints ?? 0) > 1);
  const isStandalone = env.standalone === true || env.displayModeStandalone === true;
  return { isIOS, isStandalone, needsInstallHint: isIOS && !isStandalone };
}

export function detectPlatformFromBrowser(): PlatformInfo {
  const nav = navigator as Navigator & { standalone?: boolean };
  return detectPlatform({
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints,
    standalone: nav.standalone,
    displayModeStandalone: matchMedia?.('(display-mode: standalone)').matches,
  });
}
