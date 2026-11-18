import { learningDayKey } from '../../core/time';
import type { MadarDB } from '../../data/db/db';
import { fileProgress, skillInfos } from '../../data/progress';

export interface Lernbericht {
  erstellt: string;
  hinweis: string;
  faecher: {
    fach: string;
    dateien: {
      name: string;
      fortschrittProzent: number | null;
      faehigkeiten: number;
      sitzt: number;
      belege: number;
    }[];
    faehigkeiten: {
      id: string;
      titel: string;
      thema: string;
      art: string;
      zustand: string;
      versuche: number;
      ohneHilfeRichtig: number;
      hinweiseGenutzt: number;
      fehlerarten: Record<string, number>;
      zuletzt: string | null;
    }[];
  }[];
  letzteTage: { tag: string; versuche: number; richtig: number }[];
  offeneAntworten: { vorgemerkt: number; bewertet: number; schnittSicherheit: number | null };
}

const MAX_FAEHIGKEITEN = 60;

/** Der Lernbericht, den Claude auswertet. Enthält nur Lernstand, keine Namen und keine Dateien. Fähigkeits-IDs sind Kurz-IDs (F01 …). */
export async function baueLernbericht(
  db: MadarDB,
  now: number,
): Promise<{ bericht: Lernbericht; idMap: Record<string, string> }> {
  const [subjects, documents, topics, attempts, items, infos] = await Promise.all([
    db.subjects.toArray(),
    db.documents.toArray(),
    db.topics.toArray(),
    db.attempts.toArray(),
    db.items.toArray(),
    skillInfos(db),
  ]);
  const topicTitle = new Map(topics.map((t) => [t.id, t.title]));
  const topicSubject = new Map(topics.map((t) => [t.id, t.subjectId]));
  const itemSkill = new Map(items.map((i) => [i.id, i.skillId]));
  const idMap: Record<string, string> = {};
  let n = 0;

  const faecher: Lernbericht['faecher'] = [];
  for (const s of subjects.filter((x) => !x.archived)) {
    const dateien: Lernbericht['faecher'][number]['dateien'] = [];
    for (const d of documents.filter((x) => x.subjectId === s.id)) {
      const p = await fileProgress(db, d.id);
      dateien.push({
        name: d.name,
        fortschrittProzent: p.percent,
        faehigkeiten: p.skills,
        sitzt: p.sits,
        belege: p.evidence,
      });
    }
    const rows = [...infos.values()].filter(
      (i) => topicSubject.get(i.skill.topicId) === s.id && !i.skill.hidden,
    );
    // Die aussagekräftigsten zuerst: mit Versuchen, schwächste zuerst
    rows.sort((a, b) => b.attempts - a.attempts);
    const faehigkeiten = rows.slice(0, MAX_FAEHIGKEITEN).map((r) => {
      const id = `F${String(++n).padStart(2, '0')}`;
      idMap[id] = r.skill.id;
      const mine = attempts.filter((a) => itemSkill.get(a.itemId) === r.skill.id);
      const fehler: Record<string, number> = {};
      for (const a of mine) if (a.errorType) fehler[a.errorType] = (fehler[a.errorType] ?? 0) + 1;
      const last = mine.reduce((m, a) => Math.max(m, a.ts), 0);
      return {
        id,
        titel: r.skill.title,
        thema: topicTitle.get(r.skill.topicId) ?? '',
        art: r.skill.kind,
        zustand: r.state,
        versuche: mine.length,
        ohneHilfeRichtig: mine.filter((a) => a.correct && a.hintLevel <= 1).length,
        hinweiseGenutzt: mine.filter((a) => a.hintLevel > 0).length,
        fehlerarten: fehler,
        zuletzt: last ? learningDayKey(new Date(last)) : null,
      };
    });
    faecher.push({ fach: s.name, dateien, faehigkeiten });
  }

  // Letzte 14 Lerntage
  const tage: Record<string, { versuche: number; richtig: number }> = {};
  const cutoff = now - 14 * 86_400_000;
  for (const a of attempts.filter((x) => x.ts >= cutoff)) {
    const k = learningDayKey(new Date(a.ts));
    const t = (tage[k] ??= { versuche: 0, richtig: 0 });
    t.versuche++;
    if (a.correct) t.richtig++;
  }
  const bewertet = attempts.filter((a) => a.aiGrade);
  return {
    bericht: {
      erstellt: new Date(now).toISOString(),
      hinweis: 'Lernbericht von Madar. Nur Lernstand. Wenige Daten bedeuten unsichere Aussagen.',
      faecher,
      letzteTage: Object.entries(tage)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([tag, v]) => ({ tag, ...v })),
      offeneAntworten: {
        vorgemerkt: attempts.filter((a) => a.gradingState === 'queued' || a.gradingState === 'sent')
          .length,
        bewertet: bewertet.length,
        schnittSicherheit: bewertet.length
          ? Math.round(
              (bewertet.reduce((x, a) => x + (a.aiGrade?.sicherheit ?? 0), 0) / bewertet.length) *
                100,
            ) / 100
          : null,
      },
    },
    idMap,
  };
}
