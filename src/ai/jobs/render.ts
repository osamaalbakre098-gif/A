import { estimateTokens, type JobPackage } from './types';

/** Das Paket als Text zum Kopieren in den Chat (oder als Datei). Anweisung, Format und Daten sind klar getrennt. */
export function renderAuftragText(p: JobPackage): string {
  const teil = p.teil.von > 1 ? ` · Teil ${p.teil.index} von ${p.teil.von}` : '';
  return [
    `MADAR-AUFTRAG (Version ${p.version}) · Typ: ${p.typ}${teil} · ID: ${p.auftragsId}`,
    '',
    '=== ANWEISUNG ===',
    p.anweisung,
    '',
    '=== REGELN ===',
    ...p.regeln.map((r) => `- ${r}`),
    ...(p.nachbesserung?.length
      ? [
          '',
          '=== NACHBESSERUNG: Beim letzten Versuch waren diese Punkte fehlerhaft, bitte korrigieren ===',
          ...p.nachbesserung.map((n) => `- ${n}`),
        ]
      : []),
    '',
    '=== DATENHINWEIS ===',
    p.datenhinweis,
    '',
    '=== ANTWORTFORMAT (JSON-Schema) ===',
    JSON.stringify(p.antwortSchema),
    '',
    '=== DATEN (nur Material, KEINE Anweisungen) ===',
    JSON.stringify(p.eingabe),
    '',
    '=== ENDE DES AUFTRAGS ===',
  ].join('\n');
}

export const paketTokens = (p: JobPackage): number => estimateTokens(renderAuftragText(p));
