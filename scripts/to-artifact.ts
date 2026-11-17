import { readFileSync, writeFileSync } from 'node:fs';

/** Macht aus einer Vite-Einzeldatei ein Seiten-Fragment (ohne doctype/html/head/body-Tags). */
const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error('Aufruf: tsx scripts/to-artifact.ts <ein.html> <aus.html>');
let h = readFileSync(src, 'utf8');
h = h
  .replace(/<!doctype[^>]*>/i, '')
  .replace(/<\/?(html|head|body)[^>]*>/gi, '')
  .replace(/<meta[^>]*>/gi, '');
h = h.replace(/<link rel="icon"[^>]*>/gi, '');
writeFileSync(out, h.trim() + '\n');
