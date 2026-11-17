import type { TFunction } from 'i18next';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildIndex, search, type Hit, type SearchIndex } from '../../content/search';
import { Stack, TextField } from '../components';
import { useDb } from '../DbProvider';
import { hrefTo } from '../useHashRoute';

function whereText(t: TFunction, w: Hit['where']): string {
  return [
    w.subject,
    w.document,
    w.page !== undefined ? t('search.page', { page: w.page + 1 }) : undefined,
  ]
    .filter(Boolean)
    .join(' › ');
}

export default function SearchPage() {
  const { t } = useTranslation();
  const db = useDb();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const index = useRef<SearchIndex | null>(null);

  // Index frisch bauen, wenn die Seite öffnet (klein genug für Handy-Geräte).
  useEffect(() => {
    let alive = true;
    void buildIndex(db).then((i) => {
      if (alive) index.current = i;
    });
    return () => {
      alive = false;
    };
  }, [db]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (index.current) setHits(search(index.current, q));
    }, 120);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <Stack space="section" className="view">
      <h1>{t('search.title')}</h1>
      <Stack space="stack">
        <TextField
          label={t('search.label')}
          type="search"
          value={q}
          placeholder={t('search.placeholder')}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          autoFocus
        />
        <div aria-live="polite">
          {q.trim() && hits.length === 0 ? <p className="t-note">{t('search.none')}</p> : null}
          {!q.trim() && <p className="t-note">{t('search.hint')}</p>}
        </div>
        <ul className="plain hitlist">
          {hits.map((h) => (
            <li key={h.id}>
              <a
                className="hit"
                href={
                  h.target.route === 'subject'
                    ? hrefTo('subject', h.target.id)
                    : hrefTo('doc', h.target.id, {
                        page: h.target.page !== undefined ? h.target.page + 1 : undefined,
                        q,
                      })
                }
              >
                <span className="chip">
                  {t(`search.kind${h.kind[0]!.toUpperCase()}${h.kind.slice(1)}`)}
                </span>
                <span className="hit__snippet">{h.snippet}</span>
                <span className="t-note">{whereText(t, h.where)}</span>
              </a>
            </li>
          ))}
        </ul>
      </Stack>
    </Stack>
  );
}
