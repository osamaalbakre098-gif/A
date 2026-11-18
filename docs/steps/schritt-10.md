> **Änderung durch Schritt-5-Umbau: Hinweise kommen aus der vorbereiteten Hinweisleiter (1–4), nicht live. Offene Antworten: sofortige Selbstbewertung gegen Checkliste/Musterlösung, Bewertung durch Claude später im Stapel („bewerten").**

### SCHRITT 10 – Bewertung und Rückmeldung

**Ziel:** Faire, genaue und hilfreiche Rückmeldung, die nie schmeichelt.

**Wie du es baust:**

1. **Geschlossene Aufgaben** (MC, Zuordnung, Reihenfolge, Lücke mit Toleranzliste, Zahl mit Toleranz und Einheit) werden **deterministisch und ohne KI** bewertet.
2. **Offene Antworten** bewertet die KI anhand von **Rubrik + Referenzantwort + Quelle**:

```ts
const Grading = z.object({
  criteria: z.array(
    z.object({ id: z.string(), result: z.enum(['erfüllt', 'teilweise', 'nicht']) }),
  ),
  verdict: z.enum(['richtig', 'teilweise', 'falsch']),
  coreError: z.string().nullable(),
  negationOrContradiction: z.boolean(),
  confidence: z.number(), // 0..1, lokal per Zod auf Bereich prüfen
  feedback_de: z.string(), // max. 3 Sätze: was stimmt, was fehlt, nächster Schritt
});
```

Prompt (Auszug): _„Bewerte ausschließlich anhand von Rubrik und Referenzantwort. Achte auf Verneinungen, Widersprüche und falsche Zusammenhänge. Ähnliche Wörter mit falschem Sinn sind falsch. Unterscheide Kernfehler von Randfehlern. Gib confidence ehrlich an. Kein Lob ohne Inhalt."_

3. **Unsicherheit:** Bei `confidence < 0,7` oder hohen Denkstufen ist die Bewertung „vorläufig". Der Schüler sieht die Rubrik und kann sich selbst einschätzen. Vorläufige Bewertungen zählen als halber Beleg.
4. **Widerspruch:** Ein Knopf „Ich glaube, meine Antwort stimmt" löst eine Zweitbewertung aus. Sind sich beide uneinig, gilt „teilweise richtig" mit einer Markierung.
5. **Ton der Rückmeldung:** sachlich, freundlich, nie beschämend, ohne Floskeln. Teilrichtiges wird klar als teilrichtig bezeichnet.
6. **Golden-Set:** 100 offene Antworten pro Fach, darunter richtige, teilweise richtige, falsche, solche mit Verneinung und solche mit ähnlichen Wörtern, aber falschem Sinn. Miss die Übereinstimmung (QWK). Liegt sie unter 0,6, wird die Bewertung offener Antworten in der App als „Beta" markiert.

**Abnahme:** Der Golden-Set-Bericht steht in STATUS.md. Im Leck-Test mit 200 Hinweisfällen gibt es 0 verratene Lösungen.

---
