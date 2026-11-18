import type { ZodError } from 'zod';

/** Findet das erste vollständige JSON-Objekt in einem Text (auch mit Markdown-Zaun oder Text davor/danach). */
export function extractJson(
  raw: string,
): { ok: true; value: unknown } | { ok: false; fehler: string } {
  const text = raw.replace(/^﻿/, '').trim();
  if (!text) return { ok: false, fehler: 'Die Antwort ist leer.' };
  const attempt = (s: string): unknown | undefined => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const direct = attempt(text);
  if (direct !== undefined) return { ok: true, value: direct };
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fence) {
    const v = attempt(fence[1]!.trim());
    if (v !== undefined) return { ok: true, value: v };
  }
  const start = text.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i]!;
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        const v = attempt(text.slice(start, i + 1));
        if (v !== undefined) return { ok: true, value: v };
        break;
      }
    }
  }
  if (/^falsche datei/i.test(text))
    return {
      ok: false,
      fehler: 'Claude meldet „Falsche Datei": Die hochgeladene Datei passt nicht zum Auftrag.',
    };
  return {
    ok: false,
    fehler:
      'Die Antwort ist kein gültiges JSON. Bitte Claude bitten, nur das JSON-Objekt auszugeben.',
  };
}

/** Übersetzt Zod-Fehler in verständliche deutsche Sätze. */
export function zodFehler(err: ZodError, prefix = ''): string[] {
  return err.issues.map((i) => {
    const pfad = [
      prefix,
      ...i.path.map((p) => (typeof p === 'number' ? `[${p + 1}]` : `.${String(p)}`)),
    ]
      .join('')
      .replace(/^\./, '');
    const ort = pfad ? `„${pfad}"` : 'Eintrag';
    const x = i as unknown as Record<string, unknown>;
    switch (i.code) {
      case 'invalid_type':
        return /undefined/.test(i.message)
          ? `${ort}: fehlt.`
          : `${ort}: hat den falschen Typ (erwartet: ${String(x.expected)}).`;
      case 'too_small':
        return x.origin === 'string' || x.origin === 'array'
          ? `${ort}: ${x.origin === 'string' ? 'zu kurz' : 'zu wenige Einträge'} (mindestens ${String(x.minimum)}).${i.message && !/^Too small|^Invalid/.test(i.message) ? ' ' + i.message : ''}`
          : `${ort}: Wert zu klein (mindestens ${String(x.minimum)}).`;
      case 'too_big':
        return x.origin === 'string' || x.origin === 'array'
          ? `${ort}: ${x.origin === 'string' ? 'zu lang' : 'zu viele Einträge'} (höchstens ${String(x.maximum)}).`
          : `${ort}: Wert zu groß (höchstens ${String(x.maximum)}).`;
      case 'invalid_value':
        return `${ort}: ungültiger Wert (erlaubt: ${Array.isArray(x.values) ? (x.values as unknown[]).map(String).join(', ') : '?'}).`;
      case 'unrecognized_keys':
        return `${ort}: unbekannte Felder (${Array.isArray(x.keys) ? (x.keys as string[]).join(', ') : ''}).`;
      case 'invalid_union':
        return `${ort}: passt zu keiner erlaubten Form (z. B. fehlendes oder falsches Feld „typ").`;
      default:
        return `${ort}: ${i.message}`;
    }
  });
}
