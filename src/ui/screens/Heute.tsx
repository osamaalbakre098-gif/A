import { CalendarClock, CircleHelp, Info, Send, Sprout, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Chip,
  Cluster,
  DoneMotif,
  EmptyMotif,
  LargeTitle,
  ListGroup,
  ListRow,
  SectionHeader,
  SegmentBar,
  Sheet,
  Skeleton,
  Stack,
  StickyAction,
  type SkillState,
} from '../components';
import './Heute.css';

export interface TodayData {
  state: 'plan' | 'done' | 'empty';
  /** Stunde 0–23, kommt von außen (kein Date.now im Bildschirm). */
  hour: number;
  reviews: number;
  /** Heutiger Fortschritt in Schritten, z. B. 3 von 8 */
  progress: { done: number; total: number };
  topic: string;
  minutes: number;
  /** Überschreibt „kurze Übung" in der Hauptzeile (z. B. die gewählte Methode) */
  kindLabel?: string;
  /** Fachfarbe der Hauptkarte (Punkt, nie Fläche) */
  subjectColor?: string;
  resume: { topic: string; done: number; total: number };
  review: { count: number; minutes: number };
  tomorrow: {
    count: number;
    minutes: number;
    exam?: { subject: string; date: string; sits: string; building: string };
  };
  /** Nahe Prüfung (höchstens 14 Tage): Hinweis in der Hauptkarte */
  examChip?: { subject: string; days: number };
  /** Aufträge, die auf Claude warten */
  jobsOpen?: number;
  tree: { subject: string; nodes: SkillState[] };
}

/** Zusätze für die echte Seite (Verweise, echte Begründungen, Ändern). In der Vorschau fehlen sie. */
export interface TodayExtras {
  goHref?: string;
  reviewHref?: string;
  resumeHref?: string;
  treeHref?: string;
  emptyHref?: string;
  jobsHref?: string;
  /** Übersetzte Begründungen für „Warum?" */
  reasons?: string[];
  onChange?: () => void;
  examNote?: string;
  /** Erklärung, warum heute nichts Neues kommt (übersetzt) */
  noNewNote?: string;
  /** Hinweis auf fehlende Aufgaben (übersetzt) */
  prepNote?: string;
  loading?: boolean;
}

const greetingKey = (hour: number) =>
  hour < 11 ? 'heute.greetingMorning' : hour < 18 ? 'heute.greetingDay' : 'heute.greetingEvening';

/** Startseite „Heute": eine Hauptsache (angeheftete Aktion über der Navigation), darunter ruhig drei kleine Bereiche. */
export default function Heute({ data, extras = {} }: { data: TodayData; extras?: TodayExtras }) {
  const { t } = useTranslation();
  const [why, setWhy] = useState(false);
  const count = (s: SkillState) => data.tree.nodes.filter((n) => n === s).length;
  const total = data.tree.nodes.length;
  const sits = count('sits') + count('refresh');

  if (extras.loading)
    return (
      <>
        <LargeTitle>{t(greetingKey(data.hour))}</LargeTitle>
        <Skeleton variant="card" />
        <Skeleton variant="rows" lines={3} />
      </>
    );

  const treeRow = total > 0 && (
    <ListGroup>
      <ListRow
        icon={Sprout}
        title={t('heute.treeRowTitle')}
        subtitle={t('heute.treeRowSub', { sits, total })}
        href={extras.treeHref ?? '#subjects'}
      />
    </ListGroup>
  );

  if (data.state === 'empty')
    return (
      <>
        <LargeTitle>{t(greetingKey(data.hour))}</LargeTitle>
        <Stack space="stack" className="heute__empty">
          <EmptyMotif label={t('heute.emptyAlt')} />
          <h2>{t('heute.emptyTitle')}</h2>
          <p>{t('heute.emptyText')}</p>
        </Stack>
        <StickyAction>
          <a className="btn btn--primary btn--l btn--block" href={extras.emptyHref ?? '#subjects'}>
            {t('heute.emptyCta')}
          </a>
        </StickyAction>
      </>
    );

  const reasons = extras.reasons ?? [t('heute.whyText')];
  const whySheet = (
    <Sheet
      open={why}
      onClose={() => setWhy(false)}
      title={t('heute.whyTitle')}
      size="sm"
      footer={
        <Button variant="plain" onClick={() => setWhy(false)}>
          {t('heute.whyOk')}
        </Button>
      }
    >
      <ListGroup>
        {reasons.map((r) => (
          <ListRow key={r} icon={Info} title={r} />
        ))}
      </ListGroup>
    </Sheet>
  );

  return (
    <>
      <LargeTitle>{t(greetingKey(data.hour))}</LargeTitle>

      {data.state === 'plan' ? (
        <Card variant="hero" aria-labelledby="heute-hero">
          <div className="card__eyebrow">
            {data.subjectColor && (
              <span
                className="heute__dot"
                style={{ background: `var(--subj-${data.subjectColor})` }}
                aria-hidden="true"
              />
            )}
            <h2 id="heute-hero" className="heute__hero-title">
              {t('heute.start')}
            </h2>
          </div>
          <p className="heute__line">
            {t(data.reviews > 0 ? 'heute.planLine' : 'heute.planLineNoReview', {
              reviews: data.reviews,
              topic: data.topic,
              kind: data.kindLabel ?? t('heute.kindPractice'),
              minutes: data.minutes,
            })}
          </p>
          {data.examChip && (
            <Chip icon={CalendarClock} tone="warning">
              {t('heute.examChip', data.examChip)}
            </Chip>
          )}
          {data.progress.done > 0 && (
            <Stack space="tight">
              <SegmentBar
                done={data.progress.done}
                total={data.progress.total}
                label={t('heute.progress', data.progress)}
              />
              <p className="t-note">{t('heute.progress', data.progress)}</p>
            </Stack>
          )}
          <Cluster>
            <Button variant="plain" onClick={() => setWhy(true)}>
              <CircleHelp size={20} aria-hidden="true" />
              {t('heute.why')}
            </Button>
            {extras.onChange && (
              <Button variant="plain" onClick={extras.onChange}>
                <SlidersHorizontal size={20} aria-hidden="true" />
                {t('heute.change')}
              </Button>
            )}
          </Cluster>
          {extras.noNewNote && <p className="t-note">{extras.noNewNote}</p>}
          {extras.prepNote && <p className="t-note">{extras.prepNote}</p>}
        </Card>
      ) : (
        <Stack space="stack" className="heute__empty">
          <DoneMotif label={t('heute.doneAlt')} />
          <h2>{t('heute.doneTitle')}</h2>
          <p>
            {t('heute.doneText', { count: data.tomorrow.count, minutes: data.tomorrow.minutes })}
          </p>
          <a className="btn btn--secondary btn--block" href={extras.goHref ?? '#session'}>
            {t('heute.keepGoing')}
          </a>
        </Stack>
      )}

      {data.state === 'plan' && (
        <Stack space="tight">
          <SectionHeader>{t('heute.after')}</SectionHeader>
          <ListGroup label={t('heute.after')}>
            {data.resume.topic && (
              <ListRow
                dot="sage"
                title={t('heute.resumeTitle')}
                subtitle={t('heute.resumeText', data.resume)}
                href={extras.resumeHref ?? '#subjects'}
              />
            )}
            {data.review.count > 0 && (
              <ListRow
                dot="amber"
                title={t('heute.reviewTitle')}
                subtitle={t('heute.reviewText', data.review)}
                href={extras.reviewHref ?? '#session'}
              />
            )}
            <ListRow
              dot="slate"
              title={t('heute.tomorrowTitle')}
              subtitle={t('heute.tomorrowCards', data.tomorrow)}
            />
          </ListGroup>
        </Stack>
      )}

      {data.tomorrow.exam && (
        <Card variant="plain">
          <p className="heute__strong">{t('heute.examLine', data.tomorrow.exam)}</p>
          <p>{t('heute.examStatus', data.tomorrow.exam)}</p>
          {extras.examNote && <p className="t-note">{extras.examNote}</p>}
        </Card>
      )}

      {(data.jobsOpen ?? 0) > 0 && (
        <Card variant="tinted">
          <h2 className="heute__hero-title">{t('heute.jobsTitle', { count: data.jobsOpen })}</h2>
          <a className="btn btn--secondary btn--block" href={extras.jobsHref ?? '#jobs'}>
            <Send size={20} aria-hidden="true" />
            {t('heute.jobsCta')}
          </a>
        </Card>
      )}

      {treeRow}

      {data.state === 'plan' && (
        <StickyAction>
          <a className="btn btn--primary btn--l btn--block" href={extras.goHref ?? '#session'}>
            {t('heute.go')}
          </a>
        </StickyAction>
      )}
      {whySheet}
    </>
  );
}
