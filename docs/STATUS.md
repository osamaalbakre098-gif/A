# Status

Ehrlicher Stand. „Echtes Gerät" ist ein Test auf einem echten iPhone, kein Emulator.

| Schritt     | Gebaut                  | Automatisch getestet                                       | Auf echtem iPhone geprüft |
| ----------- | ----------------------- | ---------------------------------------------------------- | ------------------------- |
| 0 Fundament | teilweise (siehe unten) | ja: Typecheck, Lint, 5 Unit-Tests, Build, 1 E2E (Chromium) | nein                      |
| 1–15        | nein                    | –                                                          | –                         |

## Schritt 0 – Details

- Gebaut: Vite + React + strict TypeScript, ESLint, Prettier, Vitest, Playwright, axe-Pakete, PWA-Gerüst (`registerType: 'prompt'`), Ordnerstruktur, `CLAUDE.md`, `src/core/time.ts` (Lerntag 04:00), CI-Datei.
- Prompt-Datei liegt nun in `docs/MADAR_PROMPT.md`, wörtlich aufgeteilt in `docs/steps/` und `docs/GRUNDLAGEN.md` (Verlustfreiheit per Zeilenvergleich geprüft).
- Noch offen: Playwright-WebKit läuft in dieser Cloud-Umgebung nicht (nur Chromium vorhanden). Das iPhone-Profil ist konfiguriert, aber ungetestet.
- `pnpm a11y` und `pnpm a11y:contrast` sind Platzhalter bis Schritt 1.
- CI (GitHub Actions) ist angelegt, aber nie auf GitHub gelaufen.

## Schritt 1 – Details

- Gebaut: Tokens (`tokens.css`/`tokens.ts`, Hell, Dunkel, Hoher Kontrast, 8 Fachfarben), Kontrasttest (`pnpm a11y:contrast`), 12 Bausteine (Button, IconButton, TextField, TextArea, Switch, ContentCard, Flashcard, ChoiceList, HintLadder, FocusCircle, ProgressArc, EmptyState, Dialog), Galerie unter `/dev/components` (nur Dev), Inter lokal, Lucide-Icons.
- Noch offen für Meilenstein 2: `SubjectCard`, `Select`, `MatchBoard`, `OrderList`, `ClozeInput`, `WhyPanel`, `OverrideSheet`, `Sheet`, `Toast`, `Skeleton`, `ErrorState`; arabische Schrift (IBM Plex Sans Arabic) ist nur als Fallback-Schriftname gesetzt, nicht eingebunden; Zoom-400-%-Test nur als 320-px-Test.
- Zustände „hover/aktiv/Fokus" sind per CSS umgesetzt, aber nicht einzeln in der Galerie erzwungen.
- Die Galerie läuft nur im Dev-Server; `pnpm a11y` startet ihn automatisch.

## Abgleich Schritt 0 und 1 mit dem Wortlaut (nach Erhalt der Prompt-Datei)

Schritt 0: stimmt überein. Abweichungen: ESLint statt Vorlagen-Linter (wie verlangt), TypeScript 6 statt 7 (Werkzeug-Kompatibilität), a11y-Skripte erst ab Schritt 1 echt. `docs/steps` und `GRUNDLAGEN.md` sind jetzt vorhanden.
Schritt 1: behoben: Schriftgrößen-Skala 13/15/17/20/24/30/36 als Tokens, Lizenzdatei `public/fonts/LICENSES/Inter-OFL.txt`.
Schritt 1: dokumentierte Abweichungen: Rahmen- und Akzentfarbe dunkler (Kontrast, siehe ENTSCHEIDUNGEN); Inter kommt über `@fontsource-variable` (lokal gebündelt, kein externer Server) statt eigenem WOFF2-Subset; arabische Schrift folgt in Schritt 2; fehlende Bausteine stehen unter „Schritt 1 – Details" (Meilenstein 2, vom Prompt so vorgesehen).

## Schritt 2 – Details

- Gebaut: i18next mit ICU-Pluralen, `de/en/ar.json` (nur wenige Schlüssel, aber alle drei Sprachen vollständig), Test auf fehlende Schlüssel, `dir`/`lang` am `<html>`, Lint-Prüfung gegen physische CSS-Eigenschaften (`pnpm lint`), Einstellungen (Sprache, Theme inkl. Hoher Kontrast, Textgröße 90–200 %, Bewegung reduzieren), Skip-Link, Landmarken, IBM Plex Sans Arabic lokal.
- Noch offen (Meilenstein 2 laut Prompt): „Lernhilfen" (Ruhiger Modus, Lesehilfe/Vorlesen, Prüfung ohne Druck); echte Übersetzung aller künftigen Texte; Screenshot-Test ist nur ein Bild, kein automatischer Bildvergleich; Einstellungen liegen bis Schritt 3 in `localStorage`, danach in der Datenbank-Tabelle `settings`.
- Nicht geprüft: Screenreader (VoiceOver), echtes iPhone.

## Vorschau-Seiten für das echte Gerät

- Heute-Entwurf: https://claude.ai/artifact/Pcp5aaf2RmDMAz6reFqCpB (privat; Beispieldaten, 3 Zustände: Plan / Alles erledigt / Kein Material).
- Galerie: https://claude.ai/artifact/AjLaRmMsBq1hgyJQmoa9y7 (privat; mit Textgrößen-Regler 90–200 %, Themes, Schreibrichtung).
- App-Vorschau: https://claude.ai/artifact/CFj8uKBhtk3JjEbPDsJQqy (privat; Sprache, Erscheinungsbild, Textgröße).
- Bauen: `pnpm build:static` (Galerie, App, Heute), dann `scripts/to-artifact.ts` (macht aus der Einzeldatei ein Seiten-Fragment).
- Grenzen: Das ist nur eine Ansicht. Installation auf den Home-Bildschirm, Offline-Betrieb, Service Worker und das Speichern in IndexedDB lassen sich so NICHT auf dem iPhone prüfen. Dafür braucht es eine eigene HTTPS-Adresse (Schritt 15 / Preview-Umgebung).
- Befund des Nutzers zur Vergrößerung (echte Sehhilfe): steht noch aus, wird hier eingetragen.

## Abstände und Entwurf Heute

- Gebaut: semantische Spacing-Tokens (`--space-tight/stack/group/section/card/inline`), Bausteine `Stack` und `Cluster` (Abstand nur über `gap`), Karten/Felder/Schalter/Dialog/Leerzustand darauf umgestellt; Eingabefelder und Grids werden nicht mehr breiter als ihr Container.
- Gebaut: Entwurf `Heute` (Hauptkarte mit einer großen Aktion, Warum?, Weiterlernen, Heute wiederholen, Für morgen bereit, Könnensbaum-Vorschau, Leerzustände), `AppShell` mit 4 Punkten (Handy unten, ab 1024 px links), SVG-Motive (Sitzungsbogen, geschlossener Kreis, Karte mit Schnittecke, Baum) mit Textalternative, keine Animation. Texte in DE/EN/AR.
- Getestet: axe (3 Zustände x Hell/Dunkel/Kontrast/Arabisch), Abstandstest, 320/400 px mit 200 % Text ohne waagerechtes Scrollen (fand einen echten Fehler in der Navigation, behoben).
- Offen: Datenanbindung (nur Beispieldaten, Studienleiter folgt in Schritt 9); Navigation führt noch nirgends hin; im Prompt heißt die Startseite Lichtung, im Entwurf Heute (auf Wunsch des Nutzers); Befund des Nutzers zum Layout steht aus.

## Optik-Überarbeitung (nach Nutzer-Feedback „weit weg von Apple-Niveau")

- Geändert wurden nur Tokens und Komponenten-Stil (plus Icon-Wrapper, Karten-Wrapper für den Schatten und Nav-Markup), keine Logik, keine Tests.
- Standard (Hell/Dunkel): gefüllte Flächen, feine Linien, weiche Schatten statt kräftiger Rahmen; Hoher Kontrast behält kräftige 2-px-Rahmen, keine Schatten, keine Transparenz (und keine Schnittecke, damit der Rahmen geschlossen bleibt).
- Textstufen: Großer Titel 36 px, Titel 24, Überschrift 20, Fließtext 17, Hinweis 13 (alle in rem, skalieren mit der App-Textgröße), Zeilenabstand 1,65, größere Abstände (Sektionen 48 px). Schrift: Systemschrift auf Apple-Geräten, sonst Inter.
- Icon-Knöpfe: rund, 48 px (mindestens 44), eine Icon-Familie (Lucide, Strich 1,75), Icon-Baustein `Icon`.
- Untere Navigation: aktiver Punkt mit getöntem Icon in Pille plus fetter Beschriftung, leicht transparent mit Unschärfe (im Hohen Kontrast deckend), Safe-Area unten und seitlich (`viewport-fit=cover` in `index.html`).
- Übergänge: 120/200/320 ms über Tokens, Bildschirm- und Zustandswechsel blenden weich ein; bei „Bewegung reduzieren" (App-Schalter oder Systemeinstellung) sind alle Übergänge 0 ms.
- Karten: Radius 24 (Hauptkarte 32), weicher Schatten, Fachfarbe als kleiner Punkt statt Seitenstreifen (Schnittecke inzwischen entfernt), eine Hauptaktion pro Karte (Hauptkarte gefüllt, übrige getönt).
- Geprüft: Kontrasttest (neue Tönungs-Paare ergänzt), axe in 3 Themes x LTR/RTL, 320/400 px mit 200 % Text, 28 Browser-Tests, 17 Unit-Tests: alle grün.
- (Überholt, siehe Abschnitt Korrekturen nach Nutzer-Feedback, Runde 2): Die zunächst dezenten Umrisse wurden auf mindestens 3:1 angehoben.
- Nicht geprüft: echtes iPhone (Unschärfe, Safe-Area, Systemschrift), VoiceOver, Befund des Nutzers zur neuen Optik.

## Korrekturen nach Nutzer-Feedback (Runde 2)

1. Schnittecke entfernt: alle Karten haben eine einfache, gleichmäßige Rundung (Radius 24, Hauptkarte 32), in allen Themes.
2. Hoher Kontrast: Rahmen oben rechts war unterbrochen, weil `clip-path` (Schnittecke) den Rahmen abschnitt. Mit der Schnittecke ist die Ursache weg. Neuer Test `tests/e2e/corners.spec.ts` liest Pixel an allen vier Ecken jeder Karte (Kante nahe der Ecke zweimal und Mitte des Bogens, deutsch und arabisch). Gegenprobe gemacht: Mit absichtlich fehlendem oberen Rahmen schlägt er an. Zusätzlich prüft er in Hell/Dunkel: keine `clip-path`, vier gleiche Rundungen. Hinweis: Meine frühere Aussage „behoben" stimmte nicht; ich hatte sie nicht per Test geprüft.
3. Hauptkarte: sinnloser Bogen entfernt. Stattdessen Segmentleiste mit Text „3 von 8 erledigt" (kein Prozentwert). „Warum?" ist ein getönter Button (48 px hoch) mit `aria-expanded`.
4. Umrisse (Felder, Auswahlzeilen, ausgeschalteter Schalter) in Hell `#84848a`, Dunkel `#72757a`: mindestens 3:1 gegen Hintergrund, Fläche und Tönungsfläche. Der Kontrasttest (`pnpm a11y:contrast`) prüft sie jetzt in allen drei Themes (im Hohen Kontrast hat der Schalter einen schwarzen Rahmen).

- Geprüft: Kontrasttest, Lint, Typecheck, 17 Unit-Tests, 32 Browser-Tests (inkl. axe 3 Themes x LTR/RTL, 320/400 px mit 200 % Text, Ecken-Test).
- Nicht geprüft: echtes iPhone; Screenshot-Vergleich nur als Pixel-Stichproben, kein visueller Gesamtvergleich; Befund des Nutzers zur Optik nach dieser Runde.
- Weitere Optik-Arbeit laut Nutzer pro Bildschirm, sobald echte Bildschirme existieren.

## Schritt 3 – Datenbank, Ereignisprotokoll, Datensicherheit

- Gebaut: alle 18 Tabellen aus Prompt 3.2 plus `blobs` (Dexie, Zod-Schemas), Migrationsregister mit Version 1, automatische JSON-Sicherung vor jeder Migration (eigene Datenbank `madar-backups`, letzte 3 bleiben), Wiederherstellung aus Sicherung, Export als ZIP und Import (eine Transaktion, vorher Prüfung und Sicherung des Bestands), Speicherprüfung (`navigator.storage.estimate`, Hinweis unter 15 % frei), Fehlerabbildung für „Speicher voll", unveränderliches Ereignisprotokoll mit Zwischenständen (Snapshots), Anfrage nach dauerhaftem Speicher (`storage.persist()`), iPhone-Erkennung, Oberfläche „Deine Daten" (Speicherstatus, bebilderte Anleitung „Zum Home-Bildschirm", Export/Import, Sicherungen, Speicher-Selbsttest), Einstellungen werden zusätzlich in `settings` geschrieben.
- Migrationstests (Fixture `tests/fixtures/db-v1.json`, alle Tabellen, echte Datei): v1 → simuliertes v2 verliert keinen Datensatz (Anzahl und Inhalts-Hash je Tabelle gleich, Datei-Prüfsumme gleich); Sicherung vorher; höchstens 3 Sicherungen; fehlgeschlagene Migration lässt Version 1 unverändert; Daten einer neueren App werden nie angefasst; Wiederherstellung funktioniert.
- Export/Import: Rundlauf Export → Import → Export ist byteidentisch (bis auf den Zeitstempel im Manifest); defekte/abgeschnittene Datei, falsche Prüfsumme, Schema-Fehler, fehlende Originaldatei, neuere Version, zu wenig Platz: Import lehnt ab und ändert nichts; Fehler mitten im Schreiben (Index-Verletzung) wird zurückgerollt.
- Ereignisse: ändern, ersetzen, löschen, `clear()` schlagen fehl (7 Wege getestet).
- Benchmark (echtes Chromium, echte IndexedDB, 100 000 Ereignisse): vollständige Neuberechnung ca. 1,7 s, **App-Start mit Zwischenstand ca. 20 ms** (Ziel unter 1 s erreicht). Das ist NICHT Safari/iPhone.
- Noch offen / nicht geprüft:
  - **Echtes iPhone/Safari**: Speichern, `persist()`, 7-Tage-Löschung, Installation auf den Home-Bildschirm, ArrayBuffer-Dateien in IndexedDB. Seite zum Testen: https://claude.ai/artifact/Dj22TkRUtRXZrjMeqnb66W (der Selbsttest läuft dort in echtem Safari; Download ist im Artifact-Rahmen gesperrt, Export/Import-Datei lässt sich dort nicht testen).
  - Das iOS-Onboarding (Schritt 11) ist nicht gebaut; die Anleitung steht in „Deine Daten" und erscheint dort nur auf iPhone im Safari-Tab. Der „dauerhafte Hinweis" im Rest der App fehlt noch (kommt mit den Bildschirmen).
  - Import älterer Exporte (Schema < aktuell) wird erst nötig, wenn Schema Version 2 existiert; dann Export-Migration und Test ergänzen.
  - Sicherungen enthalten keine Dateiinhalte (nur Prüfsummen); Migrationen fassen die Tabelle `blobs` nie an.
  - Ein Import ersetzt den gesamten Bestand (nicht zusammenführen); der alte Stand liegt als Sicherung vor.
  - Platzhalter: Startgröße des Haupt-Bundles seit Dexie/Zod geprüft erst in Schritt 12 (Budget 170 KB gzip).

## Hosting vorgezogen (Cloudflare Pages)

- Repo ist bereit: PWA mit Icons (192/512/maskable/Apple), Manifest, Service Worker (Schriften inklusive), Update-Hinweis ohne automatischen Neustart, Offline-Hinweis, `public/_headers` (Cache und Sicherheits-Header), `.node-version`, Build-Kennung in den Einstellungen, `docs/BETRIEB.md` mit Klickfolge, Rollback und iPhone-Checkliste.
- Die echte App hat jetzt Seiten über Hash-Routing: Heute (mit Beispieldaten, als solche gekennzeichnet), Einstellungen, Deine Daten, Platzhalter für Fächer/Fortschritt/Suche.
- Getestet (Chromium, gebaute App): Manifest und Icons erreichbar, **Offline-Betrieb nach dem ersten Laden im Flugmodus inkl. Speicher-Selbsttest**, Einstellungen bleiben nach Neuladen und liegen in der Datenbank. Start-Bundle 112 KB gzip (Budget 170 KB).
- **Noch nicht ausgeliefert:** Von der Cloud-Umgebung aus ist `api.cloudflare.com` gesperrt; die Einrichtung macht der Nutzer in der Cloudflare-Oberfläche (Git-Anbindung, siehe BETRIEB.md). Es gibt noch keine Adresse.
- Nicht geprüft: Safari/iPhone (Installation, Offline, `persist()`), Verhalten der Header auf Cloudflare, Content-Security-Policy (fehlt noch, kommt mit PDF-Leser in Schritt 4/13).

## Schritt 4 – Material importieren, lesen, durchsuchen (ohne OCR)

- Gebaut: Fächer anlegen; Material hinzufügen per Datei (PDF, Text, Markdown, Foto), Kamera-Aufnahme, Text einfügen, Drag & Drop; Fortschritt in Klartext (Wird gelesen / Seite n von m / Abschnitte werden gebildet / Wird gespeichert); Prüfsumme verhindert Doppelimport im selben Fach (andere Fächer erlaubt, Datei nur einmal gespeichert); Original unverändert (Hash-Vergleich im Browser-Test); alles in einer Transaktion samt Ereignis `FileImported`.
- Zerlegung: Zeilen aus pdf.js-Textstücken, Kopf-/Fußzeilen und Seitenzahlen entfernt, Silbentrennung verbunden, Überschriften über Schriftgröße und Nummerierung (Ebenen), Abschnitte höchstens 400 Wörter an Absatz- und Überschriftsgrenzen (jeder Abschnitt mit Seite, Position 0–1, Gliederungspfad), Gliederung am Dokument, Seiten ohne Text vermerkt. Eigenschaftstest (200 Läufe): kein Wort geht verloren, kein Abschnitt zu lang oder leer.
- Leser: pdf.js im Web Worker, Canvas + Textlayer, `devicePixelRatio`-genau (Pixelgrenze 16 Mio.), nur sichtbare Seiten (300 Seiten: höchstens 14 gleichzeitig gezeichnet, nicht sichtbare werden freigegeben), Zoom 50–400 % (zusätzlich natives Pinch-Zoom), Umfließen-Modus (nur `textContent`), Suche im Dokument mit Markierung im Textlayer und vorherigem/nächstem Treffer (Umlaut-tolerant), Markieren und Notiz (getrennt in `annotations`, Positionen relativ 0–1), Sprung zu Seite, Hinweis bei Seiten ohne Text.
- Suche: ein Suchfeld für Fächer, Dateien, Abschnitte und Notizen (MiniSearch, ä=ae, ß=ss, Groß-/Kleinschreibung egal, Wortanfänge, kleine Tippfehler), Quelle in Klartext „Physik › skript.pdf › Seite 3", Tipp springt auf die Seite mit Markierung.
- Fehler: defekte Datei, unbekanntes Format, zu wenig Platz → verständliche Meldung, nichts gespeichert. Eine Fehlergrenze hält bei einem Seitenfehler Rahmen und Navigation bedienbar.
- Gemessen (Chromium, Desktop, gebaute App, **nicht** iPhone): 300-Seiten-PDF Import ca. 1 s, erste Seite sichtbar nach ca. 0,9 s.
- Bekannte Grenzen / noch offen:
  - **Keine OCR** (4.3, Meilenstein 2): Fotos und Scans werden gespeichert und angezeigt, Status „Texterkennung folgt".
  - **Keine Formeln** (4.6: KaTeX/MathLive/mathjs): kommt mit Schritt 7.
  - „Karte daraus machen" und „Erklär mir das" fehlen (brauchen Fähigkeiten, Karten, KI: Schritte 6 bis 8). Es gibt Markieren und Notiz.
  - Überschriften nur über Schriftgröße und Nummerierung; Fettdruck wird nicht ausgewertet (pdf.js liefert ihn ohne Rendern nicht verlässlich). Mehrspaltige Layouts und Tabellen werden nicht gesondert behandelt.
  - Suche im Dokument markiert Treffer nur innerhalb eines Textstücks (Treffer über Zeilengrenzen werden nicht markiert).
  - Das iPhone ist ungeprüft: Auswahlleiste bei Touch-Auswahl (Safari lässt die Auswahl beim Tippen evtl. los), Pinch-Zoom, Speicher bei großen Dateien, Dateiauswahl/Kamera.
  - WebKit-Test fehlt (in der Cloud nicht verfügbar); Prompt-Abnahme „WebKit-Test plus echtes iPhone" damit offen.
  - Leser-Kopf ist auf dem Handy hoch (Titel, Modus, Zoom): Feinarbeit pro Bildschirm später.
  - Fächer lassen sich noch nicht umbenennen oder löschen; Dokumente nicht entfernen (Regel „kein Datenverlust": bewusst nichts Löschendes ohne Bestätigungs- und Rückgängig-Konzept).

## Schritt 5 (umgebaut) – Auftragsaustausch statt Proxy

- Gebaut: Auftragsformat mit 5 Typen (`quelle_ergaenzen`, `baum`, `vorbereiten`, `bewerten`, `auswertung`), Paketaufbau mit Kurz-IDs, Prüfsumme, Antwortschema, Aufteilung unter 30 000 Token, Antwortprüfung mit Zod und Teilimport in einer Transaktion, deutsche Fehlermeldungen, „Erneut anfordern" mit Nachbesserungstext; Oberfläche „Aufträge" (Vorschläge, kopieren/herunterladen, Antwort einfügen oder als Datei, Verbindung, Abgleich); Üben-Seite (Hinweisleiter erst nach eigenem Versuch oder 45 s, Selbstbewertung gegen Checkliste, Vormerken zur Bewertung); Fähigkeitenliste und Dateifortschritt im Fach; MCP-Server (5 Werkzeuge + REST für die App) als Cloudflare Pages Functions mit KV; Dokumente: `CLAUDE_ARBEITER_ANWEISUNG.md`, `KONNEKTOR_ANLEITUNG.md`, `docs/beispiele/`.
- Automatisch getestet: 138 Unit-Tests (Auftragsformat mit Beispielantworten, Prompt-Injection im Quelltext, Datenverlust-Prüfung über Tabellenzahlen, Teilimport, Prüfsummenfehler, Fortschrittsregeln, MCP-Server im Speicher inkl. falschem Code, Größenlimit, Löschen nach Abholung); 59 Browser-Tests in Chromium (u. a. Seite „Aufträge" mit axe).
- **Nicht geprüft:** Echte Auslieferung auf Cloudflare (KV-Bindung und Secret noch nicht angelegt, Adresse fehlt); echter Claude-Konnektor (ob dein Claude-Tarif eigene Konnektoren erlaubt, ist offen); echte Claude-Antworten (Beispielantworten stammen aus Testbausteinen); WebKit/iPhone; Üben-Seite nur mit Typprüfung und Seiten-Ladetest, noch kein durchgehender Browser-Test mit echten Aufgaben; Fachseite „Fähigkeiten" nicht im Browser mit Daten geprüft.
- Zurückgestellt auf Version 2: Proxy, Turnstile, D1-Zähler, Budgetlogik, mehrere Nutzer (Schnittstelle `LLMProvider` bleibt).
