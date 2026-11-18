/** Rechnen mit Lerntagen als Text `YYYY-MM-DD` (reiner Code, keine Uhr). */
const utc = (key: string) => {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
};
/** Ganze Tage von a bis b (b − a). */
export const dayDiff = (a: string, b: string) => Math.round((utc(b) - utc(a)) / 86_400_000);
export const addDays = (key: string, n: number) => {
  const d = new Date(utc(key) + n * 86_400_000);
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};
