> **Änderung durch Schritt-5-Umbau: Abnahme ohne Proxy/Turnstile/Budget. Zusätzlich: KV-Bindung `MADAR_KV` und Secret `PAIRING_CODE` in Cloudflare einrichten (docs/KONNEKTOR_ANLEITUNG.md), echten Claude-Konnektor einmal testen.**

### SCHRITT 15 – Veröffentlichung und Betrieb

**Ziel:** Madar ist unter einer eigenen Adresse erreichbar und kann sicher aktualisiert werden.

**Wie du es baust:**

1. **Hosting:** Die App als statische Seite (z. B. Cloudflare Pages), der KI-Proxy als Worker auf derselben Plattform. HTTPS ist Pflicht (sonst funktionieren PWA und Service Worker nicht).
2. **Umgebungen:** `preview` (für jeden Stand zum Testen auf dem iPhone, eigene Adresse) und `production`. Der Auftraggeber testet immer zuerst die Preview-Adresse.
3. **Geheimnisse** (API-Schlüssel, Signaturschlüssel) nur als Umgebungsvariablen der Plattform, nie im Repository. Ein Check in der CI sucht nach versehentlich eingecheckten Schlüsseln.
4. **Anleitung für den Auftraggeber** in `docs/BETRIEB.md`, verständlich ohne Programmierkenntnisse: wie man eine neue Version veröffentlicht, wie man zurückrollt, wo man das KI-Budget sieht und ändert.
5. **Impressum und Datenschutzerklärung** als Platzhalter-Seiten mit dem Hinweis, dass sie vor der öffentlichen Veröffentlichung juristisch erstellt werden müssen.

**Abnahme:** Die Preview-Adresse lässt sich auf dem iPhone zum Home-Bildschirm hinzufügen, funktioniert offline, und ein Update erscheint korrekt mit dem Hinweis aus Schritt 12.6.

---

### SPÄTER (Version 2, jetzt nur vorbereiten)

- Synchronisierung zwischen Geräten mit Konto: Speicherlösung dann neu bewerten.
- Mündliches Üben mit Spracherkennung. ASR-Fehler werden dabei nie dem Schüler angelastet.
- Integration in ChatGPT und Claude als **MCP App** (offizieller MCP-Standard für interaktive Oberflächen in Chats). Dieselben Bausteine (Karte, Prüfung, Baum) werden dafür als Widgets wiederverwendet. Achte schon jetzt darauf, dass diese Bausteine eigenständig und ohne App-Rahmen lauffähig sind.
- „Gelände": die Lernreise als Landkarte.
- Simulationen, Lehrkraft- und Elternansicht, Lehrplandaten pro Bundesland.

---
