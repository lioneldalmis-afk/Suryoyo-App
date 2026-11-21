# Surayt-Lern-App

Lern-App für gesprochenes Surayt (Turoyo) für Jugendliche. Der Plan steht in `FAHRPLAN.md`: dort werden erledigte Schritte abgehakt und Entscheidungen in Abschnitt 8 festgehalten. Der Nutzer ist kein Entwickler und schreibt Deutsch.

## Regeln für Inhalte

- Inhalte kommen nur aus *Šlomo Surayt* (textbook.surayt.com) und aus geprüften Community-Einreichungen. Niemals Surayt-Wörter, -Sätze oder Übersetzungen selbst formulieren – auch nicht für Beispieltexte, Lob oder Platzhalter in der Oberfläche. Wer Surayt in der Oberfläche braucht, nimmt einen Eintrag aus den Daten.
- Einzige Ausnahme (seit 21.11.2026, Fahrplan Phase 4b): Der Baukasten des Übersetzers darf Sätze aus Lehrbuch-Bausteinen nach Lehrbuch-Regeln zusammensetzen. Sie tragen immer das Schild „Zusammengesetzt – nicht geprüft“, haben keine Aufnahme und erscheinen nur im Übersetzer – nie in Übungen, Karteikasten oder Satz der Woche. Claude programmiert die Regeln nach dem Lehrbuch, schreibt aber keine Surayt-Sätze von Hand; bestätigen kann nur ein Muttersprachler.
- Kein klassisches Syrisch.
- Umschrift, Deutsch und syrische Schrift wörtlich wie in der Quelle, samt Klammerzusätzen.
- Keine Bezeichnungen für die Volksgruppe in der Oberfläche; die Sprache heißt wie im Lehrbuch „Surayt“.

## Arbeiten im Projekt

- `npm test` (Vitest: Inhalte und Übungslogik), `npm run build` (Typprüfung + Build), `npm run dev`.
- Lektion einlesen: `npm run extract -- <Nr>` oder `-- <von>-<bis>`; in Claude Code mit `NODE_USE_ENV_PROXY=1` davor, beim Ausprobieren zusätzlich `EXTRAKT_CACHE=<Ordner im Scratchpad>`, um die Website zu schonen. Die Website ist nur in der Cloud-Umgebung „Suryoyo-App“ erreichbar.
- Datenmodell: `text` ist der Dialog oder Lesetext einer Lektion (Dialogzeilen haben `sprecher`), `einleitung` steht davor. Im Wortschatz ist `latein` das Stichwort und `hinweis` der Zusatz dahinter. Markierungen in `tags` übersteht ein erneutes Einlesen; `nur-mit-bild` blendet einen Satz aus (siehe `src/data/index.ts`).
- Lernpfad und Übungen entstehen aus den Daten: `lernreihenfolge` (`src/lib/session.ts`) → Einheiten (`src/lib/einheiten.ts`) → Aufgaben. Lernstand und Karteikasten liegen im Browser unter `surayt.fortschritt.v1`, XP, Serie, Abzeichen und Einstellungen unter `surayt.motivation.v1`, zuletzt Nachgeschlagenes und Wortanfragen unter `surayt.woerterbuch.v1`; alles muss mit altem Stand weiter funktionieren (neue Felder bekommen beim Laden einen Standardwert). Abzeichen, Bedienhinweise und Lob sind deutsche Oberflächentexte – Surayt darin nur aus den Daten.
- Übersetzer (bis 21.11.2026 „Wörterbuch“; Adresse `#/uebersetzer`, alte `#/woerterbuch`-Links führen weiter; im Code heißen Dateien und Speicher weiter `woerterbuch`): `src/lib/woerterbuch.ts` durchsucht Wortschatz, Sätze und Glossar und zeigt nur, was in den Daten steht – nichts Erratenes. Jeder Treffer trägt ein Schild (`Stufe`, Bauteil `src/components/Schild.tsx`): `lehrbuch`, `muttersprachler` (Einträge mit `quelle: 'community'`) oder `zusammengesetzt` (nur vom Baukasten, nie in den Daten). Wortanfragen bleiben bis Phase 5 auf dem Gerät.
- Lektion 1–2 haben statt `text` das Feld `aussprache` (Alphabet, Laute, Hörpaare). Familientisch-Sätze setzt nicht Claude: Vorschläge stehen in `inhalte/familientisch-vorschlag.md`, ein Mensch hakt ab, `npm run familientisch` überträgt.
- Sonderzeichen in Suchmustern im Code als `\u{…}` mit `u`-Flag schreiben (z. B. `/[\u{700}-\u{74F}]/u`): Beim Schreiben von Dateien wird `\uXXXX` sonst zu echten, teils unsichtbaren Zeichen.
- Oberfläche und Datenfelder sind deutsch (`latein`, `deutsch`, `lektion` …), Kommentare ebenfalls.
- Bewusst einfach halten: keine zusätzlichen Pakete ohne Not, keine Schriften oder Skripte von fremden Servern (Datenschutz, viele Nutzer sind minderjährig).
- Änderungen an der Oberfläche im Browser in Handygröße prüfen (Playwright ist vorinstalliert). `window.scrollTo` und ähnliche Aufrufe geben in neuem Chromium ein Promise zurück – nicht direkt aus `useEffect` zurückgeben.
- Audio lässt sich nur per `<audio>`-Element von der Lehrbuch-Website abspielen (kein CORS, keine Range-Anfragen), also nicht per `fetch` laden oder im Service Worker zwischenspeichern.
