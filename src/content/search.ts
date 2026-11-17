import MiniSearch from 'minisearch';
import type { MadarDB } from '../data/db/db';
import { findMatches, normalizeDe } from './text';

export type HitKind = 'subject' | 'document' | 'chunk' | 'note';

interface Entry {
  id: string;
  kind: HitKind;
  title: string;
  text: string;
  subjectId?: string;
  documentId?: string;
  /** 0-basiert */
  page?: number;
}

export interface Hit {
  id: string;
  kind: HitKind;
  /** Quelle: Fach › Datei › Seite (die Oberfläche setzt daraus den übersetzten Text zusammen) */
  where: { subject?: string; document?: string; page?: number };
  snippet: string;
  score: number;
  /** Ziel: Fach, Dokument (mit Seite) */
  target: { route: 'subject' | 'doc'; id: string; page?: number };
}

export interface SearchIndex {
  mini: MiniSearch<Entry>;
  byId: Map<string, Entry>;
  subjects: Map<string, string>;
  documents: Map<string, { name: string; subjectId: string }>;
}

/** Ein Suchfeld für alles. Deutsche Normalisierung (ä=ae, ß=ss, Groß-/Kleinschreibung), unscharf, Wortanfänge. */
export async function buildIndex(db: MadarDB): Promise<SearchIndex> {
  const subjects = await db.subjects.toArray();
  const documents = await db.documents.toArray();
  const chunks = await db.chunks.toArray();
  const notes = (await db.annotations.toArray()).filter((a) => a.note);

  const entries: Entry[] = [
    ...subjects.map<Entry>((s) => ({
      id: `s:${s.id}`,
      kind: 'subject',
      title: s.name,
      text: '',
      subjectId: s.id,
    })),
    ...documents.map<Entry>((d) => ({
      id: `d:${d.id}`,
      kind: 'document',
      title: d.name,
      text: '',
      subjectId: d.subjectId,
      documentId: d.id,
    })),
    ...chunks.map<Entry>((c) => ({
      id: `c:${c.id}`,
      kind: 'chunk',
      title: c.headingPath?.at(-1) ?? '',
      text: c.text,
      documentId: c.documentId,
      page: c.page,
    })),
    ...notes.map<Entry>((a) => ({
      id: `n:${a.id}`,
      kind: 'note',
      title: '',
      text: a.note ?? '',
      documentId: a.documentId,
      page: a.page,
    })),
  ];
  const mini = new MiniSearch<Entry>({
    fields: ['title', 'text'],
    storeFields: ['kind'],
    processTerm: (t) => normalizeDe(t),
    searchOptions: { boost: { title: 2 }, prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  });
  mini.addAll(entries);
  return {
    mini,
    byId: new Map(entries.map((e) => [e.id, e])),
    subjects: new Map(subjects.map((s) => [s.id, s.name])),
    documents: new Map(documents.map((d) => [d.id, { name: d.name, subjectId: d.subjectId }])),
  };
}

function snippet(text: string, query: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const m = findMatches(flat, query)[0] ?? findMatches(flat, query.split(/\s+/)[0] ?? '')[0];
  if (!m) return flat.slice(0, 140);
  const from = Math.max(0, m.start - 50);
  return (
    (from > 0 ? '…' : '') + flat.slice(from, from + 160) + (from + 160 < flat.length ? '…' : '')
  );
}

export function search(index: SearchIndex, query: string, limit = 30): Hit[] {
  if (!query.trim()) return [];
  const out: Hit[] = [];
  for (const r of index.mini.search(query).slice(0, limit)) {
    const e = index.byId.get(r.id);
    if (!e) continue;
    const doc = e.documentId ? index.documents.get(e.documentId) : undefined;
    const subjectId = e.subjectId ?? doc?.subjectId;
    const parts = [
      subjectId ? index.subjects.get(subjectId) : undefined,
      e.kind === 'subject' ? undefined : doc?.name,
    ];
    if (e.page !== undefined) parts.push(`Seite ${e.page + 1}`);
    out.push({
      id: e.id,
      kind: e.kind,
      where: {
        subject: subjectId ? index.subjects.get(subjectId) : undefined,
        document: e.kind === 'subject' ? undefined : doc?.name,
        page: e.page,
      },
      snippet: e.kind === 'subject' || e.kind === 'document' ? e.title : snippet(e.text, query),
      score: r.score,
      target:
        e.kind === 'subject'
          ? { route: 'subject', id: e.subjectId! }
          : e.kind === 'document'
            ? { route: 'doc', id: e.documentId! }
            : { route: 'doc', id: e.documentId!, page: e.page },
    });
  }
  return out;
}
