import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeDe } from '../../content/text';
import { systemNow } from '../../data/clock';
import type { Item } from '../../data/db/schema';
import { recordAnswer, reportItem, ensureCards } from '../../data/learning';
import {
  Button,
  Card,
  ChoiceList,
  Cluster,
  EmptyState,
  LargeTitle,
  ProgressBar,
  Stack,
  StickyAction,
  TextArea,
  TextField,
} from '../components';
import { useDb } from '../DbProvider';
import { hrefTo } from '../useHashRoute';

type Rubric = {
  kernpunkte?: string[];
  raster?: { punkte: number }[];
  maxPunkte?: number;
  akzeptiert?: string[];
  optionen?: { text: string; begruendung: string }[];
  rechenweg?: string[];
};

/** Stabile Reihenfolge der Optionen, ohne Zufall (damit Tests und Anzeige gleich bleiben). */
const mischen = (xs: string[]) =>
  [...xs].sort((a, b) => (normalizeDe(a) < normalizeDe(b) ? -1 : 1));

const zahl = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.'));
function prüfen(item: Item, eingabe: string): boolean {
  const r = (item.rubric ?? {}) as Rubric;
  const e = normalizeDe(eingabe).trim();
  if (item.subtype === 'kurz' || item.subtype === 'karte') {
    const soll = [String(item.answer), ...(r.akzeptiert ?? [])].map((x) => normalizeDe(x).trim());
    return soll.includes(e);
  }
  if (item.subtype === 'luecke') {
    const soll = (item.answer as string[]).map((x) => normalizeDe(x).trim());
    const gegeben = e.split(/[;,]/).map((x) => x.trim());
    return soll.length === gegeben.length && soll.every((x, i) => x === gegeben[i]);
  }
  if (item.subtype === 'rechnung') {
    const a = item.answer as { wert: number; toleranzProzent?: number };
    const z = zahl(eingabe);
    if (!Number.isFinite(z)) return false;
    const tol = (a.toleranzProzent ?? 1) / 100;
    return Math.abs(z - a.wert) <= Math.abs(a.wert) * tol + 1e-9;
  }
  if (item.subtype === 'mc') return eingabe === (item.answer as { richtig: string }).richtig;
  return false;
}

export function Aufgabe({
  item,
  nr,
  total,
  weiter,
  askConfidence = nr % 3 === 0,
}: {
  item: Item;
  nr: number;
  total: number;
  weiter: () => void;
  askConfidence?: boolean;
}) {
  const { t } = useTranslation();
  const db = useDb();
  const start = useRef(systemNow());
  const [eingabe, setEingabe] = useState('');
  const [hilfe, setHilfe] = useState(0);
  const [aufgedeckt, setAufgedeckt] = useState<null | {
    ok: boolean;
    teil: boolean;
    geprueft: boolean;
  }>(null);
  const [haken, setHaken] = useState<string[]>([]);
  const [vormerken, setVormerken] = useState(false);
  const [confidence, setConfidence] = useState<1 | 2 | 3 | undefined>(undefined);
  const [reported, setReported] = useState(false);
  const [zeit, setZeit] = useState(0);
  const r = (item.rubric ?? {}) as Rubric;
  const offen = item.subtype === 'offen' || item.subtype === 'transfer';
  const hints = item.hints ?? [];

  // Hinweise erst nach einem eigenen Versuch oder 45 Sekunden (Regel 4: nie zuerst die Lösung)
  useEffect(() => {
    const id = setTimeout(() => setZeit(45), 45_000);
    return () => clearTimeout(id);
  }, []);
  const freigeschaltet = !!eingabe.trim() || zeit >= 45;

  const aufdecken = (unbekannt: boolean) => {
    if (offen) return setAufgedeckt({ ok: false, teil: false, geprueft: false });
    setAufgedeckt({ ok: !unbekannt && prüfen(item, eingabe), teil: false, geprueft: true });
  };
  const bewertungOffen = useMemo(() => {
    const n = r.kernpunkte?.length ?? 0;
    return { n, ok: n > 0 && haken.length === n, teil: haken.length > 0 && haken.length < n };
  }, [haken, r.kernpunkte]);

  const abschliessen = async () => {
    const ok = offen ? bewertungOffen.ok : !!aufgedeckt?.ok;
    const teil = offen ? bewertungOffen.teil : false;
    const ts = systemNow();
    await recordAnswer(db, {
      item,
      correct: ok,
      partial: teil,
      hintLevel: hilfe,
      latencyMs: ts - start.current,
      confidence,
      answerText: eingabe.trim() || undefined,
      selfChecked: offen ? haken : undefined,
      gradedBy: offen ? 'self' : 'rule',
      queueForGrading: offen && vormerken,
      now: ts,
    });
    weiter();
  };

  const optionen =
    item.subtype === 'mc'
      ? mischen([(item.answer as { richtig: string }).richtig, ...(item.distractors ?? [])])
      : [];

  return (
    <Stack space="stack">
      <Stack space="tight">
        <p className="t-note tabular">{t('practice.of', { n: nr, total })}</p>
        <ProgressBar
          percent={Math.round(((nr - 1) / Math.max(total, 1)) * 100)}
          label={t('practice.of', { n: nr, total })}
        />
      </Stack>
      <Card>
        <p className="practice__prompt">{item.prompt}</p>
      </Card>

      {!aufgedeckt && (
        <Stack space="stack">
          {item.subtype === 'mc' ? (
            <ChoiceList
              legend={t('practice.answer')}
              choices={optionen.map((o) => ({ id: o, text: o }))}
              value={eingabe || null}
              onChange={setEingabe}
            />
          ) : offen ? (
            <TextArea
              label={t('practice.answer')}
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              rows={5}
            />
          ) : (
            <TextField
              label={item.subtype === 'rechnung' ? t('practice.number') : t('practice.answer')}
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              inputMode={item.subtype === 'rechnung' ? 'decimal' : undefined}
              autoComplete="off"
            />
          )}
          {askConfidence && !offen && (
            <ChoiceList
              legend={t('practice.confidence')}
              choices={[
                { id: '1', text: t('practice.conf1') },
                { id: '2', text: t('practice.conf2') },
                { id: '3', text: t('practice.conf3') },
              ]}
              value={confidence ? String(confidence) : null}
              onChange={(v) => setConfidence(Number(v) as 1 | 2 | 3)}
            />
          )}
          {hilfe > 0 && (
            <div role="region" aria-live="polite" aria-label={t('practice.hint', { level: hilfe })}>
              <ol>
                {hints.slice(0, hilfe).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ol>
            </div>
          )}
          {hints.length > 0 && !freigeschaltet && (
            <p className="t-note">{t('practice.hintLocked')}</p>
          )}
          <StickyAction>
            <Button
              size="l"
              fullWidth
              onClick={() => aufdecken(false)}
              disabled={!eingabe.trim() && !offen}
            >
              {t('practice.check')}
            </Button>
            <Cluster>
              {hints.length > hilfe && (
                <Button
                  variant="secondary"
                  disabled={!freigeschaltet}
                  onClick={() => setHilfe(hilfe + 1)}
                >
                  {t('practice.hint', { level: hilfe + 1 })}
                </Button>
              )}
              <Button variant="quiet" onClick={() => aufdecken(true)}>
                {t('practice.dontKnow')}
              </Button>
            </Cluster>
          </StickyAction>
        </Stack>
      )}

      {aufgedeckt && (
        <Stack space="stack">
          {!offen && (
            <p role="status" className={aufgedeckt.ok ? 'msg' : 'msg msg--error'}>
              {aufgedeckt.ok ? '✓ ' + t('practice.correct') : '✗ ' + t('practice.wrong')}
            </p>
          )}
          <div>
            <h3>{offen ? t('practice.sample') : t('practice.solution')}</h3>
            <p>
              {item.subtype === 'rechnung'
                ? `${(item.answer as { wert: number; einheit?: string }).wert} ${(item.answer as { einheit?: string }).einheit ?? ''}`
                : item.subtype === 'mc'
                  ? (item.answer as { richtig: string }).richtig
                  : Array.isArray(item.answer)
                    ? (item.answer as string[]).join(', ')
                    : String(item.answer)}
            </p>
          </div>
          {item.subtype === 'mc' && r.optionen && (
            <ul>
              {r.optionen.map((o, i) => (
                <li key={i} className="t-note">
                  <strong>{o.text}:</strong> {o.begruendung}
                </li>
              ))}
            </ul>
          )}
          {item.subtype === 'rechnung' && r.rechenweg && (
            <ol className="t-note">
              {r.rechenweg.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          {offen && (
            <fieldset className="choices">
              <legend>{t('practice.checklist')}</legend>
              {(r.kernpunkte ?? []).map((k) => (
                <label key={k} className="choice">
                  <input
                    type="checkbox"
                    checked={haken.includes(k)}
                    onChange={(e) =>
                      setHaken(e.target.checked ? [...haken, k] : haken.filter((x) => x !== k))
                    }
                  />
                  <span>{k}</span>
                </label>
              ))}
              <p className="t-note" role="status">
                {t('practice.selfResult', { checked: haken.length, total: bewertungOffen.n })}
              </p>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={vormerken}
                  onChange={(e) => setVormerken(e.target.checked)}
                />
                <span>{t('practice.queue')}</span>
              </label>
            </fieldset>
          )}
          <StickyAction>
            <Button size="l" fullWidth onClick={() => void abschliessen()}>
              {nr === total ? t('practice.finish') : t('practice.next')}
            </Button>
            <Cluster>
              <Button
                variant="quiet"
                disabled={reported}
                onClick={() => {
                  setReported(true);
                  void reportItem(db, item.id, systemNow());
                }}
              >
                {reported ? t('practice.reported') : t('practice.report')}
              </Button>
            </Cluster>
          </StickyAction>
        </Stack>
      )}
    </Stack>
  );
}

export default function PracticePage({ skillId }: { skillId: string }) {
  const { t } = useTranslation();
  const db = useDb();
  const skill = useLiveQuery(() => db.skills.get(skillId), [db, skillId]);
  const [items, setItems] = useState<Item[] | null>(null);
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [lesson, setLesson] = useState(false);
  const lessonRow = useLiveQuery(() => db.lessons.get(skillId), [db, skillId]);
  const topic = useLiveQuery(
    async () => (skill ? db.topics.get(skill.topicId) : undefined),
    [db, skill?.topicId],
  );

  // Aufgaben einmal festlegen (nicht bei jedem Versuch neu mischen)
  useEffect(() => {
    let alive = true;
    void ensureCards(db, systemNow());
    void db.items
      .where('skillId')
      .equals(skillId)
      .toArray()
      .then(
        (xs) =>
          alive &&
          setItems(
            xs.filter((x) => x.status === 'active').sort((a, b) => a.difficulty - b.difficulty),
          ),
      );
    return () => {
      alive = false;
    };
  }, [db, skillId]);

  if (skill === undefined || items === null) return null;
  if (!skill) return <EmptyState title={t('subjects.notFound')} text="" />;
  const back = topic ? hrefTo('subject', topic.subjectId) : '#subjects';
  return (
    <Stack space="section" className="view">
      <LargeTitle>{skill.title}</LargeTitle>
      {lessonRow && (
        <Stack space="tight">
          <Cluster>
            <Button variant="secondary" aria-expanded={lesson} onClick={() => setLesson(!lesson)}>
              {t('practice.showExplain')}
            </Button>
          </Cluster>
          {lesson && (
            <div className="why-text">
              <p>{lessonRow.explanation}</p>
            </div>
          )}
        </Stack>
      )}
      {items.length === 0 ? (
        <EmptyState
          title={t('practice.title')}
          text={t('practice.noItems')}
          action={
            <a className="btn btn--secondary" href="#jobs">
              {t('practice.openJobs')}
            </a>
          }
        />
      ) : done ? (
        <EmptyState
          title={t('practice.doneTitle')}
          text={t('practice.doneText', { count: items.length })}
          action={
            <a className="btn btn--secondary" href={back}>
              {t('practice.back')}
            </a>
          }
        />
      ) : (
        <Aufgabe
          key={items[i]!.id}
          item={items[i]!}
          nr={i + 1}
          total={items.length}
          weiter={() => (i + 1 >= items.length ? setDone(true) : setI(i + 1))}
        />
      )}
    </Stack>
  );
}
