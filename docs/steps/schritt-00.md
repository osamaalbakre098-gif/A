### SCHRITT 0 – Fundament

**Ziel:** Ein sauberes, lauffähiges Projekt, auf dem alles Weitere sicher aufbaut.

**Was du baust:**

- Projekt mit React, Vite und TypeScript (strict), Paketmanager pnpm.
- Linting (ESLint), Formatierung (Prettier), Tests (Vitest, Testing Library, fast-check, Playwright, axe-core).
- PWA-Gerüst mit `vite-plugin-pwa`.
- Ordnerstruktur (siehe unten).
- `CLAUDE.md` mit den Regeln aus Teil B.
- `docs/STATUS.md`, `docs/ENTSCHEIDUNGEN.md`, `docs/OFFENE_FRAGEN.md`.

**Wie du es baust:**

1. Im aktuellen Projektordner: `pnpm create vite . --template react-ts`. Setze in der TypeScript-Konfiguration der App (`tsconfig.app.json` bzw. `tsconfig.json`) `strict: true` und `noUncheckedIndexedAccess: true`.
2. Installiere: `dexie`, `dexie-react-hooks`, `zod`, `ts-fsrs`, `i18next`, `react-i18next`, `zustand`, `@tanstack/react-router`, `minisearch`, `pdfjs-dist`, `tesseract.js`. Für die Entwicklung: `vitest`, `@testing-library/react`, `fast-check`, `@playwright/test`, `@axe-core/playwright`, `vite-plugin-pwa`.
3. Lege die Skripte in `package.json` an: `dev`, `build`, `test`, `test:e2e`, `typecheck`, `lint`, `a11y`, `a11y:contrast`.
4. Lege die Ordnerstruktur an:

```
/src
  /core            ← reine Logik, KEIN UI, KEIN Netzwerk, KEINE Datenbank
    /director      ← Studienleiter (Tagesplan, Sitzung, Methoden, Pausen, Prüfung)
    /model         ← Lernermodell (Zustände, Fähigkeitswert, Fehlerarten)
    /srs           ← FSRS-Anbindung
    /tree          ← Könnensbaum-Logik (Aufbau, Zustände)
    /methods       ← Methodenbibliothek (Datensätze)
  /data
    /db            ← Dexie-Datenbank, Migrationen
    /events        ← Ereignisprotokoll und Projektionen
  /content         ← Import, PDF, OCR, Zerlegung, Suche
  /ai              ← KI-Schicht: Anbieter, Prompts, Schemas, Prüfer
  /ui
    /tokens        ← Design-Tokens (CSS-Variablen)
    /components    ← Bausteine
    /screens       ← Bildschirme
  /i18n            ← de.json, en.json, ar.json
/server/ai-proxy   ← dünner KI-Proxy
/tests/{unit,property,e2e,migrations,fixtures}
/docs
```

5. Schreibe `CLAUDE.md`:

```markdown
# Madar – Projektregeln

## Produkt

Madar ist der Lernort selbst. Der Studienleiter (/src/core/director, reiner Code) entscheidet
Was/Wann/Wie/Wie lange. Die KI (/src/ai) versteht und formuliert Sprache, sie PLANT NIE.
Alles läuft automatisch; Bearbeiten ist optional.

## Befehle

pnpm dev | pnpm test | pnpm test:e2e | pnpm typecheck | pnpm lint | pnpm a11y | pnpm build

## Harte Regeln

(hier die 12 Regeln aus Teil B wörtlich einfügen)

## Definition of Done

Tests grün, axe ohne Verstöße, STATUS.md aktualisiert (gebaut / getestet / echtes Gerät).
```

6. Richte eine CI ein (GitHub Actions), die Typecheck, Lint und Tests ausführt. Gibt es noch kein GitHub-Repository, lege ein lokales Git-Repository an und notiere die CI als offenen Punkt.
7. **Teile dieses Dokument auf:** `docs/MADAR_PROMPT.md` bleibt als Original. Erzeuge zusätzlich `docs/steps/schritt-00.md` bis `schritt-15.md` (je ein Schritt, wörtlich kopiert) und `docs/GRUNDLAGEN.md` (Teile A, B, D). `CLAUDE.md` bleibt kurz (höchstens 80 Zeilen) und verweist auf diese Dateien.
8. **Zeit und Zeitzonen:** Lege `src/core/time.ts` an. Ein „Lerntag" beginnt um **04:00 Uhr Ortszeit** (wie bei Anki), damit Lernen nach Mitternacht noch zum Vortag zählt. Alle Kernfunktionen bekommen `now` als Parameter, nie `Date.now()`.

**Abnahme:**

- `pnpm dev` startet eine leere App.
- Alle Prüfbefehle laufen grün.
- `CLAUDE.md` und die drei Dokumente in `docs/` existieren.

---
