# Beispiele für Auftragspakete und Antworten

Diese Dateien sind **echt aus dem Code erzeugt** (`BEISPIELE=1 npx vitest run tests/unit/_beispiele.test.ts`), kein Handtext. Das Material ist ein Zwei-Absatz-Skript „Vektoren".

| Datei                      | Inhalt                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `auftrag-baum.json`        | Das Paket, wie es auf dem Server liegt (inkl. JSON-Schema der Antwort).                                                              |
| `auftrag-baum.txt`         | Dasselbe als Text zum Kopieren in Claude (Abschnitte ANWEISUNG, REGELN, DATENHINWEIS, ANTWORTFORMAT, DATEN).                         |
| `antwort-baum.json`        | Eine gültige Antwort (Testdaten, keine echte Claude-Antwort).                                                                        |
| `auftrag-vorbereiten.json` | Paket „Fähigkeit vorbereiten".                                                                                                       |
| `antwort-vorbereiten.json` | Gültige Beispielantwort: Erklärung, Aufgaben, Hinweisleiter 1–4, Fehlvorstellungen, offene Aufgabe mit Musterlösung und Kernpunkten. |

Hinweis: Die Antworten stammen aus Test-Bausteinen, nicht von einem echten Claude-Lauf.
