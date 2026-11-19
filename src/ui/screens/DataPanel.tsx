import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BackupDB,
  KEEP_BACKUPS,
  listBackups,
  pruneBackups,
  type BackupRow,
} from '../../data/db/backups';
import type { MadarDB } from '../../data/db/db';
import { DataError } from '../../data/db/errors';
import {
  checkStorage,
  detectPlatformFromBrowser,
  getStorageEstimate,
  requestPersistence,
  type Persistence,
  type PlatformInfo,
  type StorageEstimateLike,
} from '../../data/db/storage';
import { exportZip, importZip } from '../../data/db/transfer';
import { systemNow } from '../../data/clock';
import { getDb } from '../../data/instance';
import { runStorageSelfTest } from '../../data/selftest';
import { Lock } from 'lucide-react';
import {
  Banner,
  Button,
  Card,
  Cluster,
  InstallMotif,
  LargeTitle,
  ListGroup,
  ListRow,
  SectionHeader,
  Sheet,
  Stack,
  StepList,
} from '../components';
import { LOCALE } from '../../i18n';

export interface DataDeps {
  getDb: () => Promise<MadarDB>;
  backupStore: BackupDB;
  now: () => number;
  platform: PlatformInfo;
  /** Löst den Download aus. `false`, wenn der Rahmen (z. B. eine Vorschau) das nicht erlaubt. */
  download: (name: string, bytes: Uint8Array) => boolean;
}

export function browserDeps(): DataDeps {
  return {
    getDb,
    backupStore: new BackupDB(),
    now: systemNow,
    platform: detectPlatformFromBrowser(),
    download: (name, bytes) => {
      const url = URL.createObjectURL(
        new Blob([bytes.slice().buffer], { type: 'application/zip' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return true;
    },
  };
}

type Msg = { kind: 'ok' | 'error'; text: string } | null;

export default function DataPanel({ deps }: { deps: DataDeps }) {
  const { t } = useTranslation();
  const [persist, setPersist] = useState<Persistence | null>(null);
  const [estimate, setEstimate] = useState<StorageEstimateLike>({});
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<'export' | 'import' | 'test' | null>(null);
  const [pending, setPending] = useState<Uint8Array | null>(null);
  const [testMsg, setTestMsg] = useState<Msg>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileId = useId();

  const bytes = (n: number) =>
    new Intl.NumberFormat(LOCALE, {
      maximumFractionDigits: n < 1e7 ? 1 : 0,
    }).format(n / 1e6) + ' MB';
  const errText = (e: unknown) =>
    t(e instanceof DataError ? `data.error${e.code}` : 'data.errorUnknown');

  const refresh = useCallback(async () => {
    setEstimate(await getStorageEstimate());
    setBackups(await listBackups(deps.backupStore).catch(() => []));
  }, [deps.backupStore]);

  useEffect(() => {
    let alive = true;
    void requestPersistence().then((p) => alive && setPersist(p));
    void getStorageEstimate().then((e) => alive && setEstimate(e));
    void listBackups(deps.backupStore)
      .catch(() => [] as BackupRow[])
      .then((b) => alive && setBackups(b));
    return () => {
      alive = false;
    };
  }, [deps.backupStore]);

  const doExport = async () => {
    setBusy('export');
    setMsg(null);
    try {
      const db = await deps.getDb();
      const zip = await exportZip(db, deps.now());
      const day = new Date(deps.now()).toISOString().slice(0, 10);
      const saved = deps.download(`madar-export-${day}.zip`, zip);
      setMsg({
        kind: 'ok',
        text: t(saved ? 'data.exported' : 'data.exportBlocked', { size: bytes(zip.byteLength) }),
      });
    } catch (e) {
      setMsg({ kind: 'error', text: errText(e) });
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setMsg(null);
    setPending(new Uint8Array(await file.arrayBuffer()));
    if (fileRef.current) fileRef.current.value = '';
  };

  const doImport = async () => {
    const zip = pending;
    setPending(null);
    if (!zip) return;
    setBusy('import');
    try {
      const db = await deps.getDb();
      const r = await importZip(db, zip, { now: deps.now(), backupStore: deps.backupStore });
      const count = Object.values(r.counts).reduce((a, b) => a + b, 0);
      setMsg({ kind: 'ok', text: t('data.imported', { count, files: r.blobs }) });
      await refresh();
    } catch (e) {
      setMsg({ kind: 'error', text: errText(e) });
    } finally {
      setBusy(null);
    }
  };

  const doTest = async () => {
    setBusy('test');
    setTestMsg(null);
    const r = await runStorageSelfTest(deps.now(), () => performance.now());
    setTestMsg(
      r.ok
        ? { kind: 'ok', text: t('data.testOk', { size: bytes(r.bytes), ms: Math.round(r.ms) }) }
        : { kind: 'error', text: t('data.testFail', { message: r.error ?? '' }) },
    );
    setBusy(null);
  };

  const doPrune = async () => {
    await pruneBackups(deps.backupStore, 1);
    setMsg({ kind: 'ok', text: t('data.pruned') });
    await refresh();
  };

  const check = checkStorage(estimate, 0);
  const persistKey = !persist
    ? null
    : !persist.supported
      ? 'data.unsupported'
      : persist.persisted
        ? 'data.persisted'
        : 'data.notPersisted';
  const reasonKey = {
    migration: 'data.reasonMigration',
    import: 'data.reasonImport',
    manual: 'data.reasonManual',
  } as const;
  const when = (ts: number) =>
    new Intl.DateTimeFormat(LOCALE, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(ts);

  return (
    <div className="data">
      <LargeTitle>{t('data.title')}</LargeTitle>
      <Stack space="section">
        <p className="t-note">{t('data.intro')}</p>

        <Card aria-label={t('data.storageTitle')}>
          <Stack space="tight">
            <h2 className="data__h">
              <Lock size={20} aria-hidden="true" /> {t('data.storageTitle')}
            </h2>
            {persistKey && <p>{t(persistKey)}</p>}
            <p className="t-note">
              {estimate.quota
                ? t('data.usage', {
                    used: bytes(estimate.usage ?? 0),
                    total: bytes(estimate.quota),
                  })
                : t('data.usageUnknown')}
            </p>
            {check.level === 'tight' && <Banner tone="warning">{t('data.tight')}</Banner>}
          </Stack>
        </Card>

        {deps.platform.needsInstallHint && (
          <Stack space="tight">
            <SectionHeader>{t('data.installTitle')}</SectionHeader>
            <Card>
              <Stack space="stack">
                <InstallMotif label={t('data.installAlt')} />
                <p>{t('data.installWhy')}</p>
                <StepList
                  doneLabel={t('jobs.stepDone')}
                  steps={[
                    { title: t('data.install1') },
                    { title: t('data.install2') },
                    { title: t('data.install3') },
                  ]}
                />
                <p className="t-note">{t('data.installSeparate')}</p>
                <p className="t-note">{t('data.installReminder')}</p>
              </Stack>
            </Card>
          </Stack>
        )}

        <Stack space="tight">
          <SectionHeader>{t('data.backupTitle')}</SectionHeader>
          <Stack space="stack">
            <Button size="l" fullWidth onClick={doExport} loading={busy === 'export'}>
              {busy === 'export' ? t('data.exporting') : t('data.export')}
            </Button>
            <Button
              size="l"
              fullWidth
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              loading={busy === 'import'}
              disabled={busy !== null}
            >
              {busy === 'import' ? t('data.importing') : t('data.import')}
            </Button>
            <input
              id={fileId}
              ref={fileRef}
              type="file"
              accept=".zip,application/zip"
              hidden
              aria-label={t('data.import')}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <div aria-live="polite">
              {msg && (
                <Banner tone={msg.kind === 'error' ? 'danger' : 'success'}>{msg.text}</Banner>
              )}
            </div>
          </Stack>
          <SectionHeader>{t('data.backupsTitle')}</SectionHeader>
          {backups.length === 0 ? (
            <p className="t-note">{t('data.backupsNone')}</p>
          ) : (
            <ListGroup label={t('data.backupsTitle')}>
              {backups.slice(0, KEEP_BACKUPS).map((b) => (
                <ListRow
                  key={b.id}
                  title={when(b.createdAt)}
                  subtitle={`${t(reasonKey[b.reason])} · ${bytes(b.bytes)}`}
                />
              ))}
            </ListGroup>
          )}
          {backups.length > 1 && (
            <Cluster>
              <Button variant="quiet" onClick={doPrune}>
                {t('data.prune')}
              </Button>
            </Cluster>
          )}
        </Stack>

        <Stack space="tight">
          <SectionHeader>{t('data.testTitle')}</SectionHeader>
          <p>{t('data.testText')}</p>
          <Button
            variant="secondary"
            size="l"
            fullWidth
            onClick={doTest}
            loading={busy === 'test'}
            disabled={busy !== null}
          >
            {busy === 'test' ? t('data.testRunning') : t('data.testRun')}
          </Button>
          <div aria-live="polite">
            {testMsg && (
              <Banner tone={testMsg.kind === 'error' ? 'danger' : 'success'}>{testMsg.text}</Banner>
            )}
          </div>
        </Stack>
      </Stack>

      <Sheet
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t('data.importConfirmTitle')}
        size="sm"
        footer={
          <Stack space="tight">
            <Button variant="danger" size="l" fullWidth onClick={doImport}>
              {t('data.importConfirm')}
            </Button>
            <Button variant="quiet" size="l" fullWidth onClick={() => setPending(null)}>
              {t('data.cancel')}
            </Button>
          </Stack>
        }
      >
        <p>{t('data.importConfirmText')}</p>
      </Sheet>
    </div>
  );
}
