import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dayDiff } from '../../core/director/days';
import { planExam } from '../../core/director/exam';
import { priority } from '../../core/director/plan';
import type { ReasonCode } from '../../core/director/types';
import { toDisplay } from '../../core/model/mastery';
import { systemNow } from '../../data/clock';
import { cardsDueTomorrow, planForNow, setOverride } from '../../data/director-data';
import { appendEvent } from '../../data/events/events';
import { skillInfos } from '../../data/progress';
import { Button, Cluster, Dialog, Stack } from '../components';
import { useDb } from '../DbProvider';
import { hrefTo } from '../useHashRoute';
import Heute, { type TodayData, type TodayExtras } from './Heute';

/** „Heute" mit echtem Plan vom Studienleiter (reiner Code in `src/core/director`). */
export default function TodayPage() {
  const { t, i18n } = useTranslation();
  const db = useDb();
  const [alt, setAlt] = useState(false);
  const view = useLiveQuery(async () => {
    const now = systemNow();
    const { snapshot, plan, today, hour } = await planForNow(db, now);
    const infos = await skillInfos(db, now);
    const subjects = new Map((await db.subjects.toArray()).map((s) => [s.id, s]));
    const tomorrow = await cardsDueTomorrow(db, now);
    const byId = new Map(snapshot.skills.map((s) => [s.id, s]));
    const prio = (id: string) => priority(byId.get(id)!, byId, snapshot.exams, today).total;
    const planned = new Set(plan.entries.map((e) => e.skillId));
    const alternatives = snapshot.skills
      .filter((s) => !planned.has(s.id) && s.state !== 'mastered' && s.state !== 'review_due')
      .sort((a, b) => prio(b.id) - prio(a.id) || (a.id < b.id ? -1 : 1))
      .slice(0, 3);
    // Nächste Prüfung
    const upcoming = snapshot.exams
      .filter((e) => dayDiff(today, e.date) >= 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    let exam;
    if (upcoming) {
      const ids = new Set(
        snapshot.skills
          .filter(
            (s) =>
              s.subjectId === upcoming.subjectId &&
              (!upcoming.skillIds.length || upcoming.skillIds.includes(s.id)),
          )
          .map((s) => s.id),
      );
      const ex = [...ids].map((id) => byId.get(id)!);
      const ep = planExam(upcoming, ex, today, snapshot.settings.dailyMinutes);
      exam = {
        data: {
          subject: subjects.get(upcoming.subjectId)?.name ?? '',
          date: new Intl.DateTimeFormat(i18n.language, {
            weekday: 'short',
            day: 'numeric',
            month: 'numeric',
          }).format(new Date(`${upcoming.date}T12:00:00`)),
          sits: String(
            ex.filter((s) => toDisplay(s.state) === 'sits' || toDisplay(s.state) === 'refresh')
              .length,
          ),
          building: String(ex.filter((s) => toDisplay(s.state) === 'building').length),
        },
        status: ep.status,
        daysLeft: ep.daysLeft,
      };
    }
    // Weiterlernen: zuletzt geübte, noch nicht sitzende Fähigkeit
    const attempts = (await db.attempts.toArray()).sort((a, b) => b.ts - a.ts);
    const itemSkill = new Map((await db.items.toArray()).map((i) => [i.id, i.skillId]));
    let resume;
    for (const a of attempts) {
      const sid = itemSkill.get(a.itemId);
      const info = sid ? infos.get(sid) : undefined;
      if (info && !info.skill.hidden && toDisplay(info.state) === 'building') {
        const done = new Set(
          attempts.filter((x) => itemSkill.get(x.itemId) === sid).map((x) => x.itemId),
        ).size;
        resume = {
          id: info.skill.id,
          topic: info.skill.title,
          done,
          total: Math.max(done, info.items),
        };
        break;
      }
    }
    const first = [...subjects.values()].find((s) =>
      snapshot.skills.some((k) => k.subjectId === s.id && !s.archived),
    );
    const treeNodes = first
      ? snapshot.skills
          .filter((k) => k.subjectId === first.id)
          .slice(0, 24)
          .map((k) => toDisplay(k.state))
      : [];
    const reviewEntries = plan.entries.filter(
      (e) => e.role === 'review' || e.role === 'relearn' || e.role === 'exam',
    );
    const reviewCards = reviewEntries.reduce((a, e) => a + (byId.get(e.skillId)?.cardsDue ?? 0), 0);
    const core = plan.entries.find((e) => e.role === 'new' || e.role === 'gap') ?? plan.entries[0];
    const practicedSkills = snapshot.skills.filter((s) => s.practicedToday).length;
    return {
      snapshot,
      plan,
      hour,
      tomorrow,
      alternatives,
      exam,
      resume,
      first,
      treeNodes,
      reviewCards,
      core,
      practicedSkills,
      anySkills: snapshot.skills.length > 0,
    };
  }, [db, i18n.language]);

  if (!view) return null;
  const { plan, snapshot } = view;
  const reasonText = (c: ReasonCode) => t(`reason.${c}`);
  const state: TodayData['state'] = !view.anySkills
    ? 'empty'
    : plan.entries.length
      ? 'plan'
      : 'done';
  const remaining = plan.entries.filter((e) => !byPracticed(snapshot, e.skillId)).length;
  const data: TodayData = {
    state,
    hour: view.hour,
    reviews: view.reviewCards,
    progress: { done: view.practicedSkills, total: view.practicedSkills + remaining },
    topic: view.core ? (snapshot.skills.find((s) => s.id === view.core!.skillId)?.title ?? '') : '',
    minutes: Math.round(plan.totalMinutes),
    kindLabel: view.core ? t(`method.${view.core.method.value}`) : undefined,
    resume: view.resume ?? { topic: '', done: 0, total: 0 },
    review: { count: view.reviewCards, minutes: Math.ceil(view.reviewCards * 0.6) },
    tomorrow: {
      count: view.tomorrow,
      minutes: Math.ceil(view.tomorrow * 0.6),
      ...(view.exam ? { exam: view.exam.data } : {}),
    },
    tree: { subject: view.first?.name ?? '', nodes: view.treeNodes },
  };
  const reasons = view.core
    ? [
        ...new Set([
          ...view.core.reasons,
          ...view.core.method.reasons,
          ...(plan.entries.length ? [] : plan.reasons),
        ]),
      ].map(reasonText)
    : plan.reasons.map(reasonText);
  const extras: TodayExtras = {
    goHref: '#session',
    reviewHref: '#session',
    ...(view.resume ? { resumeHref: hrefTo('practice', view.resume.id) } : {}),
    treeHref: view.first ? hrefTo('tree', view.first.id) : '#subjects',
    emptyHref: '#subjects',
    reasons,
    onChange: () => setAlt(true),
    ...(view.exam && view.exam.status !== 'reachable'
      ? { examNote: t(`examStatus.${view.exam.status}`) }
      : view.exam
        ? { examNote: t('examStatus.reachable') }
        : {}),
    ...(plan.noNewBecause && state === 'plan'
      ? { noNewNote: t('heute.noNewReviewLoad', { reason: reasonText(plan.noNewBecause) }) }
      : {}),
    ...(plan.needsPreparation.length
      ? { prepNote: t('heute.prepNote', { count: plan.needsPreparation.length }) }
      : {}),
  };

  const choose = async (skillId: string | null, name?: string) => {
    const s = skillId ? snapshot.skills.find((k) => k.id === skillId) : undefined;
    await setOverride(db, skillId && s ? { day: plan.dayKey, skillId } : null);
    await appendEvent(
      db,
      { type: 'UserOverride', payload: { decision: 'today', to: name ?? null } },
      systemNow(),
    );
    setAlt(false);
  };

  return (
    <>
      {state === 'done' && plan.reasons.length > 0 && (
        <p className="t-note" role="status">
          {plan.reasons.map(reasonText).join(' ')}
        </p>
      )}
      <Heute data={data} extras={extras} />
      <Dialog open={alt} onClose={() => setAlt(false)} title={t('heute.alternativesTitle')}>
        <Stack space="stack">
          <ul className="plain doclist">
            {view.alternatives.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="docrow treerow"
                  onClick={() => void choose(s.id, s.title)}
                >
                  <span className="docrow__name">{t('heute.onlyX', { name: s.title })}</span>
                </button>
              </li>
            ))}
          </ul>
          <Cluster>
            {snapshot.override && (
              <Button variant="secondary" onClick={() => void choose(null)}>
                {t('heute.reset')}
              </Button>
            )}
            <Button variant="quiet" onClick={() => setAlt(false)}>
              {t('heute.close')}
            </Button>
          </Cluster>
        </Stack>
      </Dialog>
    </>
  );
}

const byPracticed = (snap: { skills: { id: string; practicedToday: boolean }[] }, id: string) =>
  snap.skills.find((s) => s.id === id)?.practicedToday ?? false;
