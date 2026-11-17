import type { MadarDB } from '../db/db';
import type { EventRow } from '../db/schema';

/**
 * Eine Projektion berechnet einen Zustand aus den Ereignissen. `apply` muss rein sein
 * (gleiche Eingabe, gleiches Ergebnis, kein Zugriff auf Uhr oder Datenbank).
 */
export interface Projection<S> {
  name: string;
  /** Bei jeder inhaltlichen Änderung der Logik erhöhen: alte Zwischenstände werden dann verworfen und neu berechnet. */
  version: number;
  initial: () => S;
  apply: (state: S, event: EventRow) => S;
}

export interface Loaded<S> {
  state: S;
  lastEventId: number;
  /** Wie viele Ereignisse nach dem Zwischenstand neu angewendet wurden. */
  replayed: number;
  fromSnapshot: boolean;
}

/** Lädt den letzten Zwischenstand und wendet nur die Ereignisse danach an. */
export async function loadProjection<S>(db: MadarDB, p: Projection<S>): Promise<Loaded<S>> {
  const snap = await db.snapshots.get(p.name);
  const usable = snap && snap.version === p.version ? snap : undefined;
  let state = usable ? (usable.data as S) : p.initial();
  let last = usable ? usable.lastEventId : 0;
  let replayed = 0;
  await db.events
    .where('id')
    .above(last)
    .each((e) => {
      state = p.apply(state, e);
      last = e.id;
      replayed++;
    });
  return { state, lastEventId: last, replayed, fromSnapshot: !!usable };
}

export async function saveSnapshot<S>(
  db: MadarDB,
  p: Projection<S>,
  state: S,
  lastEventId: number,
  now: number,
) {
  await db.snapshots.put({
    projection: p.name,
    version: p.version,
    lastEventId,
    data: state,
    createdAt: now,
  });
}

/** Ab so vielen neu angewendeten Ereignissen wird ein neuer Zwischenstand gespeichert. */
export const SNAPSHOT_EVERY = 1000;

export async function loadWithSnapshot<S>(
  db: MadarDB,
  p: Projection<S>,
  now: number,
): Promise<Loaded<S>> {
  const r = await loadProjection(db, p);
  if (r.replayed >= SNAPSHOT_EVERY) await saveSnapshot(db, p, r.state, r.lastEventId, now);
  return r;
}

/** Beispiel-Projektion: zählt Ereignisse je Art. Die echten Projektionen (Beherrschung, FSRS, Baum) folgen in Schritt 6 bis 9. */
export interface Activity {
  total: number;
  byType: Record<string, number>;
  lastTs: number;
}
export const activityProjection: Projection<Activity> = {
  name: 'activity',
  version: 1,
  initial: () => ({ total: 0, byType: {}, lastTs: 0 }),
  apply: (s, e) => ({
    total: s.total + 1,
    byType: { ...s.byType, [e.type]: (s.byType[e.type] ?? 0) + 1 },
    lastTs: Math.max(s.lastTs, e.ts),
  }),
};
