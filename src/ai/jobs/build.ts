import type { ZodType } from 'zod';
import type { MadarDB } from '../../data/db/db';
import { DataError } from '../../data/db/errors';
import { baueAuftragsPaket, type LLMProvider, type ProviderInput } from '../provider';
import { ANWEISUNG } from './instructions';
import { paketTokens } from './render';
import { baueLernbericht } from './report';
import {
  BaumErgebnis,
  BewertenErgebnis,
  AuswertungErgebnis,
  QuelleErgebnis,
  VorbereitenErgebnis,
} from './schemas';
import { estimateTokens, MAX_PACKAGE_TOKENS, type JobPayload, type JobTyp } from './types';

const alias = (prefix: string, n: number, width = 3) =>
  `${prefix}${String(n).padStart(width, '0')}`;

/** Teilt Einträge in Gruppen, die je unter dem Token-Budget bleiben. */
export function partition<T>(
  items: T[],
  tokens: (t: T) => number,
  budget: number,
  maxCount = Infinity,
): T[][] {
  const out: T[][] = [];
  let cur: T[] = [];
  let size = 0;
  for (const it of items) {
    const t = tokens(it);
    if (cur.length && (size + t > budget || cur.length >= maxCount)) {
      out.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(it);
    size += t;
  }
  if (cur.length) out.push(cur);
  return out;
}

export interface Erstellt {
  jobIds: string[];
  /** Verständlicher Hinweis, wenn nichts zu tun war */
  hinweis?: string;
}

interface Plan<T> {
  task: JobTyp;
  schema: ZodType<T>;
  titel: string;
  /** Alles außer der teilbaren Liste */
  basis: Record<string, unknown>;
  listKey: string;
  items: { json: unknown; idMap?: Record<string, string> }[];
  idMap?: Record<string, string>;
  regeln?: string[];
  bezug?: JobPayload['bezug'];
  maxCount?: number;
  nachbesserung?: string[];
}

/** Erzeugt einen oder mehrere Aufträge; teilt automatisch, damit jedes Paket unter ca. 30 000 Token bleibt. */
async function erzeugen<T>(provider: LLMProvider, p: Plan<T>, gruppe: string): Promise<string[]> {
  const system = ANWEISUNG[p.task].anweisung;
  const regeln = [...ANWEISUNG[p.task].regeln, ...(p.regeln ?? [])];
  const skeleton = baueAuftragsPaket(
    {
      task: p.task,
      schema: p.schema,
      system,
      input: { eingabe: p.listKey ? { ...p.basis, [p.listKey]: [] } : p.basis, idMap: {}, regeln },
    },
    'x',
    0,
  );
  const budget = MAX_PACKAGE_TOKENS - paketTokens(skeleton) - 300;
  const parts = p.items.length
    ? partition(
        p.items,
        (i) => estimateTokens(JSON.stringify(i.json)),
        Math.max(budget, 1000),
        p.maxCount,
      )
    : [[]]; // kein teilbarer Inhalt (z. B. Auswertung): ein Paket
  const ids: string[] = [];
  for (const [i, part] of parts.entries()) {
    const input: ProviderInput = {
      titel: parts.length > 1 ? `${p.titel} (Teil ${i + 1} von ${parts.length})` : p.titel,
      eingabe: p.listKey ? { ...p.basis, [p.listKey]: part.map((x) => x.json) } : { ...p.basis },
      idMap: { ...(p.idMap ?? {}), ...Object.assign({}, ...part.map((x) => x.idMap ?? {})) },
      regeln,
      gruppe,
      teil: { index: i + 1, von: parts.length },
      nachbesserung: p.nachbesserung,
      bezug: p.bezug,
    };
    const r = await provider.generate({ task: p.task, schema: p.schema, system, input });
    if (r.status === 'pending') ids.push(r.jobId);
    else if (r.status === 'error') throw new DataError('IMPORT_INVALID', r.message);
  }
  return ids;
}

const sortChunks = <T extends { page: number; id: string }>(c: T[]) =>
  [...c].sort((a, b) => a.page - b.page || (a.id < b.id ? -1 : 1));
const gruppeVon = (typ: string, ref: string, now: number) => `${typ}-${ref.slice(0, 8)}-${now}`;

/** Auftrag „baum": Könnensbaum aus den Abschnitten einer Datei. */
export async function requestBaum(
  db: MadarDB,
  provider: LLMProvider,
  documentId: string,
  now: number,
): Promise<Erstellt> {
  const doc = await db.documents.get(documentId);
  if (!doc) throw new DataError('IMPORT_INVALID', 'Dieses Dokument gibt es nicht.');
  const chunks = sortChunks(await db.chunks.where('documentId').equals(documentId).toArray());
  if (!chunks.length)
    return {
      jobIds: [],
      hinweis:
        'In diesem Dokument gibt es noch keinen gelesenen Text. Lies zuerst die Seiten ohne Text (Auftrag „Seiten ohne Text lesen").',
    };
  const subject = await db.subjects.get(doc.subjectId);
  const topics = (await db.topics.where('subjectId').equals(doc.subjectId).toArray()).sort(
    (a, b) => a.order - b.order,
  );
  const skills = await db.skills.toArray();
  const idMap: Record<string, string> = {};
  const items = chunks.map((c, i) => {
    const id = alias('A', i + 1);
    idMap[id] = c.id;
    return { json: { id, seite: c.page + 1, gliederung: c.headingPath ?? [], text: c.text } };
  });
  const ids = await erzeugen(
    provider,
    {
      task: 'baum',
      schema: BaumErgebnis,
      titel: `Könnensbaum bauen: ${doc.name}`,
      basis: {
        fach: subject?.name ?? '',
        dokument: { name: doc.name, pruefsumme: doc.sha256, seiten: doc.pageCount ?? 1 },
        bereitsVorhanden: topics.map((t) => ({
          thema: t.title,
          faehigkeiten: skills.filter((s) => s.topicId === t.id).map((s) => s.title),
        })),
      },
      listKey: 'abschnitte',
      items,
      idMap,
      bezug: { dokumentId: documentId },
    },
    gruppeVon('baum', documentId, now),
  );
  return { jobIds: ids };
}

/** Auftrag „quelle_ergaenzen": Seiten ohne Text aus der hochgeladenen Datei lesen. */
export async function requestQuelle(
  db: MadarDB,
  provider: LLMProvider,
  documentId: string,
  now: number,
): Promise<Erstellt> {
  const doc = await db.documents.get(documentId);
  if (!doc) throw new DataError('IMPORT_INVALID', 'Dieses Dokument gibt es nicht.');
  const isImage = doc.type.startsWith('image/');
  const seiten = isImage ? [1] : (doc.textlessPages ?? []).map((p) => p + 1);
  if (!seiten.length) return { jobIds: [], hinweis: 'In diesem Dokument fehlt kein Text.' };
  const ids = await erzeugen(
    provider,
    {
      task: 'quelle_ergaenzen',
      schema: QuelleErgebnis,
      titel: `Seiten ohne Text lesen: ${doc.name}`,
      basis: {
        hinweis: 'Lade die Originaldatei im Chat hoch. Sie wird nie über Madar übertragen.',
        dokument: {
          name: doc.name,
          typ: doc.type,
          pruefsumme: doc.sha256,
          seitenzahl: doc.pageCount ?? 1,
        },
      },
      listKey: 'seiten',
      items: seiten.map((s) => ({ json: s })),
      maxCount: 8,
      bezug: { dokumentId: documentId },
    },
    gruppeVon('quelle', documentId, now),
  );
  return { jobIds: ids };
}

/** Auftrag „vorbereiten": Erklärung, Aufgaben, Hinweisleiter und Fehlvorstellungen für eine Fähigkeit. */
export async function requestVorbereiten(
  db: MadarDB,
  provider: LLMProvider,
  skillId: string,
  now: number,
): Promise<Erstellt> {
  const skill = await db.skills.get(skillId);
  if (!skill) throw new DataError('IMPORT_INVALID', 'Diese Fähigkeit gibt es nicht.');
  const topic = await db.topics.get(skill.topicId);
  const subject = topic ? await db.subjects.get(topic.subjectId) : undefined;
  const chunks = sortChunks(
    (await db.chunks.bulkGet(skill.sourceChunkIds)).filter((c): c is NonNullable<typeof c> => !!c),
  );
  if (!chunks.length)
    return { jobIds: [], hinweis: 'Zu dieser Fähigkeit gibt es keine Quelltext-Abschnitte.' };
  const existing = (await db.items.where('skillId').equals(skillId).toArray()).filter(
    (i) => i.status !== 'retired',
  );
  const idMap: Record<string, string> = { F01: skillId };
  const items = chunks.map((c, i) => {
    const id = alias('A', i + 1);
    return {
      json: { id, seite: c.page + 1, gliederung: c.headingPath ?? [], text: c.text },
      idMap: { [id]: c.id },
    };
  });
  const ids = await erzeugen(
    provider,
    {
      task: 'vorbereiten',
      schema: VorbereitenErgebnis,
      titel: `Vorbereiten: ${skill.title}`,
      basis: {
        fach: subject?.name ?? '',
        thema: topic?.title ?? '',
        faehigkeit: {
          id: 'F01',
          titel: skill.title,
          beschreibung: skill.description,
          art: skill.kind,
          stufe: skill.bloom,
        },
        bereitsVorhanden: existing.map((i) => i.prompt.slice(0, 100)),
      },
      listKey: 'abschnitte',
      items,
      idMap,
      bezug: { faehigkeitId: skillId },
      regeln: [
        'Wenn es mehrere Teile gibt: Jeder Teil liefert vollständige Ergebnisse zu seinen Abschnitten; doppelte Aufgaben werden beim Import erkannt.',
      ],
    },
    gruppeVon('vorbereiten', skillId, now),
  );
  return { jobIds: ids };
}

/** Auftrag „bewerten": vorgemerkte offene Antworten (Stapel). */
export async function requestBewerten(
  db: MadarDB,
  provider: LLMProvider,
  now: number,
): Promise<Erstellt> {
  const queued = (await db.attempts.toArray()).filter(
    (a) => a.gradingState === 'queued' && a.answerText,
  );
  if (!queued.length)
    return { jobIds: [], hinweis: 'Es sind keine Antworten zur Bewertung vorgemerkt.' };
  const itemById = new Map((await db.items.toArray()).map((i) => [i.id, i]));
  const idMap: Record<string, string> = {};
  const items: Plan<unknown>['items'] = [];
  for (const a of queued) {
    const item = itemById.get(a.itemId);
    if (!item) continue;
    const r = (item.rubric ?? {}) as {
      kernpunkte?: string[];
      raster?: { id: string; kriterium: string; punkte: number }[];
      maxPunkte?: number;
    };
    const id = alias('R', items.length + 1, 2);
    idMap[id] = a.id;
    items.push({
      json: {
        id,
        typ: item.subtype,
        aufgabe: item.prompt,
        musterloesung: item.answer,
        kernpunkte: r.kernpunkte ?? [],
        raster: r.raster ?? [],
        maxPunkte: r.maxPunkte ?? (r.raster ?? []).reduce((n, x) => n + x.punkte, 0),
        antwort: a.answerText,
        hinweisstufe: a.hintLevel,
        selbstbewertung: { erfuellteKernpunkte: a.selfChecked ?? [] },
      },
    });
  }
  const ids = await erzeugen(
    provider,
    {
      task: 'bewerten',
      schema: BewertenErgebnis,
      titel: 'Offene Antworten bewerten',
      basis: {},
      listKey: 'antworten',
      items,
      idMap,
      maxCount: 20,
    },
    gruppeVon('bewerten', 'stapel', now),
  );
  // Jetzt gelten sie als „an Claude gegeben"
  for (const a of queued) await db.attempts.update(a.id, { gradingState: 'sent' });
  return { jobIds: ids };
}

/** Auftrag „auswertung": Claude liest den Lernbericht. Nur eine Empfehlung, ändert nie den Plan. */
export async function requestAuswertung(
  db: MadarDB,
  provider: LLMProvider,
  now: number,
): Promise<Erstellt> {
  const { bericht, idMap } = await baueLernbericht(db, now);
  const ids = await erzeugen(
    provider,
    {
      task: 'auswertung',
      schema: AuswertungErgebnis,
      titel: 'Lernbericht auswerten',
      basis: { bericht },
      listKey: '',
      items: [],
      idMap,
    },
    gruppeVon('auswertung', 'bericht', now),
  );
  return { jobIds: ids };
}

/** Fordert einen Auftrag erneut an (z. B. nach einem teilweise fehlerhaften Import). Gleiches Paket, neue ID, mit Fehlerliste. */
export async function neuAnfordern(
  db: MadarDB,
  jobId: string,
  fehler: string[],
  now: number,
): Promise<string> {
  const job = await db.jobs.get(jobId);
  if (!job) throw new DataError('IMPORT_INVALID', 'Dieser Auftrag existiert nicht mehr.');
  const pl = job.payload as JobPayload;
  const id = crypto.randomUUID();
  const paket = {
    ...pl.paket,
    auftragsId: id,
    erstellt: new Date(now).toISOString(),
    nachbesserung: fehler.slice(0, 20),
  };
  await db.jobs.add({
    id,
    type: job.type,
    payload: { paket, idMap: pl.idMap, bezug: pl.bezug } satisfies JobPayload,
    status: 'pending',
    attempts: job.attempts + 1,
    createdAt: now,
  });
  return id;
}

export interface Vorschlag {
  typ: JobTyp;
  titel: string;
  /** Dokument- oder Fähigkeits-ID, falls der Auftrag sich darauf bezieht */
  ref?: string;
  detail?: string;
}

/** Was sinnvollerweise als Nächstes angefordert werden kann (ohne schon offene Aufträge doppelt vorzuschlagen). */
export async function vorschlaege(db: MadarDB): Promise<Vorschlag[]> {
  const [docs, chunks, skills, items, attempts, jobs] = await Promise.all([
    db.documents.toArray(),
    db.chunks.toArray(),
    db.skills.toArray(),
    db.items.toArray(),
    db.attempts.toArray(),
    db.jobs.toArray(),
  ]);
  const open = jobs.filter((j) => j.status === 'pending' || j.status === 'running');
  const hasOpen = (typ: string, key: 'dokumentId' | 'faehigkeitId', ref: string) =>
    open.some((j) => j.type === typ && (j.payload as JobPayload).bezug?.[key] === ref);
  const out: Vorschlag[] = [];
  for (const d of docs) {
    if (
      (d.textlessPages?.length || d.type.startsWith('image/')) &&
      d.ocrStatus !== 'done' &&
      !hasOpen('quelle_ergaenzen', 'dokumentId', d.id)
    ) {
      out.push({
        typ: 'quelle_ergaenzen',
        titel: `Seiten lesen: ${d.name}`,
        ref: d.id,
        detail: d.type.startsWith('image/')
          ? 'Foto'
          : `${d.textlessPages?.length ?? 0} Seiten ohne Text`,
      });
    }
    const withText = chunks.some((c) => c.documentId === d.id);
    const hasSkills = skills.some((s) => s.sourceChunkIds.some((c) => c.startsWith(`${d.id}:`)));
    if (withText && !hasSkills && !hasOpen('baum', 'dokumentId', d.id))
      out.push({ typ: 'baum', titel: `Könnensbaum bauen: ${d.name}`, ref: d.id });
  }
  for (const s of skills) {
    const n = items.filter((i) => i.skillId === s.id && i.status === 'active').length;
    if (!s.hidden && n === 0 && !hasOpen('vorbereiten', 'faehigkeitId', s.id))
      out.push({ typ: 'vorbereiten', titel: `Vorbereiten: ${s.title}`, ref: s.id });
  }
  const queued = attempts.filter((a) => a.gradingState === 'queued').length;
  if (queued)
    out.push({
      typ: 'bewerten',
      titel: `${queued} offene ${queued === 1 ? 'Antwort' : 'Antworten'} bewerten`,
      detail: `${queued}`,
    });
  if (!open.some((j) => j.type === 'auswertung') && attempts.length)
    out.push({ typ: 'auswertung', titel: 'Lernbericht auswerten lassen' });
  return out;
}
