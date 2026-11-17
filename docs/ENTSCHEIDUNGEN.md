# Entscheidungen

**TypeScript 6 statt 7.** Die Vite-Vorlage brachte TypeScript 7 mit, aber ESLint (typescript-eslint) unterstützt es noch nicht. Wir nutzen 6.0, damit alle Prüfwerkzeuge laufen. Ein Wechsel ist später ein Einzeiler.

**ESLint statt oxlint.** Die Vorlage nutzte oxlint. Der Plan verlangt ESLint, außerdem brauchen wir später eigene Regeln (keine physischen CSS-Eigenschaften, kein `Date.now()`).

**`Date.now()` per Lint-Regel verboten.** So bekommt die Kernlogik die Zeit immer als Parameter und lässt sich exakt testen. Tests, Skripte und `main.tsx` sind ausgenommen.

**Lerntag beginnt um 04:00.** Lernen nach Mitternacht zählt zum Vortag (`src/core/time.ts`), getestet inkl. Sommerzeit.

**Playwright nutzt das vorinstallierte Chromium**, falls vorhanden (nur Cloud-Umgebung); lokal nimmt Playwright sein eigenes.

**Rahmenfarbe dunkler als im Plan.** Die Plan-Rahmenfarbe (#DEDAD1) hat gegenüber dem Hintergrund zu wenig Kontrast für Eingabefelder (WCAG: mind. 3:1). Interaktive Rahmen nutzen `--border` (dunkler), dekorative `--border-soft` (Plan-Wert). Die Akzentfarbe wurde minimal abgedunkelt (#38756D), damit sie 4,5:1 erreicht.

**Meilenstein 1 zuerst:** Von Schritt 1 sind nur die 10–12 wichtigsten Bausteine gebaut, der Rest kommt in Meilenstein 2.

**Einstellungen vorerst in `localStorage`.** Die Datenbank kommt erst in Schritt 3. Die Werte werden dann in die Tabelle `settings` übernommen; bis dahin gehen bei gelöschten Browserdaten nur Sprache, Theme und Textgröße verloren, keine Lerndaten.

**Hoher Kontrast als eigenes Theme** (`data-theme='contrast'`), unabhängig von Hell/Dunkel; Auswahl „System" folgt dem Betriebssystem (Hell/Dunkel).

**Abstände nur über `gap`.** Layouts nutzen `Stack`/`Cluster` und die semantischen Abstands-Tokens statt einzelner Außenabstände. Das verhindert doppelte oder fehlende Lücken (zum Beispiel zwischen gestapelten Feldern und Schaltern) und lässt sich testen.

**Navigation bei großer Schrift:** Die vier Punkte brechen bei großem Text in zwei Zeilen um, statt abgeschnitten zu werden.

**Schnittecke der Karten:** Die Rundung der Ecke oben außen entfällt, damit der 12-px-Schnitt (Hauptkarte 24 px) sichtbar ist. Der Rahmen fehlt an der Schnittkante.

**Optik per Tokens.** Farben, Schatten, Radien, Textstufen und Bewegung stehen zentral in `tokens.css`; Bausteine lesen nur diese Variablen. Hoher Kontrast überschreibt sie mit kräftigen Rahmen, ohne Schatten und ohne Transparenz.

**Umrisse mindestens 3:1.** Wegen der Sehbehinderung des Nutzers haben Felder, Auswahlzeilen und der ausgeschaltete Schalter in Hell und Dunkel ein feines, aber ausreichend dunkles Grau (`--field-border`, `--track-off`); der Kontrasttest prüft sie.

**Keine Schnittecke mehr.** Der Nutzer empfand sie als Darstellungsfehler; sie hatte außerdem im Hohen Kontrast den Rahmen unterbrochen. Karten sind einfach gerundet. (Die „Karte mit abgeschnittener Ecke" aus dem Prompt entfällt damit auf Wunsch des Nutzers; die Motive Kreis und Bogen bleiben.)

**Bewegung reduzieren = 0 ms.** Auf Wunsch des Nutzers werden Übergänge dabei ganz abgeschaltet (der Prompt erlaubt Überblendungen bis 120 ms; 0 ms ist strenger und damit zulässig).

**Zeitstempel als Zahl, FSRS-Karte mit Zahlen.** Alle Zeiten sind Millisekunden (Zahl); die FSRS-Karte speichert Fälligkeit und letzte Wiederholung ebenfalls als Zahl statt `Date`. So ist der JSON-Export verlustfrei; die Umwandlung in ts-fsrs `Card` folgt in Schritt 8. Prüfungsdatum = Text `YYYY-MM-DD` (Lerntag).

**Dateien als ArrayBuffer.** Originaldateien liegen als `ArrayBuffer` in `blobs` (nicht als `Blob`), weil Safari mit Blobs in IndexedDB historisch Probleme hatte.

**Zusätzliche Felder gegenüber dem Prompt:** `snapshots.version` (Projektionslogik-Version, damit alte Zwischenstände bei Änderungen verworfen werden) und `documents.ocrStatus` mit festen Werten.

**Ereignis-ID ist eine fortlaufende Zahl** (`++id`), nicht UUID: sie bestimmt die Reihenfolge und ist die Grenze für Zwischenstände.

**Sicherungen in eigener Datenbank** (`madar-backups`), ohne Dateiinhalte. Grund: Sie müssen eine Migration der Hauptdatenbank überstehen, und Dateien können groß sein. Migrationen dürfen `blobs` nie verändern.

**Import ersetzt, statt zusammenzuführen.** Zusammenführen von Lernverlauf aus zwei Geräten ist ein eigenes, riskantes Thema (Version 2, Synchronisierung). Vor jedem Ersetzen wird der Bestand gesichert, und alles läuft in einer Transaktion.

**Die Sperre für Ereignisse hat eine Hintertür nur für den Import** (`eventsUnlocked`, nur während der Import-Transaktion). Dexie-Hooks erfassen `clear()` nicht, deshalb wird `clear()` zusätzlich abgefangen.

**`Date.now()` nur in `src/data/clock.ts`.** Alles andere bekommt die Zeit als Parameter; die Lint-Regel erlaubt nur diese Datei und Tests.

**Einstellungen:** `localStorage` bleibt die schnelle Quelle (synchron beim Start), die Datenbank-Tabelle `settings` wird mitgeschrieben (landet im Export) und dient als Rückfall, wenn `localStorage` fehlt.

**Testwerkzeug:** Die Test-IndexedDB (`fake-indexeddb`) muss vor Dexie geladen werden (Setup-Datei). Browser-Tests mit Dateien: Playwright setzt Dateien mit Nicht-ASCII-Zeichen im Pfad still nicht, deshalb ASCII-Temp-Pfade.

**Hosting über Cloudflare-Git-Anbindung statt Upload.** Die Cloud-Umgebung erreicht `api.cloudflare.com` nicht (Proxy), ich kann nicht selbst ausliefern. Cloudflare baut deshalb direkt aus GitHub bei jedem Push. Vorteil: keine Schlüssel bei mir, keine Handarbeit pro Version. Production-Branch ist vorerst mein Arbeitszweig, weil es keinen `main` gibt. Später: `main` anlegen (nur mit Freigabe) und die Test-Umgebung (Preview) davon trennen (Schritt 15).

**Hash-Routing (`#today`, `#data`, …).** Funktioniert ohne Server-Regeln, offline und mit dem Service Worker; reicht für Version 1. Beim Seitenwechsel wandert der Fokus auf den Inhalt (nicht beim ersten Laden).

**Service Worker: Aktualisierung nur auf Klick** (`registerType: 'prompt'`), Schriften und Bilder werden mit vorab gespeichert, nicht benötigte Schriftschnitte (kyrillisch, griechisch, vietnamesisch) nicht.

**Datenbank und ZIP-Code werden erst bei Bedarf geladen** (Start-Bundle von 181 auf 112 KB gzip).

**Beispieldaten in der echten App** sind ausdrücklich gekennzeichnet („Beispieldaten … Noch keine echten Lerndaten"), bis der Studienleiter echte Pläne liefert.
