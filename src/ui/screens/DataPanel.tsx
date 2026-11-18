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
import { Button, Cluster, ContentCard, Dialog, InstallMotif, Stack } from '../components';

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
  const { t, i18n } = useTranslation();
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
    new Intl.NumberFormat(i18n.language, { maximumFractionDigits: n < 1e7 ? 1 : 0 }).format(
      n / 1e6,
    ) + ' MB';
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
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(ts);

  return (
    <Stack space="section" className="data view">
      <Stack space="tight">
        <a className="backlink" href="#settings">
          ← {t('nav.settings')}
        </a>
        <h1>{t('data.title')}</h1>
        <p className="t-note">{t('data.intro')}</p>
      </Stack>

      {deps.platform.needsInstallHint && (
        <ContentCard title={t('data.installTitle')} accent="amber">
          <InstallMotif label={t('data.installAlt')} />
          <p>{t('data.installWhy')}</p>
          <ol className="steps">
            <li>{t('data.install1')}</li>
            <li>{t('data.install2')}</li>
            <li>{t('data.install3')}</li>
          </ol>
          <p className="t-note">{t('data.installSeparate')}</p>
          <p className="strong">{t('data.installReminder')}</p>
        </ContentCard>
      )}

      <ContentCard title={t('data.storageTitle')} accent="sage">
        {persistKey && <p>{t(persistKey)}</p>}
        <p className="t-note">
          {estimate.quota
            ? t('data.usage', { used: bytes(estimate.usage ?? 0), total: bytes(estimate.quota) })
            : t('data.usageUnknown')}
        </p>
        {check.level === 'tight' && <p role="status">{t('data.tight')}</p>}
      </ContentCard>

      <ContentCard title={t('data.backupTitle')} accent="ocean">
        <Cluster>
          <Button onClick={doExport} loading={busy === 'export'}>
            {busy === 'export' ? t('data.exporting') : t('data.export')}
          </Button>
          <Button
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
        </Cluster>
        <div aria-live="polite">
          {msg && (
            <p
              role={msg.kind === 'error' ? 'alert' : 'status'}
              className={msg.kind === 'error' ? 'msg msg--error' : 'msg msg--ok'}
            >
              {msg.kind === 'error' ? '⚠ ' : '✓ '}
              {msg.text}
            </p>
          )}
        </div>
        <Stack space="tight">
          <h3>{t('data.backupsTitle')}</h3>
          {backups.length === 0 ? (
            <p className="t-note">{t('data.backupsNone')}</p>
          ) : (
            <ul className="plain">
              {backups.slice(0, KEEP_BACKUPS).map((b) => (
                <li key={b.id} className="t-note">
                  {t('data.backupItem', {
                    date: when(b.createdAt),
                    reason: t(reasonKey[b.reason]),
                    size: bytes(b.bytes),
                  })}
                </li>
              ))}
            </ul>
          )}
          {backups.length > 1 && (
            <Cluster>
              <Button variant="quiet" onClick={doPrune}>
                {t('data.prune')}
              </Button>
            </Cluster>
          )}
        </Stack>
      </ContentCard>

      <ContentCard title={t('data.testTitle')} accent="slate">
        <p>{t('data.testText')}</p>
        <Cluster>
          <Button
            variant="secondary"
            onClick={doTest}
            loading={busy === 'test'}
            disabled={busy !== null}
          >
            {busy === 'test' ? t('data.testRunning') : t('data.testRun')}
          </Button>
        </Cluster>
        <div aria-live="polite">
          {testMsg && (
            <p
              role={testMsg.kind === 'error' ? 'alert' : 'status'}
              className={testMsg.kind === 'error' ? 'msg msg--error' : 'msg msg--ok'}
            >
              {testMsg.kind === 'error' ? '⚠ ' : '✓ '}
              {testMsg.text}
            </p>
          )}
        </div>
      </ContentCard>

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t('data.importConfirmTitle')}
      >
        <p>{t('data.importConfirmText')}</p>
        <Cluster>
          <Button variant="danger" onClick={doImport}>
            {t('data.importConfirm')}
          </Button>
          <Button variant="secondary" onClick={() => setPending(null)}>
            {t('data.cancel')}
          </Button>
        </Cluster>
      </Dialog>
    </Stack>
  );
}
