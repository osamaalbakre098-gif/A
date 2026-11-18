import { z } from 'zod';
import type { MadarDB } from '../db/db';

/** Version des Ereignis-Formats. Bei Änderungen erhöhen und alte Versionen weiter lesen können. */
export const EVENT_SCHEMA_VERSION = 1;

const id = z.string().min(1);

/** Bekannte Ereignisarten mit ihren Nutzdaten. Weitere kommen mit den späteren Schritten dazu. */
export const EventInput = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('FileImported'),
    payload: z.object({
      documentId: id,
      subjectId: id,
      sha256: z.string().length(64),
      name: z.string(),
    }),
  }),
  z.object({
    type: z.literal('TreeBuilt'),
    payload: z.object({ subjectId: id, topics: z.number().int(), skills: z.number().int() }),
  }),
  z.object({
    type: z.literal('TreeEdited'),
    payload: z.object({ target: z.enum(['topic', 'skill']), targetId: id, action: z.string() }),
  }),
  z.object({ type: z.literal('SessionStarted'), payload: z.object({ sessionId: id }) }),
  z.object({
    type: z.literal('SessionEnded'),
    payload: z.object({ sessionId: id, reason: z.string() }),
  }),
  z.object({
    type: z.literal('BreakTaken'),
    payload: z.object({ sessionId: id, minutes: z.number().nonnegative() }),
  }),
  z.object({
    type: z.literal('AnswerSubmitted'),
    payload: z.object({
      attemptId: id,
      itemId: id,
      skillId: id,
      correct: z.boolean(),
      partial: z.boolean(),
      hintLevel: z.number().int().min(0).max(5),
      latencyMs: z.number().nonnegative(),
      confidence: z.number().int().min(1).max(3).optional(),
    }),
  }),
  z.object({
    type: z.literal('HintUsed'),
    payload: z.object({ itemId: id, level: z.number().int().min(1).max(5) }),
  }),
  z.object({
    type: z.literal('CardReviewed'),
    payload: z.object({ itemId: id, rating: z.number().int().min(1).max(4) }),
  }),
  z.object({
    type: z.literal('AuftragImportiert'),
    payload: z.object({
      jobId: id,
      typ: z.string(),
      importiert: z.number().int(),
      fehler: z.number().int(),
    }),
  }),
  z.object({ type: z.literal('ItemReported'), payload: z.object({ itemId: id }) }),
  z.object({
    type: z.literal('UserOverride'),
    payload: z.object({
      decision: z.string(),
      from: z.unknown().optional(),
      to: z.unknown().optional(),
    }),
  }),
]);
export type EventInput = z.infer<typeof EventInput>;

/** Hängt ein Ereignis an. Ändern oder Löschen ist nicht möglich. Gibt die laufende Nummer zurück. */
export async function appendEvent(db: MadarDB, input: EventInput, now: number): Promise<number> {
  const e = EventInput.parse(input);
  return db.events.add({
    ts: now,
    type: e.type,
    payload: e.payload,
    schemaVersion: EVENT_SCHEMA_VERSION,
  });
}
