import type { JobPackage } from '../../src/ai/jobs/types';

/** Beispielantworten, wie sie Claude liefern würde (aus einem Auftragspaket abgeleitet). */
type Abschnitt = { id: string };
const ids = (p: JobPackage) => (p.eingabe.abschnitte as Abschnitt[]).map((a) => a.id);

export const baumAntwort = (p: JobPackage) => {
  const a = ids(p);
  return {
    themen: [
      {
        thema: 'Vektoren',
        faehigkeiten: [
          {
            titel: 'Betrag und Richtung eines Vektors benennen',
            beschreibung: 'Die zwei Eigenschaften eines Vektors nennen.',
            art: 'fakt',
            stufe: 'erinnern',
            pruefungsrelevant: true,
            quellen: [a[0]!],
          },
          {
            titel: 'Vektoren komponentenweise addieren',
            beschreibung: 'Zwei Vektoren durch Addition der Komponenten zusammenfassen.',
            art: 'verfahren',
            stufe: 'anwenden',
            afb: 2,
            pruefungsrelevant: true,
            quellen: [a[1] ?? a[0]!],
          },
        ],
        voraussetzungen: [{ faehigkeit: 1, benoetigt: 0 }],
      },
    ],
  };
};

export const vorbereitenAntwort = (p: JobPackage) => {
  const q = [ids(p)[0]!];
  const hinweise = [
    'Was ist gegeben, was gesucht?',
    'Welche Rechenregel passt zu Vektoren?',
    'Rechne zuerst nur die erste Komponente aus.',
    'Ähnliches Beispiel: (2,1)+(1,1) rechnet man komponentenweise.',
  ];
  return {
    faehigkeit: 'F01',
    erklaerung: {
      text: 'Ein Vektor ist ein Pfeil mit Betrag und Richtung. Vektoren addiert man, indem man ihre Komponenten einzeln addiert.',
      quellen: q,
    },
    alternativErklaerung: {
      text: 'Stell dir zwei Schritte nacheinander vor: Der zweite Pfeil beginnt dort, wo der erste endet. Das Ergebnis führt vom Start zum Ziel.',
      quellen: q,
    },
    beispiel: {
      aufgabe: 'Addiere (1,2) und (3,4).',
      schritte: ['Erste Komponenten: 1+3=4', 'Zweite Komponenten: 2+4=6'],
      ergebnis: '(4,6)',
      quellen: q,
    },
    aufgaben: [
      {
        typ: 'karte',
        frage: 'Was hat ein Vektor?',
        antwort: 'Betrag und Richtung',
        stufe: 'erinnern',
        schwierigkeit: 0.1,
        quellen: q,
      },
      {
        typ: 'mc',
        frage: 'Wie addiert man zwei Vektoren?',
        optionen: [
          {
            text: 'Komponentenweise',
            richtig: true,
            begruendung: 'Gleiche Komponenten werden addiert.',
          },
          {
            text: 'Nur die Beträge addieren',
            richtig: false,
            begruendung: 'Die Richtung geht dabei verloren.',
          },
          {
            text: 'Die Komponenten multiplizieren',
            richtig: false,
            begruendung: 'Das ist keine Addition.',
          },
        ],
        hinweise,
        stufe: 'verstehen',
        schwierigkeit: 0.3,
        quellen: q,
      },
      {
        typ: 'kurz',
        frage: 'Wie heißt die Länge eines Vektors?',
        antwort: 'Betrag',
        hinweise: [
          'Es ist ein Fachwort.',
          'Es beginnt mit B.',
          'Es sagt, wie lang der Pfeil ist.',
          'Ähnlich: Bei einer Strecke nennt man das die Länge.',
        ],
        stufe: 'erinnern',
        schwierigkeit: 0.2,
        quellen: q,
      },
      {
        typ: 'rechnung',
        frage: 'Addiere (12,5) und (30,7). Wie lautet die erste Komponente?',
        antwort: { wert: 42, toleranzProzent: 0 },
        rechenweg: ['12+30=42'],
        hinweise,
        stufe: 'anwenden',
        schwierigkeit: 0.4,
        quellen: q,
      },
      {
        typ: 'offen',
        frage: 'Erkläre, wie man zwei Vektoren addiert, und warum die Richtung wichtig ist.',
        musterloesung:
          'Man addiert die Komponenten einzeln. Die Richtung ist wichtig, weil Pfeile in verschiedene Richtungen sich teilweise aufheben.',
        kernpunkte: ['Komponentenweise addieren', 'Richtung beachten'],
        raster: [
          { id: 'r1', kriterium: 'Komponentenweise genannt', punkte: 2 },
          { id: 'r2', kriterium: 'Richtung begründet', punkte: 2 },
        ],
        hinweise,
        stufe: 'verstehen',
        schwierigkeit: 0.6,
        quellen: q,
      },
    ],
    fehlvorstellungen: [
      {
        muster: 'x-Komponente mit y-Komponente addiert',
        diagnosefrage: 'Welche Komponenten addierst du?',
        erklaerung: 'Nur gleiche Komponenten werden addiert.',
      },
    ],
  };
};

export const bewertenAntwort = (p: JobPackage) => ({
  bewertungen: (p.eingabe.antworten as { id: string; maxPunkte: number }[]).map((a) => ({
    id: a.id,
    punkte: 3,
    maxPunkte: a.maxPunkte,
    urteil: 'teilweise',
    begruendung: 'Komponentenweise Addition ist genannt, die Begründung zur Richtung fehlt.',
    rueckmeldung:
      'Die komponentenweise Addition stimmt. Es fehlt, warum die Richtung wichtig ist. Ergänze, was bei entgegengesetzten Pfeilen passiert.',
    kernfehler: null,
    sicherheit: 0.85,
  })),
});

export const quelleAntwort = (p: JobPackage) => ({
  dokument: { pruefsumme: (p.eingabe.dokument as { pruefsumme: string }).pruefsumme },
  seiten: (p.eingabe.seiten as number[]).map((s, i) => ({
    seite: s,
    text: i === 0 ? 'Die Geschwindigkeit ist ein Vektor.\n\nSie hat Betrag und Richtung.' : '',
    ueberschriften: i === 0 ? [{ ebene: 2, titel: 'Geschwindigkeit' }] : undefined,
    formeln: i === 0 ? [{ latex: 'v=\\frac{s}{t}', bedeutung: 'Geschwindigkeit' }] : undefined,
    nurAbbildung: i !== 0,
    lesbarkeit: 'gut',
  })),
});

export const auswertungAntwort = () => ({
  zusammenfassung: 'Die ersten Aufgaben zu Vektoren laufen gut, die Datenlage ist noch dünn.',
  staerken: ['Begriffe zu Vektoren sitzen'],
  luecken: [{ faehigkeit: 'F01', text: 'Offene Begründungen sind noch unvollständig.' }],
  empfehlungen: [
    {
      text: 'Noch eine offene Aufgabe zur Richtung üben.',
      begruendung: 'Die Bewertung nannte fehlende Begründung.',
    },
  ],
});
