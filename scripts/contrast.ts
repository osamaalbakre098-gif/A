import { contrastRatio } from '../src/core/contrast';
import { subjectColors, themes } from '../src/ui/tokens/tokens';

// [Vordergrund, Hintergrund, Mindestwert]
const TEXT = 4.5;
const UI = 3;
let failed = 0;

for (const [name, t] of Object.entries(themes)) {
  const pairs: [string, string, number][] = [
    [t.text, t.bg, TEXT],
    [t.text, t.surface, TEXT],
    [t.text, t.surface2, TEXT],
    [t.textMuted, t.bg, TEXT],
    [t.textMuted, t.surface, TEXT],
    [t.textMuted, t.surface2, TEXT],
    [t.onPrimary, t.primary, TEXT],
    [t.primary, t.bg, TEXT],
    [t.primary, t.surface, TEXT],
    [t.accent, t.bg, TEXT],
    [t.accent, t.surface, TEXT],
    [t.success, t.surface, TEXT],
    [t.warning, t.surface, TEXT],
    [t.danger, t.surface, TEXT],
    [t.success, t.bg, TEXT],
    [t.warning, t.bg, TEXT],
    [t.danger, t.bg, TEXT],
    [t.border, t.bg, UI],
    [t.border, t.surface, UI],
    [t.focus, t.bg, UI],
    [t.focus, t.surface, UI],
  ];
  for (const [fg, bg, min] of pairs) {
    const r = contrastRatio(fg, bg);
    if (r < min) {
      failed++;
      console.error(`✗ ${name}: ${fg} auf ${bg} = ${r.toFixed(2)} (min ${min})`);
    }
  }
}
for (const [name, [light, dark]] of Object.entries(subjectColors)) {
  for (const [fg, th] of [
    [light, themes.light],
    [dark, themes.dark],
  ] as const) {
    const r = contrastRatio(fg, th!.surface);
    if (r < UI) {
      failed++;
      console.error(`✗ Fachfarbe ${name} ${fg} auf Fläche = ${r.toFixed(2)} (min ${UI})`);
    }
  }
}
if (failed) {
  console.error(`${failed} Kontrastpaare zu niedrig`);
  process.exit(1);
}
console.log('Kontrast ok');
