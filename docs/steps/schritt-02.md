### SCHRITT 2 – Sprachen und Barrierefreiheit

**Ziel:** Deutsch perfekt, Englisch und Arabisch vollständig, Bedienung für alle.

**Wie du es baust:**

1. i18next mit ICU-Pluralformen. Schlüssel nach Bereich: `lichtung.weiterlernen`, `session.hint.level2` usw.
2. `de.json` ist die Referenz. Ein Test schlägt fehl, wenn in `en.json` oder `ar.json` ein Schlüssel fehlt.
3. RTL umsetzen:
   - `dir` und `lang` am `<html>` setzen.
   - **Nur logische CSS-Eigenschaften** verwenden (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`). Ein Lint-Check verbietet `left`, `right`, `margin-left` usw.
   - Zahlen, Formeln und Code bleiben LTR (`<bdi>` bzw. `dir="ltr"`).
4. Barrierefreiheit:
   - Semantisches HTML, Landmarken (`header`, `nav`, `main`).
   - `aria-live="polite"` für Rückmeldungen nach Antworten.
   - Bei der Lernkarte wird die Rückseite vom Screenreader angesagt.
   - Tippziele mindestens 44×44 px. Sichtbarer Fokusring mit `--focus`.
   - Information nie nur über Farbe, sondern immer zusätzlich über Symbol oder Text.
   - Die Textgröße ist **in der App** einstellbar (90–200 %), unabhängig vom System.
   - Ein Theme mit hohem Kontrast als zusätzliche Option.
5. **Unterstützung ohne Diagnose** (in den Einstellungen unter „Lernhilfen", alles optional):
   - _Ruhiger Modus:_ Blöcke von 10–15 Minuten und ein Element pro Bildschirm.
   - _Lesehilfe:_ größere Abstände, Zeilenfokus, Vorlesen (Web Speech API).
   - _Prüfung ohne Druck:_ Timer ausgeblendet, „Probe ohne Wertung".

**Abnahme:**

- Sprachwechsel DE/EN/AR wirkt sofort, Arabisch ist korrekt gespiegelt (Screenshot-Test).
- Der Test auf fehlende Schlüssel ist grün.
- Die ganze App ist per Tastatur bedienbar, axe zeigt 0 kritische Verstöße.

---
