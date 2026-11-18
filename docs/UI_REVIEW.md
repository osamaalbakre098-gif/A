# UI-Review (docs/UI_VORGABE.md, Abschnitt 10)

Pro Bildschirm: Was sehe ich? Was ist unklar, zu dicht, zu leer, zu klein? Was habe ich korrigiert? Ein Bildschirm gilt erst als fertig, wenn hier ein Eintrag steht UND kein offener Mangel genannt wird.

Methode: Screenshots in Chromium (2× Auflösung, simulierte 47-px-Statusleiste über `--sat`), Breiten 320/390/768, Hell, Dunkel, Hoher Kontrast; Galerie zusätzlich RTL und 200 % Text. Ich habe die Bilder geöffnet und angesehen (nicht nur auf Überlauf geprüft). **Nicht geprüft:** WebKit/echtes Safari (Dynamic Island, echte `env()`-Werte, Blur), VoiceOver, echtes iPhone.

## Phase A – Fundament

### App-Rahmen (Kopfzeile + Navigation) – gesehen auf Heute, Fächer, Fach, Einstellungen, Aufträge, Deine Daten
- **Gesehen:** Kopfzeile unter der Statusleiste, runder Einstellungs-Knopf rechts (44 px), auf Unterebenen runder Zurück-Pfeil links, großer Titel darunter. Beim Scrollen erscheint der Titel klein in der Kopfzeile (Glas-Hintergrund mit feiner Linie). Untere Navigation: vier gleich breite Felder in einer Zeile, aktiver Punkt als getönte Pille mit gefülltem Symbol. Ab 768 pt: Seitenleiste links, Inhalt daneben.
- **Mangel gefunden und behoben (wichtig):** Die Schichten-Reihenfolge (`@layer`) ging beim Bündeln verloren, dadurch überschrieb die Linkfarbe die Knopffarbe: der Hauptknopf auf „Heute" war ein blauer Balken **ohne lesbare Beschriftung**. Ursache: Der Bündler lässt die Reihenfolge-Zeile fallen. Behoben mit einer Inline-Zeile in `index.html` (und den statischen Seiten). Ein Test (Hauptknopf gefüllt, Text weiß) deckt es ab.
- **Mangel gefunden und behoben:** In der Seitenleiste war der aktive Punkt doppelt hinterlegt (Zeile und Symbol); im Hohen Kontrast hatte die Seitenleiste oben eine dicke Linie. Beides korrigiert.
- **Mangel gefunden und behoben:** Der Hinweis „Madar funktioniert jetzt auch ohne Internet" war ein großer Block oben im Inhalt, bei 320 pt fast ein halber Bildschirm. Jetzt kurzer Toast unten (4 s) über der Navigation; ab 768 pt mittig über dem Inhalt, nicht über der Seitenleiste.
- **Offen / Beobachtung:** Der Toast kann kurz Inhalt überdecken (bewusst, 4 s, pausiert bei Fokus/Hover). Die Fachseite und „Deine Daten" haben noch das alte Innenleben (Karten mit Rahmen und Punkt, gestrichelte Dropzone): kommt in Phase B.
- **Abnahmefragen:** Hauptaktion eindeutig – ja (Heute leer: ein voller Knopf, 56 px). Bei 320 pt nichts abgeschnitten/verdeckt – ja (Statusleiste, Navigation, Kopfzeile). Apple-Anmutung – Rahmen ja, Innenleben der Seiten noch nicht (Phase B). Vergrößerung/Einhand – Rahmen ja. Text ruhig – ja.

### Galerie (`/dev/components`) – gesehen: Navigation, Hinweise, Buttons, (Schrift, Farbrollen, Layout, Toast/Sheet, Ladezustand, Fehleransicht in der Matrix erzeugt)
- **Gesehen:** Navigation (Kopfzeile Haupt-/Unterebene, untere Navigation, Seitenleiste) in Hell/Dunkel/Kontrast sauber; Hinweise (4 Töne) mit Symbol + Text, im Kontrast mit 2-px-Rahmen; Buttons: Primär 48/52, volle Breite, Sekundär, Text, Löschen.
- **Mangel gefunden und behoben:** Deaktivierte Knöpfe waren nur halbtransparent (Weiß auf Blaugrau unter 3:1, besonders „Laden"). Jetzt getönte Fläche mit lesbarem Text, im Hohen Kontrast gestrichelter Rahmen. (Der „Grund" als Text daneben ist Sache der jeweiligen Bildschirme, Phase B.)
- **Offen:** „Sekundär" und „Text"-Knopf unterscheiden sich im Hellen nur durch die Fläche (gewollt, Apple-ähnlich); Sheet-Ziehen mit dem Finger ist nur im Test (Pointer-Ereignisse) geprüft, nicht auf Touch.

### Ehrlich nicht gesehen
- RTL- und 200-%-Streifen der Galerie wurden erzeugt, aber nicht einzeln durchgesehen (Phase D). Tests prüfen RTL-Navigation (einzeilig, Pfeil gespiegelt) und 200 % ohne seitliches Scrollen.
