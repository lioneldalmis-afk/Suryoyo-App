# Surayt-Lern-App (Arbeitstitel „Mamlo“)

Eine Web-App, mit der Jugendliche **gesprochenes Surayt (Turoyo)** lernen, damit sie am Familientisch mitreden und sich mit ihren Großeltern unterhalten können. Sie läuft im Browser und lässt sich auf iPhone und Android wie eine normale App auf den Homescreen legen (PWA).

**Zum Ausprobieren:** https://lioneldalmis-afk.github.io/Suryoyo-App/

Der Plan mit allen Phasen steht in [FAHRPLAN.md](FAHRPLAN.md).

## Auf dem Handy ausprobieren

Den Link oben auf dem Handy öffnen und die App auf den Homescreen legen – dann startet sie wie eine normale App:

- **iPhone:** in **Safari** öffnen, unten auf das Teilen-Symbol (Quadrat mit Pfeil) tippen, dann **„Zum Home-Bildschirm“**.
- **Android/Samsung:** in **Chrome** öffnen, oben rechts auf ⋮ tippen, dann **„App installieren“** oder **„Zum Startbildschirm hinzufügen“**.

Neue Versionen kommen von selbst: Einfach die App schließen und neu öffnen. Die Aufnahmen kommen von der Lehrbuch-Website und brauchen Internet; alles andere geht auch offline.

**Was ausprobieren (etwa 10 Minuten):**

1. „Los geht’s“ – die erste Einheit von Lektion 3 durchspielen, danach gleich die zweite.
2. Beim Nachsprechen am Ende einer Einheit das Mikrofon erlauben, sich aufnehmen und mit dem Original vergleichen.
3. In Lektion 3 unter „Üben“ das **Rollenspiel** starten, z. B. als Afrem.
4. Oben auf der Startseite die Flamme antippen: „Deine Erfolge“ mit Serie, Tagesziel und Abzeichen.
5. Unten auf **Wörterbuch** tippen und etwas nachschlagen – auf Deutsch („Danke“, „Wie geht es dir?“) oder auf Surayt, auch ohne Sonderzeichen („slomo“). Einen Treffer antippen: großer Lautsprecher zum Vorspielen, Herkunft und Beispielsatz. Etwas suchen, das fehlt, und „Wort anfragen“ ausprobieren.
6. Am nächsten Tag wiederkommen: Unten unter **Karteikasten** steht, wie viele Karten dran sind. Erst überlegen, dann aufdecken und ehrlich bewerten: „Nicht gewusst“, „Knapp“ oder „Gewusst“.

**Fragen fürs Feedback:** Sind die Einheiten zu lang oder zu kurz? Klappen Audio und Mikrofon? Ist irgendwo unklar, was man tun soll? Klingt beim Nachsprechen etwas komisch? Findet das Wörterbuch, was man sucht – und welche Wörter fehlen?

Der Lernstand bleibt nur auf dem jeweiligen Handy. Zum Neuanfangen: „Über die App“ → „Lernstand zurücksetzen“.

## Stand

Prototyp mit allen 16 Lektionen aus Level A des Lehrbuchs *Šlomo Surayt*:

- Lektion 1 und 2 als Aussprache-Guide: Alphabet, besondere Laute mit Beispielwörtern und Hörpaare („talyo – ṭalyo“)
- Zu Lektion 3–16 der Dialog oder Lesetext zum Anhören, Zeile für Zeile oder am Stück
- Zusammen gut 1.300 Wörter, jedes mit Aufnahme
- Lernpfad wie bei Sprach-Apps: Jede Lektion ist in kleine Einheiten aufgeteilt (318 insgesamt), die nacheinander freigeschaltet werden
- Übungstypen: Karteikarte, Multiple Choice, Hören & Auswählen und „Genau hinhören“ (in den Einheiten), Hörpaar, Satz bauen, Lückentext, Nachsprechen (eigene Aufnahme mit dem Original vergleichen) und Dialog-Rollenspiel
- Karteikasten mit 6 Fächern (Active Recall + Spaced Repetition): Karte ansehen, selbst überlegen, aufdecken und bewerten. Was man nicht wusste, kommt gleich wieder, Gewusstes nach 1, 3, 7, 14 und 30 Tagen. Was sitzt, kommt umgedreht (Deutsch vorne), und auch die Aufgaben in den Einheiten werden kniffliger
- Der Fortschritt wird nach jeder Antwort gespeichert; eine abgebrochene Einheit geht beim nächsten Mal an derselben Stelle weiter
- XP, Tagesziel, Tagesserie und Abzeichen – bewusst ohne „Leben“, Fehler kosten nichts
- Satz der Woche für den Familientisch (sobald die Familientisch-Liste geprüft ist)
- Wörterbuch Deutsch ↔ Surayt mit gut 2.100 Wörtern und Sätzen aus den Lektionen und dem Glossar des Lehrbuchs: findet auch ohne Sonderzeichen („slomo“ → „šlomo“), mit „sch“/„sh“, Wortteilen und Tippfehlern; großer Lautsprecher zum Vorspielen, Herkunft und Beispielsatz; geht offline. Keine KI-Übersetzung – was fehlt, lässt sich anfragen (die Anfragen werden bis zu Phase 5 auf dem Gerät gesammelt)
- Lernstand wird auf dem Gerät gespeichert, ohne Konto
- Läuft offline, auch das Wörterbuch (bis auf das Audio, das von der Lehrbuch-Website kommt)

## Woher die Inhalte kommen

Alle Wörter, Sätze, Übersetzungen und Aufnahmen stammen aus dem Online-Lehrbuch [Šlomo Surayt](https://textbook.surayt.com/de) (Aramaic Online Project, Freie Universität Berlin). Es wird nichts frei übersetzt oder dazuerfunden, und es kommt kein klassisches Syrisch hinein.

Die Erlaubnis des Lehrbuch-Teams für Texte und Audio ist noch nicht eingeholt (siehe Fahrplan, Phase 0). Bis dahin ist das hier ein Prototyp zum Ausprobieren im kleinen Kreis.

## Entwickeln

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

`npm run dev` startet die App lokal, `npm test` prüft Inhalte und Übungslogik, `npm run build` erzeugt die fertige App im Ordner `dist`.

## Aufbau

| Ort | Inhalt |
|---|---|
| `src/data/` | Die Inhalte als JSON: `kurs.json` (Lernpfad), `lektion-01.json` bis `lektion-16.json` (Einleitung, Dialog oder Lesetext bzw. Aussprache, Wortschatz, Audio-Links), `glossar-a.json` (Glossar A, fürs Wörterbuch) |
| `inhalte/` | Listen zum Prüfen durch Menschen, z. B. die Familientisch-Sätze |
| `src/lib/` | Logik ohne Oberfläche: Übungen erzeugen (`session.ts`), Einheiten und Karteikasten-Runden (`einheiten.ts`), falsche Antwortmöglichkeiten (`ablenker.ts`), Lernstand und Karteikasten (`progress.ts`), XP, Serie und Satz der Woche (`motivation.ts`), Abzeichen (`abzeichen.ts`), Wörterbuch-Suche (`woerterbuch.ts`), zuletzt Nachgeschlagenes und Wortanfragen (`nachschlagen.ts`), Rollenspiel (`rollenspiel.ts`), eigene Aufnahme (`aufnahme.ts`), Audio (`audio.ts`), Adressen (`router.ts`) |
| `src/screens/` | Die Bildschirme: Start, Lektion, Übungsrunde, Karteikasten, Wörterbuch, Rollenspiel, Erfolge, Über die App |
| `src/components/` | Bausteine wie Lautsprecher-Knopf, Leiste am unteren Rand und die Übungsaufgaben |
| `src/styles.css` | Die gesamte Gestaltung; Farben stehen oben als Variablen |
| `scripts/` | Einlesen der Lehrbuch-Website (`extract-lesson.mjs` mit den Modulen `lektion.mjs`, `alphabet.mjs`, `glossar.mjs`) und Übernahme der Familientisch-Häkchen |

## Eine Lektion hinzufügen

```bash
npm run extract -- 4
```

Das Skript liest Text und Wortschatz der Lektion von der Website und schreibt `src/data/lektion-04.json`. Mehrere Lektionen auf einmal gehen mit `npm run extract -- 1-16`, das Glossar mit `npm run extract -- glossar`. Die App lädt jede `lektion-NN.json` automatisch, und die Übungen entstehen aus den Daten.

Erneutes Einlesen überschreibt die Datei, behält aber von Hand gesetzte Markierungen (`tags`). Zwei Markierungen haben eine Bedeutung:

| Markierung | Bedeutung |
|---|---|
| `nur-mit-bild` | Satz bezieht sich auf ein Bild der Website und wird in der App ausgeblendet |
| `bildtafel` | Wort stammt aus einer Bildtafel statt aus dem Wortschatz der Lektion |

Mit `EXTRAKT_CACHE=<Ordner>` vor dem Befehl werden die Seiten zwischengespeichert, damit wiederholte Läufe die Website nicht erneut abfragen. Nach jedem Einlesen `npm test` laufen lassen: Die Tests prüfen alle Lektionen auf Vollständigkeit.

## Veröffentlichen

Jede Änderung auf `main` wird automatisch getestet, gebaut und auf GitHub Pages veröffentlicht (`.github/workflows/deploy.yml`) – unter https://lioneldalmis-afk.github.io/Suryoyo-App/. Im Repository ist dafür unter **Settings → Pages → Source** die Option **GitHub Actions** gewählt.

## Familientisch-Sätze prüfen

In `inhalte/familientisch-vorschlag.md` stehen Sätze, die man zu Hause direkt verwenden kann – ein Vorschlag, den jemand prüft, der Surayt spricht. Aus den abgehakten Sätzen wählt die App jede Woche den **Satz der Woche**; solange nichts abgehakt ist, erscheint er nicht. Auf GitHub die Datei bearbeiten und bei passenden Sätzen `[ ]` durch `[x]` ersetzen. Danach überträgt dieser Befehl die Häkchen in die Daten:

```bash
npm run familientisch
```
