# Surayt-Lern-App

Lern-App für gesprochenes Surayt (Turoyo) für Jugendliche. Der Plan steht in `FAHRPLAN.md`: dort werden erledigte Schritte abgehakt und Entscheidungen in Abschnitt 8 festgehalten. Der Nutzer ist kein Entwickler und schreibt Deutsch.

## Regeln für Inhalte

- Inhalte kommen nur aus *Šlomo Surayt* (textbook.surayt.com) und aus geprüften Community-Einreichungen. Niemals Surayt-Wörter, -Sätze oder Übersetzungen selbst formulieren – auch nicht für Beispieltexte, Lob oder Platzhalter in der Oberfläche. Wer Surayt in der Oberfläche braucht, nimmt einen Eintrag aus den Daten.
- Kein klassisches Syrisch.
- Umschrift, Deutsch und syrische Schrift wörtlich wie in der Quelle, samt Klammerzusätzen.
- Keine Bezeichnungen für die Volksgruppe in der Oberfläche; die Sprache heißt wie im Lehrbuch „Surayt“.

## Arbeiten im Projekt

- `npm test` (Vitest: Inhalte und Übungslogik), `npm run build` (Typprüfung + Build), `npm run dev`.
- Lektion einlesen: `npm run extract -- <Nr>` oder `-- <von>-<bis>`; in Claude Code mit `NODE_USE_ENV_PROXY=1` davor, beim Ausprobieren zusätzlich `EXTRAKT_CACHE=<Ordner im Scratchpad>`, um die Website zu schonen. Die Website ist nur in der Cloud-Umgebung „Suryoyo-App“ erreichbar.
- Datenmodell: `text` ist der Dialog oder Lesetext einer Lektion (Dialogzeilen haben `sprecher`), `einleitung` steht davor. Im Wortschatz ist `latein` das Stichwort und `hinweis` der Zusatz dahinter. Markierungen in `tags` übersteht ein erneutes Einlesen; `nur-mit-bild` blendet einen Satz aus (siehe `src/data/index.ts`).
- Oberfläche und Datenfelder sind deutsch (`latein`, `deutsch`, `lektion` …), Kommentare ebenfalls.
- Bewusst einfach halten: keine zusätzlichen Pakete ohne Not, keine Schriften oder Skripte von fremden Servern (Datenschutz, viele Nutzer sind minderjährig).
- Änderungen an der Oberfläche im Browser in Handygröße prüfen (Playwright ist vorinstalliert). `window.scrollTo` und ähnliche Aufrufe geben in neuem Chromium ein Promise zurück – nicht direkt aus `useEffect` zurückgeben.
- Audio lässt sich nur per `<audio>`-Element von der Lehrbuch-Website abspielen (kein CORS, keine Range-Anfragen), also nicht per `fetch` laden oder im Service Worker zwischenspeichern.
