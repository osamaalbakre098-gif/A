import { z, type ZodType } from 'zod';
import type { MadarDB } from '../data/db/db';
import { newId } from '../data/ids';
import { ALLGEMEINE_REGELN, ANWEISUNG, DATENHINWEIS } from './jobs/instructions';
import {
  JOB_FORMAT,
  JOB_TITEL,
  JOB_VERSION,
  type JobPackage,
  type JobPayload,
  type JobTyp,
  type Result,
} from './jobs/types';

export interface ProviderInput {
  titel?: string;
  eingabe: Record<string, unknown>;
  /** Kurz-ID → echte ID (bleibt auf dem Gerät) */
  idMap: Record<string, string>;
  regeln?: string[];
  gruppe?: string;
  teil?: { index: number; von: number };
  nachbesserung?: string[];
  /** Worauf sich der Auftrag bezieht (Dokument, Fähigkeit), für Vorschläge in der Oberfläche */
  bezug?: JobPayload['bezug'];
}

/**
 * Anbieterneutrale Schnittstelle. KI plant nie: Sie versteht und formuliert nur Sprache.
 * Heute gibt es den AuftragsAustauschProvider (Claude im Chat); ein API-Anbieter kann später dazukommen (Version 2).
 */
export interface LLMProvider {
  readonly name: string;
  generate<T>(args: {
    task: JobTyp;
    schema: ZodType<T>;
    system: string;
    input: ProviderInput;
  }): Promise<Result<T>>;
}

/** Erzeugt Auftragspakete und legt sie als Auftrag ab. Die Antwort kommt später (Claude im Chat oder per Einfügen). */
export class AuftragsAustauschProvider implements LLMProvider {
  readonly name = 'auftragsaustausch';
  private readonly db: MadarDB;
  private readonly now: number;
  constructor(db: MadarDB, now: number) {
    this.db = db;
    this.now = now;
  }

  async generate<T>(args: {
    task: JobTyp;
    schema: ZodType<T>;
    system: string;
    input: ProviderInput;
  }): Promise<Result<T>> {
    const id = newId();
    const paket = baueAuftragsPaket(args, id, this.now);
    const payload: JobPayload = {
      paket,
      idMap: args.input.idMap,
      ...(args.input.bezug ? { bezug: args.input.bezug } : {}),
    };
    await this.db.jobs.add({
      id,
      type: args.task,
      payload,
      status: 'pending',
      attempts: 0,
      createdAt: this.now,
    });
    return { status: 'pending', jobId: id };
  }
}

/** Baut das Auftragspaket (ohne etwas zu speichern). Auch zum Abschätzen der Paketgröße. */
export function baueAuftragsPaket<T>(
  args: { task: JobTyp; schema: ZodType<T>; system: string; input: ProviderInput },
  id: string,
  now: number,
): JobPackage {
  const { task, schema, system, input } = args;
  return {
    format: JOB_FORMAT,
    version: JOB_VERSION,
    auftragsId: id,
    gruppe: input.gruppe ?? id,
    teil: input.teil ?? { index: 1, von: 1 },
    typ: task,
    titel: input.titel ?? JOB_TITEL[task],
    erstellt: new Date(now).toISOString(),
    anweisung: system,
    regeln: [...ALLGEMEINE_REGELN, ...(input.regeln ?? [])],
    datenhinweis: DATENHINWEIS,
    antwortSchema: z.toJSONSchema(schema) as Record<string, unknown>,
    eingabe: input.eingabe,
    ...(input.nachbesserung?.length ? { nachbesserung: input.nachbesserung } : {}),
  };
}

/** Nur für Tests: liefert sofort feste Antworten und prüft sie gegen das Schema. */
export class MockProvider implements LLMProvider {
  readonly name = 'mock';
  private readonly answers: Partial<Record<JobTyp, unknown>>;
  constructor(answers: Partial<Record<JobTyp, unknown>>) {
    this.answers = answers;
  }
  async generate<T>(args: {
    task: JobTyp;
    schema: ZodType<T>;
    system: string;
    input: ProviderInput;
  }): Promise<Result<T>> {
    const parsed = args.schema.safeParse(this.answers[args.task]);
    return parsed.success
      ? { status: 'ok', value: parsed.data }
      : { status: 'error', code: 'SCHEMA', message: parsed.error.message };
  }
}

export { ANWEISUNG };
