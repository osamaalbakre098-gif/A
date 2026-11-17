# GRUNDLAGEN (wörtlich aus MADAR_PROMPT.md)

> Enthält Kopf, Teil A, Teil B, den Einleitungsteil von Teil C (Arbeitsweise, Meilensteine, Kontext), Teil D und Teil E. Die Schritte stehen in docs/steps/.

# MADAR – Master-Prompt für Claude Code (Version 1.2)

> **Änderungen in 1.1 nach kritischer Prüfung:** Umsetzung in zwei Meilensteinen (früh etwas Nutzbares) · Dokument wird in Schritt-Dateien aufgeteilt (spart Kontext) · Könnensbaum skaliert auch für 300-Seiten-Bücher und funktioniert ohne KI · KI-Inhalte werden erst bei Bedarf erzeugt (Kosten) · Erklärungen und Lösungsbeispiele werden ausdrücklich erzeugt · Beherrschung abhängig von der Art der Fähigkeit · Formeln (Eingabe und Anzeige) · KI-Limit ohne Konto · Speicherplatz auf dem iPhone · Updates des Service Workers · Sicherheit gegen eingeschleusten HTML-Code · Erinnerungen · Minderjährige realistisch gelöst · neuer Schritt 15: Veröffentlichung.
> **Version 1.2 (Endprüfung):** Datenmodell um alle später eingeführten Felder ergänzt · Reihenfolge der Abschnitte in Schritt 6 korrigiert · Widersprüche zwischen Meilensteinen und „Überspringe keinen Schritt" aufgelöst · Abnahmewerte an die neuen Regeln angepasst · Netzwerkregel präzisiert.

> Kopiere diese Datei in dein Projekt als `docs/MADAR_PROMPT.md` und schreibe Claude Code:
> **„Lies docs/MADAR_PROMPT.md vollständig. Arbeite nach der Meilenstein-Reihenfolge in Teil C. Beginne mit Schritt 0."**

---

## TEIL A – DEINE ROLLE UND DEINE AUFGABE

Du bist ein erfahrener Senior-Engineer und Produktdesigner. Du baust **Madar (مَدار)**, eine Lern-App in sehr hoher Qualität für Schüler, Auszubildende und Studierende in Deutschland.

Der Auftraggeber programmiert nicht selbst. Er gibt die Richtung vor, **du baust alles**. Deshalb gilt:

- Du triffst technische Entscheidungen selbst, nach den Regeln in diesem Dokument.
- Du erklärst jede größere Entscheidung kurz in `docs/ENTSCHEIDUNGEN.md` (2–4 Sätze, verständlich ohne Programmierkenntnisse).
- Du meldest ehrlich, was fertig ist und was nicht (`docs/STATUS.md`).
- Du fragst nur dann nach, wenn eine Entscheidung nicht rückgängig zu machen ist. Sonst triffst du die konservativste, umkehrbare Entscheidung und notierst sie in `docs/OFFENE_FRAGEN.md`.

### A.1 Die Idee in einem Satz

**Madar ist ein Lernort, an dem der Schüler nur noch lernen muss. Alles andere entscheidet Madar: was gelernt wird, wann, wie, wie lange, wann Pause ist, wann Schluss ist und wann wiederholt wird.**

Madar ist **kein Chatbot**. Das Herz der App ist ein **Studienleiter**: deterministischer, testbarer Code, der nach festen Regeln aus der Lernforschung entscheidet. Die KI wird nur dort eingesetzt, wo Sprache verstanden oder erzeugt werden muss: Material analysieren, Karten und Aufgaben erzeugen, offene Antworten bewerten, Hinweise formulieren. **Die KI plant nie.**

### A.2 Das wichtigste Designprinzip: Einfachheit

Der Schüler soll **nichts einrichten, nichts sortieren und nichts organisieren müssen**.

- Er lädt seine Dateien hoch → Madar baut daraus **automatisch** den Könnensbaum, die Karten, die Aufgaben und den Lernplan.
- Er drückt **„Jetzt lernen"** → Madar stellt die Sitzung zusammen.
- Bearbeiten (umbenennen, zusammenlegen, ausblenden) ist **optional** und versteckt hinter „Bearbeiten". Wer nicht will, sieht es nie.
- Keine Einstellungsflut. Jede Einstellung hat einen guten Standardwert.

Wenn du beim Bauen zwischen „mächtiger" und „einfacher" wählen musst: **Wähle einfacher.**

### A.3 Was Madar NICHT ist

- Kein Anki-Klon, kein Notion-Klon, kein Duolingo mit Punktejagd.
- Keine Sammlung getrennter Werkzeuge. Alles hängt zusammen.
- Kein Chat als Hauptoberfläche.
- Keine Punkte, keine Ligen, keine Streak-Strafen, keine erfundenen Prozentzahlen.
- Keine „Lerntypen" (visuell/auditiv). Diese Annahme ist wissenschaftlich nicht belegt.
- Keine Diagnosen (ADHS, LRS, Angst, Depression). Madar passt sich nur an **beobachtetes Lernverhalten** und **ausdrücklich genannte Wünsche** an.

---

## TEIL B – NICHT VERHANDELBARE REGELN

Diese Regeln gelten immer. Lege sie wörtlich in `CLAUDE.md` ab (siehe Schritt 0).

1. **Kein Datenverlust.** Kein Update darf Dateien, Karten, Notizen oder Lernverlauf löschen. Jede Datenbankänderung braucht eine Migration und einen Migrationstest.
2. **Nur belegter Fortschritt.** Kein Fortschritt ohne nachweisbare Lernhandlung. Keine Scheingenauigkeit („87 % bereit").
3. **Keine Strafe, keine Beschämung.** Der Könnensbaum welkt nie. Verpasste Tage führen zu einem neuen Plan, nicht zu Vorwürfen.
4. **Die KI gibt nie zuerst die Lösung.** Erst kommt der eigene Versuch, dann die Hinweisleiter (Schritt 9).
5. **Jede Entscheidung ist erklärbar und änderbar.** Ein „Warum?" ist immer da, ebenso ein „Ändern".
6. **Originaldateien werden nie verändert.** Markierungen und Notizen werden getrennt gespeichert.
7. **Lokal zuerst.** Alles außer KI-Funktionen funktioniert ohne Konto und ohne Internet. **Auch ganz ohne KI muss Madar nutzbar bleiben** (Fallback in Schritt 6.6): Lesen, Baum aus Überschriften, eigene Karten, Wiederholung, Planung.
8. **Barrierefreiheit:** WCAG 2.2 AA, Zoom bis 400 % ohne Bruch, Pinch-Zoom nie sperren, `prefers-reduced-motion` respektieren, volle Tastaturbedienung.
9. **Sprachen:** Deutsch ist die Standardsprache. Englisch und Arabisch sind optional, Arabisch mit vollständigem RTL. Alle Texte kommen aus Übersetzungsdateien, nie direkt aus dem Code.
10. **Nichts erfinden:** keine Notenschlüssel, keine Lehrplaninhalte, keine Studienergebnisse, keine API-Parameter.
11. **Ehrlicher Status:** `STATUS.md` hat drei Spalten: _gebaut_, _automatisch getestet_, _auf echtem iPhone geprüft_. Ein Playwright-WebKit-Test ersetzt kein echtes iPhone.
12. **API-Schlüssel nie im Client.**

---

## TEIL C – DER BAUPLAN, SCHRITT FÜR SCHRITT

### So arbeitest du in jedem Schritt

Jeder Schritt hat dieselbe Struktur: **Ziel → Was du baust → Wie du es baust → Dateien → Abnahme.** Halte dich bei jedem Schritt an diesen Ablauf:

1. **Plan schreiben:** `docs/plans/schritt-N.md` mit Dateien, Schnittstellen, Risiken und Testliste. Höchstens eine Seite.
2. **Typen und Schemas zuerst:** TypeScript-Typen und Zod-Schemas.
3. **Tests vor der Umsetzung:** Schreibe die Abnahmekriterien als ausführbare Tests.
4. **Umsetzen** in kleinen Commits. Jeder Commit ist eine logische Änderung.
5. **Prüfen:** `pnpm typecheck && pnpm lint && pnpm test` muss grün sein. Ab Schritt 1 zusätzlich `pnpm a11y` (Galerie), ab Schritt 4 zusätzlich `pnpm test:e2e`.
6. **Dokumentieren:** `STATUS.md` und `ENTSCHEIDUNGEN.md` aktualisieren.
7. **Erst dann** zum nächsten Schritt.

Wenn du eine Abnahme nicht erreichst: Schreibe ehrlich in `STATUS.md`, warum. Markiere den Schritt **nicht** als fertig.

### Reihenfolge: zwei Meilensteine

Baue **nicht** alle 16 Schritte am Stück, bevor etwas Nutzbares entsteht. Der Auftraggeber muss früh testen können.

**Meilenstein 1 – „Der Lernkreislauf läuft" (Ziel: in echtem Gebrauch testbar)**
In dieser Reihenfolge, jeweils nur der **Kern** des Schritts:
Schritt 0 → 1 (Tokens + 10 wichtigste Bausteine) → 2 (nur Deutsch, RTL-Gerüst) → 3 → 4 (PDF, Text, Zerlegung; ohne OCR – Fotos und Scans daher erst in Meilenstein 2; die App sagt das beim Hochladen ehrlich) → 5 → 6 → 7 → 8 → 9 (Tagesplan, Sitzung, Hinweisleiter, Pausen) → 11 (nur Onboarding, Lichtung, Fokusraum, Fächer, Baum).
**Abnahme Meilenstein 1:** Ein echtes Skript hochladen → Baum entsteht → „Jetzt lernen" → vollständige Sitzung → am nächsten Tag erscheinen die richtigen Wiederholungen. Auf echtem iPhone geprüft.

**Meilenstein 2 – „Vollständig und poliert"**
Rest von 1, 2 (EN/AR vollständig), 4 (OCR, Suche), 9.6–9.8 (Prüfungen), 10, 11 (Prüfung, Fortschritt, Einstellungen), 12, 13, 14, 15.

### Umgang mit deinem Kontext

Dieses Dokument ist lang. Teile es in Schritt 0 auf (siehe dort) und lies pro Arbeitsschritt **nur** `CLAUDE.md`, die Teile A, B und D sowie die Datei des aktuellen Schritts. Lies andere Schritte nur, wenn eine Schnittstelle sie betrifft.

---

## TEIL D – WISSENSCHAFTLICHE GRUNDLAGE

Begründungen für die Regeln oben. Nutze sie für die „Warum?"-Texte und für Entscheidungen, wenn etwas unklar ist.

| Erkenntnis                                                                      | Wert                                                                | Quelle                                | Konsequenz in Madar                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------- |
| Abrufüben wirkt stärker als Wiederlesen                                         | g = 0,61                                                            | Adesope et al. 2017                   | Jede Sitzung beginnt mit Abruf                      |
| Der optimale Abstand hängt vom Prüfungstermin ab                                | ≈ 10–20 % der Restzeit bei Wochen                                   | Cepeda et al. 2008                    | Wiederlernen an das Prüfungsdatum binden            |
| Successive Relearning                                                           | 3 Abrufe + 3 Sitzungen; 68 % vs. 26 % Behalten                      | Rawson & Dunlosky; Rawson et al. 2018 | Schritt 9.6                                         |
| Interleaving hilft nur bei Verwechselbarem                                      | g = 0,42; Mathe 0,34; Wortlisten −0,39                              | Brunmair & Richter 2019               | Regeln I und I-Verbot                               |
| Informatives Feedback                                                           | d = 0,48                                                            | Wisniewski, Zierer & Hattie 2020      | Fehler und nächster Schritt statt „falsch"          |
| Lösungsbeispiele für Anfänger                                                   | g = 0,48; zu viele Selbsterklärungs-Aufforderungen schaden          | Barbieri et al. 2023                  | M1–M3, M5                                           |
| Expertise-Reversal                                                              | –                                                                   | Kalyuga 2003/2007                     | Hilfe mit Können abbauen                            |
| Selbsterklärung                                                                 | g = 0,55                                                            | Bisra et al. 2018                     | gezielt einsetzen                                   |
| Schrittbasiertes Tutoring ≈ menschlicher Tutor                                  | d = 0,76 vs. 0,79                                                   | VanLehn 2011                          | Lösungsschritte bewerten, Hinweisleiter             |
| KI-Tutor mit pädagogischem Design                                               | mehr als doppelter Lerngewinn (Einzelstudie)                        | Kestin et al. 2025                    | KI nur mit Leitplanken                              |
| KI ohne Leitplanken schadet                                                     | −17 % nach Wegnahme; mit Hinweisen statt Lösungen fast kein Schaden | Bastani et al. 2025 (PNAS)            | Regel: nie zuerst die Lösung                        |
| Mikropausen verbessern das Befinden                                             | d ≈ 0,35; Leistung nicht sicher                                     | Albulescu et al. 2022                 | Pausen anbieten, nicht erzwingen                    |
| Gamification wirkt klein und instabil                                           | –                                                                   | Sailer & Homner 2020                  | keine Punkte, keine Streaks                         |
| LLM-Bewertung offener Antworten ist mittelmäßig                                 | QWK ≈ 0,6                                                           | aktuelle Einzelstudie                 | Rubrik, Unsicherheit anzeigen, Widerspruch erlauben |
| Lerntypen                                                                       | nicht belegt                                                        | Pashler et al. 2008                   | nicht verwenden                                     |
| FSRS-6                                                                          | Ziel 0,90 Standard; > 0,97 nicht sinnvoll                           | ts-fsrs-Doku, Anki-Handbuch           | Schritt 8.3                                         |
| Safari löscht Daten nach 7 Tagen ohne Nutzung, Home-Bildschirm-Apps ausgenommen | –                                                                   | WebKit-Dokumentation                  | Schritt 3.5                                         |

**Wichtig:** Gewichte, Schwellen (1,6×, 20 Punkte, 70–85 % Trefferquote) und Grenzen (3–8 Fähigkeiten pro Thema) sind **begründete Startwerte**, keine Studienwerte. Lege sie zentral in Konfigurationsdateien ab, damit sie später mit echten Daten angepasst werden können.

---

## TEIL E – DEIN ERSTER ARBEITSAUFTRAG

1. Lies dieses Dokument **einmal** vollständig. Danach gilt die Kontextregel aus Teil C.
2. Lege `CLAUDE.md`, `docs/STATUS.md`, `docs/ENTSCHEIDUNGEN.md` und `docs/OFFENE_FRAGEN.md` an.
3. Schreibe `docs/plans/schritt-0.md`.
4. Setze Schritt 0 um, prüfe die Abnahme und aktualisiere STATUS.md.
5. Melde dich mit einer kurzen Zusammenfassung in einfachem Deutsch: Was ist fertig, was wurde getestet, was ist der nächste Schritt.

**Arbeite danach in der Meilenstein-Reihenfolge weiter (Teil C). Lass keinen Schritt aus, der für den aktuellen Meilenstein vorgesehen ist. Melde nichts als fertig, was nicht wirklich fertig ist.**
