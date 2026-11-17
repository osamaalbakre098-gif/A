### SCHRITT 3 – Datenbank, Ereignisprotokoll, Datensicherheit

**Ziel:** Die Daten des Schülers sind sicher, nachvollziehbar und gehen nie verloren.

**Was du baust:** Eine lokale Datenbank mit Dexie (IndexedDB), ein unveränderliches Ereignisprotokoll, Migrationen, Backups sowie Export und Import.

**Wie du es baust:**

**3.1 Grundidee: Ereignisse statt Zustände.** Jede Lernhandlung wird als unveränderliches Ereignis gespeichert, zum Beispiel `AnswerSubmitted`, `HintUsed`, `CardReviewed`, `SessionStarted`, `BreakTaken`, `UserOverride` oder `FileImported`. Zustände wie Beherrschung, Wiederholungstermine und Baumfarbe werden **daraus berechnet** (Projektionen). Dadurch geht nichts verloren, und die Logik kann später verbessert und rückwirkend neu berechnet werden.

**3.2 Tabellen (Dexie):**

```ts
subjects    { id, name, colorKey, createdAt, archived }
documents   { id, sha256, subjectId, name, type, blobRef, pageCount, ocrStatus, importedAt }  // gleiche Datei in einem Fach nur einmal (sha256+subjectId eindeutig)
blobs       { sha256, data }                       // jede Datei nur einmal gespeichert, auch wenn sie in mehreren Fächern liegt
chunks      { id, documentId, page, bbox?, text, origin: 'text'|'ocr', ocrConfidence? }
topics      { id, subjectId, title, order, origin: 'auto'|'user', hidden }
skills      { id, topicId, title, description, kind: 'fakt'|'verfahren'|'verstaendnis', bloom, afb?,
              order, origin: 'auto'|'user'|'fallback', hidden, examRelevant, sourceChunkIds[] }
requires    { skillId, requiresSkillId }      // optional, nur innerhalb eines Fachs
items       { id, skillId, kind, subtype, prompt, answer, rubric?, distractors?, hints[1..4]?, sourceRefs[],
              bloom, difficulty, status: 'draft'|'active'|'retired', createdBy: 'ai'|'user', generatorVersion? }
lessons     { skillId, explanation, alternativeExplanation, workedExample?, sourceRefs[], generatorVersion }
misconceptions { id, skillId, pattern, diagnosticQuestion, explanation }
cards       { itemId, fsrs (ts-fsrs Card), due }
attempts    { id, itemId, ts, correct, partial, hintLevel, latencyMs, confidence?, errorType?, gradedBy }
exams       { id, subjectId, date, skillIds[], gradingSystem? }
sessions    { id, startedAt, endedAt, plan, endReason }
events      { id, ts, type, payload, schemaVersion }     // append-only
annotations { id, documentId, page, rects, color, note? }
jobs        { id, type: 'ocr'|'tree'|'items'|'lesson'|'grade', payload, status, attempts, createdAt }  // Auftragswarteschlange
snapshots   { projection, lastEventId, data, createdAt }
settings    { key, value }     // u. a. Sprache, Altersgruppe, KI an/aus, Zeitbudget, Geräte-Token
```

**3.3 Migrationen.**

- Jede Schemaänderung bekommt eine neue Dexie-Version mit `upgrade()`.
- **Vor jeder Migration** erstellt die App automatisch ein JSON-Backup. Die letzten drei Backups bleiben erhalten.
- Für jede Migration gibt es einen Test, der eine Fixture-Datenbank der Vorversion lädt, migriert und Anzahl sowie Hash der Datensätze vergleicht.

**3.4 Export und Import.**

- Export als ZIP mit allen Daten als JSON und allen Originaldateien.
- Der Import stellt alles wieder her, auch auf einem anderen Gerät.
- Ein Test prüft: Export → Import → Export ergibt identische Daten.

**3.4b Speicherplatz und Leistung der Datenbank.**

- Vor jedem Import mit `navigator.storage.estimate()` prüfen, ob genug Platz frei ist. Wird es knapp (unter 15 % frei), erscheint ein ruhiger Hinweis mit Vorschlägen (alte Backups löschen, Dateien exportieren). Ein Import darf **nie** halb gespeichert werden: Er läuft in einer Dexie-Transaktion oder wird vollständig zurückgerollt.
- `QuotaExceededError` wird überall abgefangen und verständlich erklärt, nie still verschluckt.
- **Snapshots:** Projektionen (Beherrschung, FSRS-Zustand, Baum) werden als Zwischenstand gespeichert. Beim Start werden nur Ereignisse **nach** dem letzten Snapshot neu angewendet. Ziel: App-Start unter 1 Sekunde auch mit 100 000 Ereignissen (Benchmark-Test).
- Ereignisse werden nie gelöscht. Nur Snapshots dürfen neu berechnet werden.

**3.5 iPhone-Besonderheit (sehr wichtig).**

- Safari löscht im normalen Browser-Tab gespeicherte Daten nach 7 Tagen ohne Nutzung der Seite. Als **Home-Bildschirm-App** installierte Web-Apps sind davon ausgenommen.
- Baue deshalb im Onboarding auf iOS eine klare, bebilderte Anleitung „Zum Home-Bildschirm hinzufügen". Solange die App nicht installiert ist, erscheint ein ruhiger, dauerhafter Hinweis mit einer Backup-Erinnerung.
- Rufe beim Start `navigator.storage.persist()` auf und zeige das Ergebnis auf der Datenschutzseite an.
- Installierte App und Safari-Tab haben **getrennte** Speicher. Erkläre das in der UI und biete Export/Import als Übertragungsweg an.

**Abnahme:**

- Migrationstests sind grün, Export-Import-Rundlauf identisch.
- Ein simuliertes Update von v1 auf v2 verliert keinen Datensatz.

---
