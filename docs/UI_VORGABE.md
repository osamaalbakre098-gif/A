# MADAR – Gesamtvorgabe für Oberfläche und UI-Code (für Claude Code)

Version 1.0 · Sprache: Deutsch · Zweck: Diese Datei ersetzt alle bisherigen losen Layout-Hinweise. Sie beschreibt, wie JEDER Bildschirm von Madar aussieht, sich verhält und im Code aufgebaut ist.

Ablage im Repo: `docs/UI_VORGABE.md`. Lies sie vollständig, bevor du etwas änderst. Bei Konflikt gilt: Sicherheit und Barrierefreiheit (Abschnitt 8) vor Optik; Optik (Abschnitte 2 bis 6) vor Bequemlichkeit im Code.

---

## 0. Auftrag und Arbeitsweise

**Ziel:** Madar soll sich auf dem iPhone anfühlen wie eine gut gemachte Apple-App: ruhig, klar, großzügig, ohne Unruhe. Heute sieht es aus wie eine technische Demo. Das ist nicht akzeptabel.

**Regeln für die Arbeit**

1. Lies zuerst `docs/STATUS.md`, `docs/GRUNDLAGEN.md`, `docs/steps/schritt-01.md`, `schritt-02.md`, `docs/ENTSCHEIDUNGEN.md` und den vorhandenen Code in `src/ui`, `src/styles`. Erweitere Vorhandenes. Schreibe nichts neu, was gut ist.
2. Fasse Logik, Datenmodell, Studienleiter, Auftragsformat und deren Tests NICHT an. Du änderst Aussehen, Struktur der Bildschirme, Komponenten, Texte und UI-Tests.
3. Du arbeitest in Phasen (Abschnitt 11). Nach jeder Phase: Screenshots machen, SIE DIR WIRKLICH ANSEHEN, Befunde in `docs/UI_REVIEW.md` schreiben, Fehler beheben, erst dann melden.
4. Du erfindest keine neuen Funktionen. Fehlt für einen Bildschirm ein Datenfeld, zeige den Zustand ehrlich als „noch nicht verfügbar" und trage es in `docs/OFFENE_FRAGEN.md` ein.
5. Nach jeder Phase veröffentlichst du eine Vorschau (wie bisher als Artefakt) und nennst mir die Links. Ich schaue sie auf meinem Gerät an und gebe Rückmeldung. Mach erst weiter, wenn ich „weiter" sage.
6. Frag mich nur bei Entscheidungen, die ich treffen muss. Alles Technische entscheidest du.

---

## 1. Nutzer, Geräte und harte Randbedingungen

- **Nutzer:** Ossy, ein einziger privater Nutzer, keine Konten. Er hat eine Sehbehinderung und nutzt Vergrößerung und Displayzoom.
- **Hauptgerät:** iPhone, Safari und später als Home-Bildschirm-App. Seine Ansicht ist rund **320 pt breit**. 320 pt ist also der NORMALFALL und nicht der Sonderfall. Entwirf zuerst für 320, dann nach oben.
- **Prüfbreiten:** 320×568, 375×667, 390×844, iPad 768×1024, Desktop 1280×800.
- **Erscheinungsbilder:** Hell, Dunkel, Hoher Kontrast, System. Textgröße 90 bis 200 Prozent (App-Einstellung) plus Systemvergrößerung. „Bewegung reduzieren" (App-Schalter und Systemeinstellung).
- **Sprachen:** Deutsch (Standard), Englisch, Arabisch (rechts-nach-links). Nur logische CSS-Eigenschaften (`margin-inline`, `padding-block`, `inset-inline`), nie `left` oder `right`.
- **Eingabe:** Touch zuerst, Tastatur vollständig, Screenreader (VoiceOver) vollständig.
- **Wichtig für seine Augen:** keine feinen Linien als einzige Trennung, keine blasse Schrift, keine kleinen Tippflächen, kein Flackern, keine schnellen Animationen, großzügige Abstände.

---

## 2. Gestaltungsprinzipien

Leitbild: **Klarheit, Zurückhaltung, Tiefe**.

1. **Eine Hauptsache pro Bildschirm.** Jeder Bildschirm hat genau eine primäre Aktion, die sofort erkennbar ist (gefüllter Button).
2. **Inhalt zuerst.** Rahmen und Schmuck treten zurück. Karten und Listen tragen den Inhalt, nicht Linien.
3. **Hierarchie durch Größe, Gewicht und Abstand**, nicht durch Rahmen und Farbe.
4. **Gruppierte Listen im iOS-Stil** (inset grouped): Zeilen mit Symbol, Titel, Zusatztext und Pfeil auf einer abgerundeten Fläche, getrennt durch Trennlinien.
5. **Große Titel** (Large Title), die beim Scrollen in eine kleine Kopfzeile übergehen.
6. **Sheets von unten** für Auswahl und Nebenaufgaben statt neuer Seiten. Seiten nur für eigenständige Ziele.
7. **Ruhige Bewegung:** kurze, weiche Übergänge, nie Aufmerksamkeit erzwingend. Keine Konfetti, keine Streaks, keine Punkte-Anzeigen (siehe Grundregeln).
8. **Formensprache „Klarsicht":** Kreis (Fokus, Zeit, Fortschritt) und Bogen. Die Schnittecke ist entfernt und kommt nicht zurück. Alle Karten haben gleichmäßige Rundung.
9. **Kein Fachjargon im Bildschirmtext.** Siehe Abschnitt 7.
10. **Keine Nachahmung geschützter Apple-Elemente:** Systemschrift verwenden ist erlaubt, SF-Symbole und Apple-Logos nicht. Icons nur aus der gewählten Icon-Familie.

Nicht tun: Rahmen um alles, Schatten überall, Farbflächen ohne Bedeutung, mehr als eine gefüllte Hauptaktion pro Bildschirm, Texte in Großbuchstaben, Zierillustrationen ohne Aussage, Trennstriche mitten im Wort, Textlinks in Browser-Standardfarbe.

---

## 3. Design-Tokens (verbindlich, einzige Quelle)

Alle Werte kommen aus `src/styles/tokens.css` als CSS-Variablen. **Kein Hex-Wert, kein px-Wert für Abstand, Radius, Schatten oder Schrift außerhalb dieser Datei.** Eine Lint-Regel (Stylelint) prüft das.

### 3.1 Schrift

- **Schriftstapel:** `system-ui, -apple-system, "Inter", "Segoe UI", sans-serif` und für Arabisch `system-ui, "IBM Plex Sans Arabic", "Noto Sans Arabic", sans-serif`. Auf dem iPhone ergibt das die native Systemschrift, das ist gewollt. Die lokal eingebundene Inter-Datei ist nur der Rückfall.
- **Skala (Basis 100 Prozent), alle in `rem`, multipliziert mit `--text-scale` der App-Einstellung:**

| Rolle                    | Größe                        | Gewicht | Zeilenhöhe |
| ------------------------ | ---------------------------- | ------- | ---------- |
| Titel groß (Large Title) | clamp(1.75rem, 8vw, 2.25rem) | 700     | 1.15       |
| Titel                    | 1.5rem                       | 700     | 1.2        |
| Überschrift              | 1.25rem                      | 600     | 1.3        |
| Zeilentitel              | 1.0625rem                    | 600     | 1.35       |
| Fließtext                | 1.0625rem                    | 400     | 1.55       |
| Zusatztext               | 0.9375rem                    | 400     | 1.5        |
| Hinweis/Beschriftung     | 0.8125rem                    | 500     | 1.4        |
| Tab-Beschriftung         | 0.6875rem                    | 600     | 1.2        |

- Überschriften: `hyphens: none; text-wrap: balance;`. Fließtext: `text-wrap: pretty`, Silbentrennung nur in langem Fließtext, nie in Titeln, Buttons oder Zeilen.
- Zahlen in Fortschritt und Zeit: `font-variant-numeric: tabular-nums`.
- Mindestgröße für sichtbaren Text: 11 px nur für Tab-Beschriftungen, sonst 13 px.

### 3.2 Abstand (4-px-Raster)

`--space-1: 4px` · `2: 8` · `3: 12` · `4: 16` · `5: 20` · `6: 24` · `8: 32` · `10: 40` · `14: 56` · `18: 72`.

- Seitenrand: 16 px bis 767 px Breite, 24 px ab 768 px, 32 px ab 1024 px.
- Abstand zwischen Abschnitten: 32 px (`--space-8`). Abstand zwischen Karten: 16 px. Innenabstand Karte: 20 px (Hauptkarte 24 px).
- Abstände entstehen NUR durch die Layout-Bausteine `Stack`, `Cluster`, `Grid`, `Screen` (Abschnitt 9), nicht durch einzelne Außenabstände.
- Mindest-Tippfläche: 44×44 px, Haupt-Buttons 52 px hoch. Mindestabstand zwischen zwei Tippflächen 8 px.

### 3.3 Radien und Schatten

- Radien: Feld 12 · Button 14 · Karte 20 · Hauptkarte 28 · Sheet oben 28 · Pille/Chip 999 · Icon-Button rund.
- Schatten (nur Hell und Dunkel, im Hohen Kontrast keine): `--shadow-1` (Karte, sehr weich), `--shadow-2` (angehobene Karte, Sheet), `--shadow-3` (Dialog). Kein Schatten unter Listenzeilen.

### 3.4 Farben (Rollen statt Werte)

Rollen, die in allen drei Themes definiert sein müssen: `--bg`, `--bg-grouped` (Hintergrund hinter gruppierten Listen), `--surface`, `--surface-raised`, `--fill` (getönte Fläche für sekundäre Buttons), `--fill-pressed`, `--separator`, `--outline` (interaktive Umrisse, mindestens 3:1), `--text`, `--text-secondary`, `--text-on-accent`, `--accent`, `--accent-tint`, `--success`, `--warning`, `--danger` jeweils mit `-tint`, `--focus`, die acht Fachfarben als Punkt (nie als Seitenstreifen oder Fläche), `--arc-active`, `--arc-inactive`.

- Vorhandene Werte aus der Galerie bleiben, wenn sie die Kontrastwerte erfüllen. Neue Rollen ergänzt du dort.
- **Mindestkontraste:** Text 4,5:1 (Hoher Kontrast 7:1), große Schrift und UI-Bauteile 3:1. Das Skript `pnpm a11y:contrast` prüft alle Paare einschließlich der Umrisse. Es bricht ab, wenn eines unterschritten wird.
- **Links:** Farben für link, visited, hover, active aus den Tokens, nie Browser-Standard.
- **Hoher Kontrast:** deckende Flächen, 2 px Rahmen um Karten und Felder, keine Schatten, keine Transparenz, keine Unschärfe.

### 3.5 Bewegung

- Dauer: 120 ms (Zustand), 200 ms (Element), 320 ms (Bildschirm/Sheet). Kurve: `cubic-bezier(0.2, 0, 0, 1)` rein, `cubic-bezier(0.4, 0, 1, 1)` raus.
- Erlaubt: Einblenden, Verschieben um höchstens 16 px, Skalieren 0,98 bis 1 bei Tippen, Bogen füllt sich. Nicht erlaubt: Springen, Wackeln, Dauerschleifen.
- Bei „Bewegung reduzieren" sind alle Übergänge 0 ms und nur Überblendungen ohne Verschieben bleiben (dann auch 0 ms).

### 3.6 Schichten

`--z-nav: 10` · `--z-appbar: 20` · `--z-sheet: 40` · `--z-dialog: 50` · `--z-toast: 60`.

---

## 4. App-Rahmen (Shell)

**Aufbau von oben nach unten**

1. **Safe Area oben:** Nichts darf unter Statusleiste oder Dynamic Island liegen. Der Rahmen nutzt `padding-top: env(safe-area-inset-top)`. Die Seite setzt `viewport-fit=cover`, ein Test prüft, dass keine bedienbare Fläche in diesen Bereich ragt.
2. **Kopfzeile (AppBar):** links Zurück-Pfeil (wenn nicht Hauptebene) oder leer, mitte kleiner Titel (erscheint erst beim Scrollen), rechts runder Einstellungs-Button (Zahnrad, 44 px). Auf der Hauptebene steht darunter der große Titel.
3. **Inhalt:** `Screen`-Baustein mit Seitenrand, maximal 640 px breit zum Lesen (960 px für Raster), mittig ab 768 px.
4. **Untere Navigation (TabBar)** bis 767 px Breite, **Seitenleiste** ab 768 px.

**Navigation (vier Ziele, immer sichtbar außer in der Lernsitzung und im Leser-Vollbild)**

| Ziel        | Symbol      | Inhalt                                             |
| ----------- | ----------- | -------------------------------------------------- |
| Heute       | Haus        | Tagesplan, Claude-Aufträge, Prüfungs-Hinweis       |
| Fächer      | Bücherregal | Fächerliste, Fach, Dateien, Könnensbaum, Leser     |
| Fortschritt | Spross      | Fortschritt je Fach/Datei, Auswertungen von Claude |
| Suche       | Lupe        | Suche über alles                                   |

- Einstellungen, „Deine Daten" und „Aufträge" erreicht man über den Einstellungs-Button und zusätzlich über Karten auf „Heute", wenn etwas ansteht.
- **TabBar-Regeln:** immer EINE Zeile, vier gleich breite Felder, Symbol 24 px, Beschriftung 11 px und nie umbrechend (`white-space: nowrap`, `text-overflow: ellipsis`). Aktiver Punkt: gefülltes Symbol in einer getönten Pille und fette Beschriftung. Hintergrund leicht transparent mit Unschärfe (im Hohen Kontrast deckend). Höhe 56 px plus `env(safe-area-inset-bottom)`. Bei großer Textskalierung (über 150 Prozent) bleiben die Beschriftungen, die Symbole werden nicht größer.
- **Seitenleiste (ab 768 px):** 280 px breit, gleiche Ziele, Beschriftung neben dem Symbol.
- **Zurück-Verhalten:** Hauptebenen merken ihren Scrollstand. Zurück führt zum vorherigen Bildschirm. Sheets schließen per Ziehen nach unten, Schließen-Knopf und Escape.

**Systemweite Bausteine**

- **Offline-Banner:** ruhig, oben unter der AppBar: „Du bist offline. Alles Gelernte bleibt gespeichert." Kein Alarm.
- **Update-Hinweis:** „Neue Version bereit" als Toast unten über der TabBar mit Knopf „Jetzt laden". Aktiviert sich nie mitten in einer Lernsitzung.
- **Fehlergrenze:** Zeigt Titel „Das hat nicht geklappt", kurze Erklärung, Knopf „Neu laden" und „Fehler kopieren". Nie weiße Seite.
- **Toast:** Unten, 4 Sekunden, mit optionalem „Rückgängig". Wird für Screenreader angekündigt (`role="status"`).
- **Ladezustände:** Skelette in Form der späteren Inhalte statt Drehkreis. Erst nach 300 ms sichtbar, damit nichts flackert.

---

## 5. Komponentenbibliothek (Ziel)

Ort: `src/ui/<Name>/`. Jede Komponente: Datei, CSS-Modul oder `@layer components`-Block, Test, Eintrag in der Galerie mit allen Zuständen. Vorhandene Komponenten werden angepasst, nicht doppelt gebaut.

**Layout:** `Screen`, `Stack` (senkrecht, Abstand per Token), `Cluster` (waagerecht, bricht um), `Grid`, `Divider`, `Spacer`.
**Navigation:** `AppBar`, `LargeTitle`, `TabBar`, `SidebarNav`, `BackButton`, `SegmentedControl`.
**Inhalt:** `Card` (Varianten `plain`, `raised`, `hero`, `tinted`), `ListGroup` + `ListRow` (Symbol vorne, Titel, Zusatztext, Wert oder Pfeil hinten, optional Schalter), `SectionHeader`, `Chip`, `Badge`, `Disclosure` (aufklappbar), `Avatar` entfällt.
**Aktion:** `Button` (`primary` gefüllt, `secondary` getönt, `plain` Text, `destructive`; Größen `m` 48 px, `l` 52 px; Volle Breite Option; Zustände normal, gedrückt, deaktiviert, lädt), `IconButton` (rund, 44 bis 48 px), `FloatingAction` entfällt.
**Eingabe:** `TextField`, `TextArea`, `Switch`, `Slider`, `ChoiceList` (Radio/Checkbox als Zeilen), `Stepper`, `SearchField`.
**Rückmeldung:** `Toast`, `Banner`, `Dialog`, `Sheet` (unten, mit Griff, drei Höhen), `EmptyState`, `Skeleton`, `ProgressBar`, `SegmentBar` („3 von 8", Segmente), `Ring` (Kreis-Timer), `Arc` (Bogen-Fortschritt), `Meter` (Sicherheit/Kalibrierung, ruhig).
**Lernen:** `Flashcard`, `HintLadder`, `ConfidencePrompt` („Wie sicher bist du?"), `SkillRow` (Fähigkeit mit vier Zuständen), `SourceChip` (Quelle „Seite 12" mit Sprung), `StepList` (nummerierte Schritte), `CopyBlock` (Textblock mit Kopieren-Knopf).
**Illustration:** `Illustration` mit festen Motiven (siehe 5.2).

### 5.1 Buttons

- Pro Bildschirm höchstens ein `primary`. Gefüllt in `--accent`, Text `--text-on-accent`, Radius 14, Höhe 52, volle Breite in Karten und Sheets.
- `secondary`: getönte Fläche `--fill`, Text in Akzent. `plain`: nur Text, aber mit 44 px Tippfläche und sichtbarem Fokusring.
- `destructive` nur in Bestätigungsdialogen.
- Deaktiviert: dennoch Kontrast mindestens 3:1 und nicht nur ausgegraut, sondern mit Grund („Zuerst Material hinzufügen").

### 5.2 Illustrationen

- Nur einfache SVG-Formen in den Token-Farben (`currentColor`), ohne Animation, immer mit Textalternative oder `aria-hidden` wenn rein dekorativ.
- Feste Motive: `dokument-plus` (Material hinzufügen), `kreis-geschlossen` (Alles erledigt), `bogen-vier-bloecke` (Plan), `baum` (Könnensbaum), `lupe` (Suche), `wolke-haken` (Offline fertig), `schloss` (Daten sicher). Größe 96 bis 128 px, zentriert, nie größer als 20 Prozent der Bildschirmhöhe.

### 5.3 Icons

Eine Familie (Lucide), Strichstärke 1,75 px, Größen 20 (Zeile), 24 (Tab, Button). Dekorative Symbole `aria-hidden`, Symbol-Buttons mit `aria-label`. In RTL werden gerichtete Symbole (Pfeile, Zurück) gespiegelt.

---

## 6. Bildschirme

Format je Bildschirm: Zweck · Aufbau (oben nach unten) · Zustände · Verhalten · Akzeptanz. Alle Texte stehen in den i18n-Dateien, hier sind sie als Vorgabe auf Deutsch. Maße für 320 pt Breite.

### 6.1 Erststart (nur beim allerersten Öffnen, überspringbar)

- Drei kurze Schritte als Sheet-Karten, nicht mehr: 1 „Willkommen bei Madar. Du lernst, Madar plant." 2 „Wie viel Zeit hast du am Tag?" (Stepper 15 bis 240 Min, Standard 45) 3 Hinweis „Zum Home-Bildschirm" (nur iPhone im Safari-Tab) mit der kurzen bebilderten Anleitung.
- Primär: „Weiter". Plain: „Überspringen". Danach `Heute` mit dem Leerzustand.

### 6.2 Heute

Zweck: Zeigt, was jetzt dran ist, und lässt mit einem Tipp starten.
Aufbau:

1. Großer Titel „Guten Morgen" (je nach Tageszeit: Guten Morgen/Tag/Abend).
2. **Hauptkarte** (`hero`, Radius 28): Fachpunkt + Titel „Jetzt lernen", eine Zeile „8 Wiederholungen · Vektoraddition · ca. 35 Min.", darunter `SegmentBar` „3 von 8 erledigt" nur wenn begonnen, dann `Button primary` „Starten" (volle Breite), darunter `Button plain` „Warum?" (öffnet Sheet 6.15).
3. Abschnitt „Danach" als `ListGroup`: Weiterlernen, Heute wiederholen, Für morgen bereit. Jede Zeile mit Fachpunkt, Titel, Dauer, Pfeil.
4. **Claude-Aufträge-Karte** (nur wenn etwas offen ist): „2 Aufträge warten auf Claude", Button `secondary` „Aufträge öffnen".
5. **Prüfungs-Hinweis** (nur bei naher Prüfung, ruhig, Chip): „Mathe-Klausur in 12 Tagen".
6. Kleine Könnensbaum-Vorschau (`ListRow`: „Könnensbaum · 14 von 40 sitzen") → Fortschritt.
   Zustände:

- **A Plan vorhanden** wie oben.
- **B Alles erledigt:** Illustration `kreis-geschlossen`, Titel „Alles für heute erledigt", Text „Morgen warten 12 Karten (~8 Min.).", Button `secondary` „Freiwillig weiterüben".
- **C Kein Material:** Illustration `dokument-plus`, Titel „Lade dein erstes Material hoch", Text „Den Rest plant Madar.", `primary` „Material hinzufügen" (volle Breite, 52 px).
- **D Prüfung nah:** Hauptkarte enthält den Prüfungs-Chip, Plan ist wie A.
- **E Offline:** Banner oben, alles lokal Verfügbare funktioniert.
- **F Plan wird berechnet:** Skelette, nach 300 ms.
  Akzeptanz: Bei 320 pt keine Zeile bricht ungewollt um; „Starten" immer sichtbar ohne Scrollen auf 568 pt Höhe; Hauptaktion eindeutig.

### 6.3 Lernsitzung (Vollbild, TabBar ausgeblendet)

Zweck: Konzentriert lernen. Madar entscheidet, du antwortest.
Rahmen: oben Schließen-Knopf (X, fragt bei Abbruch „Sitzung pausieren?") und `SegmentBar` für den Sitzungsfortschritt; unten klebende Aktionsleiste mit Safe Area.
Phasen mit eigenem Titel (klein, oben): „Aufwärmen", „Kern", „Üben", „Abschluss".
Aufgabentypen und Layout:

- **Karte (Frage-Antwort):** große Karte mit Frage, Feld „Deine Antwort" (optional), Button `primary` „Aufdecken". Danach Antwort und drei gleich große Knöpfe „Wusste ich nicht · Schwer · Sicher" (nur falls Selbsteinschätzung nötig, sonst automatisch bewertet).
- **Auswahl:** `ChoiceList` als Zeilen (min. 52 px), nach Antwort Hervorhebung richtig/falsch mit Symbol UND Text, nicht nur Farbe.
- **Eingabe/Rechnen:** `TextField` mit passender Tastatur (`inputmode`), Formel-Eingabe wenn vorhanden.
- **Offene Antwort:** `TextArea`, danach Checkliste der Kernpunkte zum Selbstabhaken (`ChoiceList` Checkbox), Ergebnis als Prozentwert, Option „Für Claude vormerken".
- **Hinweisleiter:** `HintLadder` ab 45 s oder nach erstem Versuch, Stufe für Stufe, jede Stufe einzeln aufklappbar, Stufenanzeige „Hinweis 2 von 4".
- **Sicherheit:** bei jeder dritten Aufgabe Sheet „Wie sicher bist du?" mit vier Stufen als große Knöpfe.
- **Feedback:** Kurz („Richtig." / „Nicht ganz.") + Erklärung + `SourceChip` „Skript, Seite 12". Kein Lob-Überschwang, keine Punkte.
- **Pause-Vorschlag:** Sheet „Zeit für eine kurze Pause?" mit Kreis-Timer (`Ring`) 5 Minuten, Buttons „Pause starten" und „Weitermachen".
- **Abschluss:** ruhige Zusammenfassung: Anzahl, was sitzt, was gefestigt wird, nächster Termin. `primary` „Fertig".
  Zustände: Fehler melden (Plain-Link „Aufgabe melden", setzt aus), Aufgabe überspringen nur über Menü, Offline egal.
  Akzeptanz: Jede Aufgabe ist mit einer Hand bedienbar; die Aktionsleiste überdeckt keinen Inhalt (Inhalt hat Platz darunter); Tastatur öffnet sich, ohne dass das Feld verdeckt wird.

### 6.4 Fächer (Liste)

- Großer Titel „Fächer". `ListGroup`: je Fach Fachpunkt, Name, Zusatzzeile „3 Dateien · 14 von 40 Fähigkeiten sitzen", Pfeil.
- Oben rechts in der AppBar `IconButton` Plus „Fach hinzufügen" (öffnet Sheet mit Namensfeld, Farbwahl als Punkte, `primary` „Anlegen").
- Leer: Illustration `dokument-plus`, „Noch kein Fach", `primary` „Fach anlegen".

### 6.5 Fach (Detail)

Aufbau:

1. Großer Titel = Fachname, Fachpunkt links.
2. **Kopfkarte:** Gesamtfortschritt `Arc` mit Prozent (erst ab 5 Belegen, in 5er-Schritten), Zeile „14 von 40 Fähigkeiten sitzen".
3. **Prüfung:** `ListRow` „Prüfung eintragen" oder „Klausur am 12.12. (in 24 Tagen)" → Sheet 6.16.
4. **Dateien** (`ListGroup`): Name, Seiten, Fortschritt je Datei als `ProgressBar`, Pfeil → Leser. Unten `ListRow` Plus „Material hinzufügen".
5. **Könnensbaum** (`ListRow` mit Spross) → 6.9.
6. Weitere Aktionen im Menü (⋯): Umbenennen, Löschen (mit „Rückgängig").
   Zustände: ohne Dateien (Leerzustand), Datei wird verarbeitet (Zeile mit Text „Seite 3 von 20 wird gelesen …" und `ProgressBar`), Datei ohne Text („Texterkennung folgt").

### 6.6 Material hinzufügen (Sheet)

- Titel „Material hinzufügen". `ListGroup` mit vier Zeilen: „Datei wählen" (PDF, Text, Markdown), „Foto aufnehmen", „Text einfügen", „Datei hierher ziehen" (nur Desktop, sonst ausgeblendet). Jede Zeile mit Symbol und kurzer Beschreibung.
- Nach Wahl: Fortschrittsansicht im selben Sheet mit Klartext „Seite 3 von 20 wird gelesen …", `ProgressBar`, Button `plain` „Im Hintergrund fortsetzen".
- Fehler: verständlich („Diese Datei ist beschädigt. Versuche eine andere Datei.") mit Knopf „Andere Datei wählen".
- Doppelte Datei: Hinweis „Diese Datei ist schon im Fach." mit Zeile „Zur Datei".

### 6.7 Leser (PDF/Text)

- Kompakte Kopfzeile (44 px): Zurück, Dateiname gekürzt, ⋯-Menü. Beim Lesen blendet sich die Kopfzeile beim Scrollen nach unten aus und beim Hochscrollen ein.
- Werkzeugleiste unten (statt TabBar): Suche, Zoom (50 bis 400 %, auch Pinch), Umfließen, Notizen. Symbolbuttons 44 px mit Beschriftung im Menü.
- Suche im Dokument: Feld oben, „3 von 12" + Pfeile vor/zurück, Treffer markiert.
- Markieren: schwebende Leiste mit „Markieren", „Notiz", „Karte daraus machen" (letztere falls verfügbar, sonst ausgeblendet).
- Seiten ohne Text: Banner „Diese Seite hat keinen Text. Texterkennung folgt."
- Ein Skelett pro Seite beim Laden. Maximal 14 Seiten gleichzeitig gezeichnet.

### 6.8 Könnensbaum

- Standard ist die **Listenansicht** (zugänglich): Thema als `SectionHeader`, darunter `SkillRow`: Titel, Zustand (Neu · Im Aufbau · Sitzt · Auffrischen) als Chip mit Symbol UND Text, kleiner Bogen-Fortschritt.
- Optional per `SegmentedControl` „Liste | Baum" die SVG-Baumansicht (nur wenn gebaut, sonst Eintrag ausgeblendet).
- Tippen auf eine Fähigkeit öffnet Sheet „Fähigkeit": Beschreibung, Zustand, Belege (`SourceChip`), „Üben" (primary, wenn dran), „Ausblenden", „Umbenennen", „Letzte Änderung rückgängig".
- Leer: „Der Könnensbaum entsteht, sobald Material da ist." Illustration `baum`.

### 6.9 Suche

- Großer Titel „Suche", darunter `SearchField` (Fokus beim Öffnen). Ergebnisse gruppiert: Fächer, Dateien, Texte, Notizen. Treffer mit Pfad „Physik › skript.pdf › Seite 3" und Ausschnitt mit markiertem Wort. Tippen springt zur Stelle.
- Leer: „Gib einen Begriff ein." Keine Treffer: „Nichts gefunden. Prüfe die Schreibweise."

### 6.10 Fortschritt

- Großer Titel „Fortschritt". Je Fach eine `Card` mit `Arc`, „14 von 40 sitzen", Zeile „Auffrischen: 3". Darunter je Datei `ProgressBar`.
- **Auswertung von Claude** (falls vorhanden): `Card` „Deine Auswertung" mit Datum, kurzer Text, `Disclosure` für Details. Klar gekennzeichnet als Empfehlung: „Das ist ein Vorschlag, der Plan ändert sich dadurch nicht."
- Kein Streak, keine Punkte, kein Vergleich.

### 6.11 Aufträge (Austausch mit Claude)

Zweck: Madar bereitet Aufträge vor, Claude bearbeitet sie im Chat.
Aufbau:

1. Großer Titel „Aufträge". Oben `Banner` mit Verbindungsstatus: „Verbunden mit Claude" (grün, mit Symbol) oder „Nicht verbunden. Kopieren und Einfügen geht trotzdem."
2. **Vorschläge** (`ListGroup`): „Könnensbaum bauen: skript.pdf", „3 Fähigkeiten vorbereiten", „Quelle ergänzen (Seite 5 bis 8)", „12 offene Antworten bewerten". Je Zeile Dauer-Schätzung und Pfeil.
3. Tippen öffnet die **Auftragsansicht** als `StepList` mit drei nummerierten Schritten:
   1 „Auftrag kopieren" (`CopyBlock` mit Knopf „Kopieren" und „Als Datei"), 2 „In Claude einfügen und das Stichwort madar schreiben", 3 „Antwort hier einfügen" (`TextArea` + „Aus Zwischenablage einfügen" + „Datei laden") und `primary` „Prüfen und übernehmen".
4. Ergebnis: Zusammenfassung „18 von 20 Einträgen übernommen, 2 abgelehnt" + `Disclosure` mit Gründen auf Deutsch. Nichts wird halb gespeichert, das steht dabei.
5. Verbindung: Feld „Kopplungscode" (verdeckt, mit Auge), `secondary` „Verbindung testen", Ergebnis „Verbindung steht." oder verständlicher Fehler. Darunter `CopyBlock` mit der Konnektor-Adresse.

- Große Pakete werden automatisch geteilt: „Paket 1 von 3".
  Akzeptanz: Ein Mensch ohne Vorwissen findet in unter 30 Sekunden den Kopieren-Knopf. Jeder Schritt ist einzeln erkennbar und mit „erledigt"-Haken markiert.

### 6.12 Deine Daten

- Speicherstatus als `Card`: „Dein Lernstand ist gespeichert" mit Symbol `schloss`, Größe, ob Safari Dauerspeicher zusagt (Text ehrlich: „Safari löscht Daten nach 7 Tagen ohne Nutzung, wenn die App nicht auf dem Home-Bildschirm liegt.").
- Abschnitt „Zum Home-Bildschirm" (nur iPhone im Safari-Tab) als `StepList` mit drei kleinen Bildern.
- Abschnitt „Sichern": `primary` „Alles exportieren (ZIP)", `secondary` „Import". Liste der automatischen Sicherungen mit Datum und „Wiederherstellen".
- Abschnitt „Selbsttest": `secondary` „Test starten", Ergebnis „In Ordnung" oder Fehlertext.
- Import-Dialog warnt klar: „Ersetzt deinen ganzen Bestand. Vorher wird er gesichert."

### 6.13 Einstellungen

Gruppierte Liste mit Abschnitten, jede Zeile mit Symbol:

- **Lernen:** Lernzeit pro Tag (Stepper), Tagesbeginn 04:00 (nur Anzeige), Entspannt/Normal/Gründlich (`SegmentedControl`).
- **Darstellung:** Erscheinungsbild (`SegmentedControl` Hell · Dunkel · Hoher Kontrast · System), Textgröße (`Slider` 90 bis 200 % mit Live-Vorschau-Satz), Bewegung reduzieren (`Switch`), Sprache (Deutsch · English · العربية).
- **Claude:** Aufträge, Verbindung.
- **Daten:** Deine Daten.
- **Über:** Version, Hinweise, Lizenzen.
- Alle Einstellungen wirken sofort und sichtbar. Beim Ändern der Textgröße springt nichts.

### 6.14 Prüfung eintragen (Sheet)

Fach, Datum (nativer Datumsauswahl, Ersatz: drei Felder), Umfang (Dateien/Themen als `ChoiceList`), `primary` „Speichern". Danach Toast „Gespeichert. Madar plant rückwärts."

### 6.15 Sheets „Warum?" und „Ändern"

- **Warum?** Titel „Warum jetzt?", drei kurze Gründe als `ListRow` mit Symbol („12 Karten sind fällig", „Prüfung in 12 Tagen", „Du hast gestern bei X Fehler gemacht"). Text einfach, kein Fachwort. `plain` „Verstanden".
- **Ändern:** drei Alternativen als `ChoiceList` mit je einer Zeile Begründung, `primary` „Übernehmen", `plain` „Beim Vorschlag bleiben".

### 6.16 System-Bildschirme

- **Fehler, Offline, Update, Speicher voll, Datei kaputt:** Text nach der Formel „Was ist passiert, warum, was jetzt?", ein Knopf, nie Technik-Kauderwelsch.
- **Bestätigungsdialoge** nur für Unumkehrbares; sonst Toast mit „Rückgängig".

---

## 7. Texte und Ton

- **Ton:** ruhig, freundlich, kurz, ohne Ausrufezeichen und Floskeln. „Du" als Anrede. Keine Belohnungssprache („Super gemacht!"), keine Drohung („Du hast noch nicht gelernt!").
- **Länge:** Titel höchstens 4 Wörter, Zeilen höchstens 1 Satz, Hilfetexte höchstens 2 Sätze.
- **Wörter:** Fähigkeit, Könnensbaum, Auffrischen, Sitzt, Im Aufbau, Neu, Wiederholung, Auftrag. Keine englischen Fremdwörter und kein Kürzel wie „FSRS" im Bildschirmtext.
- **Fehlertexte:** Formel „Was · Warum · Was jetzt", niemals Fehlercodes ohne Erklärung.
- **Zahlen:** Deutsche Schreibweise (12,5 Prozent, 24 Min.), Datum „12.12.2026", Plural per i18n (auch Arabisch).
- **Buttons:** Verben im Imperativ („Starten", „Speichern"), nie „OK" allein.

---

## 8. Barrierefreiheit (verbindlich, nicht verhandelbar)

- WCAG 2.2 AA, Hoher-Kontrast-Theme AAA wo möglich. Prüfung mit axe in allen Themes, Sprachen und Breiten.
- Kontraste siehe 3.4. Zustände (Richtig/Falsch, Fähigkeitsstand, Verbunden) nie nur über Farbe, immer mit Symbol UND Text.
- Fokus: sichtbarer Fokusring (3 px, Kontrast 3:1), logische Reihenfolge, Fokus-Rückkehr nach Sheet/Dialog, Fokusfalle in Dialogen, Skip-Link „Zum Inhalt".
- Screenreader: sinnvolle Überschriftenebenen (genau eine `h1` pro Bildschirm), Landmarken (`header`, `nav`, `main`), `aria-live` für Toasts und Fortschritt, Beschriftungen für alle Symbol-Buttons, Fortschritt als „3 von 8" im Text.
- Zoom: Funktioniert bei 200 Prozent Text und 400 Prozent Zoom ohne horizontales Scrollen und ohne abgeschnittene Inhalte. Nie `maximum-scale` oder `user-scalable=no`.
- Tippflächen ≥ 44 px. Keine zeitgesteuerten Verschwinden von wichtigen Inhalten.
- Bewegung: respektiert `prefers-reduced-motion` und den App-Schalter.
- RTL: Alle Bildschirme werden in Arabisch gespiegelt geprüft (Screenshot), Zahlen bleiben lesbar, gerichtete Symbole gespiegelt.
- VoiceOver-Handprüfung steht in `docs/STATUS.md` als offen, bis Ossy sie bestätigt.

---

## 9. Interner Aufbau des UI-Codes

**Ordner**

```
src/styles/   tokens.css  base.css  reset.css  layers.css  themes/(light|dark|contrast).css
src/ui/       <Komponente>/  (Komponente.tsx, Komponente.css, Komponente.test.tsx)
src/screens/  heute/ faecher/ fach/ sitzung/ leser/ baum/ suche/ fortschritt/ auftraege/ daten/ einstellungen/ system/
src/ui/illustrations/  (SVG-Komponenten)
```

**CSS-Architektur**

- `@layer reset, tokens, base, components, screens, utilities;` in `layers.css`.
- Themes über `[data-theme="light|dark|contrast"]` am `html`, Auswahl „System" über `prefers-color-scheme` und `prefers-contrast`.
- Nur logische Eigenschaften (Lint-Regel). Keine festen Breiten in px für Inhalte, stattdessen `min()`, `clamp()`, `%`, `ch`.
- Container Queries für Komponenten, die in Karten und Sheets wiederverwendet werden.
- Keine `!important`, keine Inline-Styles außer dynamischen Werten über CSS-Variablen.
- Stylelint-Regeln: verbietet Hex-Farben und rohe `px`-Werte für `margin`, `padding`, `gap`, `border-radius`, `box-shadow`, `font-size` außerhalb von `tokens.css`, verbietet `left/right/margin-left/margin-right`.

**Komponentenregeln**

- Jede Komponente ist klein, ohne Datenzugriff. Daten kommen aus Screen-Containern über Hooks, die Komponente zeigt nur an.
- Props sind typisiert, Varianten per Union-Typ, Zustände per Prop (`state="loading"`).
- Jede Komponente hat: Tastaturbedienung, ARIA, alle Zustände in der Galerie, einen Unit-Test und – wo sichtbar – einen Screenshot-Test.
- Screens laden lazy (`React.lazy`). Haupt-Bundle bleibt ≤ 170 KB gzip, die Datenbank- und ZIP-Teile erst bei Bedarf.

**Layout-Primitive**

- `Screen` setzt Seitenrand, Safe Areas und Maximalbreite. `Stack` und `Cluster` setzen ALLE Abstände. Wer Abstände anders setzt, bricht die Regel.

**i18n**

- Jeder Text nur über Schlüssel, in `de.json`, `en.json`, `ar.json`. Ein Test schlägt fehl, wenn ein Schlüssel in einer Sprache fehlt.

**Zustandsverwaltung**

- UI-Zustand (Sheets offen, Eingaben) lokal oder in kleinen Stores. Lerndaten ausschließlich über die vorhandene Datenschicht. Keine Parallelspeicherung.

**Galerie**

- `/dev/components` zeigt jede Komponente in allen Zuständen, Themes, RTL und mit Textskala. Zusätzlich `/dev/screens` zeigt jeden Bildschirm mit Beispielzuständen (A bis F bei Heute etc.). Beide werden wie bisher als Vorschau veröffentlicht.

---

## 10. Qualitätssicherung (visuell)

**Pflicht-Matrix** für Screenshots: jeder Bildschirm aus Abschnitt 6 × Breiten (320, 390, 768) × Themes (Hell, Dunkel, Hoher Kontrast) × Richtung (LTR, RTL für Heute, Fach, Sitzung, Einstellungen) × Textskala 100 und 200 Prozent.

**Automatische Tests (Playwright, Chromium, wenn möglich auch WebKit):**

1. axe ohne Verstöße in der Matrix.
2. Kein horizontales Scrollen bei 320 px und 200 Prozent Text.
3. TabBar bei 320 px einzeilig, alle vier Beschriftungen vollständig sichtbar.
4. Nichts Bedienbares unter der Statusleiste (Safe-Area-Test).
5. Hauptaktion pro Bildschirm sichtbar ohne Scrollen bei 320×568 (Heute, Material hinzufügen, Aufträge Schritt 1).
6. Tippflächen ≥ 44×44 px für alle Buttons, Zeilen, Icon-Buttons.
7. Kontrasttest `pnpm a11y:contrast` einschließlich der interaktiven Umrisse.
8. Visuelle Regression (`toHaveScreenshot`) für Heute, Fach, Sitzung, Aufträge, Einstellungen in 320 und 390, Hell und Dunkel.
9. Eckentest der Karten im Hohen Kontrast (bleibt bestehen).
10. Kein Textumbruch mitten im Wort in Titeln und Buttons.

**Manuelle Prüfung durch dich (Pflicht, nicht ersetzbar):** Du öffnest die Screenshots wirklich, schaust jede an und schreibst pro Bildschirm in `docs/UI_REVIEW.md`: Was siehst du? Was ist unklar, zu dicht, zu leer, zu klein? Was hast du korrigiert? Ein Bildschirm gilt erst als fertig, wenn dieser Eintrag existiert UND du keinen offenen Mangel mehr nennst.

**Abnahmefragen je Bildschirm (alle mit Ja):**

- Erkennt man in 2 Sekunden, was die Hauptaktion ist?
- Ist bei 320 pt nichts abgeschnitten, nichts verdeckt, nichts doppelt?
- Würde der Bildschirm in einer Apple-App nicht auffallen?
- Ist er mit Vergrößerung gut lesbar und mit einer Hand bedienbar?
- Ist der Text ruhig, kurz und ohne Fachjargon?

---

## 11. Phasen und Abnahme

**Phase A – Fundament (zuerst)**
Tokens bereinigen und ergänzen (Abschnitt 3), Schriftstapel auf Systemschrift, Layout-Primitive, App-Rahmen mit Safe Area, TabBar/Seitenleiste, AppBar mit Large Title, Sheet, Toast, Banner, Fehlergrenze, Stylelint-Regeln, Sicherheitstests 3 und 4. Galerie aktualisieren.
Abnahme: Rahmen auf iPhone-Breite 320 ohne Verdeckung, Navigation einzeilig, Galerie vollständig.

**Phase B – Kernbildschirme von Meilenstein 1**
Heute (alle Zustände A bis F), Material hinzufügen (6.6), Fächer (6.4), Fach (6.5), Leser (6.7), Lernsitzung (6.3), Aufträge (6.11), Deine Daten (6.12), Einstellungen (6.13).
Abnahme: Ossy geht auf dem iPhone einmal durch den ganzen Lernkreislauf: Fach anlegen, Material hinzufügen, Plan sehen, Sitzung starten, Auftrag kopieren und Antwort einfügen. Danach Review-Datei.

**Phase C – Übrige Bildschirme**
Könnensbaum (6.8), Suche (6.9), Fortschritt (6.10), Prüfung eintragen (6.14), Warum/Ändern (6.15), Erststart (6.1), System-Bildschirme (6.16), Illustrationen.

**Phase D – Politur und Abnahme**
Bewegung fein einstellen, Skelette, Leerzustände, Texte prüfen und kürzen, RTL-Durchgang, 200-Prozent-Durchgang, visuelle Regression festschreiben, Doku (`UI_REVIEW.md`, `STATUS.md`, `ENTSCHEIDUNGEN.md`), Veröffentlichung der Vorschau.

**Bei jeder Meldung** nennst du: was fertig ist (nach Bildschirm), was du gesehen und korrigiert hast, was nicht geprüft ist (WebKit, iPhone, VoiceOver), die Vorschau-Links, und was ich testen soll.

---

## 12. Verbote und Erinnerungen

- Keine Gamification (Punkte, Serien, Abzeichen, Bestenlisten, Konfetti).
- Keine Schnittecke, keine Rahmen um alles, keine Transparenz im Hohen Kontrast.
- Kein Text unter 11 px, kein Kontrast unter den Werten aus 3.4.
- Keine Links in Browser-Standardfarbe, keine Silbentrennung in Titeln und Buttons.
- Keine neue Bibliothek ohne Begründung in `ENTSCHEIDUNGEN.md`. Bundle-Budget einhalten.
- Keine Änderung an Logik, Datenmodell, Studienleiter oder Auftragsformat im Rahmen dieser Vorgabe.
- Nichts als „behoben" melden, was nicht per Test UND per Screenshot geprüft ist. Sage ehrlich, was ungeprüft ist.

---

## Anhang A – Wireframes (320 pt)

**Heute, Zustand A**

```
[Statusleiste / Safe Area]
Heute                         (⚙)
Guten Morgen
┌──────────────────────────────┐
│ ● Physik                     │
│ Jetzt lernen                 │
│ 8 Wiederholungen · Vektor-   │
│ addition · ca. 35 Min.       │
│ ▰▰▰▱▱▱▱▱  3 von 8 erledigt   │
│ [        Starten           ] │
│          Warum?              │
└──────────────────────────────┘
Danach
┌──────────────────────────────┐
│ ● Mathe  Weiterlernen  12 Min ›│
│ ● Bio    Wiederholen    8 Min ›│
└──────────────────────────────┘
┌──────────────────────────────┐
│ 2 Aufträge warten auf Claude │
│ [      Aufträge öffnen     ] │
└──────────────────────────────┘
[ Heute | Fächer | Fortschritt | Suche ]
```

**Lernsitzung, Karte**

```
(✕)  ▰▰▰▱▱▱▱▱▱   Kern
┌──────────────────────────────┐
│ Was ist ein Vektor?          │
│                              │
└──────────────────────────────┘
Deine Antwort (optional)
[                              ]
─────────────────────────────────
[         Aufdecken          ]
```

**Aufträge, Auftragsansicht**

```
‹ Aufträge
Könnensbaum bauen
① Auftrag kopieren
  ┌ madar-auftrag … ┐ [Kopieren]
② In Claude einfügen
  Schreibe das Stichwort „madar".
③ Antwort hier einfügen
  [                             ]
  [ Aus Zwischenablage ] [ Datei ]
[   Prüfen und übernehmen   ]
```

## Anhang B – Entscheidungsvorlage für Konflikte

Wenn zwei Regeln kollidieren: 1. Sicherheit und Datenschutz, 2. Barrierefreiheit, 3. Verständlichkeit, 4. Ruhe und Optik, 5. Code-Eleganz. Notiere jede solche Entscheidung in `docs/ENTSCHEIDUNGEN.md` mit einem Satz Begründung.
