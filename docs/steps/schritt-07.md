### SCHRITT 7 – Karten und Aufgaben automatisch erzeugen

**Ziel:** Zu jeder Fähigkeit entstehen automatisch gute Lernkarten und Aufgaben.

**Wie du es baust:**

1. **Erst bei Bedarf erzeugen (Kosten!):** Inhalte werden **nicht** für den ganzen Baum auf einmal erzeugt, sondern nur für Fähigkeiten, die der Studienleiter in den **nächsten 3 Lerntagen** einplant (plus ein kleiner Vorrat für Offline-Nutzung). Pro Fähigkeit erzeugt die KI (Aufgabe `generate_items`) 4–8 Karten und 3–6 Aufgaben, und zwar **nur aus den Belegabschnitten**.
   1b. **Erklärung pro Fähigkeit** (Aufgabe `generate_lesson`), ebenfalls nur bei Bedarf: eine kurze Erklärung (höchstens 250 Wörter, auf dem Niveau der Klassenstufe), bei prozeduralen Fähigkeiten **ein vollständig gelöstes Beispiel mit Schritten** (für Regel M1) und eine **zweite Erklärung mit anderem Zugang** (für „Anders erklären"). Alles mit Quellverweis. Bei Bedarf eine einfache Skizze als SVG-Beschreibung, sonst keine Bilder.
   1c. **Hinweise vorbereiten:** Für jede Aufgabe werden die Hinweisstufen 1–4 zusammen mit der Aufgabe erzeugt und gespeichert. Nur der Hinweis zu einem konkreten falschen Versuch wird live erzeugt.
   1d. **Art der Fähigkeit** bestimmen: `fakt` (Begriffe, Daten, Vokabeln), `verfahren` (Rechnen, Lösungswege) oder `verständnis` (Zusammenhänge erklären). Die Art steuert Methode (Schritt 9.3) und Beherrschungskriterium (Schritt 8.1).
2. **Kartentypen:** Frage–Antwort, Lückentext, Reihenfolge, Zuordnung, Unterscheidung zweier ähnlicher Begriffe, Anwendung auf ein neues Beispiel.
3. **Aufgabentypen:** Multiple Choice (genau eine richtige Antwort, plausible Ablenker mit Begründung `distractorRationale`), Kurzantwort, offene Antwort (mit Rubrik und Referenzantwort), Rechenaufgabe (Ergebnis mit Toleranz und Einheit), Transferaufgabe.
4. **Mischung der Stufen:** Pro Fähigkeit mindestens 1 Erinnern-, 1 Verstehen- und, wenn sinnvoll, 1 Anwenden- oder Transfer-Item.
5. **Qualitätsprüfung**, automatisch und in dieser Reihenfolge:
   - Zod-Validierung.
   - Prüfer-KI: „Ist die Antwort aus der Quelle ableitbar? ja/nein + Zitat". Bei nein wird das Item verworfen.
   - Duplikate über Ähnlichkeit erkennen und zusammenlegen.
   - Regeln: keine versteckten Verneinungsfallen, MC mit genau einer richtigen Option, Lücke nicht trivial (nicht „der/die/das"), Frage eindeutig.
6. Neue Items starten als `draft` und werden nach bestandener Prüfung `active`. In der Sitzung hat jedes Item einen kleinen Knopf „Fehler melden". Gemeldete Items werden sofort ausgesetzt.
7. **Fehlvorstellungen:** Für jede Fähigkeit darf die KI bis zu 3 typische Fehlvorstellungen mit Diagnosefrage und Erklärung vorschlagen (`misconceptions`), zum Beispiel „x-Komponente des einen Vektors mit y-Komponente des anderen addiert".
8. **Nachschub:** Sinkt die Zahl ungenutzter Aufgaben einer Fähigkeit unter 3, werden im Hintergrund neue erzeugt.

**Abnahme:**

- Für das Physik-Testskript entstehen ≥ 20 geprüfte Items mit Quellenangabe.
- Im Test mit 200 erzeugten Items gibt es 0 Items ohne Quellbeleg.

---
