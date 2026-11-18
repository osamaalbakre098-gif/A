import { CircleHelp } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Cluster,
  ContentCard,
  DoneMotif,
  EmptyMotif,
  ProgressArc,
  SegmentBar,
  Icon,
  Stack,
  TreeMotif,
  type SkillState,
} from '../components';

export interface TodayData {
  state: 'plan' | 'done' | 'empty';
  /** Stunde 0–23, kommt von außen (kein Date.now im Bildschirm). */
  hour: number;
  reviews: number;
  /** Heutiger Fortschritt in Schritten, z. B. 3 von 8 */
  progress: { done: number; total: number };
  topic: string;
  minutes: number;
  resume: { topic: string; done: number; total: number };
  review: { count: number; minutes: number };
  /** Überschreibt „kurze Übung" in der Hauptzeile (z. B. die gewählte Methode) */
  kindLabel?: string;
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

/** Zusätze für die echte Seite (Verweise, echte Begründungen, Ändern). In der Vorschau fehlen sie. */
export interface TodayExtras {
  goHref?: string;
  reviewHref?: string;
  resumeHref?: string;
  treeHref?: string;
  emptyHref?: string;
  /** Übersetzte Begründungen für „Warum?" */
  reasons?: string[];
  onChange?: () => void;
  examNote?: string;
  /** Erklärung, warum heute nichts Neues kommt (übersetzt) */
  noNewNote?: string;
  /** Hinweis auf fehlende Aufgaben (übersetzt) */
  prepNote?: string;
}

/** Startseite „Heute": eine große Hauptaktion, darunter ruhig drei kleine Bereiche. */
export default function Heute({ data, extras = {} }: { data: TodayData; extras?: TodayExtras }) {
  const { t } = useTranslation();
  const [whyOpen, setWhyOpen] = useState(false);
  const whyId = useId();
  const count = (s: SkillState) => data.tree.nodes.filter((n) => n === s).length;

  if (data.state === 'empty') {
    return (
      <Stack space="section" className="heute view">
        <h1 className="heute__greet">{t(greetingKey(data.hour))}</h1>
        <Stack space="stack" className="heute__empty">
          <EmptyMotif label={t('heute.emptyAlt')} />
          <h2>{t('heute.emptyTitle')}</h2>
          <p>{t('heute.emptyText')}</p>
          <Cluster className="heute__cluster-full">
            {extras.emptyHref ? (
              <a className="btn btn--primary heute__cta" href={extras.emptyHref}>
                {t('heute.emptyCta')}
              </a>
            ) : (
              <Button>{t('heute.emptyCta')}</Button>
            )}
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
          <Stack space="tight">
            <h2 className="card__title">{t('heute.start')}</h2>
            <p>
              {t(data.reviews > 0 ? 'heute.planLine' : 'heute.planLineNoReview', {
                reviews: data.reviews,
                topic: data.topic,
                kind: data.kindLabel ?? t('heute.kindPractice'),
                minutes: data.minutes,
              })}
            </p>
          </Stack>
          <Stack space="tight">
            <SegmentBar
              done={data.progress.done}
              total={data.progress.total}
              label={t('heute.progress', data.progress)}
            />
            <p className="t-note">{t('heute.progress', data.progress)}</p>
          </Stack>
          {extras.goHref ? (
            <a className="btn btn--primary heute__cta" href={extras.goHref}>
              {t('heute.go')}
            </a>
          ) : (
            <Button className="heute__cta">{t('heute.go')}</Button>
          )}
          <Cluster>
            <Button
              variant="secondary"
              aria-expanded={whyOpen}
              aria-controls={whyId}
              onClick={() => setWhyOpen(!whyOpen)}
            >
              <Icon as={CircleHelp} size={20} />
              {t('heute.why')}
            </Button>
            {extras.onChange && (
              <Button variant="secondary" onClick={extras.onChange}>
                {t('heute.change')}
              </Button>
            )}
          </Cluster>
          {whyOpen &&
            (extras.reasons ? (
              <ul id={whyId} className="why-text">
                {extras.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : (
              <p id={whyId} className="why-text">
                {t('heute.whyText')}
              </p>
            ))}
          {extras.noNewNote && <p className="t-note">{extras.noNewNote}</p>}
          {extras.prepNote && <p className="t-note">{extras.prepNote}</p>}
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
          {data.resume.topic && (
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
                {extras.resumeHref ? (
                  <a className="btn btn--secondary" href={extras.resumeHref}>
                    {t('heute.resumeCta')}
                  </a>
                ) : (
                  <Button variant="secondary">{t('heute.resumeCta')}</Button>
                )}
              </Cluster>
            </ContentCard>
          )}
          {data.review.count > 0 && (
            <ContentCard title={t('heute.reviewTitle')} accent="amber">
              <p>{t('heute.reviewText', data.review)}</p>
              <Cluster>
                {extras.reviewHref ? (
                  <a className="btn btn--secondary" href={extras.reviewHref}>
                    {t('heute.reviewCta')}
                  </a>
                ) : (
                  <Button variant="secondary">{t('heute.reviewCta')}</Button>
                )}
              </Cluster>
            </ContentCard>
          )}
        </div>
      )}

      <ContentCard title={t('heute.tomorrowTitle')} accent="slate">
        <p>{t('heute.tomorrowCards', data.tomorrow)}</p>
        {data.tomorrow.exam && (
          <Stack space="tight">
            <p className="strong">{t('heute.examLine', data.tomorrow.exam)}</p>
            <p>{t('heute.examStatus', data.tomorrow.exam)}</p>
            {extras.examNote && <p className="t-note">{extras.examNote}</p>}
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
          {extras.treeHref ? (
            <a className="btn btn--quiet" href={extras.treeHref}>
              {t('heute.treeCta')}
            </a>
          ) : (
            <Button variant="quiet">{t('heute.treeCta')}</Button>
          )}
        </Cluster>
      </ContentCard>
    </Stack>
  );
}
