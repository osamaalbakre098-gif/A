# MADAR – UI-Feinschliff („Handwerksqualität“)

> **Gilt nicht mehr (Entscheidung 2026-11-19, siehe `ENTSCHEIDUNGEN.md`):** Madar gibt es nur noch auf Deutsch. Alle Angaben dieser Vorgabe zu Englisch, Arabisch, RTL, Spiegelung von Icons, arabischen Schriftregeln, Sprachumschaltung und Prüfungen in en/ar entfallen. Alles Übrige gilt unverändert.

> Ablage im Repo: `docs/UI_DETAILS.md`
> Gilt **zusätzlich** zu `docs/UI_VORGABE.md`. Die Vorgabe bestimmt _was_ gebaut wird (Struktur, Screens, Komponenten). Dieses Dokument bestimmt, _wie fertig_ es sein muss. Bei Konflikt: Sicherheit > Barrierefreiheit > Klarheit > Ruhe/Optik > Code-Eleganz.
> Gilt ab sofort für alles, auch rückwirkend für Phase A.

---

## 0. Das Ziel in einem Satz

Madar soll sich auf einem iPhone anfühlen wie eine Apple-Eigen-App: ruhig, präzise, ohne einen einzigen Moment, in dem etwas „zusammengebastelt“ wirkt. Der Nutzer ist stark sehbehindert und nutzt Vergrößerung. **Jeder Pixelfehler ist für ihn vergrößert sichtbar.** Details sind hier keine Kosmetik, sondern Funktion.

Maßstab für „fertig“: Wenn man einen beliebigen Screen auf 300 % zoomt, darf nichts unsauber wirken (Kanten, Abstände, Icon-Ausrichtung, Textumbruch).

## 1. Arbeitsweise (verbindlich)

1. Lies `docs/UI_VORGABE.md`, `docs/UI_REVIEW.md`, dieses Dokument.
2. Arbeite in **Durchgängen** (Abschnitt 14). Pro Durchgang: ändern → Screenshots in der Matrix aufnehmen → **wirklich ansehen** (Bilddatei öffnen, nicht nur Test grün) → Befunde in `docs/DETAIL_REVIEW.md` schreiben (Screen, Breite, Befund, Fix, Status).
3. Kein Durchgang gilt als fertig, solange ein offener Befund der Stufe „sichtbar“ existiert.
4. Datenmodell, Studienleiter, Auftragsformat: **nicht anfassen**.
5. Ehrlichkeit: Schreibe nie „behoben“, ohne es per Screenshot oder Test belegt zu haben. Schreibe „nicht geprüft“, wenn es so ist (z. B. echtes WebKit/VoiceOver).
6. Nach jedem Durchgang: Vorschau veröffentlichen, Links nennen, auf „weiter“ warten.

## 2. Raster, Abstände, Ausrichtung

- 4-px-Raster, **keine** Werte außerhalb der Token (`--space-1…12`). Lint-Regel: kein `px` für margin/padding/gap außerhalb der Token-Datei.
- Optische Ausrichtung vor mathematischer: Icons in Buttons und Zeilen sind **vertikal zur Textmitte (x-Höhe)** ausgerichtet, nicht zur Zeilenbox. Pro Icon-Größe ein fester `translateY`-Korrekturwert in den Tokens, falls nötig.
- Linke Textkante: In einer ListGroup beginnen **alle** Titel exakt an derselben x-Position (Icon-Spalte fester Breite 28 px + Abstand). Ohne Icon bleibt die Spalte leer, der Text rutscht nicht.
- Trennlinien in Listen beginnen an der Textkante (nicht am Kartenrand), enden am rechten Rand. Letzte Zeile hat keine Linie.
- Haarlinien: 1 Geräte-Pixel (`1px / devicePixelRatio` über `@media (min-resolution: 2dppx)` → `0.5px`), Farbe aus Token, nie reines Schwarz/Weiß mit Deckkraft-Mischmasch.
- Innenabstände von Karten: gleich oben/unten/seitlich (16), Abstand zwischen Karten 12, zwischen Abschnitten 28. Abschnittsüberschrift hat 8 Abstand zur Gruppe darunter.
- Kein Element darf zwischen zwei Rasterwerten „schweben“: Automatischer Test misst per Playwright die `getBoundingClientRect()` aller Karten/Zeilen und prüft: Höhen sind Vielfache von 4 (außer Textblöcke), seitliche Ränder identisch pro Screen.
- Seitenrand: 16 pt bei ≤ 390, 20 bei 768, 24 ab 1024; Inhalte nie breiter als 640 (Lesespalte) bzw. 960 (Raster) und mittig.

## 3. Typografie im Detail

- Systemschrift (`system-ui` / `-apple-system`), `font-synthesis: none`.
- **Tabellenziffern** (`font-variant-numeric: tabular-nums`) für alles Zählbare: Prozent, Zeiten, Zähler, Datum, Streak-freie Fortschrittszahlen, Timer. Zahlen springen nie seitlich.
- `text-wrap: balance` für Titel und kurze Überschriften, `text-wrap: pretty` für Fließtext (Fallback ohne). **Keine einzelnen Wörter in der letzten Zeile (Witwen)** bei Beschreibungen.
- Silbentrennung: **aus** für Titel, Buttons, Chips, Zahlen; in Fließtext nur `hyphens: manual`. Keine Trennung mitten im Wort bei normalen Breiten. Lange zusammengesetzte deutsche Wörter dürfen per `<wbr>`/`&shy;` an definierten Stellen brechen (Hilfsfunktion `softBreak()` für Fachnamen).
- Zeilenlängen: Fließtext 45–70 Zeichen, auf 320 pt natürlich kürzer; Zeilenhöhe: Titel 1.15, Text 1.45, Lesetext 1.6.
- Gewichte nur 400/500/600/700, nie 300 (schlecht lesbar bei Sehbehinderung). Großer Titel 700, Zeilentitel 500, Hilfstext 400.
- Buchstabenabstand: Große Titel leicht enger (−0.02em), Kleinstgrößen leicht weiter (+0.01em), Versalien-Beschriftungen +0.06em. Als Tokens.
- Hilfstexte nie kleiner als 13 pt und nie unter Kontrast 4.5:1; bei Textskala 200 % bleiben sie lesbar und brechen sauber.
- Arabisch (RTL): eigene Zeilenhöhe (+0.1), keine Kursivschrift, Ziffern: Nutzer-Einstellung (lateinisch als Standard). Gemischte Texte mit `<bdi>` bzw. `dir="auto"` für Namen/Dateinamen, damit Satzzeichen nicht wandern.
- Zahlen/Datum/Zeit immer über `Intl` (Sprache der App), nie manuell formatiert. Plural über i18next-Pluralregeln, nie `"1 Karten"`.
- Kein Text in Bildern/Illustrationen.

## 4. Farbe, Tiefe, Flächen

- Genau **ein** Akzent. Akzentfarbe nur für: primäre Aktion, aktiven Tab, Fokus, Auswahl. Nicht für Dekoration.
- Semantikfarben (Erfolg/Warnung/Fehler) haben immer ein **zweites Signal** (Icon oder Text), nie Farbe allein.
- Elevation: maximal 3 Stufen (0, 1 Karte, 2 Sheet/Overlay). Schatten zweilagig (enger scharfer + weiter weicher), im Dunkelmodus stattdessen hellere Fläche + Haarlinie statt Schatten.
- Gruppierte Hintergründe wie iOS: Seite = `--bg-grouped`, Karte = `--bg-elevated`. Nie Karte auf gleicher Farbe wie Seite ohne Linie.
- Transparenz/Blur (Tab-Leiste, App-Leiste beim Scrollen): `backdrop-filter` nur mit **opaker Rückfalloption** (`@supports not`) und im Hochkontrast-Modus komplett aus. Text darunter muss nachweislich Kontrast halten (Test mit hellstem/dunkelstem Hintergrund).
- Bilder/Illustrationen: einfache Formen, 2-Farben-Logik aus den Tokens, folgen Hell/Dunkel/Hochkontrast automatisch (kein festes Hex im SVG, nur `currentColor`/Variablen).
- Eckenradien konsequent geschachtelt: Radius innen = Radius außen − Abstand (Karte 20, Zeile darin sichtbar nur an den Gruppenenden, Button in Karte 14).
- Hochkontrast: Flächen werden Linien (2 px), nicht Farben; Fokusring 3 px + 2 px Abstand.

## 5. Interaktion und Rückmeldung

Jedes interaktive Element hat **alle** Zustände, sichtbar und getestet: `default`, `pressed`, `focus-visible`, `disabled`, `loading`, `selected`, `error` (wo sinnvoll). Hover nur hinter `@media (hover: hover)`.

- **Pressed**: sofort (kein Warten auf `click`), Fläche dunkelt/hellt leicht ab oder skaliert auf 0.98 in 80–120 ms; Loslassen federt in 160 ms zurück. Auf Listenzeilen: Hintergrundfarbe, nicht Skalierung.
- `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` (kein 300-ms-Warten, kein Doppeltipp-Zoom auf Buttons), `-webkit-touch-callout: none` auf Steuerelementen, `user-select: none` auf Steuerelementen, **aber** `user-select: text` im Lesetext und in Antworten.
- Trefferfläche ≥ 44×44 pt, bei Hauptaktionen 52 pt hoch. Kleine Icons bekommen eine unsichtbare Vergrößerung (`::before` mit negativem Inset), die sich **nicht** mit Nachbarn überlappt (Test).
- Ladezustand: Button zeigt Spinner **an Stelle des Icons**, behält Breite (kein Springen), ist `aria-busy`, Doppeltipp wird ignoriert.
- Keine Aktion ohne Rückmeldung innerhalb von 100 ms (Zustand, Toast, Animation). Aktionen > 400 ms zeigen Fortschritt; > 1 s Skeleton oder Fortschrittsbalken.
- Destruktive Aktionen: nie ein einzelner Tipp. Bestätigung per Sheet mit klarer Folge in einem Satz, Abbrechen ist die vorbelegte Aktion; wo möglich stattdessen **Rückgängig-Toast** (6 s).
- Eingaben: Schriftgröße ≥ 16 px (verhindert iOS-Zoom beim Fokus), `inputmode`, `enterkeyhint`, `autocomplete`, `autocapitalize`, `spellcheck` je Feld korrekt gesetzt. Labels sichtbar (nie nur Platzhalter). Fehlertext direkt unter dem Feld, `aria-describedby`, Fokus springt beim Absenden zum ersten Fehler.
- Tastatur: Sheet und Inhalt reagieren auf `visualViewport`; fokussiertes Feld wird sichtbar zentriert (`scrollIntoView({block:'center'})` mit Reduce-Motion-Beachtung); Primäraktion bleibt erreichbar (sticky über der Tastatur).
- Wischgesten: Sheet lässt sich per Griff **und** Wischen schließen, immer auch per Button (Barrierefreiheit). Gesten haben nie die einzige Funktion.
- Scrollen: `overscroll-behavior: contain` in Sheets, `-webkit-overflow-scrolling` nicht nötig, `scroll-padding-top` = AppBar-Höhe + 8 (Anker springen nicht unter die Leiste), `scroll-margin` für Fokus. Scroll-Position pro Screen wird beim Zurücknavigieren wiederhergestellt.
- Pull-to-refresh nicht nachbauen. Rubber-banding des Systems nicht stören (kein `overflow: hidden` auf `body`, das den Bounce bricht – stattdessen eigener Scroll-Container pro Screen nur wo nötig).

## 6. Bewegung

- Tokens: 120 / 200 / 320 ms; Kurven: `standard (0.2, 0, 0, 1)`, `enter (0, 0, 0, 1)`, `exit (0.4, 0, 1, 1)`, Feder nur für Sheets (CSS `linear()` oder JS-Spring, ohne Bibliothek).
- Es werden **nur `transform` und `opacity`** animiert. Kein Animieren von `height`, `top`, `left`, `box-shadow`. Für ein- und ausklappende Bereiche: `grid-template-rows: 0fr → 1fr` oder Messung + `transform`.
- Screenwechsel: View-Transitions-API mit einfacher Überblendung/Verschiebung (16 px), Fallback ohne Animation. Richtung folgt der Schreibrichtung (RTL gespiegelt).
- Sheets: Hochgleiten 320 ms, Hintergrund dimmt 200 ms, Schließen 200 ms. Der Inhalt darunter bleibt scharf (kein Blur-Zwang).
- Fortschrittsringe/-balken füllen sich einmalig beim ersten Sichtbarwerden, nie bei jedem Re-Render. Zahlen zählen **nicht** hoch (ruhig).
- `prefers-reduced-motion`: alles auf Einblenden ohne Weg, Dauer ≤ 120 ms, **keine** Parallaxe, keine Endlosschleifen. Es gibt keine Endlosanimationen außer dem Spinner (und der wird bei Reduce-Motion zu einem statischen „Lädt…“-Text mit Fortschrittsanzeige).
- Kein Layout-Sprung: Bilder, Karten, Skeletons reservieren ihren Platz (`aspect-ratio`, feste Mindesthöhe). CLS-Ziel 0 im Test.
- 60 fps: Keine Animation löst Layout aus (Prüfung per Performance-Trace für Tab-Wechsel, Sheet, Liste scrollen).

## 7. Icons und Illustrationen

- Eine Familie (Lucide), **ein** Strichstärken-Wert pro Größe (20 px → 1.75, 24 px → 1.75, 28+ → 2), `stroke-linecap/linejoin: round`, `vector-effect: non-scaling-stroke` nicht verwenden (skaliert mit Textgröße).
- Icons skalieren mit der Textskala (em-basiert), mindestens 20 px, maximal 40 px; **Icon-Größe, Zeilenhöhe und Textgröße wachsen gemeinsam**.
- Icon neben Text: Abstand 8, vertikale Mittelung geprüft per Screenshot bei 100 % und 200 % Textskala.
- RTL: Richtungsicons (Pfeile, Chevrons, Zurück, Vor) werden gespiegelt; Uhr, Häkchen, Play, Suche, Mikrofon, Zahlen **nicht**. Liste dazu in `src/ui/icons.ts` als `mirrorInRtl: boolean` je Icon.
- Dekorative Icons `aria-hidden`, funktionale haben Label.
- Eigene Illustrationen (Leerzustände, Erststart): max. 3 Formen + 1 Linie, konsistenter Stil, alle Farben aus Tokens, ≥ 120 pt groß, nie Text darin, und jede ist auf 320 pt **und** im Hochkontrast angesehen.
- App-Icon, Splash und Theme: siehe Abschnitt 11.

## 8. Inhalte, Texte, Leerräume

- Jeder Screen hat **eine** klare Hauptaussage in der Überschrift und höchstens **eine** hervorgehobene Aktion.
- Jeder Leerzustand: Titel (was fehlt), ein Satz (warum/was tun), **eine** Aktion. Keine Entschuldigungen, keine Ausrufezeichen-Flut.
- Fehlertexte: Was ist passiert (ohne Technikwörter), was bleibt sicher (z. B. „Deine Daten sind nicht verloren“), was jetzt tun. Nie Fehlercodes als einzigen Inhalt; Details einklappbar unter „Technische Details“.
- Verbotene Wörter in der UI: „Oops“, „Leider“ (außer wirklich nötig), „Bitte warten Sie“, „Error“, „null“, „undefined“, „NaN“, rohe IDs (z. B. A001), englische Reste in de/ar. Test: Skript durchsucht gerenderten Text aller Screens in allen drei Sprachen nach diesen Mustern und nach `NaN|undefined|null|\[object`.
- Länge: Button ≤ 3 Wörter, Zeilentitel ≤ 1 Zeile bei 100 % (sonst Zeilenumbruch erlaubt, aber nie abgeschnitten ohne Grund), Hilfstexte ≤ 2 Sätze.
- Abgeschnittener Text (`text-overflow`) nur bei Dateinamen/Pfaden und mit Mitten-Kürzung (Endung bleibt sichtbar). Alles andere bricht um.
- Leere Zahlen: „–“ (Gedankenstrich) statt 0, wenn „noch keine Daten“ gemeint ist; „0“ nur, wenn wirklich null.
- Relative Zeit („vor 2 Std.“) nur mit `Intl.RelativeTimeFormat`, absolute Zeit im `title`/Detail.

## 9. Barrierefreiheit im Detail (zusätzlich zur Vorgabe)

- **Fokusreihenfolge = visuelle Reihenfolge** in LTR und RTL. Nach Screenwechsel wandert der Fokus auf die H1 des neuen Screens (`tabindex="-1"`), und ein `aria-live="polite"`-Bereich sagt den Screennamen an.
- Nach dem Schließen eines Sheets geht der Fokus **auf das auslösende Element** zurück. Fokusfalle im Sheet, Escape schließt.
- Überschriftenstruktur: genau eine H1 pro Screen, H2 für Abschnitte, nie Ebenen überspringen. Landmarken: `header`, `nav` (Tab-Leiste mit `aria-label`), `main`, `aside` für Seitenleiste.
- Der aktive Tab hat `aria-current="page"`. Fortschrittsringe/-balken haben `role="progressbar"` mit `aria-valuenow/min/max` und gesprochenem Text („62 Prozent, Mathematik, Kapitel 3“).
- Lernsitzung: Aufgabe, Antwortoptionen, Rückmeldung und „Weiter“ sind in sinnvoller Reihenfolge; Rückmeldung (richtig/falsch + Erklärung) wird per `aria-live` angesagt; Selbstbewertung „Wusste ich / Teilweise / Nicht“ ist als Radiogruppe mit Labels (nicht nur Farben).
- Jede Karte, die als Ganzes tippbar ist, hat **einen** Link/Button mit vollständigem Namen (kein „Mehr“ ohne Kontext), keine verschachtelten interaktiven Elemente.
- Statusänderungen ohne Fokus (Speichern, Fehler, Offline) kommen über eine zentrale `LiveRegion`; Toasts verschwinden **nicht**, solange VoiceOver/Fokus darauf ist, und bleiben ≥ 6 s.
- Text-Skalierung 90–200 %: Layout bricht um, scrollt nie horizontal, Tab-Leiste bleibt eine Zeile (Beschriftungen kürzen/umbrechen nach Regel der Vorgabe), Sheets bekommen innen Scrollbarkeit und der Schließen-Button bleibt sichtbar.
- `forced-colors` (Windows-Hochkontrast) und `prefers-contrast: more`: eigene Regeln, Rahmen sichtbar, Fokus sichtbar.
- Zoom: `<meta viewport>` **ohne** `user-scalable=no` und ohne `maximum-scale`. Pinch-Zoom bleibt erlaubt.
- Keine Zeitlimits ohne Warnung. Keine blinkenden Elemente.

## 10. Robustheit, Grenzfälle, Echtwelt

Für **jeden** Screen existieren Screenshots (Galerie `/dev/screens`) für diese Zustände, und sie sind angesehen:

- leer, lädt, normal, voll (200 Einträge), Fehler, offline, ein sehr langer Titel (80 Zeichen ohne Leerzeichen), ein Titel mit Umlauten/Arabisch/Emoji, 0 / 1 / 2 / 99 / 100 % / 1000 Zähler, fehlende Daten (null-Felder), Datum in Vergangenheit/Zukunft/heute.
- Inhaltsüberlauf in Chips, Badges, Tab-Leiste, Tabellen, Code-/Auftragsblöcken (`CopyBlock`: horizontal scrollbar **innerhalb** der Karte, nie die Seite).
- Doppeltes Tippen, schnelles Hin- und Herwechseln, App im Hintergrund und zurück, Drehung Hoch/Quer (Quer: Inhalt nutzt Safe-Area links/rechts, nichts unter der Notch), Tastatur offen, Sheet offen + Drehung.
- Sehr kleine Höhe (iPhone SE im Querformat 320×568 → 568×320): nichts Wesentliches unerreichbar.
- Jede Seite lässt sich ohne Netz laden (PWA), und der Offline-Hinweis verdeckt nichts.
- Fehler in einem Teilbaum zerstören nie den ganzen Screen: ErrorBoundary pro Screen **und** pro Karte auf „Heute“.

## 11. PWA- und iPhone-Feinheiten

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; `env(safe-area-inset-*)` an **allen** vier Kanten, besonders unten (Tab-Leiste, Sticky-Buttons, Sheets) und seitlich im Querformat.
- `theme-color` getrennt für Hell/Dunkel (`media`-Attribut), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style="default"` bzw. passend, `apple-touch-icon` 180×180 (ohne Transparenz), Icons 192/512 maskable, `manifest` mit `display: standalone`, `lang`, `dir`, `categories: education`.
- Startbildschirm-Splash: Hintergrundfarbe = App-Hintergrund, damit beim Start kein weißer Blitz entsteht (Dunkelmodus beachten: erstes Paint liest `prefers-color-scheme`, **vor** dem JS).
- `color-scheme: light dark` setzen, damit Formularelemente/Scrollbalken/Auswahl stimmen. Eigene `::selection` mit Kontrast.
- Kein Flash falscher Sprache/Richtung/Theme: `lang`, `dir`, `data-theme`, `data-text-scale` werden **vor dem ersten Render** gesetzt (kleines Inline-Skript oder aus Speicher synchron).
- Schriftladen: Systemschrift → keine Webfont-Sprünge. Falls je Webfont: `font-display: swap` + Größenanpassung.
- Kein Hover-Zustand, der auf Touch „kleben bleibt“. Kein `100vh`; stattdessen `100dvh`/`svh` mit Fallback.
- Tastatur-Überlappung, Adressleiste, Statusleiste: im Standalone-Modus **und** im Safari-Tab-Modus prüfen (beides Echt-Gerät, siehe Abschnitt 13).

## 12. Performance als Teil der Optik

- Erstes Paint des Heute-Screens < 1,0 s auf mittlerem Gerät (gedrosselt 4× CPU im Test), Interaktion < 100 ms.
- Listen > 50 Zeilen: `content-visibility: auto` + `contain-intrinsic-size`, oder Virtualisierung nur wenn nötig (Barrierefreiheit zuerst).
- Keine Layout-Thrashing-Muster (Lesen/Schreiben von Maßen in Schleifen), keine ungebremsten Resize-/Scroll-Handler (passiv, `requestAnimationFrame`).
- Bundle-Budget der Vorgabe bleibt; Bilder/Illustrationen als SVG inline oder gesprite, nichts über 20 KB ohne Grund.

## 13. Messbare Prüfungen (automatisiert + manuell)

Ergänze `pnpm test:ui-details` (Playwright, Chromium) mit mindestens:

1. **Zielgrößen**: alle `a, button, [role=button], input, select, summary` ≥ 44×44 CSS-px (Ausnahme dokumentiert).
2. **Eingabegröße**: alle Eingaben `font-size ≥ 16px`.
3. **Kein horizontaler Überlauf** bei 320/375/390/768/1280 und Textskala 100/150/200 %, hell/dunkel/Hochkontrast, de/en/ar.
4. **Ausrichtung**: linke Textkanten in jeder `ListGroup` identisch (±0.5 px); Icon-Mitte zu Text-Mitte ±1 px.
5. **Tab-Leiste**: eine Zeile, vier Einträge, keine Beschriftung umgebrochen bei 320 pt/200 %; unten Safe-Area-Abstand korrekt (simuliert 34 px).
6. **Kontrast**: `pnpm a11y:contrast` plus axe auf jedem Screen in jedem Theme.
7. **Token-Treue**: kein Hex-Wert, kein freies `px` für Abstände/Radien außerhalb der Token-Datei (Stylelint).
8. **Texthygiene**: kein `NaN|undefined|null|[object`, keine rohen IDs, keine Mischsprache in de/ar.
9. **Fokus**: Tab-Durchlauf je Screen: jedes Element erhält sichtbaren Fokus (Screenshot-Prüfung des Rings ≥ 3:1), Reihenfolge stimmt in LTR/RTL.
10. **Bewegung**: Mit `reducedMotion: 'reduce'` laufen keine Übergänge > 120 ms; CLS im Seitenwechsel = 0.
11. **Visuelle Regression**: Referenzbilder für alle Screens × Zustände aus Abschnitt 10; Abweichung > 0,1 % blockiert.
12. **Eckentest** (Pixel): Kartenecken in Hochkontrast sind geschlossen (bleibt bestehen).

Manuell (von Claude Code durchzuführen **und** im Review zu belegen):

- Für jeden Hauptscreen je einen Screenshot bei 320×568 @3x, 390×844 @3x, 768 und 1280, hell + dunkel + Hochkontrast, Textskala 100 und 200 %, de + ar. **Öffne die Bilder und beschreibe in `DETAIL_REVIEW.md` in 1–2 Sätzen pro Screen, was du siehst und was dich stört.** Kein Eintrag „sieht gut aus“ ohne Begründung.
- Ausdrücklich ausweisen, was **nicht** prüfbar war: echtes Safari/WebKit, VoiceOver, Haptik, echte Tastatur. Dafür liefert Claude Code eine kurze **Testliste für den Nutzer** (max. 12 Schritte, je ein Satz) mit, was er auf dem iPhone ansehen soll.

## 14. Durchgänge (Reihenfolge)

1. **Raster & Ausrichtung** (Abschnitt 2): alle Screens, alle Komponenten.
2. **Typografie** (3): Ziffern, Umbrüche, Witwen, RTL-Satz, Textskala.
3. **Farbe & Tiefe** (4): Elevation, Blur-Rückfall, Hochkontrast, Illustrationen.
4. **Zustände & Rückmeldung** (5): pressed/focus/disabled/loading/error für **jede** Komponente (Galerie zeigt alle Zustände nebeneinander).
5. **Bewegung** (6): Übergänge, Sheets, Fortschritt, Reduce-Motion.
6. **Icons & Illustrationen** (7).
7. **Inhalt & Leerzustände** (8) in allen drei Sprachen, einschließlich Arabisch-Lesetest durch Sichtprüfung der Screenshots.
8. **Barrierefreiheit** (9) und **Grenzfälle** (10).
9. **PWA/iPhone** (11) und **Performance** (12).
10. **Abnahme**: alle Prüfungen aus 13 grün, `DETAIL_REVIEW.md` vollständig, Nutzer-Testliste erstellt, Vorschau-Links, auf „weiter“ warten.

Nach jedem Durchgang: kurzer Bericht an den Nutzer in einfachem Deutsch (max. 10 Zeilen): was sich sichtbar verbessert hat, was offen ist, welche Links er ansehen soll.

## 15. Verbote

- Keine neue Funktion, keine neuen Screens ohne Auftrag; hier wird **verfeinert**, nicht erweitert.
- Keine Bibliothek für Animation/Komponenten hinzufügen (Ausnahme nur mit Begründung und Bundle-Nachweis).
- Kein `!important`, keine festen Pixelhöhen für Textcontainer, kein `overflow: hidden` als Reparatur für Überlauf, kein `user-scalable=no`, kein Abschneiden von Text als Lösung.
- Keine Behauptung „barrierefrei“, „Apple-Niveau“ oder „pixelgenau“ im Bericht. Berichte Befunde und Belege, die Bewertung macht der Nutzer.
- Nichts Geschmacksgetriebenes „zur Verschönerung“ ändern, das der Vorgabe widerspricht; bei Zweifel Variante A/B als zwei Vorschau-Links anbieten.

## Anhang – Definition „Detail erledigt“ (Checkliste je Screen)

- [ ] Alle Abstände aus Tokens, linke Kanten fluchten
- [ ] Zahlen tabellarisch, keine Witwen, keine Mitten-Trennung
- [ ] Alle Zustände sichtbar und getestet (default/pressed/focus/disabled/loading/error)
- [ ] 320 pt und 200 % Textskala ohne Überlauf, hell/dunkel/Hochkontrast
- [ ] de und ar angesehen, RTL-Spiegelung korrekt (Icons, Fortschritt, Wischrichtung)
- [ ] Leer-/Fehler-/Offline-/Extremfall-Screenshots vorhanden und angesehen
- [ ] Fokusreihenfolge, Überschriften, Live-Ansagen geprüft
- [ ] Bewegung nur transform/opacity, Reduce-Motion ok
- [ ] Safe-Areas an allen Kanten ok
- [ ] Eintrag in `DETAIL_REVIEW.md` mit Beobachtung + Beleg
