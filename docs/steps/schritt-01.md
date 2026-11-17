### SCHRITT 1 – Designsystem „Klarsicht"

**Ziel:** Ein ruhiges, elegantes, eigenständiges Erscheinungsbild, das vom ersten Bildschirm an hochwertig wirkt.

**Was du baust:** Design-Tokens, Typografie, Hell- und Dunkelmodus, Grundbausteine, Icon-Regeln und einen Kontrasttest.

**Wie du es baust:**

**1.1 Formsprache.** Drei geometrische Grundideen tragen die ganze App:

- **Kreis** für Zeit, Fokus und Ziele (Timer, Tagesziel).
- **Karte mit abgeschnittener Ecke** für Inhalte (Fächer, Themen, Lernkarten). Der Schnitt sitzt oben rechts, ist 12 px groß und wird in RTL gespiegelt. Umsetzung: `clip-path: polygon(...)` mit CSS-Variable `--cut`.
- **Bogen** für Fortschritt (Sitzungsfortschritt, Bereitschaft). Er wird nie als Prozentzahl gezeigt.

**1.2 Tokens** als CSS-Variablen in `/src/ui/tokens/tokens.css`, zusätzlich als TypeScript-Objekt für Tests:

```css
:root {
  /* Hell */
  --bg: #f7f6f2;
  --surface: #ffffff;
  --surface-2: #efede7;
  --border: #dedad1;
  --text: #1c1f24;
  --text-muted: #565b65;
  --primary: #1f3a5f;
  --on-primary: #ffffff;
  --accent: #3e7c74;
  --success: #2f6b3f;
  --warning: #8a5a12;
  --danger: #9b2c2c;
  --focus: #2f6fdb;
  /* Radien */
  --r-sm: 8px;
  --r-md: 14px;
  --r-lg: 20px;
  --r-xl: 28px;
  --cut: 12px;
  /* Abstände (4er-Raster) */
  --s-1: 4px;
  --s-2: 8px;
  --s-3: 12px;
  --s-4: 16px;
  --s-5: 24px;
  --s-6: 32px;
  --s-7: 48px;
  --s-8: 64px;
  /* Bewegung */
  --t-fast: 120ms;
  --t-base: 200ms;
  --t-slow: 320ms;
  --ease: cubic-bezier(0.2, 0, 0, 1);
  /* Schrift */
  --fs-base: 17px;
  --lh: 1.6;
  --measure: 66ch;
}
[data-theme='dark'] {
  --bg: #121417;
  --surface: #1a1d21;
  --surface-2: #22262b;
  --border: #2e333a;
  --text: #e8e6e1;
  --text-muted: #a3a7ae;
  --primary: #8fb3e8;
  --on-primary: #0e1726;
  --accent: #7dbfb4;
  --focus: #8fb3e8;
}
```

Fachfarben gibt es als 8 gedämpfte Töne (Salbei, Ozean, Ziegel, Sand, Pflaume, Moos, Schiefer, Bernstein), jeweils in einer Hell- und einer Dunkel-Variante. Sie sind **nur Akzent**, nie Flächenfarbe.

Der Dunkelmodus ist ein **eigenes System** von Flächen. Er ist keine Umkehrung der hellen Farben. Statt Schatten nutzt er hellere Flächen.

**1.3 Kontrasttest.** Schreibe `scripts/contrast.ts`. Das Skript berechnet für jedes Text/Hintergrund-Paar das WCAG-Kontrastverhältnis und bricht ab, wenn es zu niedrig ist: Fließtext mindestens 4,5:1, große Schrift und UI-Grenzen mindestens 3:1. Es läuft als `pnpm a11y:contrast` in der CI.

**1.4 Typografie.**

- Latein: **Inter** oder **Source Sans 3** (OFL-Lizenz). Arabisch: **IBM Plex Sans Arabic** oder **Noto Sans Arabic** (OFL).
- Lokal als WOFF2-Subset einbinden, nie von externen Servern. Lizenzen in `/public/fonts/LICENSES`.
- Skala in px: 13 · 15 · 17 · 20 · 24 · 30 · 36. Grundgröße 17 px.
- Zeilenlänge höchstens 66 Zeichen, `hyphens: auto` mit `lang="de"`.
- Für Arabisch gilt: Zeilenhöhe +0,1 und eine Stufe größer.
- Zahlen mit `font-variant-numeric: tabular-nums` in Tabellen und Timern.

**1.5 Bewegung.**

- Nur für Zustandsübergänge: Karte drehen, Knoten wächst, Bogen füllt sich, Bildschirmwechsel.
- Bei `prefers-reduced-motion: reduce` gibt es nur Überblendungen von höchstens 120 ms.
- Kein Konfetti, kein Hüpfen, keine Dauerschleifen.

**1.6 Bausteine** in `/src/ui/components/`. Jeder Baustein hat die Zustände normal, hover, fokus, aktiv, deaktiviert, laden und fehler, funktioniert in Hell und Dunkel sowie in LTR und RTL und ist per Tastatur bedienbar:

`Button` (primär, sekundär, ruhig, gefahr) · `IconButton` · `TextField` · `TextArea` · `Select` · `Switch` · `ContentCard` (mit Schnitt) · `SubjectCard` · `Flashcard` (drehbar) · `ChoiceList` · `MatchBoard` · `OrderList` (Drag **und** Tastatur) · `ClozeInput` · `HintLadder` · `WhyPanel` · `OverrideSheet` · `FocusCircle` · `ProgressArc` · `Sheet` · `Dialog` · `Toast` · `EmptyState` · `Skeleton` · `ErrorState`.

Baue eine interne Galerie unter `/dev/components`, die nur in der Entwicklung erreichbar ist und jeden Baustein in jedem Zustand zeigt.

**1.7 Icons („Klarsicht Icons").**

- 24-px-Raster, 1,75 px Strich, runde Enden.
- Für Version 1 genügen ca. 80 Icons. Bis eigene Icons vorliegen, nimm **Lucide** (ISC-Lizenz) und passe Strichstärke und Enden an.
- Pfeile und Richtungen werden in RTL gespiegelt, Uhren, Häkchen und Medien-Symbole nicht.
- Ein Icon ohne eindeutige Bedeutung bekommt eine Textbeschriftung.
- Prüfung, Notiz, Fortschritt, Neu laden, Frage und Sprechen müssen klar unterscheidbar sein.

**Abnahme:**

- Die Galerie zeigt alle Bausteine in Hell/Dunkel und LTR/RTL.
- Der Kontrasttest ist grün, axe zeigt 0 Verstöße in der Galerie.
- Bei 400 % Zoom und 320 px Breite gibt es kein horizontales Scrollen.

---
