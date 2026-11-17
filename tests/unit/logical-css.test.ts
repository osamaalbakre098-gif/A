import { describe, expect, it } from 'vitest';
import { findPhysicalCss } from '../../src/core/logical-css';

describe('Physische CSS-Eigenschaften', () => {
  it('erkennt verbotene Eigenschaften', () => {
    expect(findPhysicalCss('a { margin-left: 4px; }')).toHaveLength(1);
    expect(findPhysicalCss('a { text-align: right; }')).toHaveLength(1);
    expect(findPhysicalCss('<div style={{ paddingRight: 4 }} />')).toHaveLength(1);
  });
  it('erlaubt logische Eigenschaften', () => {
    expect(
      findPhysicalCss('a { margin-inline-start: 4px; inset-inline-end: 0; text-align: center; }'),
    ).toEqual([]);
  });
});
