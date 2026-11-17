// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makePdf, physicsPdf } from '../fixtures/makePdf';

describe('Test-PDF-Erzeuger', () => {
  it('liefert ein PDF mit Kopf, Seitenzahl und Ende', () => {
    const s = Buffer.from(physicsPdf()).toString('latin1');
    expect(s.startsWith('%PDF-1.4')).toBe(true);
    expect(s).toContain('/Count 3');
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true);
  });
  it('schreibt Umlaute als WinAnsi-Escape', () => {
    const s = Buffer.from(makePdf([[{ text: 'Größe' }]])).toString('latin1');
    expect(s).toContain('Gr\\366\\337e');
  });
});
