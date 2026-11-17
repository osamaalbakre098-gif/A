# Betrieb: Madar im Internet (Cloudflare Pages)

Kostenlos, ohne Kreditkarte. Madar liegt dann unter einer Adresse wie `https://madar.pages.dev`. Nur mit einer echten HTTPS-Adresse lassen sich Installation auf den Home-Bildschirm, Offline-Betrieb und dauerhafter Speicher auf dem iPhone prüfen.

## Einmalige Einrichtung (ca. 10 Minuten)

Du brauchst: ein GitHub-Konto (hast du, das Projekt liegt dort als `osamaalbakre098-gif/A`) und eine E-Mail-Adresse.

1. **Konto anlegen:** Öffne https://dash.cloudflare.com/sign-up. E-Mail und Passwort eingeben, E-Mail bestätigen. Den kostenlosen Tarif behalten, keine Zahlungsdaten nötig.
2. **Pages-Projekt anlegen:** Links im Menü auf „Workers & Pages" (oder „Compute") tippen, dann „Create application" (Anwendung erstellen). Ganz unten auf der Seite steht ein Hinweis wie „Looking to deploy Pages? Get started": dort tippen. Dann „Import an existing Git repository" (Mit Git verbinden).
3. **GitHub verbinden:** „Connect GitHub" wählen. GitHub fragt, ob Cloudflare Zugriff bekommen soll. „Only select repositories" wählen und das Repository **A** auswählen, dann bestätigen.
4. **Repository wählen:** In Cloudflare das Repository `A` auswählen, „Begin setup".
5. **Einstellungen eintragen:**
   - Project name: `madar` (ist der Name vergeben, nimm `madar-lernen`)
   - Production branch: `claude/madar-lern-app-af1zmg` (es gibt noch keinen Zweig `main`; später ändern wir das)
   - Framework preset: `None` (kein Preset)
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Unter „Environment variables" (Umgebungsvariablen) hinzufügen: Name `NODE_VERSION`, Wert `22`
6. **„Save and Deploy"** tippen. Der erste Bau dauert 2 bis 4 Minuten. Am Ende steht die Adresse da, z. B. `https://madar.pages.dev`.
7. **Adresse an Claude Code schicken.** Ich prüfe, ob alles läuft.

## Neue Version veröffentlichen

Automatisch: Jedes Mal, wenn ich auf den Zweig `claude/madar-lern-app-af1zmg` pushe, baut Cloudflare die App neu und veröffentlicht sie nach 2 bis 4 Minuten. Du musst nichts tun. In Madar steht unter Einstellungen die „Version" (kurze Kennung des Stands), daran siehst du, welcher Stand läuft.

Auf dem iPhone erscheint bei installierter App oben der Hinweis „Neue Version bereit. Jetzt neu laden". Madar lädt nie von selbst neu.

## Zurückrollen, wenn eine Version Probleme macht

Cloudflare → Workers & Pages → Projekt `madar` → „Deployments" → eine frühere Version wählen → „Rollback to this deployment" (Auf diese Version zurücksetzen).

## Auf dem iPhone prüfen (Checkliste)

1. Adresse in **Safari** öffnen. Unten rechts auf „Einstellungen" (Personen-Symbol oben) → „Deine Daten" gehen → **„Test starten"**. Erwartet: „In Ordnung".
2. Auf der Seite „Deine Daten" steht, ob der Speicher als dauerhaft zugesagt ist (im Safari-Tab meist „nicht zugesagt").
3. **Zum Home-Bildschirm:** Teilen-Symbol → „Zum Home-Bildschirm" → „Hinzufügen". Madar vom Home-Bildschirm öffnen.
4. In der installierten App noch einmal „Deine Daten" → „Test starten". Hinweis: Installierte App und Safari-Tab haben **getrennten Speicher**.
5. **Offline:** Beide Male Flugmodus einschalten und Madar öffnen. Die Seite muss erscheinen. Dann „Test starten" im Flugmodus.
6. Ergebnisse (auch Fehler, mit Foto oder Text) an Claude Code melden; sie kommen in `docs/GERAETETEST.md`.

## Kosten und Grenzen

Cloudflare Pages Free: 500 Builds pro Monat, unbegrenzte Aufrufe. Das reicht.

## Noch nicht erledigt (Schritt 15)

Eigene Domain, getrennte Test- und Produktionsumgebung, Impressum und Datenschutzerklärung (juristisch zu erstellen), Schlüssel-Prüfung in der CI, KI-Proxy als Worker.
