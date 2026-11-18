import { MODEL_CONFIG } from '../core/model/config';
import {
  applyReview,
  documentProgress,
  skillState,
  type Evidence,
  type Progress,
  type SkillState,
} from '../core/model/mastery';
import type { MadarDB } from './db/db';
import type { Attempt, Item, Skill } from './db/schema';

export interface SkillInfo {
  skill: Skill;
  state: SkillState;
  attempts: number;
  items: number;
  /** Alle aktiven Karten */
  cardsTotal: number;
  /** Schon gelernte Karten, die jetzt fällig sind */
  cardsDue: number;
  /** Noch nie gelernte Karten */
  cardsNew: number;
}

/** Persönlicher Median der Antwortzeit (nur mit genug Antworten, sonst `undefined`). */
export const medianLatency = (attempts: Attempt[]): number | undefined => {
  const xs = attempts
    .filter((a) => a.latencyMs > 0)
    .slice(-60)
    .map((a) => a.latencyMs)
    .sort((a, b) => a - b);
  if (xs.length < MODEL_CONFIG.medianMinSamples) return undefined;
  return xs[Math.floor(xs.length / 2)];
};

const toEvidence = (a: Attempt, item: Item, median?: number): Evidence => ({
  itemId: a.itemId,
  subtype: item.subtype,
  ts: a.ts,
  correct: a.aiGrade ? a.aiGrade.urteil === 'richtig' : a.correct,
  partial: a.aiGrade ? a.aiGrade.urteil === 'teilweise' : a.partial,
  hintLevel: a.hintLevel,
  // Vorläufige KI-Bewertung oder eine zu schnelle richtige MC-Antwort (Raten) zählt nur halb.
  provisional:
    (!!a.aiGrade && a.aiGrade.sicherheit < 0.7) ||
    (item.subtype === 'mc' &&
      median !== undefined &&
      a.correct &&
      a.latencyMs < median * MODEL_CONFIG.guessFactor),
});

/** Stand aller Fähigkeiten, nur aus Versuchen berechnet. */
export async function skillInfos(db: MadarDB, now?: number): Promise<Map<string, SkillInfo>> {
  const [skills, items, attempts, cards] = await Promise.all([
    db.skills.toArray(),
    db.items.toArray(),
    db.attempts.toArray(),
    db.cards.toArray(),
  ]);
  const median = medianLatency(attempts);
  const cardByItem = new Map(cards.map((c) => [c.itemId, c]));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const bySkill = new Map<string, Evidence[]>();
  const nItems = new Map<string, number>();
  for (const i of items)
    if (i.status === 'active') nItems.set(i.skillId, (nItems.get(i.skillId) ?? 0) + 1);
  for (const a of attempts) {
    const item = itemById.get(a.itemId);
    if (!item) continue;
    // Selbst bewertete offene Antworten, die noch auf die KI-Bewertung warten, zählen noch nicht als Beleg für „richtig".
    const ev = toEvidence(a, item, median);
    bySkill.set(item.skillId, [...(bySkill.get(item.skillId) ?? []), ev]);
  }
  const out = new Map<string, SkillInfo>();
  const lastAttempts = new Map<string, boolean[]>();
  for (const a of [...attempts].sort((x, y) => x.ts - y.ts)) {
    const sid = itemById.get(a.itemId)?.skillId;
    if (sid) lastAttempts.set(sid, [...(lastAttempts.get(sid) ?? []), a.correct].slice(-3));
  }
  for (const s of skills) {
    const ev = bySkill.get(s.id) ?? [];
    const own = items
      .filter((i) => i.skillId === s.id && i.status === 'active' && i.kind === 'karte')
      .sort((x, y) => x.difficulty - y.difficulty || (x.id < y.id ? -1 : 1));
    // Fällig zählen nur Karten, die schon gelernt wurden; neue Karten sind „noch nicht dran", nicht „fällig".
    const learned = own.filter((i) => (cardByItem.get(i.id)?.fsrs.reps ?? 0) > 0);
    const due = learned.filter(
      (i) => (cardByItem.get(i.id)?.due ?? Infinity) <= (now ?? -Infinity),
    );
    let state = skillState(ev, s.kind);
    if (now !== undefined)
      state = applyReview(state, {
        cardsTotal: learned.length,
        cardsDue: due.length,
        coreDue: !!learned[0] && (cardByItem.get(learned[0].id)?.due ?? Infinity) <= now,
        recent: lastAttempts.get(s.id) ?? [],
      });
    out.set(s.id, {
      skill: s,
      state,
      attempts: ev.length,
      items: nItems.get(s.id) ?? 0,
      cardsTotal: own.length,
      cardsDue: due.length,
      cardsNew: own.length - learned.length,
    });
  }
  return out;
}

/** Fähigkeiten, die durch Abschnitte dieser Datei belegt sind. */
export async function skillsOfDocument(db: MadarDB, documentId: string): Promise<Skill[]> {
  const skills = await db.skills.toArray();
  const prefix = `${documentId}:`;
  return skills.filter((s) => !s.hidden && s.sourceChunkIds.some((c) => c.startsWith(prefix)));
}

/** Fortschritt je Datei: berechnet die App selbst aus dem Stand der zugehörigen Fähigkeiten (nie durch Claude). */
export async function fileProgress(db: MadarDB, documentId: string): Promise<Progress> {
  const [skills, infos] = [await skillsOfDocument(db, documentId), await skillInfos(db)];
  const states = skills.map((s) => infos.get(s.id)?.state ?? 'not_started');
  const evidence = skills.reduce((n, s) => n + (infos.get(s.id)?.attempts ?? 0), 0);
  return documentProgress(states, evidence);
}

export interface SkillEvidence {
  unaided: number;
  withHelp: number;
  wrong: number;
  last?: number;
}

/** Belege einer Fähigkeit in Worten zählbar (für „3× ohne Hilfe gelöst, zuletzt am …"). */
export async function skillEvidence(db: MadarDB, skillId: string): Promise<SkillEvidence> {
  const items = await db.items.where('skillId').equals(skillId).toArray();
  const ids = items.map((i) => i.id);
  const attempts = ids.length ? await db.attempts.where('itemId').anyOf(ids).toArray() : [];
  const out: SkillEvidence = { unaided: 0, withHelp: 0, wrong: 0 };
  for (const a of attempts) {
    if (a.correct && a.hintLevel <= 1) out.unaided++;
    else if (a.correct) out.withHelp++;
    else if (!a.partial) out.wrong++;
    if (out.last === undefined || a.ts > out.last) out.last = a.ts;
  }
  return out;
}
