import { useTranslation } from 'react-i18next';
import {
  Button,
  Cluster,
  ContentCard,
  DoneMotif,
  EmptyMotif,
  ProgressArc,
  SessionMotif,
  Stack,
  TreeMotif,
  type SkillState,
} from '../components';

export interface TodayData {
  state: 'plan' | 'done' | 'empty';
  /** Stunde 0–23, kommt von außen (kein Date.now im Bildschirm). */
  hour: number;
  reviews: number;
  topic: string;
  minutes: number;
  resume: { topic: string; done: number; total: number };
  review: { count: number; minutes: number };
  tomorrow: {
    count: number;
    minutes: number;
    exam?: { subject: string; date: string; sits: string; building: string };
  };
  tree: { subject: string; nodes: SkillState[] };
}

function greetingKey(hour: number) {
  if (hour < 11) return 'heute.greetingMorning';
  if (hour < 18) return 'heute.greetingDay';
  return 'heute.greetingEvening';
}

/** Startseite „Heute": eine große Hauptaktion, darunter ruhig drei kleine Bereiche. */
export default function Heute({ data }: { data: TodayData }) {
  const { t } = useTranslation();
  const count = (s: SkillState) => data.tree.nodes.filter((n) => n === s).length;

  if (data.state === 'empty') {
    return (
      <Stack space="section" className="heute view">
        <h1 className="heute__greet">{t(greetingKey(data.hour))}</h1>
        <Stack space="stack" className="heute__empty">
          <EmptyMotif label={t('heute.emptyAlt')} />
          <h2>{t('heute.emptyTitle')}</h2>
          <p>{t('heute.emptyText')}</p>
          <Cluster>
            <Button>{t('heute.emptyCta')}</Button>
          </Cluster>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack space="section" className="heute view">
      <h1 className="heute__greet">{t(greetingKey(data.hour))}</h1>

      {data.state === 'plan' ? (
        <ContentCard hero accent="ocean">
          <Cluster space="group" className="heute__hero">
            <SessionMotif label={t('heute.sessionAlt')} />
            <Stack space="stack" className="heute__hero-text">
              <h2 className="card__title">{t('heute.start')}</h2>
              <p>
                {t('heute.planLine', {
                  reviews: data.reviews,
                  topic: data.topic,
                  kind: t('heute.kindPractice'),
                  minutes: data.minutes,
                })}
              </p>
            </Stack>
          </Cluster>
          <Button className="heute__cta">{t('heute.go')}</Button>
          <details className="why">
            <summary>{t('heute.why')}</summary>
            <p>{t('heute.whyText')}</p>
          </details>
        </ContentCard>
      ) : (
        <Stack space="stack" className="heute__empty">
          <DoneMotif label={t('heute.doneAlt')} />
          <h2>{t('heute.doneTitle')}</h2>
          <p>
            {t('heute.doneText', { count: data.tomorrow.count, minutes: data.tomorrow.minutes })}
          </p>
        </Stack>
      )}

      {data.state === 'plan' && (
        <div className="heute__grid">
          <ContentCard title={t('heute.resumeTitle')} accent="sage">
            <Cluster>
              <ProgressArc
                done={data.resume.done}
                total={data.resume.total}
                label={data.resume.topic}
              />
              <p>{t('heute.resumeText', data.resume)}</p>
            </Cluster>
            <Cluster>
              <Button variant="secondary">{t('heute.resumeCta')}</Button>
            </Cluster>
          </ContentCard>
          <ContentCard title={t('heute.reviewTitle')} accent="amber">
            <p>{t('heute.reviewText', data.review)}</p>
            <Cluster>
              <Button variant="secondary">{t('heute.reviewCta')}</Button>
            </Cluster>
          </ContentCard>
        </div>
      )}

      <ContentCard title={t('heute.tomorrowTitle')} accent="slate">
        <p>{t('heute.tomorrowCards', data.tomorrow)}</p>
        {data.tomorrow.exam && (
          <Stack space="tight">
            <p className="strong">{t('heute.examLine', data.tomorrow.exam)}</p>
            <p>{t('heute.examStatus', data.tomorrow.exam)}</p>
          </Stack>
        )}
      </ContentCard>

      <ContentCard title={t('heute.treeTitle')} accent="moss">
        <Cluster space="group">
          <TreeMotif
            label={t('heute.treeAlt', {
              subject: data.tree.subject,
              sits: count('sits'),
              building: count('building'),
              fresh: count('new'),
              due: count('refresh'),
            })}
            nodes={data.tree.nodes}
          />
          <Button variant="quiet">{t('heute.treeCta')}</Button>
        </Cluster>
      </ContentCard>
    </Stack>
  );
}
