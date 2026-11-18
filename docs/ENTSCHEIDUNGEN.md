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

**Suche und Zerlegung ohne KI.** Beides ist reiner Code (Regeln für Zeilen, Überschriften, Abschnitte; MiniSearch). So funktioniert Madar auch offline und ohne KI-Konto (Regel 7).

**Abschnitts-IDs mit laufender Nummer** (`<Dokument>:00042`): die Reihenfolge bleibt in der Datenbank erhalten, ohne neues Feld oder neuen Index. Ein Browser-Test hat gezeigt, dass zufällige IDs die Reihenfolge zerstören.

**Neue optionale Felder, keine Migration:** `chunks.headingPath`, `documents.outline`, `documents.textlessPages`. Optionale Felder in IndexedDB brauchen keine Schemaänderung; alte Daten und Exporte bleiben gültig.

**Nichts Löschendes in Schritt 4.** Fächer und Dokumente lassen sich noch nicht entfernen; das braucht ein „Rückgängig" (Regel 1/5) und kommt mit der Bearbeitungsfunktion.

**pdf.js und der Leser werden erst bei Bedarf geladen** (eigene Pakete), damit das Start-Bundle klein bleibt (112 KB gzip). Der Worker (1,2 MB) liegt im Offline-Cache.

**Chunks nur im Reflow-Modus als Quelle für Text**, im Seitenmodus kommt der Text direkt aus pdf.js (Textlayer). So stimmen Markierung und Auswahl immer mit der sichtbaren Seite überein.

**Tests gegen die gebaute App.** Die Material-Tests laufen gegen `vite preview` (gebauter Worker-Pfad, Service Worker), nicht gegen den Dev-Server; veraltete Vorschau-Server auf Port 4173 können sonst alte Builds ausliefern (`pkill -f vite`).

## Schritt 5 umgebaut: Auftragsaustausch statt Proxy (Nutzerentscheidung)

**Kein API-Schlüssel, kein Proxy, kein Turnstile, keine Budgetlogik.** Madar ist nur für den Nutzer. Claude arbeitet im Chat über Aufträge (Stichwort „madar"). Proxy/Turnstile/D1-Zähler/Budget/mehrere Nutzer: Version 2; die Schnittstelle `LLMProvider` bleibt (Regel 12 bleibt erfüllt: kein Schlüssel im Client).

**Kurz-IDs im Paket** (A001, F01, R01) statt echter IDs: kleinere Pakete, weniger Tippfehler, echte IDs verlassen das Gerät nicht (`jobs.payload.idMap`).

**Deutsche Schlüssel und „Hülle"-Schemas:** Die Antwort wird erst grob (Hülle), dann pro Einheit (Fähigkeit, Aufgabe, Bewertung) geprüft. So geht Teilimport, und ein Fehler macht nicht alles ungültig.

**Alles Gültige in einer Dexie-Transaktion:** nie halb gespeichert. Jobstatus: offen / bei Claude / fertig / fehlgeschlagen (teilweise, wenn etwas importiert wurde). Ereignis `AuftragImportiert`.

**Fortschritt rechnet die App** aus den Fähigkeitsständen, nie Claude (Regel 2). Prozent erst ab 5 Belegen, auf 5 gerundet; davor „Noch zu wenig Daten". KI-Bewertungen mit Sicherheit < 0,7 zählen vorläufig halb; Mehrfachauswahl allein reicht nie für „Sitzt"; Fakten- und Verfahrensfähigkeiten haben getrennte Kriterien.

**Hinweise 1–3 dürfen die Lösung nicht verraten** (Prüfung beim Import, Regel 4); Hinweis 4 darf sie nennen. Hinweise sind erst nach eigenem Versuch oder 45 s freigeschaltet.

**Auswertung ist nur eine Empfehlung** (Regel „KI plant nie"): wird nur in `settings` abgelegt, ändert nie Plan oder Stände.

**Quelle ergänzen:** Text aus Seiten ohne Text wird als Abschnitte mit `origin: 'ai'` gespeichert (gekennzeichnet in der Oberfläche); das Original bleibt unverändert (Regel 6); Prüfsumme muss stimmen.

**MCP minimal selbst gebaut** (JSON-RPC über POST, JSON-Antworten) statt SDK: weniger Abhängigkeiten, läuft in Pages Functions. Kopplungscode in der Adresse (`/mcp/<code>`), weil ein eigener Konnektor hier keine eigene Anmeldung mitbringt; konstanter Zeitvergleich, Code ≥ 24 Zeichen, keine Inhalte im Log, Größenlimit 600 000 Byte, 14 Tage Aufbewahrung, Löschen nach Abholung.

**Rückfall ohne Server bleibt gleichwertig:** Kopieren/Einfügen oder Datei (Regel 7).

**Ehrliche Grenze:** Ob dein Claude-Tarif eigene Konnektoren erlaubt, konnte ich nicht prüfen; der Server ist nur mit eigenen Tests gegen die Protokollform getestet, nicht mit einem echten Claude.

## UI-Vorgabe Phase A (Fundament)

**Ablage:** Die Vorgabe liegt in `docs/UI_VORGABE.md` und ersetzt alle losen Layout-Hinweise, auch die Mängelliste vom iPhone (sie ist in der Vorgabe enthalten).

**Struktur wie vorgegeben:** `src/styles/` (layers, reset, tokens, base, themes/light|dark|contrast), neue Bausteine in `src/ui/<Name>/` mit eigener CSS-Datei und Test. Die alten Bausteine (`src/ui/components/`, `src/index.css`) bleiben, werden aber in Schichten gelegt (`components`, `screens`) und in Phase B Bildschirm für Bildschirm migriert.

**Schichten-Reihenfolge steht inline in `index.html`.** Der Bündler (Vite/Lightning) lässt die Zeile `@layer reset, tokens, …;` aus der CSS-Datei weg; dann gilt die Reihenfolge des ersten Auftretens und die Linkfarbe überschrieb Knopffarben. Eine Inline-Zeile im `<head>` ist unabhängig vom Bündeln. Sicherheit/Verständlichkeit vor Code-Eleganz.

**Schriftgröße-Basis 16 px statt 17 px.** Die Vorgabe rechnet Rollen in `rem` mit 1,0625 rem Fließtext (= 17 px bei 16 px Basis). Dieselben Pixel wie vorher, aber die Skala stimmt jetzt mit der Vorgabe überein; die alten `--fs-*`-Namen zeigen auf die neuen Rollen.

**`--accent` ist jetzt die Hauptfarbe** (vorher `--primary`; das frühere Teal heißt `--accent-alt`). Alte Namen (`--primary`, `--tint`, `--text-muted`, …) bleiben als Quelle der Werte; die neuen Rollen (`--fill`, `--separator`, `--outline`, …) sind Aliase in `tokens.css`.

**Tab-Beschriftung 11 px fest.** Die Vorgabe erlaubt 11 px nur dafür. Bei 150–200 % Textgröße würde eine mitskalierende Beschriftung bei 320 pt umbrechen oder abgeschnitten; fest 11 px mit `nowrap` hält vier Einträge in einer Zeile (Vorgabe 4: „Beschriftungen bleiben").

**Eine Navigations-Komponente für Tab-Leiste und Seitenleiste** (`TabBar`, `SidebarNav` ist dieselbe mit `variant="sidebar"`); die Breite entscheidet per CSS ab 768 px. So gibt es nie zwei Navigationen im Dokument (Screenreader).

**Neue Bibliothek:** `stylelint` (Entwicklungsabhängigkeit), verlangt von der Vorgabe (Hex-Farben, rohe px-Werte für Abstand/Radius/Schatten/Schrift, `left/right`). Begründung: automatische Durchsetzung statt Disziplin. Die zwei Altdateien (`src/index.css`, `src/ui/components/components.css`) stehen bis Phase B auf der Ausnahmeliste in `.stylelintrc.json`; alles Neue wird geprüft.

**Eigene Zurück-Links der Bildschirme sind im Rahmen ausgeblendet** (`.backlink`), weil die Kopfzeile den Zurück-Knopf hat; sie werden in Phase B aus den Bildschirmen entfernt.

**Update-Hinweis als Toast, nie in der Lernsitzung.** In der Lernsitzung (Vollbild) werden Update- und Offline-Hinweise zurückgehalten (`quiet`).

**Sheet schließt ohne Austrittsanimation** (natives `dialog`); Eintritt 320 ms. Der Austritt folgt in Phase D (Politur), wenn nötig.

## UI-Feinschliff (docs/UI_DETAILS.md), Durchgänge 1–3

**Neuere Maße gelten:** Wo UI_DETAILS andere Zahlen nennt als UI_VORGABE (Karteninnenabstand 16 statt 20, zwischen Karten 12, Abschnitte 28 statt 32, Seitenrand 20/24 statt 24/32 ab 768/1024), gilt UI_DETAILS als die spätere, genauere Vorgabe. Umgesetzt über Tokens.

**Großer Titel wird bei großer Textskala auf schmalen Anzeigen begrenzt** (`min(28–36 px, Basis × 1,25 + 6vw)`): Bei 200 % und 320 pt wäre er 72 px groß, und kein deutsches Wort ab 7 Zeichen passte in eine Zeile. Er bleibt deutlich größer als der Fließtext (bei 200 %: 59 px gegenüber 34 px). Zusammen mit festen Trennstellen aus den Übersetzungen („|" → weiches Trennzeichen) gibt es keinen Umbruch mitten im Wort mehr.

**Ziffern überall tabellarisch** (am `body`), statt Klasse für Klasse: so springt keine Zahl, auch nicht in künftigen Bildschirmen; in Fließtext mit Systemschrift kaum sichtbar.

**Arabisch mit lateinischen Ziffern** (`ar-u-nu-latn`) als Standard; eine Einstellung zum Umschalten gibt es noch nicht (offen).

**Glas deckender** (96 % im Hellen, 30 px Unschärfe): Für stark vergrößertes Lesen ist ein ruhiger Hintergrund wichtiger als der Durchscheine-Effekt.

**Einstellungs-Knopf fehlt auf den Einstellungen selbst** (nichts doppelt).

**Visuelle Regression** mit Referenzbildern unter `tests/e2e/ui-details.spec.ts-snapshots/` (Chromium/Linux). Sie gelten nur für diese Umgebung; auf anderen Rechnern müssen sie neu erzeugt werden.

**Phase B – Hauptaktion angeheftet:** Auf Heute, in Lernsitzung und Aufgaben steht die Hauptaktion in `StickyAction` direkt über der Navigation (in der Sitzung ohne Navigation am unteren Rand). So ist sie bei 200 % Schrift ohne Scrollen erreichbar.

**Phase B – Segmente brechen um:** `SegmentedControl` ist eine umbrechende Zeile (Mindestbreite = Text) statt festen Spalten, damit bei 200 % nichts überlappt und kein Wort getrennt wird.

**Phase B – Zeilen ohne Symbol:** `ListRow` ohne Symbol/Punkt reserviert keine leere Symbolspalte.

**Phase B – Sheets 62/80/92 %** der Höhe (vorher 40/70/92), weil kleine Sheets bei 568 pt den Text verdeckten.

**Phase B – Fach ohne Fähigkeitenliste:** Die Liste der Fähigkeiten steht im Könnensbaum; das Fach zeigt Fortschritt, Prüfung, Baum und Dateien.
