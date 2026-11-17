# Status

Ehrlicher Stand. „Echtes Gerät" ist ein Test auf einem echten iPhone, kein Emulator.

| Schritt     | Gebaut                  | Automatisch getestet                                       | Auf echtem iPhone geprüft |
| ----------- | ----------------------- | ---------------------------------------------------------- | ------------------------- |
| 0 Fundament | teilweise (siehe unten) | ja: Typecheck, Lint, 5 Unit-Tests, Build, 1 E2E (Chromium) | nein                      |
| 1–15        | nein                    | –                                                          | –                         |

## Schritt 0 – Details

- Gebaut: Vite + React + strict TypeScript, ESLint, Prettier, Vitest, Playwright, axe-Pakete, PWA-Gerüst (`registerType: 'prompt'`), Ordnerstruktur, `CLAUDE.md`, `src/core/time.ts` (Lerntag 04:00), CI-Datei.
- Noch offen: Aufteilung des Master-Prompts in `docs/steps/schritt-NN.md` und `docs/GRUNDLAGEN.md` (die Datei `docs/MADAR_PROMPT.md` liegt noch nicht im Repo, siehe `OFFENE_FRAGEN.md`).
- Noch offen: Playwright-WebKit läuft in dieser Cloud-Umgebung nicht (nur Chromium vorhanden). Das iPhone-Profil ist konfiguriert, aber ungetestet.
- `pnpm a11y` und `pnpm a11y:contrast` sind Platzhalter bis Schritt 1.
- CI (GitHub Actions) ist angelegt, aber nie auf GitHub gelaufen.

## Schritt 1 – Details
- Gebaut: Tokens (`tokens.css`/`tokens.ts`, Hell, Dunkel, Hoher Kontrast, 8 Fachfarben), Kontrasttest (`pnpm a11y:contrast`), 12 Bausteine (Button, IconButton, TextField, TextArea, Switch, ContentCard, Flashcard, ChoiceList, HintLadder, FocusCircle, ProgressArc, EmptyState, Dialog), Galerie unter `/dev/components` (nur Dev), Inter lokal, Lucide-Icons.
- Noch offen für Meilenstein 2: `SubjectCard`, `Select`, `MatchBoard`, `OrderList`, `ClozeInput`, `WhyPanel`, `OverrideSheet`, `Sheet`, `Toast`, `Skeleton`, `ErrorState`; arabische Schrift (IBM Plex Sans Arabic) ist nur als Fallback-Schriftname gesetzt, nicht eingebunden; Zoom-400-%-Test nur als 320-px-Test.
- Zustände „hover/aktiv/Fokus" sind per CSS umgesetzt, aber nicht einzeln in der Galerie erzwungen.
- Die Galerie läuft nur im Dev-Server; `pnpm a11y` startet ihn automatisch.
