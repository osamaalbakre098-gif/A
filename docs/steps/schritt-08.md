### SCHRITT 8 – Lernermodell und Wiederholung (FSRS)

**Ziel:** Madar weiß ehrlich, was der Schüler kann, und plant Wiederholungen zum richtigen Zeitpunkt.

**Wie du es baust:**

**8.1 Interne Beherrschungszustände pro Fähigkeit** (nur aus Ereignissen berechnet, in `/src/core/model/`):

| Zustand       | Belegkriterium                                                                           |
| ------------- | ---------------------------------------------------------------------------------------- |
| `not_started` | keine Versuche                                                                           |
| `started`     | ≥ 1 Versuch oder Erklärung gesehen                                                       |
| `with_help`   | ≥ 1 richtige Lösung mit Hinweisstufe ≥ 2 oder nach einem Lösungsbeispiel                 |
| `independent` | ≥ 2 richtige Lösungen ohne Hilfe (Hinweisstufe 0–1) an ≥ 2 verschiedenen Aufgaben        |
| `mastered`    | `independent` + ≥ 1 richtiger Abruf nach ≥ 3 Tagen Abstand + ≥ 1 Transferaufgabe richtig |
| `review_due`  | war `mastered`, und FSRS-Abrufwahrscheinlichkeit < Ziel ODER 2 Fehler in Folge           |

- **Kriterium je nach Art der Fähigkeit** (aus Schritt 7, 1d): Bei `fakt` ersetzt ein zweiter verzögerter Abruf (nach ≥ 7 Tagen) die Transferaufgabe, denn bei Vokabeln oder Daten gibt es keinen sinnvollen Transfer. Bei `verfahren` und `verständnis` bleibt die Transferaufgabe Pflicht.
- **Von Karten zur Fähigkeit:** FSRS arbeitet pro Karte. Eine Fähigkeit ist `review_due`, wenn **mindestens ein Drittel** ihrer aktiven Karten fällig ist oder ihre Kernkarte (die erste Karte jeder Fähigkeit) fällig ist.
- Ein Rückfall geht **nur** auf `review_due`, nie zurück auf `not_started`.
- **Raten erkennen:** Eine richtige MC-Antwort zählt nicht als Beleg, wenn die Antwortzeit unter 25 % des persönlichen Medians liegt **und** (falls abgefragt) die Sicherheit niedrig war. Ohne Sicherheitsabfrage zählt eine sehr schnelle MC-Antwort nur halb. Für `independent` muss deshalb mindestens eine der richtigen Antworten **kein** Multiple Choice sein.
- Vorläufig bewertete offene Antworten (siehe Schritt 10) zählen nur halb.
- Eine Prozentzahl erscheint erst ab mindestens 5 Belegen. Davor steht „Noch zu wenig Daten".

**8.2 Fähigkeitswert (einfach und erklärbar).** Pro Fähigkeit gibt es einen Wert θ, pro Aufgabe eine Schwierigkeit b, aktualisiert wie bei Elo: `P = 1/(1+e^(−(θ−b)))`, `θ += K·(richtig − P)` mit K = 0,4 am Anfang, sinkend auf 0,15. Damit wählt der Studienleiter passende Aufgaben aus. Die Zustände aus 8.1 bleiben trotzdem die Grundlage für die Anzeige.

**8.3 FSRS** mit der Bibliothek `ts-fsrs` (FSRS-6):

```ts
const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: true,
  enable_short_term: true,
});
```

- Ziel-Behaltensrate: Standard 0,90. Einstellbar nur über drei Wörter: „entspannt" (0,85), „normal" (0,90), „gründlich" (0,93). Höhere Werte sind nicht sinnvoll, weil der Aufwand stark steigt.
- **Der Schüler drückt keine vier Bewertungsknöpfe.** Madar leitet die Bewertung aus der Antwort ab: falsch → Again, richtig mit Hinweis → Hard, richtig → Good, richtig + schnell + sicher → Easy. Ein kleiner Link „Anders bewerten" bleibt verfügbar.
- Eine persönliche Optimierung der FSRS-Parameter erfolgt erst ab etwa 1000 Bewertungen, lokal in einem Web Worker, und nur wenn sie auf zurückgehaltenen Daten besser vorhersagt.
- In der UI heißt es **nie** „Gedächtnisstärke", sondern zum Beispiel: „Madar schätzt, dass du das in etwa 6 Tagen wiederholen solltest."

**8.4 Fehlerarten.** Jede falsche Antwort wird klassifiziert: `slip` (Flüchtigkeit, war vorher richtig), `prerequisite_gap` (fehlende Voraussetzung), `misconception` (bekannte Fehlvorstellung), `procedural` (richtiger Ansatz, falscher Schritt), `reading` (Aufgabe falsch gelesen), `guess`, `ocr_or_asr` (Technikfehler, wird dem Schüler nicht angelastet). Daraus entsteht automatisch ein **Fehlerheft**: Wiederkehrende Fehler werden zu eigenen kurzen Übungen.

**8.5 Selbsteinschätzung (Kalibrierung).** Bei ausgewählten Aufgaben fragt Madar vor dem Aufdecken: „Wie sicher bist du?" (3 Stufen). Daraus wird pro Fach berechnet, ob der Schüler sich über- oder unterschätzt. Bei Überschätzung erscheint eine neutrale Wochenrückmeldung, und Madar plant mehr Abruf ein.

**Abnahme:**

- Tabellentests für jeden Zustandsübergang. Es gibt keinen Übergang ohne Beleg.
- Golden-Tests gegen ts-fsrs ergeben identische Intervalle.
- Eine Simulation über 14 Tage ergibt korrekte Fälligkeiten.

---
