import { useMemo, useState } from 'react';
import { BackupDB } from '../../data/db/backups';
import { detectPlatformFromBrowser } from '../../data/db/storage';
import { systemNow } from '../../data/clock';
import { DB_NAME, getDb } from '../../data/instance';
import { Switch } from '../components';
import { AppShell } from './AppShell';
import DataPanel, { browserDeps, type DataDeps } from './DataPanel';
import SettingsPanel from './SettingsPanel';

/** Nur für die Vorschau: „Deine Daten" mit Schalter für den iPhone-Hinweis. Der Rahmen gehört nicht zur App. */
export default function DatenPreview({ sandbox = false }: { sandbox?: boolean }) {
  const [ios, setIos] = useState(false);
  const base = useMemo<DataDeps>(
    () =>
      sandbox
        ? {
            getDb,
            backupStore: new BackupDB(),
            now: systemNow,
            platform: detectPlatformFromBrowser(),
            download: () => false,
          }
        : browserDeps(),
    [sandbox],
  );
  const deps = useMemo<DataDeps>(
    () => ({
      ...base,
      platform: ios ? { isIOS: true, isStandalone: false, needsInstallHint: true } : base.platform,
    }),
    [base, ios],
  );
  return (
    <>
      <div className="preview-bar" lang="de" dir="ltr">
        <p className="preview-bar__note">
          Entwurf „Deine Daten" ({DB_NAME}-Datenbank dieses Geräts). Diese Leiste gehört nicht zur
          App.
        </p>
        <Switch
          label="iPhone im Safari-Tab simulieren (zeigt die Installationsanleitung)"
          checked={ios}
          onChange={setIos}
        />
        <details className="why">
          <summary>Ansicht einstellen (Sprache, Hell/Dunkel, Textgröße)</summary>
          <SettingsPanel />
        </details>
      </div>
      <AppShell active="progress">
        <DataPanel deps={deps} key={String(ios)} />
      </AppShell>
    </>
  );
}
