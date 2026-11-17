# Plan Schritt 2 – Sprachen und Barrierefreiheit (Kern für Meilenstein 1)

**Dateien:** `src/i18n/*`, `src/ui/settings/settings.ts`, `src/ui/screens/SettingsPanel.tsx`, `src/core/logical-css.ts`, `scripts/lint-css.ts`.
**Risiken:** Kaputte gespeicherte Einstellungen (defensiv gelesen), RTL-Brüche (Lint + axe + Screenshot).
**Tests:** Schlüsselgleichheit, ICU-Plurale, Einstellungen, Logisch-CSS, E2E Sprachwechsel/RTL/Tastatur/Textgröße/axe.
