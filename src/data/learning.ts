import { classifyError } from '../core/model/errors';
import { ratingFor } from '../core/srs/fsrs';
import { newCardData, reviewCard } from '../core/srs/fsrs';
import type { MadarDB } from './db/db';
import type { Attempt, Item } from './db/schema';
import { appendEvent } from './events/events';
import { newId } from './ids';
import { medianLatency } from './progress';

/** Legt für jede aktive Karte (Item mit `kind: 'karte'`) einen FSRS-Zustand an, falls noch keiner da ist. */
export async function ensureCards(db: MadarDB, now: number): Promise<number> {
  const items = (await db.items.toArray()).filter(
    (i) => i.kind === 'karte' && i.status === 'active',
  );
  const have = new Set((await db.cards.toArray()).map((c) => c.itemId));
  const fresh = items.filter((i) => !have.has(i.id));
  if (fresh.length)
    await db.cards.bulkAdd(
      fresh.map((i) => {
        const fsrs = newCardData(now);
        return { itemId: i.id, fsrs, due: fsrs.due };
      }),
    );
  return fresh.length;
}

export interface AnswerInput {
  item: Item;
  correct: boolean;
  partial: boolean;
  hintLevel: number;
  latencyMs: number;
  confidence?: 1 | 2 | 3 | undefined;
  answerText?: string | undefined;
  selfChecked?: string[] | undefined;
  gradedBy: Attempt['gradedBy'];
  queueForGrading?: boolean | undefined;
  now: number;
}

/**
 * Speichert eine Antwort: Versuch, Ereignisse (Hinweise, Antwort), Fehlerart und – bei Karten – die FSRS-Bewertung.
 * Alles in einer Transaktion. Ändert nie den Beherrschungszustand direkt (der wird nur aus den Versuchen berechnet).
 */
export async function recordAnswer(
  db: MadarDB,
  a: AnswerInput,
): Promise<{ attemptId: string; nextDue?: number }> {
  const attemptId = newId();
  let nextDue: number | undefined;
  await db.transaction('rw', db.attempts, db.cards, db.events, db.items, async () => {
    const all = await db.attempts.toArray();
    const median = medianLatency(all);
    const earlier = all.filter((x) => x.itemId === a.item.id);
    const errorType = classifyError({
      correct: a.correct,
      subtype: a.item.subtype,
      latencyMs: a.latencyMs,
      medianMs: median,
      solvedBefore: earlier.some((x) => x.correct),
      prerequisiteOpen: false,
      matchesMisconception: false,
      partial: a.partial,
    });
    const attempt: Attempt = {
      id: attemptId,
      itemId: a.item.id,
      ts: a.now,
      correct: a.correct,
      partial: a.partial,
      hintLevel: a.hintLevel,
      latencyMs: a.latencyMs,
      gradedBy: a.gradedBy,
      ...(a.confidence ? { confidence: a.confidence } : {}),
      ...(errorType ? { errorType } : {}),
      ...(a.answerText ? { answerText: a.answerText } : {}),
      ...(a.selfChecked ? { selfChecked: a.selfChecked } : {}),
      ...(a.queueForGrading ? { gradingState: 'queued' as const } : {}),
    };
    await db.attempts.add(attempt);
    for (let level = 1; level <= a.hintLevel; level++)
      await appendEvent(db, { type: 'HintUsed', payload: { itemId: a.item.id, level } }, a.now);
    await appendEvent(
      db,
      {
        type: 'AnswerSubmitted',
        payload: {
          attemptId,
          itemId: a.item.id,
          skillId: a.item.skillId,
          correct: a.correct,
          partial: a.partial,
          hintLevel: a.hintLevel,
          latencyMs: a.latencyMs,
          ...(a.confidence ? { confidence: a.confidence } : {}),
        },
      },
      a.now,
    );
    if (a.item.kind === 'karte') {
      const row = await db.cards.get(a.item.id);
      const rating = ratingFor({
        correct: a.correct && !a.partial,
        hintLevel: a.hintLevel,
        latencyMs: a.latencyMs,
        medianMs: median,
        confidence: a.confidence,
      });
      const fsrs = reviewCard(row?.fsrs ?? newCardData(a.now), rating, a.now);
      await db.cards.put({ itemId: a.item.id, fsrs, due: fsrs.due });
      await appendEvent(
        db,
        { type: 'CardReviewed', payload: { itemId: a.item.id, rating } },
        a.now,
      );
      nextDue = fsrs.due;
    }
  });
  return { attemptId, ...(nextDue !== undefined ? { nextDue } : {}) };
}

/** „Fehler melden": das Item wird sofort ausgesetzt (nicht gelöscht). */
export async function reportItem(db: MadarDB, itemId: string, now: number): Promise<void> {
  await db.transaction('rw', db.items, db.events, async () => {
    await db.items.update(itemId, { status: 'retired' });
    await appendEvent(db, { type: 'ItemReported', payload: { itemId } }, now);
  });
}

/** Eigene Karte (ohne KI), z. B. aus einer Markierung: Vorderseite = Frage, Rückseite = Text. */
export async function createOwnCard(
  db: MadarDB,
  p: { skillId: string; question: string; answer: string; sourceRefs?: string[]; now: number },
): Promise<string> {
  const id = newId();
  const fsrs = newCardData(p.now);
  await db.transaction('rw', db.items, db.cards, async () => {
    await db.items.add({
      id,
      skillId: p.skillId,
      kind: 'karte',
      subtype: 'karte',
      prompt: p.question.trim(),
      answer: p.answer.trim(),
      sourceRefs: p.sourceRefs ?? [],
      bloom: 'erinnern',
      difficulty: 0.4,
      status: 'active',
      createdBy: 'user',
    });
    await db.cards.add({ itemId: id, fsrs, due: fsrs.due });
  });
  return id;
}
