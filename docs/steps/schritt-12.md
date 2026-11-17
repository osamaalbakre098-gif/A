### SCHRITT 12 – Offline, Leistung, PWA

**Wie du es baust:**

1. **Offline verfügbar:** Lesen, Suche, Wiederholen, Üben mit vorhandenen Aufgaben, Planen und Fortschritt.
2. **Online nötig:** Material analysieren, neue Inhalte erzeugen, offene Antworten bewerten. Die UI zeigt das klar an. Offline-Aufträge kommen in eine Warteschlange und laufen beim nächsten Online-Start.
3. **Leistungsbudgets:**
   - Das Start-JavaScript für die Lichtung ist höchstens 170 KB gzip groß.
   - pdf.js, tesseract.js, die Prüfung und der Baum-Editor werden erst bei Bedarf geladen.
   - LCP ≤ 2,5 s, INP ≤ 200 ms auf einem Mittelklasse-iPhone.
   - Übergänge innerhalb einer Sitzung dauern höchstens 100 ms.
4. Lighthouse CI mit diesen Budgets in der CI.
5. **iOS:** Kein Background Sync. Web Push kommt erst in Version 2 und nur nach Zustimmung.
6. **Updates sicher ausliefern:** Der Service Worker nutzt `registerType: 'prompt'`. Eine neue Version wird **nie mitten in einer Sitzung** aktiviert, sondern erst nach dem Abschluss mit dem Hinweis „Neue Version bereit – jetzt neu laden". Vor dem Aktivieren läuft die Datenbank-Migration mit Backup (Schritt 3.3). Ein E2E-Test simuliert ein Update während einer laufenden Sitzung.

**Abnahme:** Lighthouse ≥ 90 in allen Kategorien (mobil). Alle Offline-Abläufe funktionieren im Flugmodus (E2E-Test mit `context.setOffline(true)`).

---
