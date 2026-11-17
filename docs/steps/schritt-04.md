### SCHRITT 4 – Material importieren, lesen, durchsuchen

**Ziel:** Der Schüler lädt PDFs, Fotos oder Text hoch und kann sie in Originalqualität lesen und durchsuchen.

**Wie du es baust:**

**4.1 Import.**

- Wege: Datei wählen, Kamera (Foto vom Heft), Text einfügen. Drag & Drop auf dem Desktop.
- Der SHA-256 der Datei verhindert, dass dieselbe Datei im selben Fach doppelt importiert wird. In einem anderen Fach darf sie erneut verwendet werden (gespeichert wird sie nur einmal).
- Die Originaldatei wird als Blob gespeichert und **nie verändert**.
- Ein Fortschrittsanzeiger zeigt die Phasen in Klartext: „Wird gelesen … Text wird erkannt … Themen werden gefunden …".

**4.2 PDF-Leser** mit pdf.js in einem Web Worker.

- Seiten mit Canvas und Textlayer rendern, `devicePixelRatio`-genau. Beim Zoomen neu rendern, damit nichts verpixelt.
- Seiten nur laden, wenn sie sichtbar werden (IntersectionObserver).
- Pinch-Zoom und stufenloser Zoom bis mindestens 400 %. Zusätzlich ein **Umfließen-Modus**, der den Text als HTML in großer Schrift zeigt. **Sicherheit:** Text aus Dateien wird nur als Text eingefügt (`textContent`), nie als HTML. Wo HTML nötig ist, läuft es durch DOMPurify.
- Suche im Textlayer: Treffer werden **direkt auf der Seite** farbig markiert, mit „vorheriger/nächster Treffer". Beim Schließen der Suche verschwinden die Markierungen.
- Text markieren zeigt drei Aktionen: „Karte daraus machen", „Erklär mir das", „Notiz".
- Markierungen werden getrennt in `annotations` gespeichert.

**4.3 OCR** mit tesseract.js in einem Web Worker, Sprachen `deu`, `eng`, `ara`.

- OCR läuft **nur** für Seiten ohne Textlayer und für Fotos.
- Die Sprachdaten (`deu`, `eng`, `ara`, je mehrere MB) werden **einmal** beim ersten Bedarf geladen, im Cache Storage gespeichert und danach offline genutzt. Vorher fragt die App: „Für Fotos und eingescannte Seiten lädt Madar einmalig ca. X MB. Jetzt laden?"
- Wörter mit einer Konfidenz unter 70 werden markiert, und es erscheint der Hinweis: „Automatisch erkannter Text – kann Fehler enthalten."
- Miss die OCR-Qualität für Arabisch an 20 Testseiten und dokumentiere das Ergebnis ehrlich in `STATUS.md`.

**4.4 Zerlegung (Chunking).**

- Text in Abschnitte von 150–400 Wörtern teilen, an Absatz- und Überschriftsgrenzen.
- Jeder Abschnitt speichert `documentId`, `page`, `bbox` (Position auf der Seite) und `text`.
- Überschriften erkennen (Schriftgröße und Fettdruck aus pdf.js) und als Strukturhinweis speichern. Sie sind die wichtigste Grundlage für den Könnensbaum.

**4.5 Einheitliche Suche** mit MiniSearch.

- **Ein** Suchfeld für alles: Fächer, Dateien, PDF-Seiten, Notizen, Karten, Fähigkeiten.
- Deutsche Normalisierung: ä=ae, ö=oe, ü=ue, ß=ss, Groß- und Kleinschreibung ignorieren, unscharfe Suche.
- Ergebnisse zeigen die Quelle in Klartext: „Physik › Skript Kapitel 3 › Seite 12".
- Ein Tipp auf ein Ergebnis springt genau an die Stelle (Seite plus markierte Position).

**4.6 Formeln (Mathe, Physik, Chemie).**

- **Anzeige:** KaTeX für alle Formeln in Erklärungen, Karten und Aufgaben (schnell, offline, barrierefrei mit MathML-Ausgabe). Die KI liefert Formeln als LaTeX zwischen `$…$`.
- **Eingabe:** Für Rechen- und Formelaufgaben ein Formelfeld mit **MathLive** (virtuelle Tastatur auf dem Handy). Für einfache Zahlenantworten genügt ein normales Feld mit Einheit.
- **Prüfung:** Zahlen mit Toleranz und Einheitenumrechnung; Terme symbolisch vergleichen (z. B. mit `mathjs` durch Einsetzen zufälliger Werte), nicht als Text.
- Chemische Formeln mit `mhchem` (KaTeX-Erweiterung).
- Bilder und Diagramme in PDFs werden in Version 1 **nicht** inhaltlich ausgewertet. Diese Grenze steht in STATUS.md und wird dem Schüler bei bildlastigen Seiten angezeigt („Diese Seite enthält vor allem Abbildungen. Madar erstellt dazu noch keine Aufgaben.").

**Abnahme:**

- Ein 300-Seiten-PDF öffnet flüssig (WebKit-Test plus echtes iPhone in STATUS.md).
- Suchtreffer werden auf der Seite markiert und der Sprung funktioniert.
- OCR-Text ist gekennzeichnet, das Original bleibt unverändert (Hash-Vergleich).

---
