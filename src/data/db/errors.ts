export type DataErrorCode =
  'STORAGE_FULL' | 'IMPORT_INVALID' | 'IMPORT_TOO_NEW' | 'DB_TOO_NEW' | 'EVENTS_IMMUTABLE';

/** Fehler mit festem Code; die Oberfläche übersetzt den Code in einen verständlichen Text (`data.error.<code>`). */
export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly cause?: unknown;
  constructor(code: DataErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'DataError';
    this.code = code;
    this.cause = cause;
  }
}

interface Maybe {
  name?: unknown;
  inner?: unknown;
  failures?: unknown;
}

/** Erkennt „Speicher voll" auch in verpackten Dexie-Fehlern. */
export function isQuotaError(e: unknown): boolean {
  const x = e as Maybe | null | undefined;
  if (!x || typeof x !== 'object') return false;
  if (x.name === 'QuotaExceededError') return true;
  if (isQuotaError(x.inner)) return true;
  return Array.isArray(x.failures) && x.failures.some(isQuotaError);
}

/** Wandelt unbekannte Fehler in einen `DataError`, wo wir sie erklären können. Sonst unverändert weiterwerfen. */
export function toDataError(e: unknown): unknown {
  if (e instanceof DataError) return e;
  if (isQuotaError(e)) return new DataError('STORAGE_FULL', 'Der Speicher des Geräts ist voll.', e);
  return e;
}
