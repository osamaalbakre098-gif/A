import type { MadarDB } from '../../data/db/db';
import type { Chunk, Skill, Topic } from '../../data/db/schema';
import { appendEvent } from '../../data/events/events';
import { newId } from '../../data/ids';
import { normalizeDe } from '../text';
import { TREE_CONFIG } from './config';

const römisch = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Entfernt Nummerierung wie „2.3", „Kapitel 3:" am Anfang einer Überschrift. */
export function cleanHeading(title: string): string {
  return title
    .replace(/^\s*(kapitel|abschnitt)\s+\d+(\.\d+)*\s*[:.\-–]?\s*/i, '')
    .replace(/^\s*\d+(\.\d+)*[.)]?\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const skillTitle = (heading: string) => {
  const base = cleanHeading(heading) || heading.trim();
  const max = TREE_CONFIG.maxTitleLength - ' verstehen'.length;
  return `${base.length > max ? base.slice(0, max - 1).trimEnd() + '…' : base} verstehen`;
};

interface Draft {
  topic: string;
  skills: { title: string; chunkIds: string[] }[];
}

const byPos = (a: Chunk, b: Chunk) => a.page - b.page || (a.id < b.id ? -1 : 1);

/** Reine Funktion: Entwurf des einfachen Baums aus Gliederung und Abschnitten. */
export function draftFromOutline(
  outline: { level: number; title: string; page: number }[],
  chunks: Chunk[],
  fileName: string,
): Draft[] {
  const sorted = [...chunks].sort(byPos);
  const wordCount = (c: Chunk) => c.text.split(/\s+/).filter(Boolean).length;
  const minLevel = outline.length ? Math.min(...outline.map((o) => o.level)) : 0;
  const drafts: Draft[] = [];

  if (outline.length) {
    const tops = new Map<string, Draft>();
    for (const c of sorted) {
      const path = c.headingPath ?? [];
      const topTitle = path[0];
      if (!topTitle) continue;
      let d = tops.get(topTitle);
      if (!d) {
        d = { topic: cleanHeading(topTitle) || topTitle, skills: [] };
        tops.set(topTitle, d);
        drafts.push(d);
      }
      const sub = path[1];
      const title = skillTitle(sub ?? topTitle);
      let s = d.skills.find((x) => x.title === title);
      if (!s) {
        s = { title, chunkIds: [] };
        d.skills.push(s);
      }
      s.chunkIds.push(c.id);
    }
    void minLevel;
  }
  if (!drafts.length) {
    // Keine erkennbaren Überschriften: Blöcke von etwa 1500 Wörtern
    let words = 0;
    let cur: Chunk[] = [];
    const blocks: Chunk[][] = [];
    for (const c of sorted) {
      if (cur.length && words >= TREE_CONFIG.blockWords) {
        blocks.push(cur);
        cur = [];
        words = 0;
      }
      cur.push(c);
      words += wordCount(c);
    }
    if (cur.length) blocks.push(cur);
    blocks.forEach((b, i) => {
      const first = b[0]!.page;
      const last = b[b.length - 1]!.page;
      const label = first === last ? `Seite ${first}` : `Seiten ${first}–${last}`;
      drafts.push({
        topic: blocks.length === 1 ? fileName.replace(/\.[^.]+$/, '') : `${label}`,
        skills: [{ title: `${label} verstehen`, chunkIds: b.map((c) => c.id) }],
      });
      void i;
    });
  }
  // Thema ohne Unterüberschriften hat genau eine Fähigkeit (siehe oben). Zu viele Fähigkeiten: in Teile teilen.
  const out: Draft[] = [];
  for (const d of drafts) {
    const max = TREE_CONFIG.maxSkillsPerTopic;
    if (d.skills.length <= max) out.push(d);
    else {
      const parts = Math.ceil(d.skills.length / max);
      for (let p = 0; p < parts; p++)
        out.push({
          topic: `${d.topic} ${römisch[p] ?? p + 1}`,
          skills: d.skills.slice(p * max, (p + 1) * max),
        });
    }
  }
  return out;
}

export interface FallbackResult {
  topics: number;
  skills: number;
  /** true, wenn nichts zu tun war (schon vorhanden) */
  unchanged: boolean;
}

/**
 * Baut aus den Überschriften einer Datei einen einfachen Könnensbaum – ganz ohne KI (Regel 7).
 * Läuft ohne Zutun nach jedem Import und kann beliebig oft aufgerufen werden: es entstehen keine Doppelungen.
 * Gibt es für die Datei schon einen KI-Baum, passiert nichts.
 */
export async function buildFallbackTree(
  db: MadarDB,
  documentId: string,
  now: number,
): Promise<FallbackResult> {
  const doc = await db.documents.get(documentId);
  const none = { topics: 0, skills: 0, unchanged: true };
  if (!doc) return none;
  const chunks = await db.chunks.where('documentId').equals(documentId).toArray();
  if (!chunks.length) return none;
  const prefix = `${documentId}:`;
  const allSkills = await db.skills.toArray();
  const mine = (s: Skill) => s.sourceChunkIds.some((c) => c.startsWith(prefix));
  if (allSkills.some((s) => mine(s) && s.origin === 'auto')) return none; // KI-Baum hat Vorrang

  const drafts = draftFromOutline(doc.outline ?? [], chunks, doc.name);
  const topics = await db.topics.where('subjectId').equals(doc.subjectId).toArray();
  const topicByKey = new Map(topics.map((t) => [normalizeDe(t.title), t]));
  const skillsByTopic = new Map<string, Set<string>>();
  for (const s of allSkills)
    skillsByTopic.set(
      s.topicId,
      (skillsByTopic.get(s.topicId) ?? new Set()).add(normalizeDe(s.title)),
    );
  let order = topics.reduce((m, t) => Math.max(m, t.order), 0);
  const newTopics: Topic[] = [];
  const newSkills: Skill[] = [];

  for (const d of drafts) {
    const key = normalizeDe(d.topic);
    let topic = topicByKey.get(key);
    if (!topic) {
      topic = {
        id: newId(),
        subjectId: doc.subjectId,
        title: d.topic,
        order: ++order,
        origin: 'auto',
        hidden: false,
      };
      topicByKey.set(key, topic);
      newTopics.push(topic);
    }
    const known = skillsByTopic.get(topic.id) ?? new Set<string>();
    skillsByTopic.set(topic.id, known);
    let si = [...known].length;
    for (const s of d.skills) {
      const k = normalizeDe(s.title);
      if (known.has(k)) continue;
      known.add(k);
      newSkills.push({
        id: newId(),
        topicId: topic.id,
        title: s.title,
        description: '',
        kind: 'verstaendnis',
        bloom: 'verstehen',
        order: ++si,
        origin: 'fallback',
        hidden: false,
        examRelevant: false,
        sourceChunkIds: s.chunkIds,
      });
    }
  }
  if (!newSkills.length) return none;
  await db.transaction('rw', db.topics, db.skills, db.events, async () => {
    await db.topics.bulkAdd(newTopics);
    await db.skills.bulkAdd(newSkills);
    await appendEvent(
      db,
      {
        type: 'TreeBuilt',
        payload: { subjectId: doc.subjectId, topics: newTopics.length, skills: newSkills.length },
      },
      now,
    );
  });
  return { topics: newTopics.length, skills: newSkills.length, unchanged: false };
}

/**
 * Nach einem KI-Baum: einfache Fähigkeiten dieser Datei ausblenden (nichts wird gelöscht), solange noch nichts darauf geübt wurde.
 * Hat der Schüler schon geübt, bleibt die Fähigkeit sichtbar.
 */
export async function ersetzeFallback(db: MadarDB, documentId: string): Promise<number> {
  const prefix = `${documentId}:`;
  const fb = (await db.skills.toArray()).filter(
    (s) =>
      s.origin === 'fallback' && !s.hidden && s.sourceChunkIds.some((c) => c.startsWith(prefix)),
  );
  if (!fb.length) return 0;
  const items = await db.items.toArray();
  const attempts = await db.attempts.toArray();
  const itemSkill = new Map(items.map((i) => [i.id, i.skillId]));
  const used = new Set(attempts.map((a) => itemSkill.get(a.itemId)));
  const ids = fb.filter((s) => !used.has(s.id)).map((s) => s.id);
  await db.skills.where('id').anyOf(ids).modify({ hidden: true });
  return ids.length;
}
