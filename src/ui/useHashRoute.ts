import { useMemo, useSyncExternalStore } from 'react';

export const ROUTES = [
  'today',
  'subjects',
  'subject',
  'doc',
  'progress',
  'search',
  'settings',
  'data',
  'jobs',
  'practice',
  'tree',
  'session',
] as const;
export type RouteName = (typeof ROUTES)[number];

export interface Route {
  name: RouteName;
  /** z. B. Fach- oder Dokument-ID */
  id?: string;
  params: URLSearchParams;
}

/** `#doc/<id>?page=3&q=Vektor` → { name: 'doc', id, params } */
export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const [name, id] = path.split('/');
  const known = (ROUTES as readonly string[]).includes(name ?? '');
  return {
    name: known ? (name as RouteName) : 'today',
    id: known && id ? decodeURIComponent(id) : undefined,
    params: new URLSearchParams(query),
  };
}

export const hrefTo = (
  name: RouteName,
  id?: string,
  params?: Record<string, string | number | undefined>,
): string => {
  const q = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';
  return `#${name}${id ? `/${encodeURIComponent(id)}` : ''}${q ? `?${q}` : ''}`;
};

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

/** Einfaches Routing über den `#`-Teil der Adresse (funktioniert offline und ohne Server-Regeln). */
export function useHashRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => location.hash,
    () => '',
  );
  return useMemo(() => parseRoute(hash), [hash]);
}
