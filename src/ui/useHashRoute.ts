import { useSyncExternalStore } from 'react';

export const ROUTES = ['today', 'subjects', 'progress', 'search', 'settings', 'data'] as const;
export type Route = (typeof ROUTES)[number];

export function parseRoute(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  return (ROUTES as readonly string[]).includes(h) ? (h as Route) : 'today';
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

/** Einfaches Routing über den `#`-Teil der Adresse (funktioniert auch offline und ohne Server-Regeln). */
export function useHashRoute(): Route {
  return parseRoute(
    useSyncExternalStore(
      subscribe,
      () => location.hash,
      () => '',
    ),
  );
}
