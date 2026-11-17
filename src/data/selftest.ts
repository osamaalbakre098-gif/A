import Dexie from 'dexie';
import { BackupDB } from './db/backups';
import { openDatabase } from './db/db';
import { exportZip, importZip } from './db/transfer';
import { sha256Hex } from './hash';
import { appendEvent } from './events/events';
import { newId } from './ids';

export interface SelfTestResult {
  ok: boolean;
  /** Größe des Test-Exports in Bytes */
  bytes: number;
  ms: number;
  error?: string;
}

/**
 * Prüft auf dem echten Gerät: Speichern, Exportieren, Importieren, Vergleichen.
 * Nutzt eigene Test-Datenbanken (werden danach gelöscht) und berührt die echten Daten nie.
 */
export async function runStorageSelfTest(
  now: number,
  clock: () => number,
): Promise<SelfTestResult> {
  const t0 = clock();
  const suffix = Math.random().toString(36).slice(2, 8);
  const names = {
    a: `madar-selftest-a-${suffix}`,
    b: `madar-selftest-b-${suffix}`,
    bk: `madar-selftest-bk-${suffix}`,
  };
  const store = new BackupDB(names.bk);
  let bytes = 0;
  const opened: Dexie[] = [store];
  try {
    const a = await openDatabase(names.a, { now, backupStore: store });
    opened.push(a);
    const subjectId = newId();
    await a.subjects.add({
      id: subjectId,
      name: 'Selbsttest',
      colorKey: 'sage',
      createdAt: now,
      archived: false,
    });
    const file = new Uint8Array(200_000);
    for (let i = 0; i < file.length; i++) file[i] = (i * 31 + 7) % 251;
    const sha = await sha256Hex(file);
    await a.blobs.add({ sha256: sha, data: file.slice().buffer });
    await a.documents.add({
      id: newId(),
      sha256: sha,
      subjectId,
      name: 'test.bin',
      type: 'application/octet-stream',
      blobRef: sha,
      ocrStatus: 'none',
      importedAt: now,
    });
    for (let i = 0; i < 50; i++)
      await appendEvent(a, { type: 'HintUsed', payload: { itemId: 'x', level: 1 } }, now + i);
    const zip = await exportZip(a, now);
    bytes = zip.byteLength;

    const b = await openDatabase(names.b, { now, backupStore: store });
    opened.push(b);
    await importZip(b, zip, { now, estimate: {}, backupStore: store });
    const zip2 = await exportZip(b, now);
    const same = (await sha256Hex(zip)) === (await sha256Hex(zip2));
    const blob = await b.blobs.get(sha);
    const fileOk = !!blob && (await sha256Hex(blob.data)) === sha;
    if (!same || !fileOk)
      return {
        ok: false,
        bytes,
        ms: clock() - t0,
        error: 'Die Daten stimmen nach dem Rundlauf nicht überein.',
      };
    return { ok: true, bytes, ms: clock() - t0 };
  } catch (e) {
    return {
      ok: false,
      bytes,
      ms: clock() - t0,
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    };
  } finally {
    for (const d of opened) d.close();
    await Promise.all(Object.values(names).map((n) => Dexie.delete(n).catch(() => undefined)));
  }
}
