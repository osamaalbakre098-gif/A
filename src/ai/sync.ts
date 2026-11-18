import type { MadarDB } from '../data/db/db';
import { newId } from '../data/ids';
import { baueLernbericht } from './jobs/report';
import { importAntwort } from './jobs/import';
import { JOB_FORMAT, JOB_VERSION, type JobPackage, type JobPayload } from './jobs/types';

/** Der Kopplungscode bleibt NUR in diesem Browser (localStorage), nie in der Datenbank und nie im Export. */
const KEY = 'madar.kopplung.v1';

export interface Kopplung {
  code: string;
}

export function ladeKopplung(): Kopplung | null {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as Kopplung) : null;
    return v && typeof v.code === 'string' && v.code.length >= 24 ? v : null;
  } catch {
    return null;
  }
}
export function speicherKopplung(code: string | null): void {
  try {
    if (code) localStorage.setItem(KEY, JSON.stringify({ code }));
    else localStorage.removeItem(KEY);
  } catch {
    /* Speicher nicht verfügbar */
  }
}

/** Zufälliger Kopplungscode (40 Zeichen, nur Buchstaben und Ziffern ohne leicht verwechselbare). */
export function neuerCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

export interface AbgleichBericht {
  hochgeladen: number;
  abgeholt: number;
  importiert: {
    id: string;
    titel: string;
    status: 'ok' | 'teilweise' | 'fehler';
    importiert: number;
    fehler: number;
  }[];
  fehler: string[];
  lernbericht: boolean;
}

export interface AbgleichOptionen {
  baseUrl: string;
  code: string;
  now: number;
  /** Lernbericht (nur Lernstand) für Auswertungen bereitstellen */
  lernbericht?: boolean;
  fetchFn?: typeof fetch;
}

async function anfrage(
  o: AbgleichOptionen,
  method: string,
  pfad: string,
  body?: unknown,
): Promise<Response> {
  const f = o.fetchFn ?? fetch;
  return f(`${o.baseUrl}/api/${pfad}`, {
    method,
    headers: {
      authorization: `Bearer ${o.code}`,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const fehlerText = (status: number) =>
  status === 401
    ? 'Der Kopplungscode stimmt nicht. Prüfe ihn in „Aufträge".'
    : status === 503
      ? 'Der Auftragsserver ist noch nicht eingerichtet (siehe Anleitung).'
      : `Der Auftragsserver antwortet mit Fehler ${status}.`;

/** Test der Verbindung: gibt `null` zurück, wenn alles stimmt, sonst eine deutsche Meldung. */
export async function verbindungPruefen(o: Omit<AbgleichOptionen, 'now'>): Promise<string | null> {
  try {
    const r = await anfrage({ ...o, now: 0 }, 'GET', 'status');
    return r.ok ? null : fehlerText(r.status);
  } catch {
    return 'Keine Verbindung zum Auftragsserver. Bist du online?';
  }
}

/**
 * Gleicht mit dem Auftragsserver ab: lädt offene Aufträge hoch, holt gelieferte Ergebnisse, prüft und importiert sie
 * (dieselbe Validierung wie beim manuellen Einfügen) und löscht sie danach auf dem Server.
 */
export async function abgleichen(db: MadarDB, o: AbgleichOptionen): Promise<AbgleichBericht> {
  const bericht: AbgleichBericht = {
    hochgeladen: 0,
    abgeholt: 0,
    importiert: [],
    fehler: [],
    lernbericht: false,
  };
  try {
    // 1. Offene Aufträge hochladen
    const offen = (await db.jobs.toArray()).filter(
      (j) => j.status === 'pending' && isOurs(j.type) && !(j.payload as JobPayload).hochgeladen,
    );
    for (const j of offen) {
      const pl = j.payload as JobPayload;
      const r = await anfrage(o, 'PUT', `auftraege/${j.id}`, pl.paket);
      if (!r.ok) {
        bericht.fehler.push(`„${pl.paket.titel}": ${fehlerText(r.status)}`);
        if (r.status === 401 || r.status === 503) return bericht;
        continue;
      }
      await db.jobs.update(j.id, {
        status: 'running',
        payload: { ...pl, hochgeladen: true } satisfies JobPayload,
      });
      bericht.hochgeladen++;
    }
    // 2. Lernbericht bereitstellen
    if (o.lernbericht !== false) {
      const { bericht: lb } = await baueLernbericht(db, o.now);
      const r = await anfrage(o, 'PUT', 'lernbericht', lb);
      bericht.lernbericht = r.ok;
    }
    // 3. Ergebnisse abholen, prüfen, importieren, auf dem Server löschen
    const res = await anfrage(o, 'GET', 'ergebnisse');
    if (!res.ok) {
      bericht.fehler.push(fehlerText(res.status));
      return bericht;
    }
    const { ergebnisse } = (await res.json()) as {
      ergebnisse: {
        auftragsId: string;
        typ: string;
        titel: string;
        ergebnis: string;
        ohneAuftrag?: boolean;
      }[];
    };
    for (const e of ergebnisse) {
      bericht.abgeholt++;
      let jobId = e.auftragsId;
      if (e.ohneAuftrag || !(await db.jobs.get(jobId))) {
        // „auswertung_ablegen" ohne Auftrag (oder Auftrag wurde hier gelöscht): als eigener Eintrag ablegen
        if (e.typ !== 'auswertung') {
          await anfrage(o, 'DELETE', `ergebnisse/${encodeURIComponent(e.auftragsId)}`);
          bericht.fehler.push(
            `Ein Ergebnis zu „${e.titel}" gehört zu keinem Auftrag auf diesem Gerät und wurde verworfen.`,
          );
          continue;
        }
        jobId = newId();
        const paket: JobPackage = {
          format: JOB_FORMAT,
          version: JOB_VERSION,
          auftragsId: jobId,
          gruppe: jobId,
          teil: { index: 1, von: 1 },
          typ: 'auswertung',
          titel: 'Auswertung von Claude',
          erstellt: new Date(o.now).toISOString(),
          anweisung: '',
          regeln: [],
          datenhinweis: '',
          antwortSchema: {},
          eingabe: {},
        };
        await db.jobs.add({
          id: jobId,
          type: 'auswertung',
          payload: { paket, idMap: {}, hochgeladen: true } satisfies JobPayload,
          status: 'running',
          attempts: 0,
          createdAt: o.now,
        });
      }
      const titel = ((await db.jobs.get(jobId))!.payload as JobPayload).paket.titel;
      const r = await importAntwort(db, jobId, e.ergebnis, o.now);
      bericht.importiert.push({
        id: jobId,
        titel,
        status: r.status,
        importiert: r.bericht.importiert,
        fehler: r.bericht.fehler.length,
      });
      // Die Antwort liegt jetzt (auch bei Fehlern) lokal im Auftrag: auf dem Server löschen
      await anfrage(o, 'DELETE', `ergebnisse/${encodeURIComponent(e.auftragsId)}`);
    }
  } catch (e) {
    bericht.fehler.push(
      e instanceof TypeError
        ? 'Keine Verbindung zum Auftragsserver. Bist du online?'
        : 'Beim Abgleich ist ein Fehler aufgetreten.',
    );
  }
  return bericht;
}

const isOurs = (t: string) =>
  ['quelle_ergaenzen', 'baum', 'vorbereiten', 'bewerten', 'auswertung'].includes(t);
