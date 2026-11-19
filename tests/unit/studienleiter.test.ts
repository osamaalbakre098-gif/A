import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DIRECTOR_CONFIG as C,
  REASON_CODES,
  addDays,
  buildSession,
  canRevealHint,
  canRevealSolution,
  chooseMethod,
  dayDiff,
  examDaysFor,
  leaksSolution,
  planDay,
  planExam,
  relearnDue,
  relearnSchedule,
  sessionAdvice,
  type DirectorSettings,
  type SkillView,
  type Snapshot,
} from '../../src/core/director';
import type { SkillState } from '../../src/core/model/mastery';

const settings: DirectorSettings = {
  dailyMinutes: 45,
  maxDailyMinutes: 90,
  latestHour: 22,
  blockMinutes: 25,
  retention: 'normal',
};
const TODAY = '2026-03-02';
const STATES: SkillState[] = [
  'not_started',
  'started',
  'with_help',
  'independent',
  'mastered',
  'review_due',
];

const skill = (id: string, o: Partial<SkillView> = {}): SkillView => ({
  id,
  subjectId: 'phys',
  title: id,
  kind: 'verfahren',
  state: 'not_started',
  examRelevant: true,
  prereqIds: [],
  cardsLearned: 0,
  cardsDue: 0,
  cardsNew: 4,
  itemsActive: 6,
  hasLesson: true,
  recentErrors: [],
  practicedToday: false,
  relearnDone: 0,
  confusableWith: [],
  ...o,
});
const snap = (skills: SkillView[], o: Partial<Snapshot> = {}): Snapshot => ({
  skills,
  exams: [],
  settings,
  newCardsToday: 0,
  load7d: 0,
  minutesDoneToday: 0,
  ...o,
});

describe('Begründungstexte', () => {
  const read = (l: string) =>
    JSON.parse(readFileSync(`src/i18n/${l}.json`, 'utf8')) as {
      reason: Record<string, string>;
      method: Record<string, string>;
    };
  it('jeder Begründungscode hat einen deutschen Text', () => {
    for (const c of REASON_CODES) expect(read('de').reason[c], c).toBeTruthy();
  });
  it('jede Methode hat einen Text', () => {
    for (const m of [
      'worked_example',
      'fading',
      'tasks_only',
      'retrieval',
      'why_question',
      'pretest',
      'interleaved',
      'read',
    ])
      expect(read('de').method[m]).toBeTruthy();
  });
});

describe('Tagesplaner: Grundverhalten', () => {
  it('leere Lage → nichts zu planen, mit Grund', () => {
    const p = planDay(snap([]), TODAY, 10);
    expect(p.entries).toHaveLength(0);
    expect(p.reasons).toEqual(['NOTHING_TO_DO']);
  });
  it('neue Fähigkeit mit Aufgaben wird eingeplant, mit Methode und Grund', () => {
    const p = planDay(snap([skill('a')]), TODAY, 10);
    expect(p.entries).toHaveLength(1);
    expect(p.entries[0]).toMatchObject({ role: 'new', skillId: 'a' });
    expect(p.entries[0]!.method.value).toBe('worked_example');
    expect(p.entries[0]!.reasons).toContain('NEW_MATERIAL');
  });
  it('H1: Voraussetzung nicht begonnen → stattdessen sie', () => {
    const p = planDay(snap([skill('b', { prereqIds: ['a'] }), skill('a')]), TODAY, 10);
    expect(p.entries.map((e) => e.skillId)).toEqual(['a']);
    expect(p.entries[0]!.reasons).toContain('PREREQ_GAP');
  });
  it('H2: Wiederlernen vor Wiederholung vor Neuem', () => {
    const exam = { id: 'e', subjectId: 'phys', date: addDays(TODAY, 10), skillIds: [] };
    const sk = [
      skill('neu'),
      skill('wl', {
        state: 'independent',
        cardsLearned: 4,
        cardsDue: 0,
        learnedDay: addDays(TODAY, -2),
        cardsNew: 0,
      }),
      skill('rev', { state: 'mastered', cardsLearned: 5, cardsDue: 3, cardsNew: 0 }),
    ];
    const p = planDay(snap(sk, { exams: [exam] }), TODAY, 10);
    const roles = p.entries.map((e) => e.role);
    expect(roles.indexOf('relearn')).toBeLessThan(roles.indexOf('review'));
    expect(roles.indexOf('review')).toBeLessThan(roles.indexOf('new'));
  });
  it('H3: viele Wiederholungen → nichts Neues, mit Erklärung', () => {
    const sk = [
      skill('neu'),
      skill('r', { state: 'mastered', cardsLearned: 100, cardsDue: 60, cardsNew: 0 }),
    ];
    const p = planDay(snap(sk), TODAY, 10);
    expect(p.entries.some((e) => e.role === 'new')).toBe(false);
    expect(p.noNewBecause).toBe('REVIEW_LOAD');
  });
  it('H5: Prüfung in 2 Tagen → nichts Neues', () => {
    const exam = { id: 'e', subjectId: 'phys', date: addDays(TODAY, 2), skillIds: [] };
    const p = planDay(snap([skill('neu')], { exams: [exam] }), TODAY, 10);
    expect(p.entries).toHaveLength(0);
    expect(p.noNewBecause).toBe('EXAM_NEAR');
  });
  it('spät am Abend: nichts Neues', () => {
    const p = planDay(snap([skill('neu')]), TODAY, 23);
    expect(p.entries).toHaveLength(0);
    expect(p.noNewBecause).toBe('LATE_HOUR');
  });
  it('H6: höchstens 20 neue Karten pro Tag', () => {
    expect(planDay(snap([skill('neu', { cardsNew: 30 })]), TODAY, 10).newCards).toBe(20);
    expect(
      planDay(snap([skill('neu', { cardsNew: 30 })], { newCardsToday: 15 }), TODAY, 10).newCards,
    ).toBe(5);
    expect(planDay(snap([skill('neu')], { newCardsToday: 20 }), TODAY, 10).noNewBecause).toBe(
      'DAILY_LIMIT',
    );
  });
  it('hohe Wochenlast halbiert die neuen Karten', () => {
    expect(
      planDay(snap([skill('neu', { cardsNew: 30 })], { load7d: 999 }), TODAY, 10).newCards,
    ).toBe(10);
  });
  it('Tagesziel erreicht → nichts mehr, Grund GOAL_REACHED', () => {
    const p = planDay(snap([skill('neu')], { minutesDoneToday: 45 }), TODAY, 10);
    expect(p.entries).toHaveLength(0);
    expect(p.reasons).toContain('GOAL_REACHED');
  });
  it('ohne Aufgaben: Lesen im Material (Fallback), und meldet „vorbereiten"', () => {
    const p = planDay(snap([skill('neu', { itemsActive: 0, cardsNew: 0 })]), TODAY, 10);
    expect(p.entries[0]!.method.value).toBe('read');
    expect(p.needsPreparation).toEqual(['neu']);
  });
  it('„Heute nur X" baut um X herum und nimmt fällige Wiederholungen kurz mit', () => {
    const sk = [
      skill('x'),
      skill('y'),
      skill('due', { state: 'mastered', cardsLearned: 5, cardsDue: 2, cardsNew: 0 }),
    ];
    const p = planDay(snap(sk, { override: { skillId: 'x' } }), TODAY, 10);
    expect(p.entries.find((e) => e.role === 'new')!.skillId).toBe('x');
    expect(p.entries.some((e) => e.skillId === 'due')).toBe(true);
    expect(p.entries.every((e) => e.reasons.includes('USER_OVERRIDE'))).toBe(true);
  });
  it('Fehlermuster erhöht die Priorität', () => {
    const sk = [
      skill('ruhig', { state: 'started' }),
      skill('fehler', { state: 'started', recentErrors: ['procedural', 'procedural'] }),
    ];
    expect(planDay(snap(sk), TODAY, 10).entries[0]!.skillId).toBe('fehler');
  });
});

describe('Tagesplaner: Eigenschaftstests (10 000 zufällige Lernstände)', () => {
  const skillsArb = fc.integer({ min: 0, max: 14 }).chain((n) =>
    fc.tuple(
      ...Array.from({ length: n }, (_, i) =>
        fc.record({
          state: fc.constantFrom(...STATES),
          subj: fc.integer({ min: 0, max: 4 }),
          pre: fc.array(fc.integer({ min: 0, max: Math.max(0, i - 1) }), { maxLength: 2 }),
          learned: fc.integer({ min: 0, max: 12 }),
          due: fc.integer({ min: 0, max: 40 }),
          cnew: fc.integer({ min: 0, max: 12 }),
          items: fc.integer({ min: 0, max: 8 }),
          errors: fc.array(fc.constantFrom('slip', 'procedural', 'guess') as fc.Arbitrary<'slip'>, {
            maxLength: 5,
          }),
          kind: fc.constantFrom('fakt', 'verfahren', 'verstaendnis') as fc.Arbitrary<'fakt'>,
        }),
      ),
    ),
  );
  it('H1–H6, Zeitbudget und Begründungen gelten immer', () => {
    fc.assert(
      fc.property(
        skillsArb,
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 25 }),
        fc.integer({ min: 0, max: 400 }),
        fc.integer({ min: 0, max: 100 }),
        fc.option(fc.integer({ min: -2, max: 40 }), { nil: undefined }),
        (raw, minutesDone, hour, newToday, load, daily, examIn) => {
          const skills = raw.map((r, i) =>
            skill(`s${i}`, {
              subjectId: `f${r.subj}`,
              state: r.state,
              kind: r.kind,
              prereqIds: [...new Set(r.pre.filter((p) => p < i).map((p) => `s${p}`))],
              cardsLearned: r.learned,
              cardsDue: Math.min(r.due, r.learned),
              cardsNew: r.cnew,
              itemsActive: r.items,
              recentErrors: r.errors,
              learnedDay: addDays(TODAY, -5),
              relearnDone: 0,
            }),
          );
          const exams =
            examIn === undefined
              ? []
              : [{ id: 'e', subjectId: 'f0', date: addDays(TODAY, examIn), skillIds: [] }];
          const s = snap(skills, {
            exams,
            minutesDoneToday: minutesDone,
            newCardsToday: newToday,
            load7d: load,
            settings: { ...settings, dailyMinutes: Math.max(10, daily) },
          });
          const plan = planDay(s, TODAY, hour);
          const byId = new Map(skills.map((x) => [x.id, x]));
          const fresh = plan.entries.filter((e) => e.role === 'new' || e.role === 'gap');
          // Zeitbudget
          expect(plan.totalMinutes).toBeLessThanOrEqual(plan.availableMinutes + 1e-9);
          // jede Entscheidung hat einen Grund, nur bekannte Codes
          for (const e of plan.entries) {
            expect(e.reasons.length).toBeGreaterThan(0);
            for (const r of [...e.reasons, ...e.method.reasons]) expect(REASON_CODES).toContain(r);
          }
          if (!plan.entries.length) expect(plan.reasons.length).toBeGreaterThan(0);
          // H1
          for (const e of fresh)
            for (const p of byId.get(e.skillId)!.prereqIds)
              expect(byId.get(p)!.state).not.toBe('not_started');
          // H2: Wiederlernen vor allem anderen, Wiederholung vor Neuem
          const order = plan.entries.map((e) => e.role);
          const lastNonNew = Math.max(
            -1,
            ...order.map((r, i) => (r === 'new' || r === 'gap' ? -1 : i)),
          );
          const firstNew = order.findIndex((r) => r === 'new' || r === 'gap');
          if (firstNew >= 0) expect(lastNonNew).toBeLessThan(firstNew);
          // H3
          const dueMin = skills
            .filter((x) => x.cardsDue > 0)
            .reduce((a, x) => a + Math.max(2, Math.ceil(x.cardsDue * C.minutesPerCard)), 0);
          if (dueMin > plan.availableMinutes * C.reviewShareLimit) expect(fresh).toHaveLength(0);
          // H4
          expect(new Set(plan.entries.map((e) => e.subjectId)).size).toBeLessThanOrEqual(
            C.maxSubjectsPerSession,
          );
          // H5
          const near = skills.some((x) => {
            const d = examDaysFor(x, exams, TODAY);
            return d !== undefined && d <= C.examNoNewDays;
          });
          if (near) expect(fresh).toHaveLength(0);
          // H6
          expect(plan.newCards).toBeLessThanOrEqual(Math.max(0, C.maxNewCardsPerDay - newToday));
          // später Abend: nichts Neues
          if (hour >= settings.latestHour || hour < 4) expect(fresh).toHaveLength(0);
        },
      ),
      { numRuns: 10_000 },
    );
  });
});

describe('Szenario: Physik-Prüfung in 14 Tagen', () => {
  it('jede neue Fähigkeit hat 3 Wiederlern-Termine vor der Prüfung, die letzten 2 Tage nichts Neues, Plan passt immer', () => {
    const examDay = addDays(TODAY, 14);
    const exam = { id: 'e', subjectId: 'phys', date: examDay, skillIds: [] };
    let skills: SkillView[] = Array.from({ length: 6 }, (_, i) =>
      skill(`p${i}`, { prereqIds: i ? [`p${i - 1}`] : [] }),
    );
    const relearnDays = new Map<string, string[]>();
    const newDays: string[] = [];
    for (let d = 0; d <= 14; d++) {
      const day = addDays(TODAY, d);
      const plan = planDay(snap(skills, { exams: [exam] }), day, 10);
      expect(plan.totalMinutes).toBeLessThanOrEqual(plan.availableMinutes);
      for (const e of plan.entries) {
        if (e.role === 'new') {
          newDays.push(day);
          skills = skills.map((s) =>
            s.id === e.skillId
              ? {
                  ...s,
                  state: 'independent',
                  learnedDay: day,
                  cardsLearned: 4,
                  cardsNew: 0,
                  cardsDue: 0,
                }
              : s,
          );
        }
        if (e.role === 'relearn') {
          relearnDays.set(e.skillId, [...(relearnDays.get(e.skillId) ?? []), day]);
          skills = skills.map((s) =>
            s.id === e.skillId ? { ...s, relearnDone: s.relearnDone + 1, lastRelearnDay: day } : s,
          );
        }
      }
    }
    expect(newDays.length).toBe(6);
    for (const nd of newDays) expect(dayDiff(nd, examDay)).toBeGreaterThan(2); // an den letzten 2 Tagen nichts Neues
    for (const s of skills) {
      const days = relearnDays.get(s.id) ?? [];
      expect(days, s.id).toHaveLength(3);
      for (const x of days) expect(dayDiff(x, examDay)).toBeGreaterThan(0);
    }
  });
});

describe('Wiederlernen und Prüfungsplanung', () => {
  it('Abstand 10–20 %, mindestens 1, höchstens 21 Tage; alle Termine vor der Prüfung', () => {
    const s = relearnSchedule('2026-01-01', '2026-03-02'); // 60 Tage
    expect(s).toHaveLength(3);
    expect(dayDiff('2026-01-01', s[0]!)).toBe(9);
    expect(dayDiff(s[0]!, s[1]!)).toBe(9);
    expect(
      relearnSchedule('2025-01-01', '2026-03-02').map((x) => dayDiff('2025-01-01', x))[0],
    ).toBe(21);
  });
  it('Prüfung < 7 Tage: 1-Tages-Abstände, mindestens 2 Sitzungen', () => {
    const s = relearnSchedule(TODAY, addDays(TODAY, 5));
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(dayDiff(s[0]!, s[1]!)).toBe(1);
  });
  it('verpasster Termin wird nachgeholt, nach der Prüfung nicht mehr', () => {
    const s = skill('a', { learnedDay: TODAY, state: 'independent' });
    expect(relearnDue(s, addDays(TODAY, 30), addDays(TODAY, 10))).toBe(true);
    expect(relearnDue(s, addDays(TODAY, 30), addDays(TODAY, 31))).toBe(false);
  });
  it('Überlast wird ehrlich gesagt und priorisiert in Lernreihenfolge', () => {
    const sk = Array.from({ length: 10 }, (_, i) => skill(`t${i}`));
    const p = planExam(
      { id: 'e', subjectId: 'phys', date: addDays(TODAY, 6), skillIds: [] },
      sk,
      TODAY,
      45,
    );
    expect(p.status).toBe('overload');
    expect(p.safe.length + p.basicsOnly.length).toBe(10);
    expect(p.safe).toEqual(sk.slice(0, p.safe.length).map((s) => s.id));
    expect(dayDiff(p.newUntil, addDays(TODAY, 6))).toBeGreaterThanOrEqual(3);
  });
  it('genug Zeit → erreichbar; zwei Probeprüfungen bei ca. 60 % und 85 %', () => {
    const p = planExam(
      { id: 'e', subjectId: 'phys', date: addDays(TODAY, 40), skillIds: [] },
      [skill('a')],
      TODAY,
      45,
    );
    expect(p.status).toBe('reachable');
    expect(p.probes).toEqual([addDays(TODAY, 24), addDays(TODAY, 34)]);
  });
});

describe('Methodenwähler', () => {
  it('M1 neu + Verfahren → Lösungsbeispiel; M2 mit Hilfe → weniger Hilfe; M3 ab selbstständig → nur Aufgaben', () => {
    expect(chooseMethod(skill('a'), { role: 'new' }).value).toBe('worked_example');
    expect(chooseMethod(skill('a', { state: 'with_help' }), { role: 'gap' }).value).toBe('fading');
    expect(chooseMethod(skill('a', { state: 'independent' }), { role: 'gap' }).value).toBe(
      'tasks_only',
    );
  });
  it('M4 Fakten → Abruf; M5 Verständnis → Warum-Frage; M6 Vortest bei unklarem Vorwissen', () => {
    expect(chooseMethod(skill('a', { kind: 'fakt' }), { role: 'new' }).value).toBe('retrieval');
    expect(chooseMethod(skill('a', { kind: 'verstaendnis' }), { role: 'new' }).value).toBe(
      'why_question',
    );
    expect(
      chooseMethod(skill('a', { kind: 'verstaendnis' }), {
        role: 'new',
        unclearPriorKnowledge: true,
      }).value,
    ).toBe('pretest');
  });
  it('Mischen (I) bei verwechselbaren Typen ab „mit Hilfe"; nie bei Fakten (I-Verbot)', () => {
    expect(
      chooseMethod(skill('a', { state: 'with_help', confusableWith: ['b'] }), { role: 'gap' })
        .value,
    ).toBe('interleaved');
    expect(
      chooseMethod(skill('a', { kind: 'fakt', state: 'with_help', confusableWith: ['b'] }), {
        role: 'gap',
      }).value,
    ).not.toBe('interleaved');
  });
  it('Wiederholung → Abruf; ohne Aufgaben → Lesen', () => {
    expect(chooseMethod(skill('a', { state: 'mastered' }), { role: 'review' }).value).toBe(
      'retrieval',
    );
    expect(chooseMethod(skill('a', { itemsActive: 0 }), { role: 'new' }).value).toBe('read');
  });
});

describe('Sitzung, Pausen, Hinweise', () => {
  const stats = (o = {}) => ({
    blockMinutes: 5,
    todayMinutes: 10,
    goalMinutes: 45,
    answers: [],
    fatigueSignals: 0,
    hour: 10,
    ...o,
  });
  const ans = (n: number, correct: boolean, ms: number) =>
    Array.from({ length: n }, () => ({ correct, latencyMs: ms }));
  it('Aufbau: Aufwärmen → Kern → Üben → Abschluss, passt in die Zeit', () => {
    const sk = [
      skill('neu'),
      skill('r', { state: 'mastered', cardsLearned: 5, cardsDue: 4, cardsNew: 0 }),
    ];
    const plan = planDay(snap(sk), TODAY, 10);
    const b = buildSession(plan);
    expect(b.map((x) => x.kind)).toEqual(['warmup', 'core', 'practice', 'closing']);
    expect(b.reduce((a, x) => a + x.minutes, 0)).toBeLessThanOrEqual(plan.availableMinutes);
    expect(b[1]!.skillIds).toEqual(['neu']);
  });
  it('Blockzeit erreicht → Pause (5 Min), nicht belohnend, mit Grund', () => {
    const a = sessionAdvice(stats({ blockMinutes: 25 }), settings);
    expect(a.value).toEqual({ action: 'break', minutes: 5 });
    expect(a.reasons).toEqual(['BLOCK_TIME']);
  });
  it('simulierte Ermüdung (langsamer UND schlechter) löst Pausenvorschlag aus; nur eines davon nicht', () => {
    const answers = [...ans(6, true, 4000), ...ans(6, false, 9000)];
    const tired = sessionAdvice(stats({ answers, medianMs: 4000 }), settings);
    expect(tired.value.action).toBe('break');
    expect(tired.value.minutes).toBe(12);
    expect(tired.reasons).toEqual(['FATIGUE']);
    expect(
      sessionAdvice(
        stats({ answers: [...ans(6, true, 4000), ...ans(6, false, 4000)], medianMs: 4000 }),
        settings,
      ).value.action,
    ).toBe('continue');
    expect(
      sessionAdvice(
        stats({ answers: [...ans(6, true, 4000), ...ans(6, true, 9000)], medianMs: 4000 }),
        settings,
      ).value.action,
    ).toBe('continue');
  });
  it('3 Fehler in Folge bei Sicherem → Pause; zwei Signale → Schluss', () => {
    const answers = ans(3, false, 4000).map((x) => ({ ...x, wasSecure: true }));
    expect(sessionAdvice(stats({ answers }), settings).reasons).toEqual(['WRONG_IN_ROW']);
    expect(sessionAdvice(stats({ answers, fatigueSignals: 1 }), settings).value.action).toBe('end');
  });
  it('Schluss: Tagesziel, Höchstzeit, späte Stunde', () => {
    expect(sessionAdvice(stats({ todayMinutes: 45 }), settings).reasons).toEqual(['GOAL_REACHED']);
    expect(sessionAdvice(stats({ todayMinutes: 95 }), settings).reasons).toEqual(['DAILY_LIMIT']);
    expect(sessionAdvice(stats({ hour: 23 }), settings).reasons).toEqual(['LATE_HOUR']);
  });
  it('Hinweise erst nach eigenem Versuch oder 45 Sekunden; Lösung erst nach allen Hinweisen', () => {
    expect(canRevealHint(0, 10_000)).toBe(false);
    expect(canRevealHint(1, 0)).toBe(true);
    expect(canRevealHint(0, 45_000)).toBe(true);
    expect(canRevealSolution(4, 3)).toBe(false);
    expect(canRevealSolution(4, 4)).toBe(true);
  });
  it('Lösungs-Leck-Prüfung: Zahl und Wort in der Lösung werden erkannt', () => {
    expect(leaksSolution('Das Ergebnis ist 12,5 N.', ['12.5'])).toBe(true);
    expect(leaksSolution('Rechne 5 mal 2.', ['12.5'])).toBe(false);
    expect(
      leaksSolution('Es ist die Komponentenweise Addition.', ['komponentenweise Addition']),
    ).toBe(true);
    expect(
      leaksSolution('Welche Rechenregel passt zu Vektoren?', ['komponentenweise Addition']),
    ).toBe(false);
    expect(leaksSolution('Man addiert komponentenweise.', ['komponentenweise'])).toBe(true);
  });
});

describe('Leistung', () => {
  it('Tagesplan für 5000 Items (1000 Fähigkeiten, 5 je Fähigkeit) in höchstens 50 ms', () => {
    const skills = Array.from({ length: 1000 }, (_, i) =>
      skill(`s${i}`, {
        subjectId: `f${i % 5}`,
        state: STATES[i % STATES.length]!,
        itemsActive: 5,
        cardsLearned: 3,
        cardsDue: i % 4,
        cardsNew: 2,
        prereqIds: i > 0 ? [`s${i - 1}`] : [],
        learnedDay: addDays(TODAY, -3),
      }),
    );
    const exams = [{ id: 'e', subjectId: 'f0', date: addDays(TODAY, 20), skillIds: [] }];
    planDay(snap(skills, { exams }), TODAY, 10); // Aufwärmen
    const t0 = performance.now();
    planDay(snap(skills, { exams }), TODAY, 10);
    const ms = performance.now() - t0;
    console.log(`Tagesplan 1000 Fähigkeiten / 5000 Items: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(50);
  });
});
