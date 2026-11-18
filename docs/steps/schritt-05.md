### SCHRITT 5 – KI-Schicht: Auftragsaustausch (ersetzt „Proxy, Schemas, Schutzregeln")

> **Änderung durch den Nutzer (verbindlich, ersetzt den Prompt-Text zu Schritt 5):** Madar wird nur für den Nutzer selbst gebaut. Kein API-Schlüssel, kein Proxy, kein Turnstile, keine Budgetlogik. Claude arbeitet im Chat (Stichwort „madar") über einen **Auftragsaustausch**. Der Original-Wortlaut steht unverändert in `docs/MADAR_PROMPT.md`; bei dieser Änderung gilt diese Datei.

**Ziel:** Die KI versteht und formuliert Sprache. Sie plant nie. Der Studienleiter (reiner Code) entscheidet.

**A. Auftragsformat (gebaut, `src/ai/jobs/`)**

- `AuftragsAustauschProvider` hinter `LLMProvider` (`src/ai/provider.ts`); `MockProvider` für Tests.
- Paket: Anweisung, Regeln, Datenhinweis (Quelltext = Daten, nie Anweisung), JSON-Schema der Antwort, Textabschnitte mit kurzen IDs (A001 …), Prüfsumme des Dokuments, Version. Echte IDs bleiben auf dem Gerät (`idMap`).
- Auftragstypen: `quelle_ergaenzen`, `baum`, `vorbereiten`, `bewerten`, `auswertung`.
- Antworten werden mit Zod geprüft (Pflicht-Quellen, IDs müssen existieren, Hinweise 1–3 dürfen die Lösung nicht verraten), **teilweise importiert** (gültige Einheiten ja, ungültige mit deutscher Fehlermeldung), alles in **einer** Transaktion (nie halb gespeichert).
- Pakete höchstens ca. 30 000 Token, größere werden automatisch geteilt.
- Fortschritt je Datei berechnet die App aus den Fähigkeitsständen (`src/core/model/mastery.ts`, `src/data/progress.ts`), nie Claude; Prozent erst ab 5 Belegen, auf 5 gerundet.
- Offene Antworten: sofortige Selbstbewertung gegen Checkliste/Musterlösung; optional zur Bewertung vormerken (`gradingState: 'queued'`); Hinweise kommen aus der vorbereiteten Hinweisleiter.
- „Auswertung": nur eine Empfehlung; ändert nie den Plan.
- Oberfläche „Aufträge" (`#jobs`): Auftrag kopieren/herunterladen, Antwort einfügen oder als Datei, Rückfall ohne Server.
- Anleitung für Claude: `docs/CLAUDE_ARBEITER_ANWEISUNG.md`. Beispiele: `docs/beispiele/`.

**B. MCP-Server auf Cloudflare (gebaut, `server/mcp/`, `functions/`)**

- Werkzeuge: `offene_auftraege`, `auftrag_holen`, `ergebnis_abliefern`, `lernbericht_holen`, `auswertung_ablegen`. Zugriff nur mit geheimem Kopplungscode.
- Server speichert nur Pakete und Ergebnisse (Cloudflare KV), nie Dateien oder die Datenbank; nach Abholung gelöscht (spätestens 14 Tage).
- Die App lädt Aufträge hoch und holt Ergebnisse ab (gleiche Prüfung wie beim Einfügen).
- Anleitung: `docs/KONNEKTOR_ANLEITUNG.md`.

**C. Auf Version 2 verschoben:** Proxy, Turnstile, D1-Zähler, Budgetlogik, mehrere Nutzer. Die Schnittstelle `LLMProvider` bleibt, damit eine direkte API-Anbindung später ohne Umbau möglich ist.

**Abnahme:** Auftragsformat mit Beispielantworten getestet (Tests `tests/unit/auftraege.test.ts`, `tests/unit/mcp.test.ts`); Datenverlust ausgeschlossen (Zeilenzahlen aller Tabellen vor/nach gleich, außer Neues); Prompt-Injection im Quelltext ändert nichts; Rückfall ohne Server geht.
