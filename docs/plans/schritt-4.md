# Plan Schritt 4 – Material importieren, lesen, durchsuchen (Meilenstein-1-Umfang, ohne OCR)

**Umfang jetzt:** Fächer anlegen, Material importieren (PDF, Text/Markdown, Text einfügen; Fotos werden gespeichert und angezeigt, Texterkennung folgt), PDF-Leser (Canvas + Textlayer, sichtbare Seiten, Zoom bis 400 %, Umfließen-Modus, Suche mit Markierung, Markieren und Notizen), Zerlegung in Abschnitte mit Überschriften, einheitliche Suche (MiniSearch).
**Später:** OCR (4.3, Meilenstein 2), Formeln KaTeX/MathLive (4.6, mit Schritt 7), „Karte daraus machen" und „Erklär mir das" (brauchen Fähigkeiten und KI, Schritte 6/7).
**Dateien:** `src/content/{structure,text,pdf,import,search}.ts`, `src/ui/screens/{DbProvider,SubjectsPage,SubjectPage,ReaderPage,PdfReader,SearchPage}.tsx`, Tests.
**Schema (nur optionale Felder, keine Migration):** `chunks.headingPath`, `documents.outline`, `documents.textlessPages`.
**Risiken:** pdf.js-Worker in Vite/PWA, 300 Seiten (nur sichtbare Seiten rendern), Text über Spans verteilt (Suche), Sicherheit (Text nur als `textContent`).
**Tests:** reine Logik (Zeilen, Überschriften, Abschnitte 150–400 Wörter, Normalisierung, Suche), Import (Duplikat pro Fach, gleiche Datei in zweitem Fach, Originalhash), Browser: PDF importieren, lesen, zoomen, suchen, springen; 300-Seiten-PDF.
