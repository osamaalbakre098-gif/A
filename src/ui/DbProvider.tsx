import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { MadarDB } from '../data/db/db';
import { DataError } from '../data/db/errors';
import { getDb } from '../data/instance';
import { EmptyState } from './components';

const Ctx = createContext<MadarDB | null>(null);

/** Öffnet die Datenbank (mit Migration und Sicherung) und zeigt Kinder erst, wenn sie bereit ist. */
export function DbProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [db, setDb] = useState<MadarDB | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let alive = true;
    getDb().then(
      (d) => alive && setDb(d),
      (e) => alive && setError(e),
    );
    return () => {
      alive = false;
    };
  }, []);
  if (error) {
    const code = error instanceof DataError ? error.code : 'Unknown';
    return <EmptyState title={t('data.title')} text={t(`data.error${code}`)} />;
  }
  if (!db) return null;
  return <Ctx.Provider value={db}>{children}</Ctx.Provider>;
}

export function useDb(): MadarDB {
  const db = useContext(Ctx);
  if (!db) throw new Error('useDb außerhalb von DbProvider');
  return db;
}
