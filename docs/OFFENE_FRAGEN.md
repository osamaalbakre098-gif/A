# Offene Fragen

1. **`docs/MADAR_PROMPT.md` fehlt im Repo.** Bitte die Prompt-Datei dort ablegen; danach teile ich sie wörtlich in `docs/steps/schritt-00.md … 15.md` und `docs/GRUNDLAGEN.md` auf. (Umkehrbar, nur Dokumentation.)
2. **GitHub-Remote/CI:** Das Repository `osamaalbakre098-gif/A` ist angebunden; die CI-Datei existiert, ihr erster Lauf steht aus.

3. **Cloudflare-Pages-Adresse:** Der Nutzer richtet das Projekt nach `docs/BETRIEB.md` ein und schickt die Adresse. Danach: Erreichbarkeit prüfen, iPhone-Checkliste durchgehen, Ergebnisse in `docs/GERAETETEST.md`.
4. **Produktionszweig:** Soll später ein `main`-Zweig angelegt werden (Freigabe nötig)? Bis dahin liefert Cloudflare vom Arbeitszweig aus.
5. **Claude-Tarif:** Erlaubt dein Tarif „Benutzerdefinierte Konnektoren"? Wenn nein, nutzt du den Rückfall (Kopieren/Einfügen); der Konnektor-Teil ruht dann.
6. **Cloudflare:** KV-Namespace und Secret `PAIRING_CODE` anlegen (Schritte in `docs/KONNEKTOR_ANLEITUNG.md`), nachdem die Seite ausgeliefert ist.
7. **Echter Test:** Einmal einen echten „baum"-Auftrag durch Claude laufen lassen; danach Antwortqualität und Schemafehler auswerten und ggf. Anweisungen nachschärfen.
8. **Version 2:** Proxy/Turnstile/Budget/mehrere Nutzer (zurückgestellt).
