import { z } from 'zod';

/** Antwortformate. Gelten für Claude (als JSON-Schema im Paket) und für die Prüfung in der App (Zod). */

export const Stufe = z.enum([
  'erinnern',
  'verstehen',
  'anwenden',
  'analysieren',
  'bewerten',
  'erschaffen',
]);
const Quellen = z
  .array(z.string().min(1))
  .min(1, 'Mindestens eine Quelle (Abschnitts-ID aus dem Paket) ist Pflicht.');
const Text = z.string().min(1);

// ---------- quelle_ergaenzen ----------
export const SeiteSchema = z.object({
  seite: z.number().int().min(1),
  text: z
    .string()
    .describe(
      'Der gelesene Text der Seite, Absätze durch Leerzeilen. Formeln als LaTeX zwischen $…$. Leer, wenn die Seite nur Abbildungen enthält.',
    ),
  ueberschriften: z
    .array(z.object({ ebene: z.number().int().min(1).max(6), titel: Text }))
    .optional(),
  formeln: z.array(z.object({ latex: Text, bedeutung: z.string().optional() })).optional(),
  nurAbbildung: z
    .boolean()
    .optional()
    .describe('true, wenn die Seite vor allem aus Abbildungen besteht'),
  lesbarkeit: z.enum(['gut', 'teilweise', 'schlecht']),
  notizen: z.string().optional(),
});
export const QuelleErgebnis = z.object({
  dokument: z.object({
    pruefsumme: z.string().length(64).describe('SHA-256 des Dokuments, genau wie im Auftrag'),
  }),
  seiten: z.array(SeiteSchema).min(1),
});

// ---------- baum ----------
export const BaumFaehigkeit = z.object({
  titel: z
    .string()
    .min(3)
    .max(70)
    .describe('Ein Satz, der mit einem Verb beginnt, z. B. „Vektoren komponentenweise addieren"'),
  beschreibung: Text,
  art: z.enum(['fakt', 'verfahren', 'verstaendnis']),
  stufe: Stufe,
  afb: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  pruefungsrelevant: z.boolean(),
  quellen: Quellen,
});
export const BaumThema = z.object({
  thema: z.string().min(1).max(60).describe('Kurz, 1 bis 5 Wörter'),
  faehigkeiten: z.array(BaumFaehigkeit).min(1).max(8),
  voraussetzungen: z
    .array(z.object({ faehigkeit: z.number().int().min(0), benoetigt: z.number().int().min(0) }))
    .max(8)
    .optional()
    .describe(
      'Indizes (ab 0) innerhalb von `faehigkeiten`: Fähigkeit X braucht vorher Fähigkeit Y. Höchstens 2 je Fähigkeit.',
    ),
});
export const BaumErgebnis = z.object({
  themen: z
    .array(BaumThema)
    .describe(
      'Leer, wenn die Abschnitte nur Einleitung, Inhaltsverzeichnis oder Organisatorisches enthalten',
    ),
});

// ---------- vorbereiten ----------
const Hinweise4 = z
  .array(Text)
  .length(4)
  .describe(
    'Hinweisleiter: 1 Orientierung, 2 Strategie, 3 nächster Schritt, 4 ähnliches gelöstes Beispiel. Verrät nie das Endergebnis.',
  );
const Basis = {
  frage: Text,
  stufe: Stufe,
  schwierigkeit: z.number().min(0).max(1),
  quellen: Quellen,
};
export const AufgabeKarte = z.object({
  typ: z.literal('karte'),
  ...Basis,
  antwort: Text,
  hinweise: z.array(Text).max(4).optional(),
});
export const AufgabeLuecke = z.object({
  typ: z.literal('luecke'),
  ...Basis,
  loesungen: z
    .array(Text)
    .min(1)
    .describe('Passende Wörter für die Lücken (___ im Text) in Reihenfolge'),
  hinweise: z.array(Text).max(4).optional(),
});
export const AufgabeMc = z.object({
  typ: z.literal('mc'),
  ...Basis,
  optionen: z
    .array(z.object({ text: Text, richtig: z.boolean(), begruendung: Text }))
    .min(3)
    .max(5),
  hinweise: Hinweise4,
});
export const AufgabeKurz = z.object({
  typ: z.literal('kurz'),
  ...Basis,
  antwort: Text,
  akzeptiert: z.array(Text).optional(),
  hinweise: Hinweise4,
});
export const AufgabeRechnung = z.object({
  typ: z.literal('rechnung'),
  ...Basis,
  antwort: z.object({
    wert: z.number(),
    einheit: z.string().optional(),
    toleranzProzent: z.number().min(0).max(20).optional(),
  }),
  rechenweg: z.array(Text).min(1),
  hinweise: Hinweise4,
});
const Offen = {
  ...Basis,
  musterloesung: Text,
  kernpunkte: z.array(Text).min(2).max(8).describe('Checkliste der Kernpunkte einer guten Antwort'),
  raster: z
    .array(z.object({ id: Text, kriterium: Text, punkte: z.number().int().min(1) }))
    .min(2)
    .max(10)
    .describe('Bewertungsraster; die Summe der Punkte ist die Höchstpunktzahl'),
  hinweise: Hinweise4,
};
export const AufgabeOffen = z.object({ typ: z.literal('offen'), ...Offen });
export const AufgabeTransfer = z.object({ typ: z.literal('transfer'), ...Offen });
export const Aufgabe = z.discriminatedUnion('typ', [
  AufgabeKarte,
  AufgabeLuecke,
  AufgabeMc,
  AufgabeKurz,
  AufgabeRechnung,
  AufgabeOffen,
  AufgabeTransfer,
]);

export const Erklaerung = z.object({
  text: z
    .string()
    .min(20)
    .describe('Höchstens 250 Wörter, auf dem Niveau der Klassenstufe. Formeln als LaTeX $…$'),
  quellen: Quellen,
});
export const Beispiel = z.object({
  aufgabe: Text,
  schritte: z.array(Text).min(1),
  ergebnis: Text,
  quellen: Quellen,
});
export const Fehlvorstellung = z.object({ muster: Text, diagnosefrage: Text, erklaerung: Text });
export const VorbereitenErgebnis = z.object({
  faehigkeit: z.string().min(1).describe('Die Fähigkeits-ID aus dem Auftrag'),
  erklaerung: Erklaerung,
  alternativErklaerung: Erklaerung.describe('Zweite Erklärung mit anderem Zugang'),
  beispiel: Beispiel.optional().describe(
    'Pflicht bei Fähigkeiten der Art „verfahren": vollständig gelöstes Beispiel',
  ),
  aufgaben: z
    .array(Aufgabe)
    .min(3)
    .max(14)
    .describe(
      'Mindestens je 1 Erinnern-, 1 Verstehen- und, wenn sinnvoll, 1 Anwenden-/Transfer-Aufgabe',
    ),
  fehlvorstellungen: z.array(Fehlvorstellung).max(3).optional(),
});

// ---------- bewerten ----------
export const Bewertung = z.object({
  id: Text.describe('Die Antwort-ID aus dem Auftrag'),
  punkte: z.number().min(0),
  maxPunkte: z.number().positive(),
  urteil: z.enum(['richtig', 'teilweise', 'falsch']),
  begruendung: z
    .string()
    .min(1)
    .max(600)
    .describe(
      'Welche Kernpunkte erfüllt sind, welche fehlen. Achte auf Verneinungen und Widersprüche.',
    ),
  rueckmeldung: z
    .string()
    .min(1)
    .max(500)
    .describe(
      'Höchstens 3 Sätze an den Schüler: was stimmt, was fehlt, nächster Schritt. Sachlich, ohne Floskeln.',
    ),
  kernfehler: z.string().nullable().optional(),
  sicherheit: z.number().min(0).max(1).describe('Ehrliche Sicherheit der Bewertung, 0 bis 1'),
});
export const BewertenErgebnis = z.object({ bewertungen: z.array(Bewertung).min(1) });

// ---------- auswertung ----------
export const AuswertungErgebnis = z.object({
  zusammenfassung: z.string().min(1).max(1500),
  staerken: z.array(Text).max(6),
  luecken: z
    .array(
      z.object({
        faehigkeit: z.string().optional().describe('Fähigkeits-ID oder -Titel aus dem Bericht'),
        text: Text,
      }),
    )
    .max(8),
  empfehlungen: z.array(z.object({ text: Text, begruendung: Text })).max(6),
  hinweis: z.string().optional(),
});

// Lockere Kopfschemas: prüfen nur die Hülle, die Einträge werden einzeln geprüft (Teilimport).
export const Huelle = {
  quelle_ergaenzen: z.object({
    dokument: z.object({ pruefsumme: z.string() }),
    seiten: z.array(z.unknown()),
  }),
  baum: z.object({ themen: z.array(z.unknown()) }),
  vorbereiten: z.object({
    faehigkeit: z.string(),
    erklaerung: z.unknown().optional(),
    alternativErklaerung: z.unknown().optional(),
    beispiel: z.unknown().optional(),
    aufgaben: z.array(z.unknown()),
    fehlvorstellungen: z.array(z.unknown()).optional(),
  }),
  bewerten: z.object({ bewertungen: z.array(z.unknown()) }),
  auswertung: z.unknown(),
} as const;

export const ErgebnisSchema = {
  quelle_ergaenzen: QuelleErgebnis,
  baum: BaumErgebnis,
  vorbereiten: VorbereitenErgebnis,
  bewerten: BewertenErgebnis,
  auswertung: AuswertungErgebnis,
} as const;
