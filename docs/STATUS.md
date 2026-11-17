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
- Karten: Radius 24 (Hauptkarte 32), weicher Schatten, Fachfarbe als kleiner Punkt statt Seitenstreifen, eine Hauptaktion pro Karte (Hauptkarte gefüllt, übrige getönt).
- Geprüft: Kontrasttest (neue Tönungs-Paare ergänzt), axe in 3 Themes x LTR/RTL, 320/400 px mit 200 % Text, 28 Browser-Tests, 17 Unit-Tests: alle grün.
- Bekannte Einschränkung (bitte beachten): In Hell/Dunkel sind Feldumrisse, Auswahlzeilen und der ausgeschaltete Schalter bewusst dezent (unter 3:1 zur Umgebung, WCAG 1.4.11 „Nicht-Text-Kontrast" ist dort nur über Füllung, Fokusring und Zustandsanzeige abgedeckt). Wer klare Umrisse braucht, nutzt „Hoher Kontrast". Der Kontrasttest prüft diese dezenten Linien nicht.
- Nicht geprüft: echtes iPhone (Unschärfe, Safe-Area, Systemschrift), VoiceOver, Befund des Nutzers zur neuen Optik.
