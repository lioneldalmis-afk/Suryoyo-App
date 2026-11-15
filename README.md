# Surayt-Lern-App (Arbeitstitel „Mamlo“)

Eine Web-App, mit der Jugendliche **gesprochenes Surayt (Turoyo)** lernen, damit sie am Familientisch mitreden und sich mit ihren Großeltern unterhalten können. Sie läuft im Browser und lässt sich auf iPhone und Android wie eine normale App auf den Homescreen legen (PWA).

Der Plan mit allen Phasen steht in [FAHRPLAN.md](FAHRPLAN.md).

## Stand

Prototyp mit Lektion 3 „Šlomo“ aus dem Lehrbuch *Šlomo Surayt*:

- Dialog zum Anhören, Zeile für Zeile oder am Stück
- 51 Wörter mit Aufnahme
- Drei Übungstypen: Karteikarte, Multiple Choice, Hören & Auswählen
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
| `src/data/` | Die Inhalte als JSON: `kurs.json` (Lernpfad), `lektion-03.json` (Dialog, Wortschatz, Audio-Links) |
| `src/lib/` | Logik ohne Oberfläche: Übungen erzeugen (`session.ts`), Lernstand (`progress.ts`), Audio (`audio.ts`), Adressen (`router.ts`) |
| `src/screens/` | Die Bildschirme: Start, Lektion, Übungsrunde, Über die App |
| `src/components/` | Bausteine wie Lautsprecher-Knopf und die Übungsaufgaben |
| `src/styles.css` | Die gesamte Gestaltung; Farben stehen oben als Variablen |
| `scripts/` | Extraktions-Skript für die Lehrbuch-Website |

## Eine Lektion hinzufügen

```bash
npm run extract -- 4
```

Das Skript liest Dialog und Wortschatz der Lektion von der Website und schreibt `src/data/lektion-04.json`. Danach die Datei in `src/data/index.ts` eintragen. Die Übungen entstehen automatisch aus den Daten.

Das Skript ist bisher nur an Lektion 3 erprobt. Andere Lektionen können anders aufgebaut sein, deshalb das Ergebnis immer gegen die Website prüfen.

## Veröffentlichen

Jede Änderung auf `main` wird automatisch getestet, gebaut und auf GitHub Pages veröffentlicht (`.github/workflows/deploy.yml`). Dafür muss einmalig im Repository unter **Settings → Pages → Source** die Option **GitHub Actions** gewählt sein.
