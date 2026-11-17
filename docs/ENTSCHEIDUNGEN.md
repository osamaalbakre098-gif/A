# Entscheidungen

**TypeScript 6 statt 7.** Die Vite-Vorlage brachte TypeScript 7 mit, aber ESLint (typescript-eslint) unterstützt es noch nicht. Wir nutzen 6.0, damit alle Prüfwerkzeuge laufen. Ein Wechsel ist später ein Einzeiler.

**ESLint statt oxlint.** Die Vorlage nutzte oxlint. Der Plan verlangt ESLint, außerdem brauchen wir später eigene Regeln (keine physischen CSS-Eigenschaften, kein `Date.now()`).

**`Date.now()` per Lint-Regel verboten.** So bekommt die Kernlogik die Zeit immer als Parameter und lässt sich exakt testen. Tests, Skripte und `main.tsx` sind ausgenommen.

**Lerntag beginnt um 04:00.** Lernen nach Mitternacht zählt zum Vortag (`src/core/time.ts`), getestet inkl. Sommerzeit.

**Playwright nutzt das vorinstallierte Chromium**, falls vorhanden (nur Cloud-Umgebung); lokal nimmt Playwright sein eigenes.
