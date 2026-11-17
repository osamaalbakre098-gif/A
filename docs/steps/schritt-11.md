### SCHRITT 11 – Die Bildschirme

**Ziel:** Wenige, klare Bildschirme mit je **einem** Hauptelement.

**Navigation:** Auf dem Handy unten, auf Tablet und Desktop links, jeweils 4 Punkte: **Lichtung · Fächer · Fortschritt · Suche**. Die Einstellungen liegen hinter dem Profilsymbol oben.

**Responsive:** Handy 320–599 px (eine Spalte), Tablet 600–1023 px (zwei Spalten, wo sinnvoll), Desktop ab 1024 px (Navigation links, Inhalt mittig, maximal 66 Zeichen Textbreite). Alles ist zuerst für das Handy gebaut.

**11.1 Onboarding** (höchstens 60–90 Sekunden, jeder Schritt überspringbar):

1. Begrüßung in einem Satz. Die Sprache wird automatisch erkannt und kann geändert werden.
2. „Was machst du gerade?" Schule, Ausbildung, Uni oder Selbstlernen, bei Schule optional Bundesland und Klasse.
3. Altersgruppe (unter 16 / 16 oder älter). Unter 16 startet Madar ohne KI (siehe Schritt 13).
4. „Lade dein erstes Material hoch." Datei, Foto oder Text.
5. „Wie viel Zeit hast du heute?" 15, 30, 45, 60 oder 90 Minuten.
6. Auf iOS die Anleitung „Zum Home-Bildschirm" (Schritt 3.5).
7. → **Direkt in die erste Sitzung**, beginnend mit 5–8 Diagnosefragen zum **ersten fertigen Thema**. Fehler sind ausdrücklich erlaubt. Ist noch kein Thema fertig, zeigt Madar währenddessen den PDF-Leser mit dem Material („Lies schon mal rein – in ca. 1 Minute geht es los").
8. **Ohne Material** (nur mit eingeschalteter KI; sonst bittet Madar freundlich um eine Datei): Nennt der Schüler nur ein Thema („Elektrizitätslehre Grundlagen"), erzeugt die KI einen kleinen Start-Baum ohne Quelle. Er ist deutlich als „ohne eigenes Material – bitte mit deinem Unterricht abgleichen" markiert, und Madar bittet später, Material hochzuladen.

**11.2 Lichtung (Startseite).** Sie ist ruhig und kein Dashboard.

- Oben eine kurze Begrüßung je nach Tageszeit, ohne erfundene Erfolge.
- **Hauptkarte „Jetzt lernen"** (Radius 28 px): darunter eine Zeile, was Madar vorhat, etwa „8 Wiederholungen · Vektoraddition · kurze Übung · ca. 35 Min.", dazu „Warum?".
- Drei Bereiche:
  - **Weiterlernen:** genau dort weitermachen, wo man aufgehört hat.
  - **Heute wiederholen:** Anzahl und Minuten, direkter Start.
  - **Für morgen bereit:** nächste Termine und Prüfungen mit Bereitschaft in Worten.
- Eine kleine Vorschau des Könnensbaums führt mit einem Tipp zum Fortschritt.
- **Leerzustände** mit Sorgfalt gestalten: „Alles für heute erledigt. Morgen warten 12 Karten (~8 Min.)." oder „Lade dein erstes Material hoch – den Rest plant Madar."

**11.3 Fokusraum (die Lernsitzung).** Das ist der wichtigste Bildschirm.

- Vollbild. Oben ein dünner Bogen mit den 4 Blöcken und ein kleiner Kreis-Timer. Sonst nur die Aufgabe.
- Keine Navigation, keine Benachrichtigungen, keine Statistik.
- Der Rahmen bleibt gleich, der Inhalt **passt sich der Tätigkeit an**:
  - _Erklären:_ Lesetext mit großzügigen Abständen, bei Bedarf ein Diagramm, dazu „Verstanden", „Anders erklären" und „Frage zu dieser Stelle".
  - _Abrufen:_ Frage, dann Eingabe (Pflicht), dann Aufdecken mit Kartendrehung, Bewertung und „Anders bewerten".
  - _Üben:_ Aufgabe, Eingabe, „Hinweis" (Leiter) und die Rückmeldung darunter.
  - _Lesen:_ PDF-Leser im Fokusrahmen.
  - _Frage stellen:_ Ein Sheet mit KI-Antwort **zu genau dieser Aufgabe**. Danach geht es an dieselbe Stelle zurück. In Version 1 gibt es keinen freien Chat.
- Unten klein: „Warum diese Aufgabe?", Pause, Beenden.
- Beim Beenden oder Schließen wird der Zustand automatisch gespeichert. „Weiterlernen" führt exakt dorthin zurück.
- **Abschluss:** neu Belegtes in Worten, offene Punkte, was morgen kommt. Keine Punkte und kein Konfetti.

**11.4 Fächer.**

- Ein Raster aus Fachkarten mit abgeschnittener Ecke und einem Akzent in der Fachfarbe.
- Ein geöffnetes Fach zeigt die Tabs Überblick, Material, Karten, Prüfungen und Notizen.
- „Material hinzufügen" ist immer sichtbar.

**11.5 Prüfungssimulation.**

- Timer, der sich ausblenden lässt, Fragenübersicht, Markieren zum Wiederansehen, automatisches Speichern und Abgabe mit Bestätigung.
- Die Auswertung zeigt nach Fähigkeit und Fehlerart, was sitzt, wo es Fehler gab, die wahrscheinliche Ursache und eine **sofort startbare** Folgeübung. Danach wird umgeplant.
- Eine Note erscheint nur, wenn der Schüler einen Notenschlüssel hinterlegt hat.

**11.6 Fortschritt.**

- Der Könnensbaum (Schritt 6.5) mit Umschalter zur Listenansicht.
- Prüfungen mit Bereitschaft als Ampel **und** in Worten, das Fehlerheft und die Wiederholungsprognose für die nächsten 7 Tage.

**11.7 Einstellungen** (bewusst wenige):
Sprache · Erscheinungsbild (Hell, Dunkel, System, Hoher Kontrast) · Textgröße · Bewegung reduzieren · tägliche Lernzeit · Blocklänge · späteste Lernzeit · Gründlichkeit (entspannt, normal, gründlich) · Lernhilfen · KI an/aus · Daten (Export, Import, Backup, Löschen, „Was wird wo gespeichert").

**11.8 Erinnerungen.** Madar entscheidet _wann_ gelernt wird, kann aber auf dem iPhone ohne Installation keine Nachrichten senden. Deshalb:

- **Kalender-Export:** Der Lernplan lässt sich als `.ics`-Datei bzw. abonnierbarer Kalender exportieren (feste Lernzeiten + Prüfungstermine). So erinnert der eigene Kalender.
- Web Push (nur installierte App, nur nach Zustimmung, höchstens 1 Erinnerung pro Tag) folgt in Version 2.
- Keine Erinnerung mit Schuldgefühl („Du hast 3 Tage nicht gelernt!"). Nur sachlich: „Heute stehen 12 Wiederholungen an (~9 Min.)."

**Abnahme:**

- E2E-Tests mit Playwright (Chromium und WebKit, 320–1440 px) für: Onboarding → Upload → automatischer Baum → erste Sitzung → Pause → Abschluss → Weiterlernen. Dazu Prüfung planen → Probeprüfung → Auswertung.
- Screenshots in Hell, Dunkel und RTL.
- axe ohne Verstöße, alles per Tastatur bedienbar.

---
