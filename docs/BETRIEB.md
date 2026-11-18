# Betrieb: Madar im Internet (Cloudflare Workers)

Madar läuft als **ein Cloudflare Worker** (Projektname `a`): Er liefert die App aus (`dist`, mit Rückfall auf `index.html`) und beantwortet zugleich `/mcp/…` und `/api/…` (Auftragsaustausch). Kostenlos, ohne Kreditkarte.

## Wie es gebaut wird

- Konfiguration: `wrangler.jsonc` im Repository (Name `a`, statische Dateien aus `dist`, Single-Page-Fallback, Worker-Code `server/worker.ts`, KV-Bindung `MADAR_KV` mit der ID des Namespace).
- Cloudflare (Workers Builds) baut bei jedem Push auf den Zweig `claude/madar-lern-app-af1zmg`:
  - Build command: `pnpm build`
  - Deploy command: `npx wrangler deploy`
  - Umgebungsvariable `NODE_VERSION` = `22` (Build-Einstellungen)
- Lokal geprüft (ohne Internet): `npx wrangler deploy --dry-run` liest die Konfiguration und bündelt alles; `wrangler dev` lieferte `/` und Unterseiten (200), `/mcp/<Code>` (Werkzeugliste), falschen Code (404) und `/api/status` mit Code (200).

## Geheimnis setzen (nur du)

Cloudflare → Workers & Pages → Projekt `a` → Settings → **Variables and Secrets** → Add → Typ **Secret**, Name `PAIRING_CODE`, Wert: langer Zufallscode (mindestens 24 Zeichen; die App erzeugt dir einen unter „Aufträge → Verbindung → Neuen Code erzeugen"). Danach das Projekt neu bereitstellen (Deployments → Retry). Der Code darf **nicht** im Repository stehen.

## Neue Version veröffentlichen

Automatisch bei jedem Push (2 bis 4 Minuten). In Madar zeigt Einstellungen die „Version". Auf dem iPhone erscheint bei installierter App „Neue Version bereit. Jetzt neu laden"; Madar lädt nie von selbst neu.

## Zurückrollen

Cloudflare → Workers & Pages → Projekt `a` → Deployments → frühere Version → Rollback.

## Auf dem iPhone prüfen (Checkliste)

1. Adresse in **Safari** öffnen. Unten rechts auf „Einstellungen" (Personen-Symbol oben) → „Deine Daten" gehen → **„Test starten"**. Erwartet: „In Ordnung".
2. Auf der Seite „Deine Daten" steht, ob der Speicher als dauerhaft zugesagt ist (im Safari-Tab meist „nicht zugesagt").
3. **Zum Home-Bildschirm:** Teilen-Symbol → „Zum Home-Bildschirm" → „Hinzufügen". Madar vom Home-Bildschirm öffnen.
4. In der installierten App noch einmal „Deine Daten" → „Test starten". Hinweis: Installierte App und Safari-Tab haben **getrennten Speicher**.
5. **Offline:** Beide Male Flugmodus einschalten und Madar öffnen. Die Seite muss erscheinen. Dann „Test starten" im Flugmodus.
6. Ergebnisse (auch Fehler, mit Foto oder Text) an Claude Code melden; sie kommen in `docs/GERAETETEST.md`.

## Kosten und Grenzen

Cloudflare Workers Free: Aufrufe der statischen Dateien sind unbegrenzt; Worker-Aufrufe (nur `/mcp`, `/api`) bis 100 000 pro Tag; KV Free: 1000 Schreibvorgänge pro Tag. Das reicht für eine Person.

## Noch nicht erledigt (Schritt 15)

Eigene Domain, getrennte Test- und Produktionsumgebung, Impressum und Datenschutzerklärung (juristisch zu erstellen), Schlüssel-Prüfung in der CI, KI-Proxy (Version 2).
