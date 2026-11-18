// @vitest-environment node
// Erzeugt die Beispieldateien in docs/beispiele/ aus dem echten Code (kein Teil der normalen Testläufe).
import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { AuftragsAustauschProvider } from '../../src/ai/provider';
import { requestBaum, requestVorbereiten } from '../../src/ai/jobs/build';
import { importAntwort } from '../../src/ai/jobs/import';
import { renderAuftragText } from '../../src/ai/jobs/render';
import type { JobPayload } from '../../src/ai/jobs/types';
import { importMaterial } from '../../src/content/import';
import { openDatabase } from '../../src/data/db/db';
import { baumAntwort, vorbereitenAntwort } from '../fixtures/auftraege';
import { newBackupStore, uniqueName } from './_db';

const NOW = 1_800_000_000_000;
const SKRIPT = `# Vektoren\n\nEin Vektor hat Betrag und Richtung. Die Geschwindigkeit ist ein Vektor.\n\n## Addition\n\nVektoren addiert man komponentenweise. Kräfte addiert man ebenso.\n`;

it.runIf(process.env.BEISPIELE === '1')('schreibt Beispiele', async () => {
  const db = await openDatabase(uniqueName(), { now: 0, backupStore: newBackupStore() });
  await db.subjects.add({
    id: 's1',
    name: 'Physik',
    colorKey: 'ocean',
    createdAt: 1,
    archived: false,
  });
  const r = await importMaterial(
    db,
    {
      subjectId: 's1',
      name: 'skript.md',
      type: 'text/markdown',
      bytes: new TextEncoder().encode(SKRIPT),
    },
    { extractPdf: async () => [], estimate: { usage: 0, quota: 1e12 } },
    1,
  );
  if (r.status !== 'imported') throw new Error('x');
  const prov = new AuftragsAustauschProvider(db, NOW);
  const dir = new URL('../../docs/beispiele/', import.meta.url).pathname;
  mkdirSync(dir, { recursive: true });
  const paketVon = async (id: string) => ((await db.jobs.get(id))!.payload as JobPayload).paket;
  const b = await requestBaum(db, prov, r.documentId, NOW);
  const pb = await paketVon(b.jobIds[0]!);
  writeFileSync(dir + 'auftrag-baum.json', JSON.stringify(pb, null, 2));
  writeFileSync(dir + 'auftrag-baum.txt', renderAuftragText(pb));
  const ab = baumAntwort(pb);
  writeFileSync(dir + 'antwort-baum.json', JSON.stringify(ab, null, 2));
  await importAntwort(db, b.jobIds[0]!, JSON.stringify(ab), NOW);
  const skill = (await db.skills.toArray())[0]!;
  const v = await requestVorbereiten(db, prov, skill.id, NOW);
  const pv = await paketVon(v.jobIds[0]!);
  writeFileSync(dir + 'auftrag-vorbereiten.json', JSON.stringify(pv, null, 2));
  writeFileSync(dir + 'antwort-vorbereiten.json', JSON.stringify(vorbereitenAntwort(pv), null, 2));
});
