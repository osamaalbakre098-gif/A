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
