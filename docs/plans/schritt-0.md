# Plan Schritt 0 – Fundament

**Dateien:** Projektkonfiguration (Vite, TS strict, ESLint, Prettier, Vitest, Playwright, PWA), Ordnerstruktur nach Master-Prompt, `CLAUDE.md`, `docs/*`, `src/core/time.ts`, CI.
**Schnittstelle:** `learningDayKey(now, timeZone?)`, `learningDaysBetween(a, b, timeZone?)`.
**Risiken:** Werkzeug-Versionen (TS 7 vs. typescript-eslint → TS 6), WebKit in der Cloud nicht verfügbar, Prompt-Datei fehlt.
**Tests:** Lerntag-Grenzen 03:59/04:00, Sommerzeit, Jahreswechsel; E2E: leere App zeigt „Madar".
