# Madar als Konnektor in Claude einrichten

Ziel: Du schreibst in Claude nur „madar". Claude holt die offenen Aufträge aus der App, arbeitet sie ab und liefert die Ergebnisse zurück. **Ohne** Konnektor geht es trotzdem: In der App unter „Aufträge" kopierst du einen Auftrag, fügst ihn in Claude ein und kopierst die Antwort zurück (oder lädst die Datei hoch). Das ist der Rückfall und funktioniert ohne Server.

## Was auf dem Server liegt (und was nicht)

- Nur Auftragspakete, Ergebnisse und der Lernbericht (Zahlen und Fähigkeitstitel, keine Dateien, keine Namen).
- Nie deine Dateien, nie die ganze Datenbank, keine Notizen.
- Alles wird nach dem Abholen sofort gelöscht, spätestens nach 14 Tagen. Es werden keine Inhalte protokolliert.
- Zugriff nur mit dem geheimen Kopplungscode (mindestens 24 Zeichen). Wer ihn kennt, kann Aufträge lesen und Ergebnisse einspielen. Behandle ihn wie ein Passwort.

## Voraussetzungen (ehrlich)

1. Die Madar-App ist auf Cloudflare Pages ausgeliefert (siehe `docs/BETRIEB.md`).
2. Claude muss **eigene (benutzerdefinierte) Konnektoren** erlauben. Das hängt von deinem Claude-Tarif und vom Gerät ab und ändert sich. Prüfe in Claude unter **Einstellungen → Konnektoren**, ob es dort „Benutzerdefinierten Konnektor hinzufügen" (englisch „Add custom connector") gibt. **Das habe ich nicht selbst getestet** (kein Zugang zu deinem Claude-Konto); der Server selbst ist mit Tests geprüft, aber nicht mit einem echten Claude-Konnektor.
3. Gibt es die Funktion in deinem Tarif nicht: nutze den Rückfall (Kopieren/Einfügen). Nichts anderes ändert sich.

## Einrichtung in 6 Schritten

**A. Speicher für Aufträge anlegen (Cloudflare, einmalig)**

1. Cloudflare-Oberfläche → **Storage & Databases → KV → Create** (Namespace anlegen), Name z. B. `madar-auftraege`.
2. Dein Pages-Projekt → **Settings → Bindings (Funktionen) → KV namespace → Add**: Variablenname **`MADAR_KV`**, Namespace `madar-auftraege`.
3. Gleiche Stelle → **Variables and Secrets → Add** → Typ **Secret**, Name **`PAIRING_CODE`**, Wert: ein langer Zufallscode (mindestens 24 Zeichen). Die App erzeugt dir einen unter **Aufträge → Verbindung → Neuen Code erzeugen**; kopiere ihn dort und füge ihn hier ein.
4. Das Projekt neu bereitstellen (Deployments → letzte → Retry deployment), damit Bindung und Geheimnis gelten.

**B. App koppeln**

5. In der App: **Aufträge → Verbindung**: den **gleichen** Code eintragen, **Code speichern**, dann **Verbindung testen**. Es muss „Verbindung steht." erscheinen.

**C. In Claude hinzufügen**

6. Claude → **Einstellungen → Konnektoren → Benutzerdefinierten Konnektor hinzufügen**: Name `Madar`, Adresse (die App zeigt sie unter „Aufträge → Verbindung" an): `https://<deine-adresse>/mcp/<dein-code>`. Der Code ist Teil der Adresse, weil Claude hier keine eigene Anmeldung mitbringt. Teile die Adresse mit niemandem.

Danach: neues **Claude-Projekt** anlegen, den Text aus `docs/CLAUDE_ARBEITER_ANWEISUNG.md` als Projektanweisung einfügen, das Konnektor-Werkzeug für das Projekt aktivieren. Dann: „madar" schreiben.

## Täglicher Ablauf

1. In der App: **Aufträge** → gewünschten Auftrag erstellen (oder die vorgeschlagenen).
2. In der App: **Mit Claude abgleichen** (lädt Aufträge hoch).
3. In Claude (Projekt): **madar** schreiben (bei „Seiten ohne Text lesen" zusätzlich die Datei hochladen).
4. In der App: **Mit Claude abgleichen** (holt Ergebnisse ab, prüft sie, speichert gültige Teile). Fehlerhaftes zeigt die App in einfachen Worten, mit „Erneut anfordern".

## Wenn etwas nicht geht

| Beobachtung                                          | Ursache / Lösung                                                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| „Verbindung testen" meldet „Nicht autorisiert" (401) | Code in App und Cloudflare-Secret unterschiedlich. Beide neu setzen.                                                          |
| Meldung „Der Auftragsserver ist nicht eingerichtet"  | KV-Bindung `MADAR_KV` fehlt oder nicht neu bereitgestellt.                                                                    |
| Claude findet das Werkzeug nicht                     | Konnektor im Projekt nicht aktiviert, oder Tarif erlaubt keine eigenen Konnektoren: Rückfall nutzen.                          |
| Ergebnis abgelehnt                                   | Die App nennt die Stelle („Aufgabe 3: Hinweis 2 verrät die Lösung"). „Erneut anfordern" erzeugt einen Nachbesserungs-Auftrag. |
| Code verloren/verraten                               | In der App neuen Code erzeugen, in Cloudflare Secret ersetzen, Konnektor-Adresse in Claude aktualisieren.                     |

## Technik (für später)

Endpunkte: `POST /mcp/<code>` (MCP über HTTP, JSON-RPC; Werkzeuge `offene_auftraege`, `auftrag_holen`, `ergebnis_abliefern`, `lernbericht_holen`, `auswertung_ablegen`), `/api/...` mit `Authorization: Bearer <code>` für die App. Anfragen über 600 000 Byte werden abgelehnt. Code: `server/mcp/`, `functions/`.
