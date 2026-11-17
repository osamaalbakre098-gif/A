import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { findPhysicalCss } from '../src/core/logical-css';

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(css|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

let bad = 0;
for (const file of walk('src')) {
  for (const hit of findPhysicalCss(readFileSync(file, 'utf8'))) {
    bad++;
    console.error(
      `✗ ${file}:${hit.line} physische CSS-Eigenschaft „${hit.prop}" – logische Eigenschaft verwenden`,
    );
  }
}
if (bad) process.exit(1);
console.log('CSS: nur logische Eigenschaften');
