import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hourOf } from '../../core/director/plan';
import { buildSession } from '../../core/director/session';
import { sessionAdvice, type Advice } from '../../core/director/session';
import type { DayPlan, DirectorSettings } from '../../core/director/types';
import { systemNow } from '../../data/clock';
import { planForNow } from '../../data/director-data';
import { ensureCards } from '../../data/learning';
import { medianLatency } from '../../data/progress';
import { buildQueue, endSession, startSession, type Step } from '../../data/session-queue';
import { Button, Cluster, ContentCard, EmptyState, Stack, TextArea } from '../components';
import { useDb } from '../DbProvider';
import { hrefTo } from '../useHashRoute';
import { Aufgabe } from './PracticePage';

interface Loaded {
  plan: DayPlan;
  settings: DirectorSettings;
  minutesBefore: number;
  steps: Step[];
  sessionId: string;
  lesson: Record<string, string>;
  skillTitle: Record<string, string>;
  skillNote: Record<string, string>;
}

/** Eine Sitzung: Aufwärmen → Kern → Üben → Abschluss. Nach jeder Aufgabe prüft der Studienleiter, ob eine Pause oder der Schluss dran ist. */
export default function SessionPage() {
  const { t } = useTranslation();
  const db = useDb();
  const [data, setData] = useState<Loaded | null | 'empty'>(null);
  const [i, setI] = useState(0);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [pause, setPause] = useState<number | null>(null);
  const [signals, setSignals] = useState(0);
  const [finished, setFinished] = useState(false);
  const [closingText, setClosingText] = useState('');
  const startedAt = useRef(0);
  const lastBreak = useRef(0);
  const doneSkills = useRef(new Set<string>());
  const answers = useRef<{ correct: boolean; latencyMs: number; wasSecure: boolean }[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const now = systemNow();
      await ensureCards(db, now);
      const { plan, snapshot } = await planForNow(db, now);
      const blocks = buildSession(plan);
      const steps = await buildQueue(db, plan, blocks, now);
      if (!alive) return;
      if (!steps.length) return setData('empty');
      const sessionId = await startSession(db, plan, blocks, now);
      const skills = await db.skills.bulkGet([
        ...new Set(steps.map((s) => (s.type === 'item' ? s.item.skillId : s.skillId))),
      ]);
      const lessons = await db.lessons.toArray();
      startedAt.current = now;
      lastBreak.current = now;
      setData({
        plan,
        settings: snapshot.settings,
        minutesBefore: snapshot.minutesDoneToday,
        steps,
        sessionId,
        lesson: Object.fromEntries(lessons.map((l) => [l.skillId, l.explanation])),
        skillTitle: Object.fromEntries(skills.filter(Boolean).map((s) => [s!.id, s!.title])),
        skillNote: Object.fromEntries(skills.filter(Boolean).map((s) => [s!.id, s!.description])),
      });
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  useEffect(() => {
    if (pause === null || pause <= 0) return;
    const id = setTimeout(() => setPause(pause - 1), 60_000);
    return () => clearTimeout(id);
  }, [pause]);

  if (data === null) return null;
  if (data === 'empty')
    return (
      <Stack space="section" className="view">
        <EmptyState
          title={t('session.nothingTitle')}
          text={t('session.nothingText')}
          action={
            <a className="btn btn--secondary" href="#today">
              {t('session.back')}
            </a>
          }
        />
      </Stack>
    );

  const step = data.steps[i];
  const stopNow = async (reason: string) => {
    await endSession(db, data.sessionId, reason, data.plan, systemNow(), [...doneSkills.current]);
    setFinished(true);
  };

  const next = async (lastWasItem: boolean) => {
    if (lastWasItem && step?.type === 'item') {
      doneSkills.current.add(step.item.skillId);
      const all = await db.attempts.toArray();
      const mine = all.filter((a) => a.ts >= startedAt.current).sort((a, b) => a.ts - b.ts);
      const earlierSolved = new Set(
        all.filter((a) => a.ts < startedAt.current && a.correct).map((a) => a.itemId),
      );
      answers.current = mine.map((a) => ({
        correct: a.correct,
        latencyMs: a.latencyMs,
        wasSecure: earlierSolved.has(a.itemId),
      }));
      const now = systemNow();
      const adv = sessionAdvice(
        {
          blockMinutes: (now - lastBreak.current) / 60_000,
          todayMinutes: data.minutesBefore + (now - startedAt.current) / 60_000,
          goalMinutes: data.settings.dailyMinutes,
          answers: answers.current,
          medianMs: medianLatency(all),
          fatigueSignals: signals,
          hour: hourOf(new Date(now)),
        },
        data.settings,
      );
      if (adv.value.action !== 'continue' && i + 1 < data.steps.length) {
        if (adv.reasons.some((r) => r === 'FATIGUE' || r === 'WRONG_IN_ROW'))
          setSignals(signals + 1);
        setAdvice(adv);
        return;
      }
    }
    if (i + 1 >= data.steps.length) return void stopNow('completed');
    setI(i + 1);
  };

  if (finished)
    return (
      <Stack space="section" className="view">
        <EmptyState
          title={t('session.doneTitle')}
          text={t('session.doneText')}
          action={
            <a className="btn btn--primary" href="#today">
              {t('session.back')}
            </a>
          }
        />
      </Stack>
    );

  if (pause !== null)
    return (
      <Stack space="section" className="view session-pause">
        <h1>{t('session.pauseTitle')}</h1>
        <p role="timer" aria-live="off">
          {t('session.pauseLeft', { minutes: pause })}
        </p>
        <ul>
          <li>{t('session.pause1')}</li>
          <li>{t('session.pause2')}</li>
          <li>{t('session.pause3')}</li>
        </ul>
        <Cluster>
          <Button
            onClick={() => {
              lastBreak.current = systemNow();
              setPause(null);
              setAdvice(null);
              setI(i + 1);
            }}
          >
            {t('session.continue')}
          </Button>
        </Cluster>
      </Stack>
    );

  if (advice)
    return (
      <Stack space="section" className="view">
        <ContentCard
          title={
            advice.value.action === 'end' ? t('session.endSuggest') : t('session.breakSuggest')
          }
          accent="amber"
        >
          <p>{advice.reasons.map((r) => t(`reason.${r}`)).join(' ')}</p>
          <Cluster>
            {advice.value.action === 'break' ? (
              <Button onClick={() => setPause(advice.value.minutes ?? 5)}>
                {t('session.takeBreak', { minutes: advice.value.minutes ?? 5 })}
              </Button>
            ) : (
              <Button onClick={() => void stopNow('suggested')}>{t('session.finish')}</Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                setAdvice(null);
                lastBreak.current = systemNow();
                setI(i + 1);
              }}
            >
              {t('session.keepGoing')}
            </Button>
            {advice.value.action === 'break' && (
              <Button variant="quiet" onClick={() => void stopNow('suggested')}>
                {t('session.finish')}
              </Button>
            )}
          </Cluster>
        </ContentCard>
      </Stack>
    );

  if (!step) return null;
  const total = data.steps.filter((s) => s.type === 'item').length;
  const nr = data.steps.slice(0, i + 1).filter((s) => s.type === 'item').length;
  const blockLabel = t(`session.block.${step.block}`);

  return (
    <Stack space="section" className="view">
      <Stack space="tight">
        <a className="backlink" href="#today">
          ← {t('session.back')}
        </a>
        <h1>{blockLabel}</h1>
        <p className="t-note">
          {data.skillTitle[step.type === 'item' ? step.item.skillId : step.skillId] ?? ''}
        </p>
      </Stack>
      {step.type === 'lesson' && (
        <ContentCard title={t('session.lesson')} accent="sage">
          <p>{data.lesson[step.skillId]}</p>
          <Cluster>
            <Button onClick={() => void next(false)}>{t('session.understood')}</Button>
          </Cluster>
        </ContentCard>
      )}
      {step.type === 'read' && (
        <ContentCard title={t('session.read')} accent="sage">
          <p>{t('session.readText', { title: data.skillTitle[step.skillId] ?? '' })}</p>
          <Cluster>
            {step.documentId && (
              <a
                className="btn btn--secondary"
                href={hrefTo('doc', step.documentId, { page: step.page })}
              >
                {t('session.openMaterial')}
              </a>
            )}
            <Button onClick={() => void next(false)}>{t('session.readDone')}</Button>
          </Cluster>
        </ContentCard>
      )}
      {step.type === 'item' && (
        <Aufgabe
          key={step.item.id + i}
          item={step.item}
          nr={nr}
          total={total}
          weiter={() => void next(true)}
        />
      )}
      {step.type === 'closing' && (
        <ContentCard title={t('session.closingTitle')} accent="ocean">
          <TextArea
            label={t('session.closingPrompt')}
            value={closingText}
            onChange={(e) => setClosingText(e.target.value)}
            rows={4}
          />
          {closingText.trim() && (
            <div className="why-text">
              <h3>{t('session.coreTitle')}</h3>
              <p>
                {data.skillNote[step.skillId] ||
                  data.lesson[step.skillId] ||
                  data.skillTitle[step.skillId]}
              </p>
              <p className="t-note">{t('session.notGraded')}</p>
            </div>
          )}
          <Cluster>
            <Button onClick={() => void next(false)}>{t('session.finish')}</Button>
          </Cluster>
        </ContentCard>
      )}
    </Stack>
  );
}
