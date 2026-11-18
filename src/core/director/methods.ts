import type { Decision, Method, Role, SkillView } from './types';

const ORDER = {
  not_started: 0,
  started: 1,
  with_help: 2,
  independent: 3,
  mastered: 4,
  review_due: 4,
} as const;

export interface MethodContext {
  role: Role;
  /** Neues Kapitel, Vorwissen unklar → Vortest (M6) */
  unclearPriorKnowledge?: boolean;
}

/** Methodenwähler (Tabelle 9.3). Gibt Methode und Begründungscodes zurück. */
export function chooseMethod(s: SkillView, ctx: MethodContext): Decision<Method> {
  const d = (value: Method, ...reasons: Decision<Method>['reasons']): Decision<Method> => ({
    value,
    reasons,
    overridable: true,
  });
  const lvl = ORDER[s.state];
  if (s.itemsActive === 0) return d('read', 'NO_AI_FALLBACK', 'NEW_MATERIAL');
  if (ctx.role === 'relearn') return d('retrieval', 'RELEARN');
  if (ctx.role === 'review' || ctx.role === 'exam') return d('retrieval', 'DUE_REVIEW');
  // I-Verbot: Fakten und isolierte Inhalte werden nie gemischt
  if (s.kind !== 'fakt' && s.confusableWith.length > 0 && lvl >= ORDER.with_help)
    return d('interleaved', 'INTERLEAVE_CONFUSABLE');
  if (ctx.unclearPriorKnowledge && s.state === 'not_started') return d('pretest', 'PRETEST');
  if (s.kind === 'verfahren') {
    if (lvl === ORDER.not_started || lvl === ORDER.started)
      return d('worked_example', 'WORKED_EXAMPLE');
    if (lvl === ORDER.with_help) return d('fading', 'FADING_HELP');
    return d('tasks_only', 'TASKS_ONLY'); // M3: keine Lösungsbeispiele mehr
  }
  if (s.kind === 'verstaendnis') return d('why_question', 'WHY_QUESTION');
  return d('retrieval', 'RETRIEVAL');
}
