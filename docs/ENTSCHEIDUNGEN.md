# Entscheidungen

**TypeScript 6 statt 7.** Die Vite-Vorlage brachte TypeScript 7 mit, aber ESLint (typescript-eslint) unterstützt es noch nicht. Wir nutzen 6.0, damit alle Prüfwerkzeuge laufen. Ein Wechsel ist später ein Einzeiler.

**ESLint statt oxlint.** Die Vorlage nutzte oxlint. Der Plan verlangt ESLint, außerdem brauchen wir später eigene Regeln (keine physischen CSS-Eigenschaften, kein `Date.now()`).

**`Date.now()` per Lint-Regel verboten.** So bekommt die Kernlogik die Zeit immer als Parameter und lässt sich exakt testen. Tests, Skripte und `main.tsx` sind ausgenommen.

**Lerntag beginnt um 04:00.** Lernen nach Mitternacht zählt zum Vortag (`src/core/time.ts`), getestet inkl. Sommerzeit.

**Playwright nutzt das vorinstallierte Chromium**, falls vorhanden (nur Cloud-Umgebung); lokal nimmt Playwright sein eigenes.

**Rahmenfarbe dunkler als im Plan.** Die Plan-Rahmenfarbe (#DEDAD1) hat gegenüber dem Hintergrund zu wenig Kontrast für Eingabefelder (WCAG: mind. 3:1). Interaktive Rahmen nutzen `--border` (dunkler), dekorative `--border-soft` (Plan-Wert). Die Akzentfarbe wurde minimal abgedunkelt (#38756D), damit sie 4,5:1 erreicht.

**Meilenstein 1 zuerst:** Von Schritt 1 sind nur die 10–12 wichtigsten Bausteine gebaut, der Rest kommt in Meilenstein 2.
