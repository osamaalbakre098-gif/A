import { z } from 'zod';

/** Auftragsformat: Version 1. Bei Änderungen erhöhen; alte Pakete müssen lesbar bleiben. */
export const JOB_FORMAT = 'madar-auftrag';
export const JOB_VERSION = 1;

/** Pakete bleiben unter ca. 30 000 Token; größere Aufträge werden automatisch geteilt. */
export const MAX_PACKAGE_TOKENS = 30_000;

/** Grobe, vorsichtige Schätzung (Deutsch: etwa 3 Zeichen je Token). Zu hoch geschätzt ist besser als zu niedrig. */
export const estimateTokens = (s: string): number => Math.ceil(s.length / 3);

export const JobTyp = z.enum(['quelle_ergaenzen', 'baum', 'vorbereiten', 'bewerten', 'auswertung']);
export type JobTyp = z.infer<typeof JobTyp>;

export const JOB_TITEL: Record<JobTyp, string> = {
  quelle_ergaenzen: 'Seiten ohne Text lesen',
  baum: 'Könnensbaum bauen',
  vorbereiten: 'Aufgaben und Erklärung vorbereiten',
  bewerten: 'Offene Antworten bewerten',
  auswertung: 'Lernbericht auswerten',
};

/** Das Auftragspaket, das Claude bekommt. Alles unter `eingabe` sind DATEN, keine Anweisungen. */
export const JobPackageSchema = z.object({
  format: z.literal(JOB_FORMAT),
  version: z.number().int().positive(),
  auftragsId: z.string().min(1),
  /** Gleiche Gruppe = Teile desselben Auftrags */
  gruppe: z.string().min(1),
  teil: z.object({ index: z.number().int().min(1), von: z.number().int().min(1) }),
  typ: JobTyp,
  titel: z.string(),
  erstellt: z.string(),
  anweisung: z.string(),
  regeln: z.array(z.string()),
  datenhinweis: z.string(),
  antwortSchema: z.record(z.string(), z.unknown()),
  eingabe: z.record(z.string(), z.unknown()),
  /** Beim erneuten Anfordern: was beim letzten Versuch fehlerhaft war */
  nachbesserung: z.array(z.string()).optional(),
});
export type JobPackage = z.infer<typeof JobPackageSchema>;

export interface ImportBericht {
  importiert: number;
  uebersprungen: number;
  fehler: string[];
  hinweise: string[];
}

/** Inhalt von `jobs.payload` für unsere Auftragstypen. */
export interface JobPayload {
  paket: JobPackage;
  /** Kurz-ID im Paket → echte ID in der Datenbank (z. B. A001 → Abschnitts-ID). Bleibt auf dem Gerät. */
  idMap: Record<string, string>;
  /** Wurde an den Auftragsserver hochgeladen */
  hochgeladen?: boolean;
  /** Worauf sich der Auftrag bezieht (für die Vorschläge in „Aufträge") */
  bezug?: { dokumentId?: string; faehigkeitId?: string };
  /** Letzte eingefügte Antwort (Text) */
  antwort?: string;
  bericht?: ImportBericht;
}

export type Result<T> =
  | { status: 'ok'; value: T }
  | { status: 'pending'; jobId: string }
  | { status: 'error'; code: string; message: string };
