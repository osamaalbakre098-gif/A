import type { ZodError } from 'zod';
import { z } from 'zod';
import { normalizeDe } from '../../content/text';
import { structureText } from '../../content/structure';
import type { MadarDB } from '../../data/db/db';
import { DataError, toDataError } from '../../data/db/errors';
import type { Chunk, Item, Skill } from '../../data/db/schema';
import { appendEvent } from '../../data/events/events';
import { newId } from '../../data/ids';
import { extractJson, zodFehler } from './parse';
import {
  Aufgabe,
  AuswertungErgebnis,
  BaumFaehigkeit,
  Bewertung,
  Erklaerung,
  Fehlvorstellung,
  Huelle,
  SeiteSchema,
  Beispiel,
} from './schemas';
import type { ImportBericht, JobPayload } from './types';

type Write = () => Promise<unknown>;

interface Plan {
  writes: Write[];
  importiert: number;
  uebersprungen: number;
  fehler: string[];
  hinweise: string[];
  /** Nach dem Schreiben anhängen (z. B. Ereignis) */
  nachher?: () => Promise<unknown>;
}
const leer = (): Plan => ({
  writes: [],
  importiert: 0,
  uebersprungen: 0,
  fehler: [],
  hinweise: [],
});

interface Ctx {
  db: MadarDB;
  jobId: string;
  payload: JobPayload;
  value: unknown;
  now: number;
}

export interface ImportErgebnis {
  status: 'ok' | 'teilweise' | 'fehler';
  bericht: ImportBericht;
}

const istQuelle = (idMap: Record<string, string>, a: string) => a.startsWith('A') && a in idMap;
function quellenPruefen(
  quellen: string[],
  idMap: Record<string, string>,
  ort: string,
  fehler: string[],
): string[] | null {
  const unbekannt = quellen.filter((q) => !istQuelle(idMap, q));
  if (unbekannt.length) {
    fehler.push(`${ort}: Quelle „${unbekannt.join('", „')}" gibt es im Auftrag nicht.`);
    return null;
  }
  return quellen.map((q) => idMap[q]!);
}

// ---------------------------------------------------------------- baum
async function planBaum(c: Ctx): Promise<Plan> {
  const plan = leer();
  const h = Huelle.baum.safeParse(c.value);
  if (!h.success) return { ...plan, fehler: zodFehler(h.error) };
  const { db, payload } = c;
  const dokId = payload.bezug?.dokumentId;
  const doc = dokId ? await db.documents.get(dokId) : undefined;
  if (!doc) return { ...plan, fehler: ['Das Dokument zu diesem Auftrag gibt es nicht mehr.'] };
  const topics = await db.topics.where('subjectId').equals(doc.subjectId).toArray();
  const topicSkills = new Map<string, Set<string>>();
  for (const s of await db.skills.toArray())
    topicSkills.set(s.topicId, (topicSkills.get(s.topicId) ?? new Set()).add(normalizeDe(s.title)));
  const planned = new Map<string, string>(topics.map((t) => [normalizeDe(t.title), t.id]));
  let order = topics.reduce((m, t) => Math.max(m, t.order), 0);
  let skillCount = 0;
  let topicCount = 0;

  const kopf = z.object({
    thema: z.string().min(1).max(60),
    faehigkeiten: z.array(z.unknown()).min(1, 'Mindestens eine Fähigkeit ist Pflicht.'),
    voraussetzungen: z.unknown().optional(),
  });
  h.data.themen.forEach((raw, ti) => {
    const ort = `themen[${ti + 1}]`;
    const k = kopf.safeParse(raw);
    if (!k.success) return void plan.fehler.push(...zodFehler(k.error, ort));
    const key = normalizeDe(k.data.thema);
    let topicId = planned.get(key);
    const neuesThema = !topicId;
    if (!topicId) {
      topicId = newId();
      planned.set(key, topicId);
    }
    const bekannt = topicSkills.get(topicId) ?? new Set<string>();
    const neue: { idx: number; id: string }[] = [];
    const writes: Write[] = [];
    const items = k.data.faehigkeiten.slice(0, 8);
    if (k.data.faehigkeiten.length > 8)
      plan.hinweise.push(`${ort}: Mehr als 8 Fähigkeiten, die übrigen wurden ignoriert.`);
    items.forEach((rawSkill, si) => {
      const o2 = `${ort}.faehigkeiten[${si + 1}]`;
      const f = BaumFaehigkeit.safeParse(rawSkill);
      if (!f.success) return void plan.fehler.push(...zodFehler(f.error, o2));
      const refs = quellenPruefen(f.data.quellen, payload.idMap, o2, plan.fehler);
      if (!refs) return;
      const nk = normalizeDe(f.data.titel);
      if (bekannt.has(nk)) {
        plan.uebersprungen++;
        return void plan.hinweise.push(
          `„${f.data.titel}" gibt es schon im Thema „${k.data.thema}" und wurde nicht doppelt angelegt.`,
        );
      }
      bekannt.add(nk);
      topicSkills.set(topicId!, bekannt);
      const id = newId();
      neue.push({ idx: si, id });
      const skill: Skill = {
        id,
        topicId: topicId!,
        title: f.data.titel,
        description: f.data.beschreibung,
        kind: f.data.art,
        bloom: f.data.stufe,
        ...(f.data.afb ? { afb: f.data.afb } : {}),
        order: si + 1,
        origin: 'auto',
        hidden: false,
        examRelevant: f.data.pruefungsrelevant,
        sourceChunkIds: refs,
      };
      writes.push(() => c.db.skills.add(skill));
      skillCount++;
    });
    if (!neue.length && !neuesThema) return;
    if (neuesThema && neue.length) {
      topicCount++;
      const t = {
        id: topicId,
        subjectId: doc.subjectId,
        title: k.data.thema,
        order: ++order,
        origin: 'auto' as const,
        hidden: false,
      };
      plan.writes.push(() => db.topics.add(t));
    }
    plan.writes.push(...writes);
    // Voraussetzungen (höchstens 2 je Fähigkeit, nur zwischen neuen Fähigkeiten, ohne Kreise)
    const vor = z
      .array(z.object({ faehigkeit: z.number().int(), benoetigt: z.number().int() }))
      .safeParse(k.data.voraussetzungen ?? []);
    if (vor.success) {
      const byIdx = new Map(neue.map((n) => [n.idx, n.id]));
      const kanten = new Map<string, Set<string>>();
      const reach = (from: string, to: string, seen = new Set<string>()): boolean => {
        if (from === to) return true;
        if (seen.has(from)) return false;
        seen.add(from);
        return [...(kanten.get(from) ?? [])].some((n) => reach(n, to, seen));
      };
      for (const v of vor.data) {
        const a = byIdx.get(v.faehigkeit);
        const b = byIdx.get(v.benoetigt);
        if (!a || !b || a === b || (kanten.get(a)?.size ?? 0) >= 2 || reach(b, a)) continue;
        kanten.set(a, (kanten.get(a) ?? new Set()).add(b));
        plan.writes.push(() => db.requires.put({ skillId: a, requiresSkillId: b }));
      }
    }
  });
  plan.importiert = skillCount;
  plan.nachher = () =>
    appendEvent(
      db,
      {
        type: 'TreeBuilt',
        payload: { subjectId: doc.subjectId, topics: topicCount, skills: skillCount },
      },
      c.now,
    );
  if (!h.data.themen.length)
    plan.hinweise.push(
      'Claude hat keine Themen geliefert (die Abschnitte enthielten wohl nur Einleitung oder Organisatorisches).',
    );
  return plan;
}

// ---------------------------------------------------------------- vorbereiten
const vorkommen = (hinweis: string, ziel: string) => {
  const t = normalizeDe(ziel).trim();
  return t.length >= 4 && normalizeDe(hinweis).includes(t);
};
/** Lösungs-Leck-Prüfung: Hinweise 1 bis 3 dürfen das Endergebnis nie verraten. */
export function verraetLoesung(a: z.infer<typeof Aufgabe>): number | null {
  const ziele: string[] = [];
  if (a.typ === 'karte' || a.typ === 'kurz')
    ziele.push(a.antwort, ...(a.typ === 'kurz' ? (a.akzeptiert ?? []) : []));
  else if (a.typ === 'luecke') ziele.push(...a.loesungen);
  else if (a.typ === 'mc') ziele.push(...a.optionen.filter((o) => o.richtig).map((o) => o.text));
  const hints = (a.hinweise ?? []).slice(0, 3);
  for (const [i, h] of hints.entries()) {
    if (ziele.some((z) => vorkommen(h, z))) return i + 1;
    if (a.typ === 'rechnung') {
      const w = a.antwort.wert;
      if (Math.abs(w) >= 10 || !Number.isInteger(w)) {
        const forms = [String(w), String(w).replace('.', ',')];
        if (forms.some((f) => new RegExp(`(^|[^\\d.,])${f.replace('.', '\\.')}($|[^\\d])`).test(h)))
          return i + 1;
      }
    }
  }
  return null;
}

async function planVorbereiten(c: Ctx): Promise<Plan> {
  const plan = leer();
  const h = Huelle.vorbereiten.safeParse(c.value);
  if (!h.success) return { ...plan, fehler: zodFehler(h.error) };
  const { db, payload } = c;
  const skillId = payload.idMap['F01'];
  if (h.data.faehigkeit !== 'F01' || !skillId)
    return { ...plan, fehler: [`„faehigkeit" muss „F01" sein (war „${h.data.faehigkeit}").`] };
  const skill = await db.skills.get(skillId);
  if (!skill) return { ...plan, fehler: ['Die Fähigkeit zu diesem Auftrag gibt es nicht mehr.'] };

  // Erklärung (beide Fassungen sind Pflicht)
  const e1 = Erklaerung.safeParse(h.data.erklaerung);
  const e2 = Erklaerung.safeParse(h.data.alternativErklaerung);
  if (!e1.success) plan.fehler.push(...zodFehler(e1.error, 'erklaerung'));
  if (!e2.success) plan.fehler.push(...zodFehler(e2.error, 'alternativErklaerung'));
  if (e1.success && e2.success) {
    const r1 = quellenPruefen(e1.data.quellen, payload.idMap, 'erklaerung', plan.fehler);
    const r2 = quellenPruefen(e2.data.quellen, payload.idMap, 'alternativErklaerung', plan.fehler);
    let beispiel: string | undefined;
    if (h.data.beispiel !== undefined) {
      const b = Beispiel.safeParse(h.data.beispiel);
      if (b.success && quellenPruefen(b.data.quellen, payload.idMap, 'beispiel', plan.fehler))
        beispiel = `${b.data.aufgabe}\n${b.data.schritte.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nErgebnis: ${b.data.ergebnis}`;
      else if (!b.success) plan.fehler.push(...zodFehler(b.error, 'beispiel'));
    } else if (skill.kind === 'verfahren')
      plan.hinweise.push('Zu dieser Fähigkeit (Verfahren) fehlt das gelöste Beispiel.');
    if (r1 && r2) {
      const existing = await db.lessons.get(skillId);
      if (existing && c.payload.paket.teil.index > 1) plan.uebersprungen++;
      else {
        plan.writes.push(() =>
          db.lessons.put({
            skillId,
            explanation: e1.data.text,
            alternativeExplanation: e2.data.text,
            ...(beispiel ? { workedExample: beispiel } : {}),
            sourceRefs: [...new Set([...r1, ...r2])],
            generatorVersion: 'auftrag-v1',
          }),
        );
        plan.importiert++;
      }
    }
  }

  // Aufgaben (einzeln geprüft)
  const bekannt = new Set(
    (await db.items.where('skillId').equals(skillId).toArray()).map((i) => normalizeDe(i.prompt)),
  );
  const neueItems: Item[] = [];
  h.data.aufgaben.forEach((raw, i) => {
    const ort = `aufgaben[${i + 1}]`;
    const p = Aufgabe.safeParse(raw);
    if (!p.success) return void plan.fehler.push(...zodFehler(p.error, ort));
    const a = p.data;
    const refs = quellenPruefen(a.quellen, payload.idMap, ort, plan.fehler);
    if (!refs) return;
    if (a.typ === 'mc' && a.optionen.filter((o) => o.richtig).length !== 1)
      return void plan.fehler.push(`${ort}: Multiple Choice braucht genau eine richtige Option.`);
    if (
      (a.typ === 'offen' || a.typ === 'transfer') &&
      new Set(a.raster.map((r) => r.id)).size !== a.raster.length
    )
      return void plan.fehler.push(`${ort}: Die Raster-IDs müssen eindeutig sein.`);
    const leck = verraetLoesung(a);
    if (leck)
      return void plan.fehler.push(
        `${ort}: Hinweis ${leck} verrät die Lösung. Aufgabe nicht übernommen.`,
      );
    const key = normalizeDe(a.frage);
    if (bekannt.has(key)) {
      plan.uebersprungen++;
      return void plan.hinweise.push(
        `${ort}: Diese Aufgabe gibt es schon und wurde nicht doppelt angelegt.`,
      );
    }
    bekannt.add(key);
    const offen = a.typ === 'offen' || a.typ === 'transfer';
    const maxPunkte = offen ? a.raster.reduce((n, r) => n + r.punkte, 0) : undefined;
    const answer =
      a.typ === 'luecke'
        ? a.loesungen
        : a.typ === 'mc'
          ? { richtig: a.optionen.find((o) => o.richtig)!.text }
          : offen
            ? a.musterloesung
            : a.typ === 'rechnung'
              ? a.antwort
              : a.antwort;
    const rubric = offen
      ? { kernpunkte: a.kernpunkte, raster: a.raster, maxPunkte }
      : a.typ === 'mc'
        ? { optionen: a.optionen.map((o) => ({ text: o.text, begruendung: o.begruendung })) }
        : a.typ === 'rechnung'
          ? { rechenweg: a.rechenweg }
          : a.typ === 'kurz' && a.akzeptiert?.length
            ? { akzeptiert: a.akzeptiert }
            : undefined;
    const hints = a.hinweise?.length ? a.hinweise : undefined;
    neueItems.push({
      id: newId(),
      skillId,
      kind: a.typ === 'karte' || a.typ === 'luecke' ? 'karte' : 'aufgabe',
      subtype: a.typ,
      prompt: a.frage,
      answer,
      ...(rubric ? { rubric } : {}),
      ...(a.typ === 'mc'
        ? { distractors: a.optionen.filter((o) => !o.richtig).map((o) => o.text) }
        : {}),
      ...(hints ? { hints } : {}),
      sourceRefs: refs,
      bloom: a.stufe,
      difficulty: a.schwierigkeit,
      status: 'active',
      createdBy: 'ai',
      generatorVersion: 'auftrag-v1',
    });
  });
  if (neueItems.length) {
    plan.writes.push(() => db.items.bulkAdd(neueItems));
    plan.importiert += neueItems.length;
  }

  // Fehlvorstellungen
  const mis = (h.data.fehlvorstellungen ?? []).flatMap((raw, i) => {
    const m = Fehlvorstellung.safeParse(raw);
    if (!m.success) {
      plan.fehler.push(...zodFehler(m.error, `fehlvorstellungen[${i + 1}]`));
      return [];
    }
    return [
      {
        id: newId(),
        skillId,
        pattern: m.data.muster,
        diagnosticQuestion: m.data.diagnosefrage,
        explanation: m.data.erklaerung,
      },
    ];
  });
  if (mis.length) {
    plan.writes.push(() => db.misconceptions.bulkAdd(mis));
    plan.importiert += mis.length;
  }
  return plan;
}

// ---------------------------------------------------------------- bewerten
async function planBewerten(c: Ctx): Promise<Plan> {
  const plan = leer();
  const h = Huelle.bewerten.safeParse(c.value);
  if (!h.success) return { ...plan, fehler: zodFehler(h.error) };
  const { db, payload } = c;
  const antworten =
    (payload.paket.eingabe.antworten as { id: string; maxPunkte?: number }[] | undefined) ?? [];
  const max = new Map(antworten.map((a) => [a.id, a.maxPunkte ?? 0]));
  const gesehen = new Set<string>();
  for (const [i, raw] of h.data.bewertungen.entries()) {
    const ort = `bewertungen[${i + 1}]`;
    const b = Bewertung.safeParse(raw);
    if (!b.success) {
      plan.fehler.push(...zodFehler(b.error, ort));
      continue;
    }
    const x = b.data;
    const attemptId = payload.idMap[x.id];
    if (!attemptId || !x.id.startsWith('R')) {
      plan.fehler.push(`${ort}: Die Antwort-ID „${x.id}" gibt es im Auftrag nicht.`);
      continue;
    }
    if (gesehen.has(x.id)) {
      plan.fehler.push(`${ort}: Die Antwort „${x.id}" ist doppelt bewertet.`);
      continue;
    }
    gesehen.add(x.id);
    const soll = max.get(x.id) ?? 0;
    if (soll > 0 && x.maxPunkte !== soll) {
      plan.fehler.push(`${ort}: maxPunkte ist ${x.maxPunkte}, laut Raster sind es ${soll}.`);
      continue;
    }
    if (x.punkte > x.maxPunkte) {
      plan.fehler.push(`${ort}: punkte (${x.punkte}) sind höher als maxPunkte (${x.maxPunkte}).`);
      continue;
    }
    if (!(await db.attempts.get(attemptId))) {
      plan.fehler.push(`${ort}: Die Antwort „${x.id}" gibt es nicht mehr.`);
      continue;
    }
    plan.writes.push(() =>
      db.attempts.update(attemptId, {
        aiGrade: {
          punkte: x.punkte,
          maxPunkte: x.maxPunkte,
          urteil: x.urteil,
          begruendung: x.begruendung,
          rueckmeldung: x.rueckmeldung,
          sicherheit: x.sicherheit,
          kernfehler: x.kernfehler ?? null,
        },
        gradingState: 'done',
        correct: x.urteil === 'richtig',
        partial: x.urteil === 'teilweise',
        gradedBy: 'ai',
      }),
    );
    plan.importiert++;
    if (x.sicherheit < 0.7)
      plan.hinweise.push(
        `Bewertung ${x.id}: vorläufig (Sicherheit ${Math.round(x.sicherheit * 100)} %), zählt nur halb.`,
      );
  }
  // Nicht bewertete Antworten bleiben vorgemerkt
  for (const id of max.keys()) {
    const attemptId = payload.idMap[id];
    if (!gesehen.has(id) && attemptId) {
      plan.hinweise.push(`Für „${id}" fehlt die Bewertung; die Antwort bleibt vorgemerkt.`);
      plan.writes.push(() => db.attempts.update(attemptId, { gradingState: 'queued' }));
    }
  }
  return plan;
}

// ---------------------------------------------------------------- quelle_ergaenzen
const KONFIDENZ = { gut: 90, teilweise: 60, schlecht: 30 } as const;
async function planQuelle(c: Ctx): Promise<Plan> {
  const plan = leer();
  const h = Huelle.quelle_ergaenzen.safeParse(c.value);
  if (!h.success) return { ...plan, fehler: zodFehler(h.error) };
  const { db, payload } = c;
  const docId = payload.bezug?.dokumentId;
  const doc = docId ? await db.documents.get(docId) : undefined;
  if (!doc) return { ...plan, fehler: ['Das Dokument zu diesem Auftrag gibt es nicht mehr.'] };
  const soll = (payload.paket.eingabe.dokument as { pruefsumme?: string } | undefined)?.pruefsumme;
  if (h.data.dokument.pruefsumme !== soll || soll !== doc.sha256) {
    return {
      ...plan,
      fehler: [
        'Die Prüfsumme in der Antwort passt nicht zu deinem Dokument. Wurde die richtige Datei hochgeladen?',
      ],
    };
  }
  const erlaubt = new Set((payload.paket.eingabe.seiten as number[] | undefined) ?? []);
  const fertig = new Set<number>();
  const neueChunks: Chunk[] = [];
  const outline: { level: number; title: string; page: number }[] = [];
  const raw = h.data.seiten;
  raw.forEach((r, i) => {
    const ort = `seiten[${i + 1}]`;
    const s = SeiteSchema.safeParse(r);
    if (!s.success) return void plan.fehler.push(...zodFehler(s.error, ort));
    const x = s.data;
    if (!erlaubt.has(x.seite))
      return void plan.fehler.push(`${ort}: Seite ${x.seite} wurde nicht angefordert.`);
    if (fertig.has(x.seite))
      return void plan.fehler.push(`${ort}: Seite ${x.seite} kommt doppelt vor.`);
    fertig.add(x.seite);
    const text = [
      ...(x.ueberschriften ?? []).map((u) => `${'#'.repeat(u.ebene)} ${u.titel}`),
      x.text.trim(),
      ...(x.formeln ?? []).map(
        (f) => `Formel: $${f.latex}$${f.bedeutung ? ` (${f.bedeutung})` : ''}`,
      ),
    ]
      .filter(Boolean)
      .join('\n\n');
    if (!text.trim()) {
      plan.hinweise.push(
        `Seite ${x.seite}: ${x.nurAbbildung ? 'enthält nur Abbildungen' : 'ohne Text'}, es wurde nichts ergänzt.`,
      );
      return;
    }
    const st = structureText(text);
    st.chunks.forEach((ch, k) =>
      neueChunks.push({
        id: `${doc.id}:ai-${String(x.seite).padStart(5, '0')}-${String(k).padStart(3, '0')}`,
        documentId: doc.id,
        page: x.seite - 1,
        text: ch.text,
        origin: 'ai',
        ...(ch.headingPath.length ? { headingPath: ch.headingPath } : {}),
        ocrConfidence: KONFIDENZ[x.lesbarkeit],
      }),
    );
    outline.push(...st.outline.map((o) => ({ ...o, page: x.seite - 1 })));
    plan.importiert++;
    if (x.lesbarkeit !== 'gut')
      plan.hinweise.push(
        `Seite ${x.seite}: Lesbarkeit „${x.lesbarkeit}", der Text kann Fehler enthalten.`,
      );
  });
  const mitText = new Set(neueChunks.map((n) => n.page + 1));
  if (mitText.size) {
    plan.writes.push(async () => {
      for (const p of mitText) {
        const prefix = `${doc.id}:ai-${String(p).padStart(5, '0')}-`;
        await db.chunks
          .where('documentId')
          .equals(doc.id)
          .filter((ch) => ch.id.startsWith(prefix))
          .delete(); // erneutes Lesen ersetzt
      }
      await db.chunks.bulkAdd(neueChunks);
      const rest = (doc.textlessPages ?? []).filter((p) => !mitText.has(p + 1));
      await db.documents.update(doc.id, {
        textlessPages: rest,
        outline: [...(doc.outline ?? []), ...outline],
        ocrStatus: rest.length ? doc.ocrStatus : 'done',
      });
    });
  }
  return plan;
}

// ---------------------------------------------------------------- auswertung
async function planAuswertung(c: Ctx): Promise<Plan> {
  const plan = leer();
  const r = AuswertungErgebnis.safeParse(c.value);
  if (!r.success) return { ...plan, fehler: zodFehler(r.error) };
  // Nur ablegen. Die Auswertung ändert NIE den Plan: sie schreibt ausschließlich in `settings`.
  const eintrag = {
    erstellt: new Date(c.now).toISOString(),
    auftragsId: c.jobId,
    ergebnis: r.data,
  };
  plan.writes.push(
    () => c.db.settings.put({ key: 'auswertung:latest', value: eintrag }),
    () => c.db.settings.put({ key: `auswertung:${c.jobId}`, value: eintrag }),
  );
  plan.importiert = 1;
  return plan;
}

const PLANER: Record<string, (c: Ctx) => Promise<Plan>> = {
  baum: planBaum,
  vorbereiten: planVorbereiten,
  bewerten: planBewerten,
  quelle_ergaenzen: planQuelle,
  auswertung: planAuswertung,
};

/**
 * Prüft eine Antwort (Text oder Datei-Inhalt) und importiert alles Gültige. Fehlerhafte Einträge werden mit deutscher Meldung
 * übersprungen (Teilimport). Alles Gültige wird in EINER Transaktion gespeichert: bei einem Fehler wird nichts gespeichert.
 */
export async function importAntwort(
  db: MadarDB,
  jobId: string,
  text: string,
  now: number,
): Promise<ImportErgebnis> {
  const job = await db.jobs.get(jobId);
  if (!job) throw new DataError('IMPORT_INVALID', 'Dieser Auftrag existiert nicht (mehr).');
  const payload = job.payload as JobPayload;
  const fertig = async (
    plan: Plan | { fehler: string[] },
    status: ImportErgebnis['status'],
  ): Promise<ImportErgebnis> => {
    const p = plan as Plan;
    const bericht: ImportBericht = {
      importiert: p.importiert ?? 0,
      uebersprungen: p.uebersprungen ?? 0,
      fehler: p.fehler,
      hinweise: p.hinweise ?? [],
    };
    await db.jobs.update(jobId, {
      status: status === 'ok' ? 'done' : 'failed',
      attempts: job.attempts + 1,
      payload: { ...payload, antwort: text, bericht } satisfies JobPayload,
    });
    return { status, bericht };
  };

  const parsed = extractJson(text);
  if (!parsed.ok) return fertig({ fehler: [parsed.fehler] }, 'fehler');
  const planer = PLANER[job.type];
  if (!planer)
    return fertig(
      { fehler: [`Der Auftragstyp „${job.type}" kann nicht importiert werden.`] },
      'fehler',
    );

  let plan: Plan;
  try {
    plan = await planer({ db, jobId, payload, value: parsed.value, now });
  } catch (e) {
    return fertig(
      {
        fehler: [
          'Die Antwort konnte nicht geprüft werden: ' +
            (e instanceof Error ? e.message : String(e)),
        ],
      },
      'fehler',
    );
  }
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const w of plan.writes) await w();
      await plan.nachher?.();
      await appendEvent(
        db,
        {
          type: 'AuftragImportiert',
          payload: {
            jobId,
            typ: job.type,
            importiert: plan.importiert,
            fehler: plan.fehler.length,
          },
        },
        now,
      );
    });
  } catch (e) {
    const err = toDataError(e);
    return fertig(
      {
        fehler: [
          err instanceof DataError && err.code === 'STORAGE_FULL'
            ? 'Der Speicher ist voll. Es wurde nichts gespeichert.'
            : 'Beim Speichern ist ein Fehler aufgetreten. Es wurde nichts gespeichert.',
        ],
      },
      'fehler',
    );
  }
  const status: ImportErgebnis['status'] =
    plan.fehler.length === 0 ? 'ok' : plan.importiert > 0 ? 'teilweise' : 'fehler';
  return fertig(plan, status);
}

export type { ZodError };
