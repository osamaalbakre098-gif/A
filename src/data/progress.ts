import {
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
}

const toEvidence = (a: Attempt, item: Item): Evidence => ({
  itemId: a.itemId,
  subtype: item.subtype,
  ts: a.ts,
  correct: a.aiGrade ? a.aiGrade.urteil === 'richtig' : a.correct,
  partial: a.aiGrade ? a.aiGrade.urteil === 'teilweise' : a.partial,
  hintLevel: a.hintLevel,
  provisional: !!a.aiGrade && a.aiGrade.sicherheit < 0.7,
});

/** Stand aller Fähigkeiten, nur aus Versuchen berechnet. */
export async function skillInfos(db: MadarDB): Promise<Map<string, SkillInfo>> {
  const [skills, items, attempts] = await Promise.all([
    db.skills.toArray(),
    db.items.toArray(),
    db.attempts.toArray(),
  ]);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const bySkill = new Map<string, Evidence[]>();
  const nItems = new Map<string, number>();
  for (const i of items)
    if (i.status === 'active') nItems.set(i.skillId, (nItems.get(i.skillId) ?? 0) + 1);
  for (const a of attempts) {
    const item = itemById.get(a.itemId);
    if (!item) continue;
    // Selbst bewertete offene Antworten, die noch auf die KI-Bewertung warten, zählen noch nicht als Beleg für „richtig".
    const ev = toEvidence(a, item);
    bySkill.set(item.skillId, [...(bySkill.get(item.skillId) ?? []), ev]);
  }
  const out = new Map<string, SkillInfo>();
  for (const s of skills) {
    const ev = bySkill.get(s.id) ?? [];
    out.set(s.id, {
      skill: s,
      state: skillState(ev, s.kind),
      attempts: ev.length,
      items: nItems.get(s.id) ?? 0,
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
