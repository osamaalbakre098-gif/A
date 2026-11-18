# Madar – Projektregeln

## Produkt

Madar ist der Lernort selbst. Der Studienleiter (`/src/core/director`, reiner Code) entscheidet
Was/Wann/Wie/Wie lange. Die KI (`/src/ai`) versteht und formuliert Sprache, sie PLANT NIE.
Alles läuft automatisch; Bearbeiten ist optional. Im Zweifel: einfacher statt mächtiger.

> **Änderung Schritt 5:** Kein Proxy/API-Schlüssel/Budget. Die KI arbeitet über Auftragsaustausch (`src/ai/jobs`, `server/mcp`, siehe `docs/steps/schritt-05.md`). Proxy etc. = Version 2.

## Befehle

`pnpm dev` | `pnpm test` | `pnpm test:e2e` | `pnpm typecheck` | `pnpm lint` | `pnpm a11y` | `pnpm build`

## Harte Regeln

1. **Kein Datenverlust.** Kein Update darf Dateien, Karten, Notizen oder Lernverlauf löschen. Jede Datenbankänderung braucht eine Migration und einen Migrationstest.
2. **Nur belegter Fortschritt.** Kein Fortschritt ohne nachweisbare Lernhandlung. Keine Scheingenauigkeit („87 % bereit").
3. **Keine Strafe, keine Beschämung.** Der Könnensbaum welkt nie. Verpasste Tage führen zu einem neuen Plan, nicht zu Vorwürfen.
4. **Die KI gibt nie zuerst die Lösung.** Erst der eigene Versuch, dann die Hinweisleiter.
5. **Jede Entscheidung ist erklärbar und änderbar.** „Warum?" und „Ändern" sind immer da.
6. **Originaldateien werden nie verändert.** Markierungen und Notizen werden getrennt gespeichert.
7. **Lokal zuerst.** Alles außer KI-Funktionen läuft ohne Konto und ohne Internet. Auch ganz ohne KI bleibt Madar nutzbar (Fallback).
8. **Barrierefreiheit:** WCAG 2.2 AA, Zoom bis 400 %, Pinch-Zoom nie sperren, `prefers-reduced-motion` respektieren, volle Tastaturbedienung.
9. **Sprachen:** Deutsch Standard, Englisch und Arabisch optional (Arabisch mit vollständigem RTL). Alle Texte aus Übersetzungsdateien.
10. **Nichts erfinden:** keine Notenschlüssel, Lehrplaninhalte, Studienergebnisse, API-Parameter.
11. **Ehrlicher Status:** `docs/STATUS.md` mit drei Spalten: gebaut / automatisch getestet / auf echtem iPhone geprüft.
12. **API-Schlüssel nie im Client.**

## Technische Konventionen

- `src/core` ist reine Logik: kein UI, kein Netzwerk, keine Datenbank, kein `Date.now()` (`now` als Parameter; Lerntag beginnt 04:00, siehe `src/core/time.ts`).
- Strict TypeScript inkl. `noUncheckedIndexedAccess`. Zod-Schemas an allen Grenzen.
- Nur logische CSS-Eigenschaften (RTL). Kein HTML aus Dateien oder KI-Ausgaben ohne DOMPurify.
- Schwellen und Gewichte stehen in Konfigurationsdateien, nie verstreut im Code.

## Beginn jeder neuen Sitzung (Pflicht)

1. `docs/STATUS.md` lesen (wo stehen wir, was ist offen).
2. `docs/steps/schritt-NN.md` des aktuellen Schritts lesen. Dazu `docs/GRUNDLAGEN.md` (Teile A, B, D, Meilensteine).
3. Original ist `docs/MADAR_PROMPT.md` (verbindlich; bei Widerspruch gilt der Prompt). Meilenstein-Reihenfolge aus Teil C einhalten.

## Arbeitsweise

Pro Schritt: Plan (`docs/plans/schritt-N.md`) → Typen/Schemas → Tests → Umsetzung → Prüfen → Doku.
Andere Schritt-Dateien nur lesen, wenn eine Schnittstelle sie betrifft.
Entscheidungen in `docs/ENTSCHEIDUNGEN.md`, offene Punkte in `docs/OFFENE_FRAGEN.md`.

## Definition of Done

Tests grün, axe ohne Verstöße, `docs/STATUS.md` aktualisiert (gebaut / getestet / echtes Gerät).
