### SCHRITT 9 – Der Studienleiter ⭐ (das Herzstück)

**Ziel:** Madar entscheidet alles, was der Schüler sonst selbst organisieren müsste, und begründet jede Entscheidung.

**Grundregel für den Code:** `/src/core/director/` ist **reiner, deterministischer TypeScript-Code**, ohne UI, ohne Datenbank, ohne KI und ohne `Date.now()`. Eingabe: `LearnerSnapshot`, `now`, `settings`. Ausgabe: Entscheidungen mit Begründungscodes.

```ts
interface Decision<T> {
  value: T;
  reasons: ReasonCode[];
  overridable: true;
}
type ReasonCode =
  | 'DUE_REVIEW'
  | 'EXAM_PRESSURE'
  | 'PREREQ_GAP'
  | 'RECURRING_ERROR'
  | 'NEW_MATERIAL'
  | 'INTERLEAVE_CONFUSABLE'
  | 'FATIGUE'
  | 'GOAL_REACHED'
  | 'USER_OVERRIDE'
  | 'RELEARN'
  | 'LATE_HOUR';
```

Erweitere die Liste bei Bedarf (z. B. `PRETEST`, `NO_AI_FALLBACK`), aber jeder Code braucht einen Text. Jeder Begründungscode hat einen verständlichen Text in `de.json`, zum Beispiel `DUE_REVIEW`: „Diese Karten sind heute fällig. Wenn du sie jetzt wiederholst, bleiben sie besser im Gedächtnis."

**9.1 Tagesplaner – was heute dran ist.**
Für jede Fähigkeit wird eine Priorität berechnet:

```
priorität = 0.30·fälligkeit + 0.25·prüfungsdruck + 0.20·lückenschwere
          + 0.15·fehlermuster + 0.10·neuheit − 0.15·heuteSchonGeübt
```

- `fälligkeit` = Anteil fälliger Karten der Fähigkeit.
- `prüfungsdruck` = steigt, je näher eine Prüfung ist, in der die Fähigkeit vorkommt.
- `lückenschwere` = Anteil offener Voraussetzungen.
- `fehlermuster` = 1, wenn derselbe Fehlertyp ≥ 2× in den letzten 5 Versuchen vorkam.
- `neuheit` = nur > 0, wenn alle Voraussetzungen mindestens `with_help` sind.

Die Gewichte sind **Startwerte** und stehen in `director.config.ts`. Sie werden später anhand echter Daten angepasst.

**Harte Regeln vor der Formel:**

- **H1:** Nichts Neues, wenn eine Voraussetzung `not_started` ist. Stattdessen wird die Voraussetzung eingeplant.
- **H2:** Fällige Wiederlern-Sitzungen (9.6) kommen vor Neuem.
- **H3:** Der Plan passt immer in die verfügbare Zeit. Brauchen die Wiederholungen mehr als 60 % der Zeit, gibt es heute nichts Neues, und Madar erklärt das.
- **H4:** Höchstens 3 Fächer pro Sitzung.
- **H5:** Ist die Prüfung höchstens 2 Tage entfernt, gibt es nur noch Wiederholung und Probeprüfung.
- **H6:** Höchstens 20 neue Karten pro Tag. Ist die Wiederholungslast der nächsten 7 Tage zu hoch, wird automatisch reduziert.

**9.2 Sitzungsbauer – wie eine Sitzung aufgebaut ist.**

| Block        | Dauer     | Inhalt                                                                     | Warum                        |
| ------------ | --------- | -------------------------------------------------------------------------- | ---------------------------- |
| 1. Aufwärmen | 3–5 min   | 3–6 fällige Abrufkarten aus **früheren** Sitzungen                         | Abruf vor neuem Input        |
| 2. Kern      | 10–20 min | **eine** Fähigkeit: neu oder Lücke                                         | Verstehen                    |
| 3. Üben      | 8–15 min  | Aufgaben mit abnehmender Hilfe, später gemischt                            | Anwenden                     |
| 4. Abschluss | 2–4 min   | „Schreib 3 Dinge auf, die du jetzt weißt" + 1 Sicherheitsfrage + Übersicht | Festigen, Selbsteinschätzung |

Nach jedem Block entscheidet der Studienleiter neu: weiter, Pause, Wechsel oder Ende.

Die freie Wiedergabe im Abschluss („3 Dinge") wird **nicht bewertet** und zählt nicht als Beleg. Madar zeigt danach nur die Kernpunkte der Fähigkeit daneben, damit der Schüler selbst vergleicht. So entstehen keine KI-Kosten und keine falschen Urteile.

**9.3 Methodenwähler – mit welcher Methode.**

| Regel    | Bedingung                                             | Methode                                                                           |
| -------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| M1       | Fähigkeit neu und prozedural (Mathe, Physik, Chemie)  | Lösungsbeispiel → ähnliche Aufgabe → Hilfe schrittweise ausblenden                |
| M2       | Zustand `with_help`                                   | pro richtiger Aufgabe ein ausgearbeiteter Schritt weniger                         |
| M3       | Zustand ≥ `independent`                               | keine Lösungsbeispiele mehr, nur Aufgaben (Fortgeschrittene bremst zu viel Hilfe) |
| M4       | Faktenwissen (Begriffe, Daten, Vokabeln)              | Abrufkarten + Wiederlernen (9.6)                                                  |
| M5       | Verständnisziel                                       | gezielte „Warum?"-Frage, **nicht** bei jedem Rechenschritt                        |
| M6       | neues Kapitel, Vorwissen unklar                       | Vortest mit 3–5 Fragen. Fehler sind ausdrücklich erlaubt und zählen nicht         |
| I        | ≥ 2 verwechselbare Aufgabentypen, jeder ≥ `with_help` | gemischtes Üben (Interleaving)                                                    |
| I-Verbot | Vokabellisten, isolierte Fakten, unverwandte Fächer   | nicht mischen (schadet dort)                                                      |

**Zielschwierigkeit:** Im Übungsblock soll die Trefferquote bei 70–85 % liegen. Bei über 90 % über 8 Aufgaben wird es schwerer (Transfer oder höhere Stufe). Bei unter 60 % über 6 Aufgaben wird es leichter (Lösungsbeispiel oder Voraussetzung).

**Echter Abruf ist Pflicht:** Bevor eine Karte aufgedeckt wird, muss der Schüler eine Antwort eingeben **oder** bewusst „Weiß ich nicht" wählen. Einfaches Umdrehen gibt es nicht.

**9.4 Hinweisleiter – nie zuerst die Lösung.**

```
Stufe 0: eigener Versuch (Pflicht: mind. 1 Versuch oder 45 Sekunden)
Stufe 1: Orientierung – „Was ist gegeben, was ist gesucht?"
Stufe 2: Strategie – „Welche Regel passt?" (Auswahl aus 3)
Stufe 3: nächster konkreter Schritt (genau einer)
Stufe 4: ähnliches gelöstes Beispiel (nicht diese Aufgabe)
Stufe 5: vollständige Lösung – nur nach Stufe 1–4; zählt als „mit Hilfe";
         eine ähnliche Aufgabe wird für morgen eingeplant
```

**Lösungs-Leck-Prüfung:** Enthält ein KI-Hinweis das Endergebnis (Vergleich mit der Musterlösung), wird er verworfen und eine Stufe niedriger neu erzeugt.

**9.5 Pausen und Schluss.**

```
Pause vorschlagen, wenn EINES gilt:
 - Blockzeit erreicht (Standard 25 min, einstellbar 15–50)
 - Ermüdung: Antwortzeit-Median der letzten 6 Aufgaben > 1,6 × persönlicher Median
   UND Trefferquote ≥ 20 Prozentpunkte unter Sitzungsbeginn
 - ≥ 3 Fehler in Folge bei Aufgaben, die vorher sicher waren
Pausenlänge: 5 Minuten normal; 10–15 Minuten nach schwerem Block oder Ermüdung
Schluss vorschlagen, wenn: Tagesziel erreicht ODER 2 Ermüdungssignale in einer Sitzung
   ODER Tageshöchstzeit erreicht ODER nach der eingestellten spätesten Uhrzeit (Standard 22:00)
```

- Pausen und Schluss sind **Vorschläge** mit „Warum?". Der Schüler darf weitermachen, wird dafür aber nicht belohnt.
- Der Pausenbildschirm ist ruhig: Kreis-Timer und Vorschläge wie Aufstehen, Wasser trinken oder die Augen entspannen. Er zeigt keine Lerninhalte und keine Statistik.
- Nach der spätesten Uhrzeit gibt es keine neuen Inhalte mehr, nur kurze Wiederholung und einen sanften Hinweis auf Schlaf.
- Die Schwellenwerte (1,6× und 20 Punkte) sind **Startwerte** in der Konfiguration.

**9.6 Wiederlernen vor Prüfungen (Successive Relearning).**

```
Für jede prüfungsrelevante neue Fähigkeit/Karte mit Prüfung am Datum E:
 Sitzung 1: wiederholen, bis 3 richtige Abrufe (falsch → ans Ende der Warteschlange)
 Wiederlern-Sitzungen 1–3: je bis 1 richtiger Abruf
 Abstand = 10–20 % der Zeit bis zur Prüfung, mindestens 1 Tag, höchstens 21 Tage
 Prüfung < 7 Tage entfernt: Abstände 1–2 Tage, mindestens 2 Wiederlern-Sitzungen
 Nach der Prüfung: zurück in den normalen FSRS-Betrieb
Liegt der FSRS-Termin nach der Prüfung, gilt dieser Planer.
```

**9.7 Prüfungsplanung rückwärts.**

1. Eingabe: Fach, Datum und optional die Themen. Ohne Themen gilt das ganze Fach.
2. Die letzten 1–2 Tage vor der Prüfung sind nur für Wiederholung und eine leichte Probeprüfung.
3. Neuer Stoff wird nur bis `E − max(3 Tage, 20 % der Restzeit)` eingeplant.
4. Fähigkeiten werden in Lernreihenfolge verteilt (Voraussetzungen zuerst), 15 % Puffer bleiben frei.
5. Dazu kommen die Wiederlern-Sitzungen nach 9.6.
6. Eine volle Probeprüfung findet bei ca. 60 % der Zeit statt, eine zweite bei ca. 85 %. Danach wird automatisch umgeplant.
7. **Überlast:** Reicht die Zeit nicht, sagt Madar das ehrlich und priorisiert: „Mit 4 Tagen schaffst du die Themen A–C sicher. D und E nur in den Grundlagen."
8. Ein verpasster Tag oder ein verschobener Termin führt zu einer automatischen Neuplanung **ohne Vorwurf**: „Der Plan wurde angepasst. Bis Freitag ist noch alles erreichbar."
9. Deutsches Bildungssystem: Bundesland und Schulform werden einmal optional erfragt. Notensysteme (1–6, 15 Punkte, Uni 1,0–5,0) sind wählbar. **Einen Notenschlüssel gibt es nur, wenn der Schüler ihn selbst einträgt.** Nichts wird erfunden.

**9.8 Ändern und „Warum?".**

- Jede Entscheidung (Thema, Methode, Dauer, Pause, Schluss) hat „Warum?" und „Ändern".
- „Lieber etwas anderes" zeigt 2–3 Alternativen. Bei „Heute nur X" baut Madar die Sitzung um X herum und behält fällige Wiederholungen kurz bei.
- Jede Änderung wird als `UserOverride`-Ereignis gespeichert. Nach drei gleichen Änderungen fragt Madar **einmal**, ob die Voreinstellung dauerhaft angepasst werden soll.
- Änderungen beeinflussen **nie** den Beherrschungszustand.

**Abnahme:**

- Property-Tests mit fast-check: H1–H6 gelten für 10 000 zufällige Lernstände, jede Entscheidung hat mindestens einen Begründungscode.
- Szenario-Test „Physik-Prüfung in 14 Tagen": Jede neue Fähigkeit hat 3 Wiederlern-Termine vor der Prüfung, an den letzten 2 Tagen gibt es nichts Neues, der Plan passt immer ins Zeitbudget.
- Der Tagesplan für 5000 Items wird in höchstens 50 ms berechnet (Benchmark).
- Eine simulierte Ermüdung löst einen Pausenvorschlag aus.

---
