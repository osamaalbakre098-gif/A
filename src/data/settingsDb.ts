import { getDb } from './instance';

/** Einstellungen in der Tabelle `settings` (ergänzt `localStorage`, damit sie in Export und Sicherung landen). */
export async function saveSettingsToDb(values: Record<string, unknown>): Promise<void> {
  try {
    const db = await getDb();
    await db.settings.bulkPut(Object.entries(values).map(([key, value]) => ({ key, value })));
  } catch {
    // Speicher nicht verfügbar (z. B. privates Fenster): Einstellungen gelten dann nur für diese Sitzung.
  }
}

export async function loadSettingsFromDb(): Promise<Record<string, unknown> | null> {
  try {
    const db = await getDb();
    const rows = await db.settings.toArray();
    return rows.length ? Object.fromEntries(rows.map((r) => [r.key, r.value])) : null;
  } catch {
    return null;
  }
}
