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
