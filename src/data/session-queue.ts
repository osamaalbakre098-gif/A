import type { Block } from '../core/director/session';
import type { DayPlan } from '../core/director/types';
import { DIRECTOR_CONFIG as C } from '../core/director/config';
import type { MadarDB } from './db/db';
import type { Item } from './db/schema';
import { markRelearn } from './director-data';
import { appendEvent } from './events/events';
import { newId } from './ids';

export type Step =
  | { type: 'lesson'; skillId: string; block: Block['kind'] }
  | { type: 'read'; skillId: string; documentId?: string; page?: number; block: Block['kind'] }
  | { type: 'item'; item: Item; block: Block['kind'] }
  | { type: 'closing'; skillId: string; block: Block['kind'] };

const byDifficulty = (a: Item, b: Item) => a.difficulty - b.difficulty || (a.id < b.id ? -1 : 1);

/** Macht aus den Blöcken der Sitzung die Schritte: fällige Karten, Erklärung, Aufgaben, Abschluss. */
export async function buildQueue(
  db: MadarDB,
  plan: DayPlan,
  blocks: Block[],
  now: number,
): Promise<Step[]> {
  const items = (await db.items.toArray()).filter((i) => i.status === 'active');
  const cards = new Map((await db.cards.toArray()).map((c) => [c.itemId, c]));
  const attempts = await db.attempts.toArray();
  const attempted = new Set(attempts.map((a) => a.itemId));
  const steps: Step[] = [];
  const used = new Set<string>();
  const dueOf = (skillId: string) =>
    items
      .filter((i) => i.skillId === skillId && i.kind === 'karte')
      .filter((i) => {
        const c = cards.get(i.id);
        return !!c && c.fsrs.reps > 0 && c.due <= now;
      })
      .sort((a, b) => cards.get(a.id)!.due - cards.get(b.id)!.due || (a.id < b.id ? -1 : 1));

  for (const b of blocks) {
    if (b.kind === 'warmup') {
      let left = C.warmupCards.max;
      for (const sid of b.skillIds)
        for (const it of dueOf(sid)) {
          if (left <= 0) break;
          if (used.has(it.id)) continue;
          used.add(it.id);
          steps.push({ type: 'item', item: it, block: 'warmup' });
          left--;
        }
    } else if (b.kind === 'core' || b.kind === 'practice') {
      const sid = b.skillIds[0]!;
      const entry = plan.entries.find((e) => e.skillId === sid);
      const isReview =
        entry && (entry.role === 'review' || entry.role === 'relearn' || entry.role === 'exam');
      if (b.kind === 'core') {
        if (entry?.method.value === 'read') {
          const skill = await db.skills.get(sid);
          const chunk = skill?.sourceChunkIds[0]
            ? await db.chunks.get(skill.sourceChunkIds[0])
            : undefined;
          steps.push({
            type: 'read',
            skillId: sid,
            ...(chunk ? { documentId: chunk.documentId, page: chunk.page } : {}),
            block: 'core',
          });
          continue;
        }
        if (!isReview && (await db.lessons.get(sid)))
          steps.push({ type: 'lesson', skillId: sid, block: 'core' });
      }
      const pool = isReview
        ? dueOf(sid)
        : items.filter((i) => i.skillId === sid && !used.has(i.id)).sort(byDifficulty);
      // Noch nie gesehene zuerst; Kern bekommt die ersten, Üben den Rest
      const ordered = [
        ...pool.filter((i) => !attempted.has(i.id)),
        ...pool.filter((i) => attempted.has(i.id)),
      ];
      const half = Math.ceil(ordered.length / 2);
      const part = isReview ? ordered : b.kind === 'core' ? ordered.slice(0, half) : ordered;
      for (const it of part.slice(0, b.kind === 'core' ? 8 : 10)) {
        if (used.has(it.id)) continue;
        used.add(it.id);
        steps.push({ type: 'item', item: it, block: b.kind });
      }
    } else {
      steps.push({ type: 'closing', skillId: b.skillIds[0]!, block: 'closing' });
    }
  }
  return steps;
}

/** Legt die Sitzung an (Zeile + Ereignis). */
export async function startSession(
  db: MadarDB,
  plan: DayPlan,
  blocks: Block[],
  now: number,
): Promise<string> {
  const id = newId();
  await db.transaction('rw', db.sessions, db.events, async () => {
    await db.sessions.add({
      id,
      startedAt: now,
      plan: {
        dayKey: plan.dayKey,
        blocks,
        entries: plan.entries.map((e) => ({ skillId: e.skillId, role: e.role })),
      },
    });
    await appendEvent(db, { type: 'SessionStarted', payload: { sessionId: id } }, now);
  });
  return id;
}

/** Beendet die Sitzung. Wiederlern-Sitzungen werden gezählt, damit die Termine weiterrücken. */
export async function endSession(
  db: MadarDB,
  id: string,
  reason: string,
  plan: DayPlan,
  now: number,
  doneSkillIds: string[],
): Promise<void> {
  await db.transaction('rw', db.sessions, db.events, db.settings, async () => {
    await db.sessions.update(id, { endedAt: now, endReason: reason });
    await appendEvent(db, { type: 'SessionEnded', payload: { sessionId: id, reason } }, now);
    for (const e of plan.entries)
      if (e.role === 'relearn' && doneSkillIds.includes(e.skillId))
        await markRelearn(db, e.skillId, plan.dayKey);
  });
}
