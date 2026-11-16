# Surayt-Lern-App (Arbeitstitel „Mamlo“)

Eine Web-App, mit der Jugendliche **gesprochenes Surayt (Turoyo)** lernen, damit sie am Familientisch mitreden und sich mit ihren Großeltern unterhalten können. Sie läuft im Browser und lässt sich auf iPhone und Android wie eine normale App auf den Homescreen legen (PWA).

Der Plan mit allen Phasen steht in [FAHRPLAN.md](FAHRPLAN.md).

## Stand

Prototyp mit allen 16 Lektionen aus Level A des Lehrbuchs *Šlomo Surayt*:

- Lektion 1 und 2 als Aussprache-Guide: Alphabet, besondere Laute mit Beispielwörtern und Hörpaare („talyo – ṭalyo“)
- Zu Lektion 3–16 der Dialog oder Lesetext zum Anhören, Zeile für Zeile oder am Stück
- Zusammen gut 1.300 Wörter, jedes mit Aufnahme
- Vier Übungstypen: Karteikarte, Multiple Choice, Hören & Auswählen, Hörpaar
- Lernstand wird auf dem Gerät gespeichert, ohne Konto
- Läuft offline (bis auf das Audio, das von der Lehrbuch-Website kommt)

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
| `src/data/` | Die Inhalte als JSON: `kurs.json` (Lernpfad), `lektion-01.json` bis `lektion-16.json` (Einleitung, Dialog oder Lesetext bzw. Aussprache, Wortschatz, Audio-Links), `glossar-a.json` (Glossar für den späteren Übersetzer) |
| `inhalte/` | Listen zum Prüfen durch Menschen, z. B. die Familientisch-Sätze |
| `src/lib/` | Logik ohne Oberfläche: Übungen erzeugen (`session.ts`), Lernstand (`progress.ts`), Audio (`audio.ts`), Adressen (`router.ts`) |
| `src/screens/` | Die Bildschirme: Start, Lektion, Übungsrunde, Über die App |
| `src/components/` | Bausteine wie Lautsprecher-Knopf und die Übungsaufgaben |
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

Jede Änderung auf `main` wird automatisch getestet, gebaut und auf GitHub Pages veröffentlicht (`.github/workflows/deploy.yml`). Dafür muss einmalig im Repository unter **Settings → Pages → Source** die Option **GitHub Actions** gewählt sein.

## Familientisch-Sätze prüfen

In `inhalte/familientisch-vorschlag.md` stehen Sätze, die man zu Hause direkt verwenden kann – ein Vorschlag, den jemand prüft, der Surayt spricht. Auf GitHub die Datei bearbeiten und bei passenden Sätzen `[ ]` durch `[x]` ersetzen. Danach überträgt dieser Befehl die Häkchen in die Daten:

```bash
npm run familientisch
```
