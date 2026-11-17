/** Findet physische CSS-Eigenschaften (verboten wegen RTL). Reine Textprüfung. */
const FORBIDDEN = [
  'left',
  'right',
  'margin-left',
  'margin-right',
  'padding-left',
  'padding-right',
  'border-left',
  'border-right',
  'border-left-width',
  'border-right-width',
  'border-left-color',
  'border-right-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  // JSX-Schreibweise
  'marginLeft',
  'marginRight',
  'paddingLeft',
  'paddingRight',
  'borderLeft',
  'borderRight',
];
const RE = new RegExp(
  `(?<![\\w-])(${FORBIDDEN.join('|')})\\s*:\\s*(?!\\s*(?:inherit|unset)\\b)`,
  'g',
);
const TEXT_ALIGN = /text-align\s*:\s*(left|right)\b|textAlign\s*:\s*['"](left|right)['"]/g;

export interface Hit {
  line: number;
  prop: string;
}

export function findPhysicalCss(source: string): Hit[] {
  const hits: Hit[] = [];
  source.split('\n').forEach((text, i) => {
    for (const m of text.matchAll(RE)) hits.push({ line: i + 1, prop: m[1] ?? '' });
    for (const m of text.matchAll(TEXT_ALIGN)) hits.push({ line: i + 1, prop: m[0] });
  });
  return hits;
}
