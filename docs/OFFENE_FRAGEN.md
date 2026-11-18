# Offene Fragen

1. **`docs/MADAR_PROMPT.md` fehlt im Repo.** Bitte die Prompt-Datei dort ablegen; danach teile ich sie wörtlich in `docs/steps/schritt-00.md … 15.md` und `docs/GRUNDLAGEN.md` auf. (Umkehrbar, nur Dokumentation.)
2. **GitHub-Remote/CI:** Das Repository `osamaalbakre098-gif/A` ist angebunden; die CI-Datei existiert, ihr erster Lauf steht aus.

3. **Cloudflare-Pages-Adresse:** Der Nutzer richtet das Projekt nach `docs/BETRIEB.md` ein und schickt die Adresse. Danach: Erreichbarkeit prüfen, iPhone-Checkliste durchgehen, Ergebnisse in `docs/GERAETETEST.md`.
4. **Produktionszweig:** Soll später ein `main`-Zweig angelegt werden (Freigabe nötig)? Bis dahin liefert Cloudflare vom Arbeitszweig aus.
5. **Claude-Tarif:** Erlaubt dein Tarif „Benutzerdefinierte Konnektoren"? Wenn nein, nutzt du den Rückfall (Kopieren/Einfügen); der Konnektor-Teil ruht dann.
6. **Cloudflare:** KV-Namespace und Secret `PAIRING_CODE` anlegen (Schritte in `docs/KONNEKTOR_ANLEITUNG.md`), nachdem die Seite ausgeliefert ist.
7. **Echter Test:** Einmal einen echten „baum"-Auftrag durch Claude laufen lassen; danach Antwortqualität und Schemafehler auswerten und ggf. Anweisungen nachschärfen.
8. **Version 2:** Proxy/Turnstile/Budget/mehrere Nutzer (zurückgestellt).
9. **UI Phase A:** WebKit/echtes iPhone: Safe Area (`env()`), Unschärfe der Kopfzeile/Navigation, Sheet mit dem Finger ziehen, Dynamic Island. Bitte auf dem iPhone ansehen (Vorschau-Links in der Meldung).
10. **UI-Vorgabe:** Die Vorgabe nennt „Aufträge" auch als Karte auf „Heute"; `Heute` zeigt sie bisher nur bei vorbereiteten Fähigkeiten (kommt in Phase B mit den Zuständen A–F).
11. **Arabische Ziffern:** Standard ist jetzt lateinisch (1, 2, 3). Möchtest du eine Einstellung, um arabisch-indische Ziffern (١، ٢، ٣) zu wählen?
12. **Einstellungen „Entspannt/Normal/Gründlich"** (UI_VORGABE 6.13): Der Studienleiter kennt diese Stufen nicht. Ich habe sie nicht erfunden und nichts gebaut. Sag, was sie bewirken sollen, dann kommt es als Schritt in den Studienleiter.
13. **Fortschritt/„Warum?" mit Quellen:** Texte kommen aus den bestehenden Gründen (`reason.*`); fehlende Daten werden nicht ergänzt.
14. **Datumsersatz mit drei Feldern** (6.14): nicht gebaut; das native Feld genügt auf dem iPhone. Bitte beim iPhone-Test prüfen.
15. **Eingestellte Ziffern (deine letzte Zeile „1234567890 … die anders"):** Ich habe sie nicht verstanden. Meinst du eine Einstellung für die Ziffernform (lateinisch/arabisch-indisch)? Bis zur Antwort bleibt es lateinisch.
