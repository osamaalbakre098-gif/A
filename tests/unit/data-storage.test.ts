import { describe, expect, it } from 'vitest';
import { DataError, isQuotaError, toDataError } from '../../src/data/db/errors';
import { checkStorage, detectPlatform, requestPersistence } from '../../src/data/db/storage';

const GB = 1e9;

describe('Speicherprüfung', () => {
  it('ok, knapp (unter 15 % frei nach dem Speichern), nicht genug, unbekannt', () => {
    expect(checkStorage({ usage: 1 * GB, quota: 10 * GB }, 1 * GB).level).toBe('ok');
    expect(checkStorage({ usage: 8 * GB, quota: 10 * GB }, 1 * GB).level).toBe('tight'); // 10 % frei danach
    expect(checkStorage({ usage: 9.5 * GB, quota: 10 * GB }, 1 * GB).level).toBe('insufficient');
    expect(checkStorage({}, 5 * GB).level).toBe('unknown');
  });
  it('Grenze: genau 15 % frei ist noch ok', () => {
    expect(checkStorage({ usage: 8.5 * GB, quota: 10 * GB }, 0).level).toBe('ok');
    expect(checkStorage({ usage: 8.51 * GB, quota: 10 * GB }, 0).level).toBe('tight');
  });
});

describe('Fehlerabbildung', () => {
  it('erkennt „Speicher voll" auch in verpackten Fehlern', () => {
    expect(isQuotaError({ name: 'QuotaExceededError' })).toBe(true);
    expect(isQuotaError({ name: 'AbortError', inner: { name: 'QuotaExceededError' } })).toBe(true);
    expect(isQuotaError({ name: 'BulkError', failures: [{ name: 'QuotaExceededError' }] })).toBe(
      true,
    );
    expect(isQuotaError(new Error('x'))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });
  it('wandelt Quota-Fehler in STORAGE_FULL, lässt andere unverändert', () => {
    const e = toDataError({ name: 'QuotaExceededError' }) as DataError;
    expect(e).toBeInstanceOf(DataError);
    expect(e.code).toBe('STORAGE_FULL');
    const other = new Error('anderes');
    expect(toDataError(other)).toBe(other);
  });
});

describe('Plattform (iPhone-Hinweis)', () => {
  const iphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
  it('iPhone im Safari-Tab braucht den Hinweis', () => {
    expect(detectPlatform({ userAgent: iphone })).toEqual({
      isIOS: true,
      isStandalone: false,
      needsInstallHint: true,
    });
  });
  it('installiert (Home-Bildschirm): kein Hinweis', () => {
    expect(detectPlatform({ userAgent: iphone, standalone: true }).needsInstallHint).toBe(false);
    expect(
      detectPlatform({ userAgent: iphone, displayModeStandalone: true }).needsInstallHint,
    ).toBe(false);
  });
  it('iPad im Desktop-Modus (meldet sich als Mac, hat Touch) wird erkannt', () => {
    const mac =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
    expect(detectPlatform({ userAgent: mac, platform: 'MacIntel', maxTouchPoints: 5 }).isIOS).toBe(
      true,
    );
    expect(detectPlatform({ userAgent: mac, platform: 'MacIntel', maxTouchPoints: 0 }).isIOS).toBe(
      false,
    );
  });
  it('Android und Desktop: kein Hinweis', () => {
    expect(
      detectPlatform({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120' }).needsInstallHint,
    ).toBe(false);
  });
});

describe('Dauerhafter Speicher', () => {
  it('nicht unterstützt', async () => {
    expect(await requestPersistence({} as Navigator)).toEqual({
      supported: false,
      persisted: false,
    });
  });
  it('bereits dauerhaft: fragt nicht erneut', async () => {
    let asked = false;
    const nav = {
      storage: { persisted: async () => true, persist: async () => ((asked = true), true) },
    } as unknown as Navigator;
    expect(await requestPersistence(nav)).toEqual({ supported: true, persisted: true });
    expect(asked).toBe(false);
  });
  it('wird abgelehnt oder wirft: kein Absturz', async () => {
    const no = {
      storage: { persisted: async () => false, persist: async () => false },
    } as unknown as Navigator;
    expect(await requestPersistence(no)).toEqual({ supported: true, persisted: false });
    const boom = {
      storage: {
        persist: async () => {
          throw new Error('x');
        },
      },
    } as unknown as Navigator;
    expect(await requestPersistence(boom)).toEqual({ supported: true, persisted: false });
  });
});
