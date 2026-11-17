import { z } from 'zod';

/** Zeitstempel = Millisekunden seit 1970. Tage (Prüfungsdatum) = Text `YYYY-MM-DD` (Lerntag). */
const ts = z.number().int().nonnegative();
const id = z.string().min(1);
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const Bloom = z.enum([
  'erinnern',
  'verstehen',
  'anwenden',
  'analysieren',
  'bewerten',
  'erschaffen',
]);

export const Subject = z.object({
  id,
  name: z.string().min(1),
  colorKey: z.string(),
  createdAt: ts,
  archived: z.boolean(),
});

export const DocumentRow = z.object({
  id,
  sha256: z.string().length(64),
  subjectId: id,
  name: z.string(),
  type: z.string(),
  /** Verweis auf `blobs.sha256` */
  blobRef: z.string().length(64),
  pageCount: z.number().int().nonnegative().optional(),
  /** Gliederung (Überschriften) als Strukturhinweis für den Könnensbaum */
  outline: z
    .array(
      z.object({
        level: z.number().int().min(1).max(6),
        title: z.string(),
        page: z.number().int().nonnegative(),
      }),
    )
    .optional(),
  /** Seiten ohne Text (Abbildungen oder Scans): dort erstellt Madar noch keine Aufgaben */
  textlessPages: z.array(z.number().int().nonnegative()).optional(),
  ocrStatus: z.enum(['none', 'pending', 'running', 'done', 'failed']),
  importedAt: ts,
});

/** Originaldatei, jede nur einmal gespeichert (auch wenn in mehreren Fächern). Als ArrayBuffer (iOS-sicher). */
export const BlobRow = z.object({ sha256: z.string().length(64), data: z.instanceof(ArrayBuffer) });

export const Chunk = z.object({
  id,
  documentId: id,
  page: z.number().int().nonnegative(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  text: z.string(),
  origin: z.enum(['text', 'ocr']),
  /** Überschriften über diesem Abschnitt, z. B. ["Vektoren", "Addition"] */
  headingPath: z.array(z.string()).optional(),
  ocrConfidence: z.number().min(0).max(100).optional(),
});

export const Topic = z.object({
  id,
  subjectId: id,
  title: z.string(),
  order: z.number(),
  origin: z.enum(['auto', 'user']),
  hidden: z.boolean(),
});

export const Skill = z.object({
  id,
  topicId: id,
  title: z.string(),
  description: z.string(),
  kind: z.enum(['fakt', 'verfahren', 'verstaendnis']),
  bloom: Bloom,
  afb: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  order: z.number(),
  origin: z.enum(['auto', 'user', 'fallback']),
  hidden: z.boolean(),
  examRelevant: z.boolean(),
  sourceChunkIds: z.array(id),
});

export const Requires = z.object({ skillId: id, requiresSkillId: id });

export const Item = z.object({
  id,
  skillId: id,
  kind: z.string(),
  subtype: z.string(),
  prompt: z.string(),
  answer: z.unknown(),
  rubric: z.unknown().optional(),
  distractors: z.array(z.string()).optional(),
  hints: z.array(z.string()).min(1).max(4).optional(),
  sourceRefs: z.array(z.string()),
  bloom: Bloom,
  difficulty: z.number(),
  status: z.enum(['draft', 'active', 'retired']),
  createdBy: z.enum(['ai', 'user']),
  generatorVersion: z.string().optional(),
});

export const Lesson = z.object({
  skillId: id,
  explanation: z.string(),
  alternativeExplanation: z.string(),
  workedExample: z.string().optional(),
  sourceRefs: z.array(z.string()),
  generatorVersion: z.string(),
});

export const Misconception = z.object({
  id,
  skillId: id,
  pattern: z.string(),
  diagnosticQuestion: z.string(),
  explanation: z.string(),
});

/** FSRS-Zustand einer Karte. Zeiten als Millisekunden (verlustfreier JSON-Export); Umwandlung in ts-fsrs `Card` in Schritt 8. */
export const FsrsCardData = z.object({
  due: ts,
  stability: z.number(),
  difficulty: z.number(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  learning_steps: z.number().optional(),
  reps: z.number().int(),
  lapses: z.number().int(),
  state: z.number().int(),
  last_review: ts.optional(),
});

export const CardRow = z.object({ itemId: id, fsrs: FsrsCardData, due: ts });

export const Attempt = z.object({
  id,
  itemId: id,
  ts,
  correct: z.boolean(),
  partial: z.boolean(),
  hintLevel: z.number().int().min(0).max(5),
  latencyMs: z.number().nonnegative(),
  confidence: z.number().int().min(1).max(3).optional(),
  errorType: z
    .enum([
      'slip',
      'prerequisite_gap',
      'misconception',
      'procedural',
      'reading',
      'guess',
      'ocr_or_asr',
    ])
    .optional(),
  gradedBy: z.enum(['rule', 'ai', 'self', 'user']),
});

export const Exam = z.object({
  id,
  subjectId: id,
  date: dayKey,
  skillIds: z.array(id),
  gradingSystem: z.string().optional(),
});

export const Session = z.object({
  id,
  startedAt: ts,
  endedAt: ts.optional(),
  plan: z.unknown(),
  endReason: z.string().optional(),
});

/** Unveränderliches Ereignisprotokoll. `id` ist eine fortlaufende Zahl und bestimmt die Reihenfolge. */
export const EventRow = z.object({
  id: z.number().int().positive(),
  ts,
  type: z.string().min(1),
  payload: z.unknown(),
  schemaVersion: z.number().int().positive(),
});

export const Annotation = z.object({
  id,
  documentId: id,
  page: z.number().int().nonnegative(),
  rects: z.array(z.tuple([z.number(), z.number(), z.number(), z.number()])),
  color: z.string(),
  note: z.string().optional(),
});

export const Job = z.object({
  id,
  type: z.enum(['ocr', 'tree', 'items', 'lesson', 'grade']),
  payload: z.unknown(),
  status: z.enum(['pending', 'running', 'done', 'failed']),
  attempts: z.number().int().nonnegative(),
  createdAt: ts,
});

export const Snapshot = z.object({
  projection: z.string(),
  /** Version der Projektionslogik; bei Änderung wird neu berechnet. */
  version: z.number().int().positive(),
  lastEventId: z.number().int().nonnegative(),
  data: z.unknown(),
  createdAt: ts,
});

export const Setting = z.object({ key: z.string(), value: z.unknown() });

export type Subject = z.infer<typeof Subject>;
export type DocumentRow = z.infer<typeof DocumentRow>;
export type BlobRow = z.infer<typeof BlobRow>;
export type Chunk = z.infer<typeof Chunk>;
export type Topic = z.infer<typeof Topic>;
export type Skill = z.infer<typeof Skill>;
export type Requires = z.infer<typeof Requires>;
export type Item = z.infer<typeof Item>;
export type Lesson = z.infer<typeof Lesson>;
export type Misconception = z.infer<typeof Misconception>;
export type CardRow = z.infer<typeof CardRow>;
export type Attempt = z.infer<typeof Attempt>;
export type Exam = z.infer<typeof Exam>;
export type Session = z.infer<typeof Session>;
export type EventRow = z.infer<typeof EventRow>;
export type Annotation = z.infer<typeof Annotation>;
export type Job = z.infer<typeof Job>;
export type Snapshot = z.infer<typeof Snapshot>;
export type Setting = z.infer<typeof Setting>;

/** Alle Tabellen mit ihrem Zeilen-Schema (Reihenfolge = Reihenfolge im Export). `blobs` wird getrennt als Dateien exportiert. */
export const TABLE_SCHEMAS = {
  subjects: Subject,
  documents: DocumentRow,
  chunks: Chunk,
  topics: Topic,
  skills: Skill,
  requires: Requires,
  items: Item,
  lessons: Lesson,
  misconceptions: Misconception,
  cards: CardRow,
  attempts: Attempt,
  exams: Exam,
  sessions: Session,
  events: EventRow,
  annotations: Annotation,
  jobs: Job,
  snapshots: Snapshot,
  settings: Setting,
} as const;

export type DataTableName = keyof typeof TABLE_SCHEMAS;
export const DATA_TABLES = Object.keys(TABLE_SCHEMAS) as DataTableName[];
