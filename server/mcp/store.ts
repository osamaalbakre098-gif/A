import { JobPackageSchema, type JobPackage } from '../../src/ai/jobs/types';

/** Minimale KV-Schnittstelle (Cloudflare Workers KV). In Tests ein Speicher im Arbeitsspeicher. */
export interface KVLike {
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts: { prefix: string; limit?: number }): Promise<{ keys: { name: string }[] }>;
}

export interface Env {
  /** Geheimer Kopplungscode (mindestens 24 Zeichen), als Secret gesetzt */
  PAIRING_CODE?: string;
  MADAR_KV?: KVLike;
}

/** Alles verfällt nach spätestens 14 Tagen von selbst. Daten werden außerdem nach der Abholung gelöscht. */
export const TTL_SECONDS = 14 * 24 * 3600;
export const MAX_AUFTRAEGE = 100;
export const MAX_BODY_BYTES = 600_000;

export interface Ergebnis {
  auftragsId: string;
  typ: string;
  titel: string;
  /** Der Text der Antwort (JSON) */
  ergebnis: string;
  geliefert: string;
  /** true bei „auswertung_ablegen" ohne Auftrag */
  ohneAuftrag?: boolean;
}

interface Gespeichert {
  paket: JobPackage;
  hochgeladen: string;
}

export class Store {
  private readonly kv: KVLike;
  constructor(kv: KVLike) {
    this.kv = kv;
  }

  async putAuftrag(paket: JobPackage, jetzt: string): Promise<void> {
    await this.kv.put(
      `auftrag:${paket.auftragsId}`,
      JSON.stringify({ paket, hochgeladen: jetzt } satisfies Gespeichert),
      { expirationTtl: TTL_SECONDS },
    );
  }
  async getAuftrag(id: string): Promise<JobPackage | null> {
    const g = (await this.kv.get(`auftrag:${id}`, 'json')) as Gespeichert | null;
    const p = g ? JobPackageSchema.safeParse(g.paket) : null;
    return p?.success ? p.data : null;
  }
  async deleteAuftrag(id: string): Promise<void> {
    await this.kv.delete(`auftrag:${id}`);
  }
  async listAuftraege(): Promise<JobPackage[]> {
    const { keys } = await this.kv.list({ prefix: 'auftrag:', limit: MAX_AUFTRAEGE });
    const out: JobPackage[] = [];
    for (const k of keys) {
      const p = await this.getAuftrag(k.name.slice('auftrag:'.length));
      if (p) out.push(p);
    }
    return out.sort((a, b) => (a.erstellt < b.erstellt ? -1 : 1));
  }

  async putErgebnis(e: Ergebnis): Promise<void> {
    await this.kv.put(`ergebnis:${e.auftragsId}`, JSON.stringify(e), {
      expirationTtl: TTL_SECONDS,
    });
  }
  async listErgebnisse(): Promise<Ergebnis[]> {
    const { keys } = await this.kv.list({ prefix: 'ergebnis:', limit: MAX_AUFTRAEGE });
    const out: Ergebnis[] = [];
    for (const k of keys) {
      const e = (await this.kv.get(k.name, 'json')) as Ergebnis | null;
      if (e) out.push(e);
    }
    return out;
  }
  async deleteErgebnis(id: string): Promise<void> {
    await this.kv.delete(`ergebnis:${id}`);
  }

  async putBericht(bericht: unknown): Promise<void> {
    await this.kv.put('bericht:latest', JSON.stringify(bericht), { expirationTtl: 3 * 24 * 3600 });
  }
  async getBericht(): Promise<unknown> {
    return this.kv.get('bericht:latest', 'json');
  }
  async deleteBericht(): Promise<void> {
    await this.kv.delete('bericht:latest');
  }
}
