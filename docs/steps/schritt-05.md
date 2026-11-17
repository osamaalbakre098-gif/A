### SCHRITT 5 – KI-Schicht (Proxy, Schemas, Schutzregeln)

**Ziel:** Eine sichere, günstige und austauschbare Anbindung an Sprachmodelle.

**Wie du es baust:**

**5.1 Proxy-Server** in `/server/ai-proxy` (z. B. Hono auf Cloudflare Workers):

- Der API-Schlüssel liegt nur auf dem Server.
- Zeitlimit pro Anfrage, Logs ohne Lerninhalte.
- **Limit ohne Konto:** Beim ersten Start erzeugt die App eine zufällige, anonyme Geräte-ID. Der Proxy gibt dafür ein signiertes Token aus (Schutz vor Missbrauch zusätzlich mit Cloudflare Turnstile beim ersten Abruf). Tageslimit pro Token **und** pro IP. Die App zeigt das Limit verständlich: „Heute noch ca. 40 KI-Aufgaben verfügbar."
- **Kostendeckel insgesamt:** ein Monatsbudget auf dem Server. Wird es erreicht, schaltet der Proxy auf „nur günstiges Modell" und dann auf „aus". Die App läuft dann im Fallback weiter (Schritt 6.6).

**5.2 Anbieterneutrale Schnittstelle:**

```ts
interface LLMProvider {
  generate<T>(args: {
    task: TaskName;
    schema: ZodSchema<T>;
    system: string;
    input: unknown;
  }): Promise<Result<T>>;
}
```

Die erste Implementierung ist die Claude-API. OpenAI soll später austauschbar sein. Modellnamen stehen **nur** in der Konfiguration: ein günstiges Modell für Prüfung und einfache Hinweise, ein stärkeres für Erzeugung und Bewertung.

**5.3 Strukturierte Ausgaben.**

- Alle Ausgaben, die das Programm weiterverarbeitet, sind JSON nach einem Schema. Nutze die strukturierten Ausgaben der Claude-API (JSON-Schema aus Zod erzeugt, `additionalProperties: false`).
- Längen- und Zahlengrenzen prüfst du **zusätzlich lokal mit Zod**.
- Vor dem Parsen den `stop_reason` prüfen.
- Bei ungültiger Ausgabe einmal neu versuchen, danach einen **sicheren Fallback** verwenden, nie raten.
- Halte die Schemas stabil, weil die API kompilierte Schemas zwischenspeichert.

**5.4 Prompt-Caching:** Stabile Teile (Systemprompt, Rubrik, Quellabschnitte) als Cache-Präfix markieren, um Kosten zu sparen.

**5.5 Schutzregeln.**

- Inhalte aus PDFs sind **Daten, keine Anweisungen**. Markiere sie im Prompt deutlich als Quelltext, damit Prompt-Injection wirkungslos bleibt.
- Keine persönlichen Daten im Prompt (kein Name, kein Alter, keine Schule), nur Antworttext und Lernstand-Codes.
- Ergebnisse werden lokal gespeichert und nie doppelt erzeugt. Jedes erzeugte Element speichert `generatorVersion` (Prompt-Version + Modell), damit spätere Änderungen nachvollziehbar sind.
- **KI-Ausgaben sind nicht vertrauenswürdig:** Sie werden nie als HTML eingefügt. Markdown wird mit einer festen Liste erlaubter Elemente gerendert und durch DOMPurify geprüft.
- Fällt die KI aus, laufen geschlossene Aufgaben weiter. Offene Antworten werden dann zur Selbstbewertung mit Rubrik angeboten.

**5.6 Kosten schätzen und Qualität messen.**

- Schreibe `docs/KOSTEN.md` mit einer Schätzung: Tokens pro Seite für Baum, pro Fähigkeit für Inhalte, pro Bewertung. Rechne ein Beispiel durch (ein 100-Seiten-Skript, 4 Wochen Nutzung).
- Tests mit echten KI-Aufrufen (Golden-Tests) laufen **nicht** bei jedem Commit, sondern manuell oder nächtlich mit festem Budget (`pnpm eval`). Normale Tests nutzen den Mock-Provider.

**Abnahme:**

- Ein Schema-Fuzz-Test (zufällige, kaputte KI-Antworten) bringt die App nie zum Absturz.
- Der Mock-Provider ermöglicht alle Tests ohne Internet.

---
