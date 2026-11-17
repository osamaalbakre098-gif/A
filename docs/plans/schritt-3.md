# Plan Schritt 3 – Datenbank, Ereignisprotokoll, Datensicherheit

**Dateien:** `src/data/{ids,hash,clock}.ts`, `src/data/db/{schema,migrations,db,backups,errors,storage,transfer}.ts`, `src/data/events/{events,projections}.ts`, UI `src/ui/screens/DataPanel.tsx`, Tests in `tests/migrations`, `tests/unit`, `tests/e2e`.
**Schnittstellen:** `openDatabase(name, {now, migrations?})`, `appendEvent(db, input, now)`, `loadProjection(db, projection)`, `exportZip(db, now)`, `importZip(db, bytes, {now, estimate})`, `checkStorage(...)`.
**Entscheidungen:** Tabellen exakt nach Prompt 3.2 (+ separate Backup-Datenbank `madar-backups`). Zeitstempel = Millisekunden (Zahl), FSRS-Karte mit Zahlen statt Date (verlustfreier Export). Dateien als ArrayBuffer (iOS-sicher). Ereignisse unveränderlich (Dexie-Hooks).
**Risiken:** Migration zerstört Daten (→ Backup vorher + Test mit Fixture), halber Import (→ eine Transaktion), Speicher voll (→ Schätzung + Fehlerabbildung), Safari löscht Daten (→ Hinweis, persist(), Export).
**Tests:** Migration v1→v2 (Anzahl + Hash), Backups (max. 3), Export→Import→Export identisch, defekter Import ändert nichts, Ereignisse nicht änderbar/löschbar, Snapshot = Neuberechnung, Benchmark 100 000 Ereignisse in echtem Chromium.
