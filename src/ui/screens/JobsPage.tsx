import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  neuAnfordern,
  requestAuswertung,
  requestBaum,
  requestBewerten,
  requestQuelle,
  requestVorbereiten,
  vorschlaege,
  type Erstellt,
  type Vorschlag,
} from '../../ai/jobs/build';
import { renderAuftragText } from '../../ai/jobs/render';
import { importAntwort } from '../../ai/jobs/import';
import type { JobPayload, JobTyp } from '../../ai/jobs/types';
import { AuftragsAustauschProvider } from '../../ai/provider';
import {
  abgleichen,
  ladeKopplung,
  neuerCode,
  speicherKopplung,
  verbindungPruefen,
  type AbgleichBericht,
} from '../../ai/sync';
import { systemNow } from '../../data/clock';
import type { AuswertungErgebnis } from '../../ai/jobs/schemas';
import type { z } from 'zod';
import {
  Banner,
  Button,
  Card,
  Chip,
  Cluster,
  CopyBlock,
  Disclosure,
  LargeTitle,
  ListGroup,
  ListRow,
  SectionHeader,
  StepList,
  Stack,
  Switch,
  TextArea,
  TextField,
} from '../components';
import { Sparkles } from 'lucide-react';
import './Jobs.css';
import { useDb } from '../DbProvider';

type Row = { id: string; type: string; status: string; payload: JobPayload; createdAt: number };

function statusKey(j: Row): 'open' | 'withClaude' | 'done' | 'failed' | 'partial' {
  const b = j.payload.bericht;
  if (j.status === 'done') return 'done';
  if (j.status === 'failed')
    return b && b.importiert > 0 && b.fehler.length > 0 ? 'partial' : 'failed';
  return j.status === 'running' ? 'withClaude' : 'open';
}

function JobCard({ j, onChange }: { j: Row; onChange: (msg: string) => void }) {
  const { t } = useTranslation();
  const db = useDb();
  const [antwort, setAntwort] = useState('');
  const [busy, setBusy] = useState(false);
  const [zeigen, setZeigen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const text = renderAuftragText(j.payload.paket);
  const teil = j.payload.paket.teil;
  const b = j.payload.bericht;
  const sk = statusKey(j);

  const markieren = async () => {
    if (j.status === 'pending') await db.jobs.update(j.id, { status: 'running' });
  };
  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onChange(t('jobs.copied'));
    } catch {
      setZeigen(true);
      onChange(t('jobs.copyFail'));
    }
    await markieren();
  };
  const herunterladen = async () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(j.payload.paket, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `madar-auftrag-${j.payload.paket.typ}-${j.id.slice(0, 8)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    await markieren();
  };
  const importieren = async () => {
    setBusy(true);
    try {
      await importAntwort(db, j.id, antwort, systemNow());
      setAntwort('');
    } finally {
      setBusy(false);
    }
  };
  const neu = async () => {
    await neuAnfordern(db, j.id, b?.fehler ?? [], systemNow());
    onChange(t('jobs.retried'));
  };

  const open = j.status === 'pending' || j.status === 'running' || j.status === 'failed';
  const tone =
    sk === 'done' ? 'success' : sk === 'failed' || sk === 'partial' ? 'warning' : 'neutral';
  return (
    <li className="jobcard">
      <Disclosure
        open={open}
        summary={
          <span className="jobcard__sum">
            <span className="jobcard__title">
              <bdi dir="auto">{j.payload.paket.titel}</bdi>
            </span>
            <span className="jobcard__meta">
              <Chip tone={tone}>{t(`jobs.status.${sk}`)}</Chip>
              <span className="t-note">
                {t(`jobs.typ.${j.type}`)}
                {teil.von > 1 ? ` · ${t('jobs.part', { index: teil.index, total: teil.von })}` : ''}
              </span>
            </span>
          </span>
        }
      >
        <Stack space="stack">
          {open && (
            <StepList
              doneLabel={t('jobs.stepDone')}
              steps={[
                {
                  title: t('jobs.step1'),
                  done: j.status !== 'pending',
                  children: (
                    <Stack space="tight">
                      <Cluster>
                        <Button variant="secondary" onClick={kopieren}>
                          {t('jobs.copy')}
                        </Button>
                        <Button variant="quiet" onClick={herunterladen}>
                          {t('jobs.download')}
                        </Button>
                        <Button
                          variant="quiet"
                          aria-expanded={zeigen}
                          onClick={() => setZeigen(!zeigen)}
                        >
                          {t('jobs.show')}
                        </Button>
                      </Cluster>
                      {zeigen && (
                        <CopyBlock
                          text={text}
                          label={t('jobs.show')}
                          copyLabel={t('jobs.copy')}
                          copiedLabel={t('jobs.copied')}
                        />
                      )}
                    </Stack>
                  ),
                },
                { title: t('jobs.step2'), done: j.status === 'running' },
                {
                  title: t('jobs.step3'),
                  children: (
                    <Stack space="tight">
                      <TextArea
                        label={t('jobs.answerLabel')}
                        value={antwort}
                        onChange={(e) => setAntwort(e.target.value)}
                        rows={4}
                      />
                      <Cluster>
                        <Button onClick={importieren} loading={busy} disabled={!antwort.trim()}>
                          {busy ? t('jobs.importing') : t('jobs.import')}
                        </Button>
                        <Button variant="quiet" onClick={() => fileRef.current?.click()}>
                          {t('jobs.answerFile')}
                        </Button>
                        <input
                          ref={fileRef}
                          type="file"
                          hidden
                          accept=".json,.txt,application/json,text/plain"
                          aria-label={t('jobs.answerFile')}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) setAntwort(await f.text());
                            e.target.value = '';
                          }}
                        />
                      </Cluster>
                    </Stack>
                  ),
                },
              ]}
            />
          )}
          {b && (
            <div aria-live="polite" className="jobcard__result">
              <Banner
                tone={b.fehler.length === 0 ? 'success' : b.importiert > 0 ? 'warning' : 'danger'}
              >
                {b.fehler.length === 0
                  ? t('jobs.resultOk', { count: b.importiert })
                  : b.importiert > 0
                    ? t('jobs.resultPartial', { count: b.importiert })
                    : t('jobs.resultFail')}
              </Banner>
              <p className="t-note">{t('jobs.nothingHalf')}</p>
              {b.uebersprungen > 0 && (
                <p className="t-note">{t('jobs.skipped', { count: b.uebersprungen })}</p>
              )}
              {b.fehler.length > 0 && (
                <Disclosure summary={t('jobs.errorsTitle')}>
                  <ul className="plain">
                    {b.fehler.slice(0, 12).map((f, i) => (
                      <li key={i} className="t-note">
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Cluster>
                    <Button variant="secondary" onClick={neu}>
                      {t('jobs.retry')}
                    </Button>
                  </Cluster>
                </Disclosure>
              )}
              {b.hinweise.length > 0 && (
                <Disclosure summary={t('jobs.notesTitle')}>
                  <ul className="plain">
                    {b.hinweise.slice(0, 8).map((f, i) => (
                      <li key={i} className="t-note">
                        {f}
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}
            </div>
          )}
        </Stack>
      </Disclosure>
    </li>
  );
}

function Auswertung() {
  const { t } = useTranslation();
  const db = useDb();
  const a = useLiveQuery(() => db.settings.get('auswertung:latest'), [db]);
  const v = a?.value as { ergebnis: z.infer<typeof AuswertungErgebnis> } | undefined;
  if (!v) return null;
  const e = v.ergebnis;
  return (
    <Card>
      <h2>{t('jobs.reviewTitle')}</h2>
      <p className="t-note">{t('jobs.reviewNote')}</p>
      <p>{e.zusammenfassung}</p>
      {e.staerken.length > 0 && (
        <>
          <h3>{t('jobs.reviewStrengths')}</h3>
          <ul>
            {e.staerken.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}
      {e.luecken.length > 0 && (
        <>
          <h3>{t('jobs.reviewGaps')}</h3>
          <ul>
            {e.luecken.map((s, i) => (
              <li key={i}>{s.text}</li>
            ))}
          </ul>
        </>
      )}
      {e.empfehlungen.length > 0 && (
        <>
          <h3>{t('jobs.reviewTips')}</h3>
          <ul>
            {e.empfehlungen.map((s, i) => (
              <li key={i}>
                {s.text} <span className="t-note">{s.begruendung}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export default function JobsPage() {
  const { t } = useTranslation();
  const db = useDb();
  const jobs = useLiveQuery(
    async () =>
      (await db.jobs.toArray())
        .filter((j) =>
          ['quelle_ergaenzen', 'baum', 'vorbereiten', 'bewerten', 'auswertung'].includes(j.type),
        )
        .sort((a, b) => b.createdAt - a.createdAt),
    [db],
  ) as Row[] | undefined;
  const sug = useLiveQuery(() => vorschlaege(db), [db, jobs?.length]);
  const [msg, setMsg] = useState('');
  const [code, setCode] = useState(() => ladeKopplung()?.code ?? '');
  const [saved, setSaved] = useState(() => ladeKopplung()?.code ?? '');
  const [report, setReport] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sync, setSync] = useState<AbgleichBericht | null>(null);
  const [connMsg, setConnMsg] = useState('');
  const [showCode, setShowCode] = useState(false);
  const base = typeof location === 'undefined' ? '' : location.origin;

  const erstellen = async (v: Vorschlag) => {
    const now = systemNow();
    const p = new AuftragsAustauschProvider(db, now);
    const r: Erstellt =
      v.typ === 'baum'
        ? await requestBaum(db, p, v.ref!, now)
        : v.typ === 'quelle_ergaenzen'
          ? await requestQuelle(db, p, v.ref!, now)
          : v.typ === 'vorbereiten'
            ? await requestVorbereiten(db, p, v.ref!, now)
            : v.typ === 'bewerten'
              ? await requestBewerten(db, p, now)
              : await requestAuswertung(db, p, now);
    setMsg(
      r.jobIds.length
        ? t('jobs.created', { count: r.jobIds.length })
        : (r.hinweis ?? t('jobs.nothing')),
    );
  };

  const speichern = () => {
    speicherKopplung(code.trim() || null);
    setSaved(code.trim());
  };
  const abgleich = async () => {
    setSyncing(true);
    setSync(
      await abgleichen(db, { baseUrl: base, code: saved, now: systemNow(), lernbericht: report }),
    );
    setSyncing(false);
  };
  const urlText = saved ? `${base}/mcp/${saved}` : '';

  return (
    <>
      <LargeTitle>{t('jobs.title')}</LargeTitle>
      <Banner tone={saved ? 'success' : 'info'}>
        {saved ? t('jobs.connected') : t('jobs.notConnected')}
      </Banner>
      <p>{t('jobs.intro')}</p>

      <Stack space="tight">
        <SectionHeader>{t('jobs.suggestTitle')}</SectionHeader>
        {sug && sug.length === 0 ? (
          <p className="t-note">{t('jobs.suggestNone')}</p>
        ) : (
          <ListGroup label={t('jobs.suggestTitle')}>
            {sug?.map((v, i) => (
              <ListRow
                key={`${v.typ}-${v.ref ?? i}`}
                icon={Sparkles}
                title={<bdi dir="auto">{v.titel}</bdi>}
                subtitle={`${t(`jobs.typ.${v.typ as JobTyp}`)}${v.detail ? ` · ${v.detail}` : ''} · ${t('jobs.create')}`}
                onClick={() => void erstellen(v)}
              />
            ))}
          </ListGroup>
        )}
        <div aria-live="polite">
          {msg && (
            <p role="status" className="msg">
              {msg}
            </p>
          )}
        </div>
      </Stack>

      <Auswertung />

      <Stack space="tight">
        <SectionHeader>{t('jobs.listTitle')}</SectionHeader>
        {jobs && jobs.length === 0 ? (
          <p className="t-note">{t('jobs.listNone')}</p>
        ) : (
          <ul className="plain jobs__list">
            {jobs?.map((j) => (
              <JobCard key={j.id} j={j} onChange={setMsg} />
            ))}
          </ul>
        )}
      </Stack>

      <Card>
        <Stack space="stack">
          <h2>{t('jobs.connTitle')}</h2>
          <p className="t-note">{t('jobs.connText')}</p>
          <div className="jobs__code">
            <TextField
              label={t('jobs.code')}
              hint={t('jobs.codeHint')}
              type={showCode ? 'text' : 'password'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              variant="quiet"
              className="jobs__flush"
              aria-pressed={showCode}
              onClick={() => setShowCode(!showCode)}
            >
              {showCode ? t('jobs.codeHide') : t('jobs.codeShow')}
            </Button>
          </div>
          <Cluster className="jobs__flush">
            <Button
              variant="secondary"
              onClick={speichern}
              disabled={code.trim().length < 24 && code.trim() !== ''}
            >
              {t('jobs.codeSave')}
            </Button>
            <Button variant="quiet" onClick={() => setCode(neuerCode())}>
              {t('jobs.codeNew')}
            </Button>
            {saved && (
              <Button
                variant="quiet"
                onClick={() => {
                  setCode('');
                  speicherKopplung(null);
                  setSaved('');
                }}
              >
                {t('jobs.codeRemove')}
              </Button>
            )}
          </Cluster>
          {urlText && (
            <>
              <CopyBlock
                text={urlText}
                label={t('jobs.urlLabel')}
                copyLabel={t('jobs.urlCopy')}
                copiedLabel={t('jobs.urlCopied')}
              />
              <Button
                variant="secondary"
                onClick={async () =>
                  setConnMsg(
                    (await verbindungPruefen({ baseUrl: base, code: saved })) ?? t('jobs.testOk'),
                  )
                }
              >
                {t('jobs.test')}
              </Button>
              <Switch label={t('jobs.withReport')} checked={report} onChange={setReport} />
              <Button onClick={abgleich} loading={syncing}>
                {syncing ? t('jobs.syncing') : t('jobs.sync')}
              </Button>
            </>
          )}
          <div aria-live="polite">
            {connMsg && (
              <p role="status" className="msg">
                {connMsg}
              </p>
            )}
            {sync && (
              <>
                <p role="status" className="msg">
                  {t('jobs.syncResult', { up: sync.hochgeladen, down: sync.abgeholt })}
                </p>
                {sync.fehler.map((f, i) => (
                  <p key={i} role="alert" className="msg msg--error">
                    ⚠ {f}
                  </p>
                ))}
              </>
            )}
          </div>
        </Stack>
      </Card>
    </>
  );
}
