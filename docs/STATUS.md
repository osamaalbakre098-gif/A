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
