# Plan Schritt 1 – Designsystem Klarsicht (Kern für Meilenstein 1)

**Dateien:** `src/ui/tokens/*`, `src/core/contrast.ts`, `scripts/contrast.ts`, `src/ui/components/*`, `src/ui/screens/Gallery.tsx`.
**Risiken:** Kontrast der Plan-Farben (Rahmen, Akzent) → angepasst; Galerie darf nicht in Produktion landen → nur `import.meta.env.DEV`.
**Tests:** Kontrasttest (CI), axe in 3 Themes × LTR/RTL, 320 px ohne Scrollen, Token-Spiegel-Test.
