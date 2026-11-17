// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { runStorageSelfTest } from '../../src/data/selftest';

describe('Speicher-Selbsttest', () => {
  it('Rundlauf besteht und räumt die Test-Datenbanken auf', async () => {
    let t = 0;
    const r = await runStorageSelfTest(1000, () => (t += 5));
    expect(r.error).toBeUndefined();
    expect(r.ok).toBe(true);
    expect(r.bytes).toBeGreaterThan(1000);
    const names = (await indexedDB.databases()).map((d) => d.name ?? '');
    expect(names.filter((n) => n.startsWith('madar-selftest'))).toEqual([]);
  });
});
