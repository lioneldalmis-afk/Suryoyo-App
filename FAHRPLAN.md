# Fahrplan: Surayt-Lern-App

*Stand: 16.11.2026 · Dieses Dokument ist unser gemeinsamer Fahrplan. In jedem neuen Chat dieses Projekts reicht: „Weiter mit Phase X, Schritt Y". Erledigtes wird hier abgehakt.*

---

## 1. Ziel und Leitlinien

**Ziel:** Jugendliche lernen **gesprochenes Surayt (Turoyo)** und können am Familientisch mitreden und sich mit ihren Großeltern unterhalten.

**Leitlinien**

1. **Erst hören, dann lesen.** Audio und Alltagssätze gehen vor Grammatik und Schrift.
2. **Saubere Quelle.** Die Inhalte kommen nur aus *Šlomo Surayt* (textbook.surayt.com, Level A) und aus geprüften Community-Einreichungen. **Kein klassisches Syrisch** (Kṯoboyo/Gebetssprache). Claude erfindet keine Übersetzungen.
3. **So einfach wie möglich.** Eine einzige Web-App (PWA), die auf iPhone und Android/Samsung wie eine normale App auf dem Homescreen läuft. In die App Stores kommt sie nur, wenn das später gewünscht ist.
4. **Lateinische Umschrift zuerst**, so wie im Lehrbuch (š, ṭ, ḥ, ṯ, ḏ, c, ë …). Die syrische Schrift wird gleich mit gespeichert und kann später per Schalter eingeblendet werden.
5. **Jede Sitzung liefert etwas zum Ausprobieren**, das man auf dem Handy testen kann.

---

## 2. Bestandsaufnahme der Website (geprüft am 15.11.2026)

**Level A** besteht aus 16 Lektionen sowie Glossar und Verbtabellen:

| Nr. | Lektion | Inhalt |
|---|---|---|
| 1–2 | Olafbeṯ I + II | Alphabet, Laute, Vokale |
| 3 | Šlomo | Hallo / Begrüßung |
| 4 | Iqarṯo | Familie |
| 5 | Madrašto | Schule |
| 6 | Bayto | Haus |
| 7 | Gušmo | Körper |
| 8 | Zabno | Zeit, Zählen, Uhr |
| 9 | Surgoḏo | Kalender |
| 10 | Muklo | Essen |
| 11 | Jule w Gawne | Kleidung und Farben |
| 12 | Mazracto | Bauernhof |
| 13 | Ceḏo zcuro bu Swed | Weihnachten in Schweden |
| 14 | Su taxtor | Beim Arzt |
| 15 | Spor | Sport |
| 16 | Ṭlobo w Gworo | Verlobung und Heirat |
| 17 | Kunoš mele | Glossar A |
| 18 | Surcofo | Verbkonjugation |

**Aufbau einer Lektion:** Dialog (syrische Schrift + Umschrift + Deutsch), Übungen I/II, Grammatik, Kultur, Wortschatz.

**Audio gibt es schon:** Zu **jedem Dialogsatz und jedem Vokabeleintrag** liegt eine MP3 vor. Allein der Wortschatz von Lektion 3 hat etwa 50 Wörter und 104 Audiodateien (Umschrift und syrische Schrift). Audio ist damit **ab dem ersten Prototyp** möglich und muss nicht bis „später" warten.

**Beispiel (Lektion 3, Wortschatz):** šlomo = Hallo · b šayno = Hallo (Antwort) · tawdi = Danke! · fëš bë šlomo = Auf Wiedersehen

**Rechte:** Auf der Website steht keine Lizenzangabe. Die französische Buchfassung auf Zenodo steht unter CC BY 4.0, d. h. Nutzung ist mit Namensnennung erlaubt. Für Website-Texte und Audio sollten wir die Erlaubnis trotzdem beim Team einholen (Phase 0). Kontakt: aramaic.online@gmail.com (Projektleitung Prof. Dr. Shabo Talay, FU Berlin).

**Technischer Hinweis:** Claude Code erreicht die Website direkt, wenn die Sitzung in der Cloud-Umgebung **„Suryoyo-App"** läuft (dort ist `textbook.surayt.com` freigegeben). Die Extraktion läuft über `scripts/extract-lesson.mjs`.

**Nachtrag 15.11.2026 (beim Auslesen von Lektion 3 festgestellt):**
- Im Inhaltsverzeichnis von Level A ist Surcofo Kapitel 17, die Bibliographie Kapitel 18 und das Glossar A Kapitel 19.
- Die Website enthält mehr als Level A: **Šlomo Surayt II – Fortgeschrittene** (8 Lektionen), 10 Lesestücke, Formentabellen und ein **Gesamtglossar Surayt > Deutsch und Deutsch > Surayt** (gute Grundlage für den Übersetzer in Phase 4).
- Jeder Wortschatz-Eintrag hat **zwei Aufnahmen** (eine bei der Umschrift, eine bei der syrischen Schrift). Beide Links sind gespeichert (`audio`, `audio2`); die App nutzt vorerst die erste.
- Der Audio-Server erlaubt nur direktes Abspielen, kein Zwischenspeichern durch die App. **Offline-Audio geht deshalb erst mit eigenen Kopien** der Dateien (nach Erlaubnis, siehe Phase 0).

**Nachtrag 16.11.2026 (beim Einlesen der Lektionen 4–16 festgestellt):**
- Nur die Lektionen **3, 8, 10 und 12 sind Dialoge** mit Sprechern. Die anderen haben einen **Lesetext** (eine kurze Erzählung, z. B. über Familie Be Marawge). Lektion 9 hat keinen eigenen Text, dort ist die Einleitung selbst der Text.
- Die Lektionen 7, 10 und 11 enthalten **Bildtafeln** (Körperteile, Gerichte, Kleidung). Nur die Tafel mit den Gerichten (Lektion 10) hat eine deutsche Zeile, bei den anderen steht die Bedeutung nur im Bild.
- In den Lektionen 13 und 14 steht in der Umschrift stellenweise das **kyrillische „ё“** statt „ë“ (sieht gleich aus, ist technisch ein anderes Zeichen).
- Kleine Tippfehler auf der Website werden wörtlich übernommen, z. B. „Jede Jahreszeitbesteht aus drei Monaten“ (Lektion 9). Eine Liste solcher Stellen könnten wir dem Lehrbuch-Team schicken.

---

## 3. Architektur (bewusst einfach)

```
 Handy (iPhone / Android)
 └─ Web-App (PWA, auf dem Homescreen installierbar, offline nutzbar)
     ├─ Inhalte: JSON-Dateien (Lektionen, Wörterbuch) – direkt in der App
     ├─ Fortschritt: lokal auf dem Gerät (kein Login nötig)
     └─ „Satz einreichen" ──► Supabase (kostenlose Datenbank, nur Schreibzugriff für Nutzer)

 GitHub-Repository (Code + Inhalte)  ──►  GitHub Pages (kostenloses Hosting, automatisch)
        ▲
        └── jeden Sonntag: geplante Aufgabe in Claude liest Einreichungen,
            prüft sie und erstellt einen Änderungsvorschlag (Pull Request) → du gibst frei
```

| Baustein | Wahl | Warum |
|---|---|---|
| App | PWA mit React + Vite | Eine Codebasis für iOS und Android, keine Store-Gebühren, Updates sind sofort live (wichtig für die wöchentlichen Updates) |
| Hosting | GitHub Pages | Kostenlos, veröffentlicht automatisch nach jeder Freigabe |
| Einreichungen | Supabase (Free Tier) | Einfache Tabelle, für Claude per Supabase-Connector lesbar |
| Fortschritt | Lokal im Browser-Speicher | Keine Konten, kein Datenschutz-Aufwand am Anfang |
| Audio | Erst Original-MP3s von der Website verlinkt; nach Erlaubnis Kopien selbst hosten | Sofort nutzbar, später unabhängig und offline |
| App Stores (optional, später) | Capacitor verpackt dieselbe App | Apple 99 €/Jahr, Google 25 € einmalig |

**Datenmodell (ein Eintrag):**

```json
{
  "id": "L03-W-tawdi",
  "latein": "tawdi",
  "syrisch": "ܬܰܘܕܝ",
  "deutsch": "Danke!",
  "audio": "https://textbook.surayt.com/de/files/….mp3",
  "lektion": 3,
  "art": "wort",
  "quelle": "lehrbuch",
  "tags": ["begrüßung", "familientisch"]
}
```

`quelle` ist entweder `lehrbuch` oder `community`. Community-Einträge werden in der App immer gekennzeichnet.

**Wichtige Vereinfachung:** Die Übungen werden **automatisch aus Wortschatz und Dialogen erzeugt**. Eine neue Lektion braucht also nur Daten, keine eigens programmierten Übungen.

---

## 4. Die Phasen

### Phase 0 – Vorbereitung (du, ca. 1 Stunde)
- [x] GitHub-Konto anlegen (kostenlos) und ein leeres Repository erstellen. → `lioneldalmis-afk/Suryoyo-App`
- [ ] E-Mail an das Šlomo-Surayt-Team: Projekt vorstellen und um Erlaubnis für Texte und Audio bitten, eventuell auch um die Audiodateien als Paket. *Claude entwirft die Mail, du schickst sie ab.*
- [ ] Prüfer festlegen: Wer aus Familie oder Gemeinde schaut sich die Einreichungen sprachlich an?
- [ ] App-Namen überlegen. Vorschlag: **„Mamlo"** (= Gespräch, kommt im Dialog von Lektion 3 vor).

### Phase 1 – Grundgerüst + Prototyp mit Lektion 3 (1–2 Sitzungen)
- [x] App-Gerüst: Startseite mit Lernpfad, Lektionsansicht, Übungsmodul, lokaler Fortschritt, PWA-Installation
- [x] Lektion 3 „Šlomo" vollständig: Dialog (19 Zeilen + Einleitung), Wortschatz (51 Wörter), Audio
- [x] Drei erste Übungstypen: Karteikarte (hören → aufdecken), Multiple Choice (Surayt ↔ Deutsch), Hören & Auswählen
- [ ] Veröffentlichung auf GitHub Pages → Link zum Testen auf dem Handy. *Automatik ist vorbereitet (`.github/workflows/deploy.yml`). Es fehlen noch: Änderungen nach `main` übernehmen und einmalig Settings → Pages → Source „GitHub Actions" wählen.*
- [ ] Test mit 2–3 Jugendlichen, Feedback sammeln

### Phase 2 – Inhalte: ganz Level A einpflegen (2–4 Sitzungen)
- [x] Extraktions-Skript: Dialoge, Wortschatz und Audio-Links jeder Lektion → JSON im einheitlichen Format. *Kommt mit allen Lektionsformaten zurecht (Dialog oder Lesetext, Bildtafeln) und liest mehrere Lektionen in einem Lauf: `npm run extract -- 3-16`.*
- [x] Lektionen 4–16 einpflegen. *Alle 14 Lektionen (3–16) sind in der App: 1.288 Wörter, 260 Text- und Dialogzeilen und 58 Einleitungssätze, alle mit Audio und syrischer Schrift.*
- [ ] Lektionen 1–2 als kurzer **Aussprache-Guide**: Was bedeuten š, ṭ, ḥ, c, ë? Jeweils mit Audio
- [ ] Glossar A (Kunoš mele) als Grundlage für den Übersetzer
- [x] Qualitätskontrolle, automatisch: Jeder Audio-Link der Website ist genau einem Eintrag zugeordnet, Stichproben der Audio-Adressen liefern MP3s, die Tests prüfen alle Lektionen (Vollständigkeit, Sprecher, keine Doppelgänger-Zeichen).
- [ ] Qualitätskontrolle durch einen Menschen: in jeder Lektion ein paar Wörter und Sätze anhören und mit dem Text vergleichen
- [ ] In jeder Lektion „Familientisch-Sätze" markieren (Sätze, die man zu Hause direkt verwenden kann)

### Phase 3 – Spielerisches Lernen à la Duolingo (2–3 Sitzungen)
- [ ] Lernpfad mit Einheiten pro Lektion, die nacheinander freigeschaltet werden
- [ ] Weitere Übungstypen: Satz bauen (Wortbausteine), Dialog-Rollenspiel („Du bist Afrem – antworte Aday"), Lückentext, Nachsprechen (eigene Aufnahme mit dem Original vergleichen und selbst bewerten)
- [ ] Motivation: XP, Tagesserie (Streak), Tagesziel, Abzeichen. Bewusst **ohne** „Leben/Herzen", damit kein Frust entsteht
- [ ] Wiederholung: einfache Spaced Repetition (Karteikasten-Prinzip) für Wörter, die man falsch hatte
- [ ] **„Satz der Woche für den Familientisch"**: ein Satz, den man bei Oma oder Opa ausprobiert, dann „Hab ich gesagt!" abhaken

### Phase 4 – Übersetzer / Schnell-Wörterbuch (1–2 Sitzungen)
- [ ] Eigener Tab mit Suchfeld, Deutsch ↔ Surayt; durchsucht Wörter **und** ganze Sätze
- [ ] Tolerante Suche: „slomo" findet „šlomo"; Tippfehler und Wortteile werden erkannt
- [ ] Großer Audio-Knopf für den Moment am Tisch, dazu Herkunft (Lehrbuch/Community) und ein Beispielsatz
- [ ] Offline nutzbar (bei Oma gibt es vielleicht kein WLAN)
- [ ] Nicht gefunden → **„Wort anfragen"**; die Anfrage landet bei den Einreichungen
- [ ] Grundsatz: **keine KI-Übersetzung**, nur geprüfte Einträge. Sonst drohen Fehler und eine Vermischung mit klassischem Syrisch

### Phase 5 – Community-Einreichungen + wöchentliches Update (2 Sitzungen + Einrichtung)
- [ ] Supabase-Projekt anlegen (kostenlos) und den Supabase-Connector in Claude verbinden
- [ ] Formular in der App: Satz oder Wort in Umschrift, deutsche Bedeutung, Situation (z. B. „beim Essen"), Herkunftsort/Dialekt (z. B. Midyat, Midin, Iwardo …), Name optional
- [ ] Spam-Schutz: Begrenzung pro Gerät, einfache Bot-Falle
- [ ] In der App: Community-Sätze bewerten („Stimmt so" / „Sagt man bei uns anders")
- [ ] **Geplante Aufgabe jeden Sonntag** (richtet Claude ein):
  1. Neue Einreichungen über den Supabase-Connector lesen
  2. Duplikate und Spam aussortieren, Vollständigkeit prüfen, Schreibweise mit dem Lehrbuch abgleichen, Verdacht auf klassisches Syrisch markieren
  3. Pull Request auf GitHub erstellen: neue Einträge (als „Community" markiert) plus Bericht (neu / unklar / abgelehnt)
  4. Du oder der Prüfer gebt mit einem Klick frei → die App ist automatisch aktuell
- **Warum eine menschliche Freigabe?** Claude kann Surayt nicht zuverlässig selbst prüfen, weil die verfügbare Datenlage dünn ist. Die letzte Entscheidung trifft deshalb ein Mensch, der die Sprache spricht.

### Phase 6 – Später / Ausbau
- [ ] Syrische Schrift per Schalter einblenden (die Daten sind schon vorhanden)
- [ ] Community-Audio: Großeltern sprechen Wörter ein („Oma-Stimme"), nur mit Einwilligung
- [ ] Weitere Inhalte der Website (Level B ist vorhanden: 8 Lektionen, dazu 10 Lesestücke)
- [ ] App Stores über Capacitor
- [ ] Konten, Fortschritt über mehrere Geräte, Familien-Rangliste
- [ ] Oberfläche auf Englisch, Schwedisch, Niederländisch für die Diaspora (das Lehrbuch gibt es in 7 Sprachen)

---

## 5. Rechtliches (Kurzfassung, keine Rechtsberatung)
- Erlaubnis für Lehrbuch-Inhalte und Audio einholen (Phase 0); Quellenangabe in der App („Inhalte: Šlomo Surayt, FU Berlin / Aramaic Online Project")
- Vor dem öffentlichen Start: Impressum und Datenschutzerklärung
- Datensparsam: Einreichungen ohne Login; Name und Audioaufnahmen nur freiwillig und mit Einwilligung (viele Nutzer sind minderjährig)

---

## 6. So arbeiten wir
- **Dieses Dokument** ist der Fahrplan, abgehakt wird hier.
- **Code und Inhalte** liegen im GitHub-Repository. Getroffene Entscheidungen hält Claude hier im Projekt fest.
- **Grober Aufwand:** etwa 10–15 Arbeitssitzungen bis zur vollständigen Version mit Level A, Übersetzer und Einreichungen.

## 7. Offene Entscheidungen
- [x] GitHub-Repository: `lioneldalmis-afk/Suryoyo-App`
- [ ] Wer prüft die Einreichungen sprachlich?
- [ ] App-Name. *Die App läuft vorerst unter dem Arbeitstitel „Mamlo" (änderbar in `src/config.ts`, `index.html`, `vite.config.ts`).*
- [ ] **„aramäisch/assyrisch" in Lehrbuchsätzen:** In 11 Sätzen der Lektionen 4, 5, 10, 13, 15 und 16 steht im Deutschen die Doppelform des Lehrbuchs (z. B. „Das ist eine aramäische/assyrische Familie."). Die Regel „keine Bezeichnungen für die Volksgruppe in der Oberfläche" gilt bisher für die eigenen Texte der App. Sollen diese Lehrbuchsätze wörtlich bleiben (Stand jetzt) oder ausgeblendet werden?
- [ ] Antwort des Šlomo-Surayt-Teams zu Nutzungsrechten und Audio

## 8. Getroffene Entscheidungen

**15.11.2026 – Phase 1**
- Technik: React + Vite + TypeScript, PWA über `vite-plugin-pwa`. Kein Router-Paket, keine Design-Bibliothek, keine Schriften von fremden Servern.
- Deutsche Bedeutungen stehen wörtlich wie im Lehrbuch in den Daten, samt Klammerzusätzen wie „(m.Sg.)".
- Lernreihenfolge wird automatisch berechnet: Wörter in der Reihenfolge, in der sie im Dialog vorkommen, jede Dialogzeile direkt nach ihren Wörtern.
- Eine gemischte Übungsrunde stellt 4 neue Einträge vor (Karteikarte), fragt sie zweimal ab (Multiple Choice, dann Hören) und wiederholt 2 ältere. Falsche Antworten kommen am Ende der Runde noch einmal.
- Lernstand pro Eintrag als Stufe 0–3 im Browser-Speicher (`surayt.fortschritt.v1`): fehlerfreie Runde +1, Fehler −1. Das ist die Grundlage für den Karteikasten in Phase 3.
- Lob am Ende einer Runde („Ġalabe ṭawwo!", „Ṭawwo!") ist wörtlich aus dem Dialog von Lektion 3 übernommen.
- Audio wird direkt von textbook.surayt.com abgespielt; ohne Internet funktioniert alles außer Audio.

**16.11.2026 – Phase 2 (Lektionen 4–16)**
- Das Datenfeld `dialog` heißt jetzt `text`: Es enthält den Dialog oder den Lesetext einer Lektion. In Dialogen hat jede Zeile einen `sprecher`. Die Kennungen bleiben `LNN-D-…`, damit vorhandener Lernstand gültig bleibt. Der erste Reiter heißt bei Dialogen „Dialog", sonst „Text". Lesetexte erscheinen als Satzliste, jeder Satz ist antippbar.
- Überschriften von Lesetexten („Malfono Aday – Der Lehrer Aday") stehen in `textTitel`. Der Lektionstitel kommt aus der ersten Zeile der Einleitung.
- Wortschatz: Zusätze hinter dem Stichwort stehen im Feld `hinweis`, z. B. „aḏno" + „(f.), Pl. aḏne, aḏnoṯe". Zusammen ergeben beide genau den Text der Website. Abgefragt wird das Stichwort. Wendungen mit Doppelpunkt („cayni: b cayni zabno") bleiben ganz. Die syrische Schrift ist die ganze Zelle samt Klammerzusatz.
- Unsichtbare Zeichen werden entfernt, das kyrillische „ё" wird durch „ë" ersetzt. Sonst bleibt alles wörtlich, auch Tippfehler der Website.
- Bildtafeln werden nur übernommen, wenn sie eine deutsche Zeile haben: die 6 Gerichte aus Lektion 10, die noch nicht im Wortschatz standen (Markierung `bildtafel`).
- Sätze, die ohne Bild der Website keinen Sinn ergeben („Lassen Sie die Maus über die Bilder gleiten …"), sind mit `nur-mit-bild` markiert und werden ausgeblendet: 6 Sätze in den Lektionen 7, 10 und 11. Sie bleiben in den Daten, die Markierung übersteht ein erneutes Einlesen.
- Alle Lektionen sind von Anfang an offen. Das schrittweise Freischalten kommt mit Phase 3. „Weiter lernen" auf der Startseite führt in die zuletzt geübte Lektion, solange sie nicht fertig ist, sonst in die erste unfertige.
- Jede Datei `src/data/lektion-NN.json` wird automatisch geladen. Alle Lektionen stecken im App-Code (etwa 160 KB komprimiert), damit sie offline da sind.
- Wörter, die in mehreren Lektionen vorkommen (z. B. „dukano" in Lektion 4 und 10), haben pro Lektion einen eigenen Lernstand. Zusammenführen lässt sich das mit dem Karteikasten in Phase 3.
- Behoben: Auf der Startseite ließ sich die Seite auf dem Handy ein Stück seitlich verschieben (der Lernpfad ragte unsichtbar über den Rand).
