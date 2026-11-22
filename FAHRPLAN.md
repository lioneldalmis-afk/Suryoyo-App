# Fahrplan: Surayt-Lern-App

*Stand: 22.11.2026 · Dieses Dokument ist unser gemeinsamer Fahrplan. In jedem neuen Chat dieses Projekts reicht: „Weiter mit Phase X, Schritt Y". Erledigtes wird hier abgehakt.*

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
- Kleine Tippfehler auf der Website werden wörtlich übernommen, z. B. „Jede Jahreszeitbesteht aus drei Monaten“ (Lektion 9) oder „neu konzipierte Buchtstaben“ (Lektion 1). Eine Liste solcher Stellen könnten wir dem Lehrbuch-Team schicken. Dazu gehört auch: In Lektion 2 ist beim Laut ḥ im Beispiel „qaḥwa“ das q hervorgehoben statt des ḥ.
- **Lektion 1 und 2** haben keinen Dialog. Lektion 1 erklärt die beiden Schriften, Lektion 2 die Laute: 18 besondere Konsonanten mit Beschreibung und je drei Beispielwörtern, 7 Vokale und 16 **Hörpaare** („talyo – ṭalyo“), alles mit Audio.
- Das **Glossar A** (Kapitel 1.19) hat 821 Einträge mit Verweis auf die Lektion, aber keine Aufnahmen.

**Nachtrag 21.11.2026 (beim Einlesen der Grammatik festgestellt):**
- Die Verbkonjugation „Surcofo“ und die Formentabellen in Teil 4 haben **keine Aufnahmen**, die Grammatik-Seiten der Lektionen schon.
- Teil 4 enthält fast alle Verben aus „Surcofo“ (bis auf zwei) und viel mehr (Pronomina, Hilfsverben, Objektsuffixe, Zeitformen, Zahlen). Die Verben werden mit Wurzel, Stamm und „Bedeutung“ vorgestellt, die Tabellen selbst haben keine deutsche Spalte.
- Für die Liste an das Lehrbuch-Team: „sie zigen“ statt „sie zogen“ und „er wird nach Arbeit sucht“ (Grammatik 7/8), „Regelm&fauml;ßige Verben“ und „Presens – Preteritum“ (Surcofo), in Grammatik 12 sind beim Plusquampräteritum die Zeilen „2. Person“ bis „1. Person (f.)“ gegenüber den Formen verrutscht (grëšwaylax steht bei „1. Person (m.)“), ähnlich bei Grammatik 16 (mtalfanlan).

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
- [x] Veröffentlichung auf GitHub Pages → Link zum Testen auf dem Handy: **https://lioneldalmis-afk.github.io/Suryoyo-App/** *Jede Änderung auf `main` wird automatisch getestet und veröffentlicht (`.github/workflows/deploy.yml`). Anleitung zum Installieren und Ausprobieren im README.*
- [ ] Test mit 2–3 Jugendlichen, Feedback sammeln

### Phase 2 – Inhalte: ganz Level A einpflegen (2–4 Sitzungen)
- [x] Extraktions-Skript: Dialoge, Wortschatz und Audio-Links jeder Lektion → JSON im einheitlichen Format. *Kommt mit allen Lektionsformaten zurecht (Dialog oder Lesetext, Bildtafeln) und liest mehrere Lektionen in einem Lauf: `npm run extract -- 3-16`.*
- [x] Lektionen 4–16 einpflegen. *Alle 14 Lektionen (3–16) sind in der App: 1.288 Wörter, 260 Text- und Dialogzeilen und 58 Einleitungssätze, alle mit Audio und syrischer Schrift.*
- [x] Lektionen 1–2 als kurzer **Aussprache-Guide**: Was bedeuten š, ṭ, ḥ, c, ë? Jeweils mit Audio. *Lektion 1 „Alphabet“: die 37 Buchstaben der Umschrift (antippen führt zur Erklärung), die 22 syrischen Buchstaben mit Namen zum Anhören und die neuen Buchstaben č, j, ž. Lektion 2 „Laute“: 18 Konsonanten und 7 Vokale mit Beschreibung und Beispielwörtern (der Laut ist im Wort hervorgehoben), die Betonungsregel und 16 Hörpaare, dazu die neue Übung „Hörst du den Unterschied?“. Beide Lektionen haben außerdem ihren Wortschatz (17 und 31 Wörter) mit den normalen Übungen.*
- [x] Glossar A (Kunoš mele) als Grundlage für den Übersetzer. *821 Einträge mit 1.089 Wendungen in `src/data/glossar-a.json`. Seit 21.11. Teil des Wörterbuchs (Phase 4).*
- [x] Qualitätskontrolle, automatisch: Jeder Audio-Link der Website ist genau einem Eintrag zugeordnet, Stichproben der Audio-Adressen liefern MP3s, die Tests prüfen alle Lektionen (Vollständigkeit, Sprecher, keine Doppelgänger-Zeichen).
- [ ] Qualitätskontrolle durch einen Menschen: in jeder Lektion ein paar Wörter und Sätze anhören und mit dem Text vergleichen
- [ ] In jeder Lektion „Familientisch-Sätze" markieren (Sätze, die man zu Hause direkt verwenden kann). *Vorschlag mit 56 Sätzen und Wendungen liegt in `inhalte/familientisch-vorschlag.md`, nach Situationen sortiert (Begrüßen, Essen, zu Besuch …). Jemand, der Surayt spricht, hakt dort ab, was passt; `npm run familientisch` überträgt die Häkchen in die Daten.*

### Phase 3 – Spielerisches Lernen à la Duolingo (2–3 Sitzungen)
- [x] Lernpfad mit Einheiten pro Lektion, die nacheinander freigeschaltet werden. *Jede Lektion ist in Einheiten mit 4–6 Wörtern und Sätzen aufgeteilt (318 insgesamt, 4 bis 31 pro Lektion). Eine Runde hat je nach Einheit 12 bis 24 Aufgaben und dauert etwa 3 bis 5 Minuten. Die Einheiten stehen als Pfad im Reiter „Üben“; „Weiter lernen“ auf der Startseite führt direkt in die nächste.*
- [x] Weitere Übungstypen: Satz bauen (Wortbausteine), Dialog-Rollenspiel („Du bist Afrem – antworte Aday“), Lückentext, Nachsprechen (eigene Aufnahme mit dem Original vergleichen und selbst bewerten). *Satz bauen und Lückentext üben die Sätze aus Dialog und Lesetext, beim Satzbauen auch nach Gehör. Das Rollenspiel gibt es für die vier Dialog-Lektionen 3, 8, 10 und 12.*
- [x] Motivation: XP, Tagesserie (Streak), Tagesziel, Abzeichen. Bewusst **ohne** „Leben/Herzen“, damit kein Frust entsteht. *Neue Seite „Deine Erfolge“ mit Wochenübersicht, Tagesziel zum Einstellen und 37 Abzeichen.*
- [x] Wiederholung: einfache Spaced Repetition (Karteikasten-Prinzip) für Wörter, die man falsch hatte. *Eigener Bereich „Karteikasten“ mit Fächern und Kartenrunden (seit 21.11., vorher „Wiederholen“); außerdem kommen in jede Einheit zwei fällige Wiederholungen.*
- [x] **„Satz der Woche für den Familientisch“**: ein Satz, den man bei Oma oder Opa ausprobiert, dann „Hab ich gesagt!“ abhaken. *Erscheint auf der Startseite, sobald in `inhalte/familientisch-vorschlag.md` Sätze abgehakt und mit `npm run familientisch` übertragen sind.*
- [ ] Test mit 2–3 Jugendlichen: Sind die Einheiten zu lang oder zu kurz? Wird das Nachsprechen genutzt?

### Phase 4 – Übersetzer / Schnell-Wörterbuch (1–2 Sitzungen)
- [x] Eigener Tab mit Suchfeld, Deutsch ↔ Surayt; durchsucht Wörter **und** ganze Sätze. *Neue Leiste am unteren Rand mit „Lernen“, „Wörterbuch“ und „Karteikasten“. Das Wörterbuch hat 2.145 Einträge: Wortschatz aller Lektionen (samt Beispielwörtern aus Lektion 1–2), alle Sätze aus Dialogen, Lesetexten und Einleitungen und knapp 600 zusätzliche Wendungen aus dem Glossar. Auf Android führt langes Drücken aufs App-Symbol direkt ins Wörterbuch.*
- [x] Tolerante Suche: „slomo" findet „šlomo"; Tippfehler und Wortteile werden erkannt. *Auch „sch“/„sh“ für „š“, „ae“ für „ä“; Artikel („der Vater“) müssen nicht passen. Gefundenes, das nur ähnlich geschrieben ist („Brot“ → „rot“), wird als solches gekennzeichnet.*
- [x] Großer Audio-Knopf für den Moment am Tisch, dazu Herkunft (Lehrbuch/Community) und ein Beispielsatz. *Bei Sätzen stehen statt des Beispielsatzes die Wörter des Satzes darunter. Außerdem „Zuletzt nachgeschlagen“.*
- [x] Offline nutzbar (bei Oma gibt es vielleicht kein WLAN). *Suche und Glossar gehen offline, nur die Aufnahmen brauchen Internet (siehe Phase 0: eigene Kopien).*
- [x] Nicht gefunden → **„Wort anfragen"**. *Die Anfragen werden vorerst auf dem Gerät gesammelt; verschickt werden sie mit Phase 5.*
- [x] Grundsatz: **keine KI-Übersetzung**, nur geprüfte Einträge. Sonst drohen Fehler und eine Vermischung mit klassischem Syrisch. *Ein Test prüft, dass jeder Eintrag wörtlich aus Lektion oder Glossar stammt. Seit 21.11.2026 erweitert (Phase 4b): Der Baukasten darf Sätze aus Lehrbuch-Bausteinen zusammensetzen, wenn sie als „nicht geprüft“ gekennzeichnet sind; eine KI übersetzt weiterhin nichts.*
- [ ] Test mit 2–3 Jugendlichen: Was suchen sie am Tisch, und was fehlt? (Die Wortanfragen zeigen es.)

### Phase 4b – Vom Wörterbuch zum Übersetzer (Plan vom 21.11.2026, freigegeben am selben Tag)

**Idee:** Der Bereich „Wörterbuch“ heißt künftig **„Übersetzer“**. Er zeigt weiterhin zuerst, was wörtlich im Lehrbuch steht. Steht ein Satz dort nicht, kann er einfache Sätze **nach den Regeln des Lehrbuchs zusammensetzen** – immer deutlich als ungeprüft gekennzeichnet und ohne Aufnahme. Ein Muttersprachler kann solche Sätze bestätigen oder verbessern, dann gelten sie als geprüft. Der Rest der App (Lernpfad, Übungen, Karteikasten, Satz der Woche) bleibt bei geprüften Inhalten.

**Was dafür da ist (geprüft am 21.11.2026):** In der App stecken Wortschatz, Texte und Glossar A, aber **noch keine Grammatik**. Auf der Website gibt es:
- die Grammatik-Abschnitte der Lektionen 3–16: Erklärungen, 165 Tabellen und knapp 1.500 Audio-Links, also gut 700 Beispiele mit Aufnahme (z. B. Grammatik 4b „Die Kopula“: „gawire na – wir sind verheiratet“),
- die Verbtabellen „Surcofo“ (Kapitel 1.17, 41 Tabellen: Präsens, Präteritum, Imperativ, Infinitiv, getrennt nach Person, männlich/weiblich, Einzahl/Mehrzahl; ohne Aufnahmen),
- die Formentabellen in Teil 4 (Artikel, Pronomen, Hilfsverben, regelmäßige und unregelmäßige Verben, Zeitformen, Zahlen, Wochentage),
- das große Glossar in Teil 5 (Surayt > Deutsch und Deutsch > Surayt) und die Lektionen von Level B.

**Drei Schilder** an jeder Übersetzung:

| Schild | Bedeutet | Aufnahme |
|---|---|---|
| **Lehrbuch** (grün) | steht wörtlich in *Šlomo Surayt*: Wortschatz, Text, Glossar, Grammatik-Beispiel oder Verbtabelle | meist ja |
| **Muttersprachler** (grün-blau) | von einem Muttersprachler eingereicht oder bestätigt und vor der Aufnahme in die App geprüft, mit Datum und Ort/Dialekt, ohne Namen. Das bisherige Schild „Community“ geht darin auf. | nein (später „Oma-Stimme“, Phase 6) |
| **Zusammengesetzt – nicht geprüft** (orange) | nach Regeln aus dem Lehrbuch gebaut; kann falsch sein oder so von niemandem gesagt werden | nein |

**So arbeitet der Übersetzer**
- **Keine KI in der App.** Sprachmodelle wie ChatGPT oder Claude kennen Surayt kaum, vermischen es mit klassischem Syrisch, bräuchten einen Server und Geld, und die Eingaben (oft von Minderjährigen) gingen an fremde Dienste. Stattdessen ein **fester Baukasten**, der offline auf dem Handy läuft, immer gleich arbeitet und jedes Ergebnis erklären kann.
- **Bausteine** sind nur Einträge aus den Daten: Wörter mit ihren Merkmalen (männlich/weiblich, Einzahl/Mehrzahl – nur, wenn das Lehrbuch sie angibt) und Formen aus den Verb- und Formentabellen.
- **Satzbaupläne** kommen nur aus dem Lehrbuch, auf zwei Wegen:
  1. *Ein Wort tauschen:* Ein echter Lehrbuch-Satz ist die Vorlage, ein Wort darin wird durch ein gleichartiges ersetzt (gleiches Geschlecht, gleiche Zahl). Als Vorlage taugt ein Satzbau nur, wenn das Lehrbuch ihn mindestens zweimal mit verschiedenen Wörtern zeigt.
  2. *Regeln aus der Grammatik:* z. B. Kopula, „mein/dein …“, Verb mit Person aus den Verbtabellen, Zahl mit Nomen, Verneinung, Fragewörter. Jede Regel nennt ihren Abschnitt („Grammatik 4b“) und hat Lehrbuch-Sätze als Beleg.
- **Anzeige:** Oranges Schild und der Satz „Nach Regeln aus dem Lehrbuch zusammengesetzt. Kann falsch sein oder ungewöhnlich klingen – frag nach, bevor du es benutzt.“ Darunter der **Bauplan**: jedes Wort mit Herkunft und eigener Aufnahme, die Regel und „Gleich gebaut wie:“ mit einem Lehrbuch-Satz samt Aufnahme. Kein großer Lautsprecher, kein Zusammenschneiden von Aufnahmen.
- **Wer spricht mit wem?** Surayt unterscheidet bei „ich“ und „du“ oft männlich und weiblich (Verbtabelle „ziehen“: gorašno / guršono). Der Übersetzer fragt einmal „Ich bin: Junge / Mädchen“ und zeigt bei „du“ beide Formen, wenn nicht klar ist, wer gemeint ist.
- **Geprüftes zuerst:** Zusammengesetzt wird nur, wenn kein Eintrag mit grünem Schild passt. Zusammengesetztes kommt nie in Übungen, Karteikasten oder Satz der Woche – erst nach der Bestätigung.
- **Surayt → Deutsch:** Was jemand gesagt hat, wird erst als Ganzes gesucht, sonst **Wort für Wort erklärt**, auch gebeugte Formen aus den Tabellen (z. B. „dëmxono – schlafen, Präsens, 1. Person f. Sg.“, wörtlich die Bezeichnung der Tabelle). Einen flüssigen deutschen Satz baut die App daraus nicht.

**Sicherheitsnetz**
- **Gegenprobe:** Der Baukasten übersetzt die deutschen Sätze des Lehrbuchs, ohne den jeweiligen Satz selbst zu kennen, und das Ergebnis wird mit dem echten Surayt verglichen. Eine Regel wird erst eingeschaltet, wenn sie alle ihre Belege genau trifft und in der Gegenprobe nicht danebenliegt. Die Trefferquote steht hier im Fahrplan – sie ist der ehrliche Maßstab, wie gut der Baukasten ist.
- **Lieber nichts als Unsinn:** Fehlt ein Merkmal (z. B. das Geschlecht eines Wortes) oder passt kein Bauplan genau, wird nichts zusammengesetzt. Dann zeigt die App wie heute die Wörter einzeln und bietet „Satz anfragen“ an.
- **Verbesserungen fließen zurück:** Sagt ein Muttersprachler „sagt man anders“, wird seine Fassung der geprüfte Eintrag. Der falsche Satz kommt auf eine Sperrliste, und ein Test schlägt Alarm, solange der Baukasten ihn noch so baut – dann wird die Regel verbessert oder abgeschaltet.
- **Claude formuliert weiterhin kein Surayt.** Claude programmiert den Baukasten nach dem Lehrbuch, die Sätze setzt das Programm aus den Daten zusammen, bestätigen kann nur ein Mensch.

**Schritte**
- [x] 1. Umbenennen in „Übersetzer“ (Leiste, Überschrift, Kurzbefehl auf Android; die alte Adresse `#/woerterbuch` führt weiter, gespeicherte Suchen und Anfragen bleiben) und die drei Schilder einführen. *Jeder Treffer trägt sein Schild in der Liste und oben auf der Eintragsseite; auf der Startseite des Übersetzers erklärt „Was die Schilder bedeuten“ alle drei. Vorerst kommt nur „Lehrbuch“ vor: Community-Einträge gibt es noch keine, Zusammengesetztes erst mit Schritt 4. Ort und Datum der Bestätigung kommen mit Schritt 6 in die Daten.*
- [x] 2. Grammatik einlesen: Grammatik-Abschnitte 3–16 (Erklärungen wörtlich, Beispiele mit Aufnahme), Verbtabellen „Surcofo“ und die Formentabellen aus Teil 4. Beispiele und Formen werden im Übersetzer findbar, mit Schild „Lehrbuch“. *27 Seiten mit 280 Tabellen in `src/data/grammatik.json` (`npm run extract -- grammatik`): 3.386 Beispiele und Formen, davon 572 mit Aufnahme, 52 Verben mit allen Personen, Imperativ und Infinitiv. Der Übersetzer hat damit 4.317 statt 2.145 Einträge. „ich schlafe“, „du gehst“, „wir haben“, „mein/dein“, „zwei Frauen“ finden jetzt die passende Form; die Eintragsseite zeigt die Tabelle aus dem Lehrbuch mit der Form hervorgehoben, bei Grammatik-Beispielen die Erklärung dazu. Geht offline.*
- [x] 3. Wort für Wort: Surayt-Sätze erklären, auch mit gebeugten Formen. *Tippt man einen Surayt-Satz, der so nicht im Übersetzer steht, erklärt er jedes Wort einzeln (auch ohne Sonderzeichen getippt); auf der Seite jedes Satzes steht „Wort für Wort“ statt der bisherigen Wörterliste. Gebeugte Formen kommen mit der Beschriftung der Tabelle („schlafen · Präsens, Sg., 1. f. · ich, weiblich“). Neu eingelesen sind 33 Kleinwörter und Beispiele aus den Erklärtexten der Grammatik: der Artikel (u, i, an …), die Präpositionen („b – in“), Präsens- und Futurmarker (ko-, gëd) und die Partikel d. Wörter wie „lu“, „kosaymono“ oder „cwodayḏe“ zerlegt die App nach vier Regeln des Lehrbuchs in Teile, die im Lehrbuch stehen – mit orangem Schild „Nicht geprüft“. Trefferquote an allen Sätzen der Lektionen: 90 % der Wörter erklärt (mit und ohne Sonderzeichen getippt), 7 % kommen nur in anderen Sätzen vor, 3 % bleiben unerklärt (vor allem Namen). Einen deutschen Satz baut die App daraus nicht.*
- [x] 4. Baukasten, Teil 1: „Ein Wort tauschen“ mit Gegenprobe, Bauplan und orangem Schild. *Steht ein deutscher Satz nicht im Übersetzer, sucht die App einen Lehrbuch-Satz, der genauso gebaut ist, und tauscht ein Wort aus: „er wird essen“ wird wie „gëd goraš – er wird ziehen“ gebaut, mit der Form von „essen“ für „er“ aus der Verbtabelle. Das Ergebnis steht in einer orange umrandeten Karte mit Schild „Zusammengesetzt – nicht geprüft“, ohne Aufnahme, darunter der Bauplan: was getauscht wurde und warum es passt, die Lehrbuch-Sätze mit Aufnahme („Gleich gebaut wie“) und Wort für Wort. Das Lehrbuch zeigt nur 13 Satzbaupläne zweimal mit verschiedenen Wörtern; 4 bestehen die Gegenprobe (alle 8 Belege genau getroffen, kein Fehlgriff): „er wird …“ und „wir werden …“ mit 47 Verben aus den Verbtabellen, Zahlen von 4 bis 10 mit „Männer“ und „Frauen“. Die übrigen 9 bleiben aus, weil das Lehrbuch das Geschlecht eines Wortes nicht zeigt (z. B. „koso d ḥamro – Glas Wein“) oder weil ein Merkmal fehlt. Das ist wenig – die meisten Sätze kommen erst mit den Grammatik-Regeln in Schritt 5.*
- [x] 5. Baukasten, Teil 2: Regeln aus der Grammatik, eine nach der anderen, jede mit Gegenprobe. *Elf Regeln, jede mit Kapitel, wörtlichem Erklärsatz und Beispielen aus dem Lehrbuch: Artikel (G3a), Possessivsuffix „mein/dein …“ (G5a), Zahl und Gezähltes (G8b), Adjektiv (G11a), Präposition mit Artikel „im Haus“ (G11b), Kopula „ich bin/war/bin nicht …“ (G4b, 9c, 12a), „Das ist …“ (G5b), „haben“/„nicht haben“ (G9b), „es gibt“/„es gibt nicht“ (G9a), Futur und Präsens mit Person (G7b). 10 davon bestehen die Gegenprobe: 103 deutsche Sätze des Lehrbuchs gebaut, 94 genau getroffen, 9 nicht vergleichbar (das Lehrbuch nimmt dort ein anderes Wort), keiner daneben. „Das ist …“ bleibt aus, weil sich keines seiner Beispiele bauen lässt. Der Übersetzer fragt einmal „Ich bin: Junge / Mädchen“ und zeigt bei „du“ beide Formen. Beispiele: „ich bin müde“, „wir sind nicht hier“, „mein Lehrer“, „unser Haus“, „zwei Brüder“, „in der Schule“, „die Schule ist groß“, „du hast einen Hund“, „ich werde schlafen“, „ich schlafe“.*
- [ ] 6. Prüfen lassen: an jedem zusammengesetzten Satz „Von einem Muttersprachler prüfen lassen“ (bleibt bis Phase 5 auf dem Gerät, wie die Wortanfragen). Bis dahin eine Prüfliste `inhalte/pruefliste.md` wie beim Familientisch: Claude schlägt typische Alltagssätze auf Deutsch vor, der Baukasten setzt sie zusammen, ein Muttersprachler hakt ab oder schreibt die richtige Fassung daneben, ein Befehl überträgt sie in die Daten (Schild „Muttersprachler“).
- [ ] 7. Später: das große Glossar aus Teil 5 und Level B als weitere Bausteine.
- [ ] 8. Test mit 2–3 Jugendlichen: Werden die Schilder verstanden? Wird Oranges trotzdem ungeprüft benutzt?

**Grenzen:** Anfangs klappen nur kurze, einfache Sätze (Das ist …, Ich habe …, Wo ist …, mein/dein …, Zahlen). Nebensätze, Redewendungen und Umgangssprache nicht. Das Lehrbuch zeigt eine Form des Surayt; in manchen Orten sagt man manches anders, deshalb notiert die Prüfung Ort/Dialekt. Ohne Prüfer bleibt alles Zusammengesetzte orange.

**Aufwand:** etwa 5–7 Sitzungen. Schritt 1–3 lohnen sich auch dann, wenn der Baukasten später kleiner ausfällt als erhofft.

### Phase 5 – Community-Einreichungen + wöchentliches Update (2 Sitzungen + Einrichtung)
- [ ] Supabase-Projekt anlegen (kostenlos) und den Supabase-Connector in Claude verbinden
- [ ] Formular in der App: Satz oder Wort in Umschrift, deutsche Bedeutung, Situation (z. B. „beim Essen"), Herkunftsort/Dialekt (z. B. Midyat, Midin, Iwardo …), Name optional
- [ ] Spam-Schutz: Begrenzung pro Gerät, einfache Bot-Falle
- [ ] In der App: Community-Sätze bewerten („Stimmt so" / „Sagt man bei uns anders")
- [ ] Wortanfragen aus dem Wörterbuch verschicken (liegen bis dahin auf dem Gerät, `surayt.woerterbuch.v1`): nur Wort und Situation, kein Name. Die Sonntags-Aufgabe listet sie im Bericht als „gewünscht“.
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
- [ ] Wer prüft die Einreichungen sprachlich? *Dieselbe Person könnte auch die Familientisch-Liste (`inhalte/familientisch-vorschlag.md`) abhaken und die zusammengesetzten Sätze des Übersetzers bestätigen (Phase 4b).*
- [ ] App-Name. *Die App läuft vorerst unter dem Arbeitstitel „Mamlo" (änderbar in `src/config.ts`, `index.html`, `vite.config.ts`).*
- [ ] **„aramäisch/assyrisch" in Lehrbuchsätzen:** In 11 Sätzen der Lektionen 4, 5, 10, 13, 15 und 16 steht im Deutschen die Doppelform des Lehrbuchs (z. B. „Das ist eine aramäische/assyrische Familie."). Die Regel „keine Bezeichnungen für die Volksgruppe in der Oberfläche" gilt bisher für die eigenen Texte der App. Sollen diese Lehrbuchsätze wörtlich bleiben (Stand jetzt) oder ausgeblendet werden? *Seit Phase 4b kommen 5 Beispielsätze der Grammatik dazu (Lektion 5, 9 und 12, z. B. „diese sind Aramäer/Assyrer“); sie stehen nur im Übersetzer. Aus den Erklärtexten der Grammatik sind 4 Sätze mit „aramäisch“ nicht übernommen.*
- [ ] Antwort des Šlomo-Surayt-Teams zu Nutzungsrechten und Audio
- [x] **Übersetzer (Phase 4b): Grundsatz ändern?** *Ja (21.11.2026), siehe Abschnitt 8.* Bisher gilt „keine zusammengesetzten Übersetzungen, nur geprüfte Einträge“ (Phase 4, `CLAUDE.md`). Vorschlag: Die App darf im Übersetzer Sätze aus Lehrbuch-Bausteinen zusammensetzen, wenn sie als „nicht geprüft“ gekennzeichnet sind und nirgends sonst in der App auftauchen; Claude formuliert weiterhin kein Surayt. Erst nach deinem Ja werden `CLAUDE.md` und der Grundsatz in Phase 4 angepasst.
- [x] **Übersetzer: Zusammengesetztes gleich zeigen oder erst auf Tippen** *Gleich zeigen (21.11.2026).* („Trotzdem zusammensetzen?“)? Vorschlag: gleich zeigen, aber nur, wenn nichts Geprüftes passt.
- [x] **Übersetzer: Reicht eine Bestätigung?** *Ja (21.11.2026).* Vorschlag: eine Bestätigung durch einen eingetragenen Prüfer reicht; abweichende Fassungen aus anderen Orten werden mit Ort zusätzlich gespeichert.

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

**16.11.2026 – Phase 2 (Lektion 1–2, Glossar, Familientisch)**
- Lektion 1 und 2 sind normale Stationen im Lernpfad. Statt „Text“ heißt ihr erster Reiter „Alphabet“ bzw. „Laute“, die Inhalte stehen im Feld `aussprache`. Erklärungen und Beispiele sind wörtlich aus dem Lehrbuch, Überschriften und Bedienhinweise („Tippe auf …“) gehören zur Oberfläche.
- Nicht übernommen aus Lektion 1–2: das Schreiben der syrischen Schrift, Vergleiche mit dem klassischen Syrisch, Absätze, die die Lernenden mit „Sie“ ansprechen, und der Einleitungsabsatz mit „syrisch-aramäischer Schrift“ (solange die Entscheidung zu den Bezeichnungen offen ist; ein Test wacht darüber). Die App sagt „syrische Schrift“.
- Den hervorgehobenen Laut in Beispielwörtern („kä**č**al“) übernimmt die App nur, wenn er zum erklärten Buchstaben passt (betrifft einmal „qaḥwa“).
- „Los geht’s“ beginnt weiterhin mit Lektion 3; Lektion 1–2 sind zum Nachschlagen da. Wer dort zuletzt geübt hat, macht dort weiter.
- Hörpaare sind ein eigener Übungstyp: Ein Wort wird gespielt, beide stehen zur Wahl. Der Lernstand zählt pro Wort; Paare mit Fehlern kommen zuerst.
- Glossar: `voll` enthält jede Zeile wörtlich, `teile` die einzelnen Wendungen (nur zerlegt, wenn Umschrift, Deutsch und Schrift gleich viele Teile haben), `lektionen` die Verweise („L.4“, „L.11.6“, „L16“ → Lektion). Das Glossar ist noch nicht im App-Code, damit die App klein bleibt.
- Familientisch-Sätze werden nicht von Claude festgelegt, sondern von einem Menschen abgehakt: Claude schlägt nach der deutschen Bedeutung vor, die Markierung `familientisch` setzt erst `npm run familientisch` nach der Prüfung. Ein Test meldet, wenn die Liste auf Einträge verweist, die es nicht mehr gibt.
- Das Extraktions-Skript ist in Module aufgeteilt (`scripts/lehrbuch.mjs`, `lektion.mjs`, `alphabet.mjs`, `glossar.mjs`); `npm run extract -- 1-16 glossar` liest alles neu ein.

**16.11.2026 – Phase 3 (spielerisches Lernen)**
- **Einheiten** werden automatisch aus der Lernreihenfolge geschnitten: Im Text-Teil endet eine Einheit mit einem Satz, sobald sie 4 Einträge hat (höchstens 6). Wörter, die im Text nicht vorkommen, kommen am Ende in gleich großen Päckchen von etwa 5. Kleinere Reste werden an die vorige Einheit gehängt. Neue Lektionen brauchen dafür nichts Zusätzliches.
- Eine Einheit ist **geschafft**, wenn jeder Eintrag einmal geübt wurde, auch wenn eine Antwort falsch war. Wer eine Runde durchhält, kommt also weiter; was falsch war, holt der Karteikasten wieder hervor. Freigeschaltet wird der Reihe nach innerhalb einer Lektion.
- **Die Lektionen selbst bleiben alle offen** (Text, Wörter, freies Üben, erste Einheit). So kann man z. B. vor einem Familienessen direkt Lektion 10 „Essen“ anschauen. Der Lernpfad empfiehlt weiter die Reihenfolge ab Lektion 3.
- Runde einer Einheit: neue Einträge in Zweierpäckchen vorstellen (Karteikarte) und abfragen, dann jeden Eintrag ein zweites Mal üben. *(Geändert am 21.11.2026, siehe unten: Die erste Abfrage kommt erst nach dem nächsten Päckchen.)* Dazu zwei fällige Wiederholungen aus anderen Einheiten und am Ende ein Satz zum Nachsprechen. Eine geschaffte Einheit lässt sich wiederholen, dann ohne Karteikarten.
- **Karteikasten** (Leitner) mit 6 Fächern: Richtig schiebt einen Eintrag ein Fach weiter, er ist nach 0, 1, 3, 7, 14 bzw. 30 Tagen wieder dran. Falsch legt ihn zurück ins erste Fach, er ist gleich wieder zum Wiederholen da. Gerechnet wird in Kalendertagen. Der bisherige Lernstand (Stufe 0–3) gilt weiter. In der Wörterliste zeigen Punkte: neu, nochmal üben (rot umrandet), geübt, sitzt (ab Fach 3).
- **Satz bauen** gibt es für Sätze mit 2 bis 9 Wörtern, mit 2–3 Wörtern zu viel aus dem Wortschatz der Lektion; nichts davon ist einem Wort im Satz zum Verwechseln ähnlich. Satzzeichen sind keine Bausteine, Großschreibung zählt beim Prüfen nicht, Sonderzeichen schon („ṭ“ ist nicht „t“). In jeder vierten Aufgabe wird der Satz vorgespielt statt auf Deutsch gezeigt.
- **Lückentext**: Es fehlt nie ein großgeschriebenes Wort (Namen und Satzanfänge würden die Lösung verraten), bevorzugt ein gerade gelerntes. Die deutsche Übersetzung steht immer dabei, damit nur eine Antwort passt.
- **Nachsprechen**: Die Aufnahme bleibt im Speicher des Handys, wird nirgends hochgeladen und ist weg, sobald die Aufgabe vorbei ist. Bewertet wird selbst („Nochmal“ / „Klingt gut!“), es gibt keine Fehler. „Kann gerade nicht sprechen“ pausiert das Nachsprechen eine Stunde; unter „Über die App“ lässt es sich ganz abschalten. Ohne Mikrofon heißt es „Sprich einfach laut nach“.
- **Rollenspiel**: Man wählt eine Person mit mindestens zwei Zeilen. Gemeinsame Zeilen („Saro w Aday“) gehören beiden. Die anderen sprechen mit der Lehrbuch-Aufnahme. Bei den eigenen Zeilen steht die deutsche Bedeutung da („Du sagst: …“), gewählt wird aus drei Surayt-Sätzen, sonst wäre es oft mehrdeutig (z. B. „Ṭawwo.“ und „Ġalabe ṭawwo.“). Falsche Antworten sind andere Zeilen derselben Person.
- **XP**: 1 pro richtiger Antwort (auch beim Nachholen am Ende und beim Nachsprechen; seit 21.11. sofort gutgeschrieben), 5 für jede abgeschlossene Runde, 5 extra für eine fehlerfreie Runde ab 3 Aufgaben, 10 für „Hab ich gesagt!“. Tagesziel wählbar: 10, 20 (Standard), 30 oder 50 XP.
- **Tagesserie**: Ein Tag zählt, sobald es XP gab (seit 21.11.: schon mit der ersten richtigen Antwort, weil XP sofort gutgeschrieben werden). Wer heute noch nicht geübt hat, sieht die Serie bis gestern; sie reißt erst, wenn ein ganzer Tag fehlt. Keine „Serien-Schoner“ oder Ähnliches – bewusst einfach.
- **Abzeichen** (37): erste Runde, fehlerfreie Runde, Serien (3/7/30/100 Tage), XP (100 bis 2.500), geübte Wörter (25 bis 1.000), Wiederholung, Nachsprechen (1×/50×), Rollenspiel, alle Hörpaare, Familientisch und je eins pro geschaffter Lektion. Namen und Texte sind deutsch; Surayt steht nur in Form der Lektionstitel aus den Daten.
- **Satz der Woche** kommt nur aus Einträgen mit der Markierung `familientisch`, die ein Mensch gesetzt hat. Er wird einmal pro Kalenderwoche (ab Montag) gewählt: bevorzugt noch nicht ausprobiert und aus einer Lektion, bei der man schon ist. Solange die Liste nicht geprüft ist, erscheint keine Karte.
- XP, Serie, Abzeichen und Einstellungen stehen in einem eigenen Speicher (`surayt.motivation.v1`), getrennt vom Lernstand. „Lernstand zurücksetzen“ löscht beides, Tagesziel und Nachsprechen-Einstellung bleiben.
- Alte Adressen (`#/lektion/3/ueben/gemischt`) führen in die nächste Einheit. Neue Adressen: `#/lektion/3/einheit/2`, `#/lektion/3/rollenspiel`, `#/wiederholen`, `#/erfolge`.

**21.11.2026 – Nach dem ersten Test auf dem Handy**

Rückmeldung: Die Einheiten waren zu einfach (ein Wort wird vorgestellt und sofort abgefragt), Multiple Choice ebenfalls; wer eine Einheit abbrach, verlor alles; Karteikarten zeigten vorne nur den Ton.
- **Neue Einträge werden nicht mehr sofort abgefragt.** Erst wird das nächste Päckchen vorgestellt, dann kommt die Abfrage des vorigen; vor der Abfrage des letzten Päckchens stehen zwei andere Aufgaben. Die erste Abfrage ist nach Gehör („Was bedeutet das?“), die zweite verlangt Surayt: Bei Wörtern wählt man das richtige Surayt-Wort zur deutschen Bedeutung, Sätze werden gebaut oder ergänzt.
- **Antwortmöglichkeiten sind nicht mehr zufällig**, sondern verwechselbar (`src/lib/ablenker.ts`): ähnlich geschriebene Surayt-Wörter, dieselbe Art von deutscher Bedeutung (Frage, Verbform, Nomen, Ausruf …) und Einträge, die man kurz vorher gelernt hat. Ein bisschen Zufall bleibt für Abwechslung. Doppeldeutig wird es nie: Dieselbe deutsche Bedeutung samt Zusatz oder dieselbe Schreibweise kommt nie zweimal vor.
- **Die Schwierigkeit wächst mit dem Fach im Karteikasten.** Ab Fach 3 (in der App von 1 bis 6 gezählt; zweimal hintereinander richtig) muss man bei Wiederholungen selbst auf Surayt kommen; „Was bedeutet das?“ mit deutschen Antworten gibt es dann nicht mehr. Neu ist „Genau hinhören“: ein Wort hören und unter ähnlich geschriebenen die richtige Schreibweise finden. Formen mit gleicher Bedeutung, die sich nur im Klammerzusatz unterscheiden („ṭawwo“ = gut (m.Sg.), „ṭawwe“ = gut (pl.)), stehen dann zusammen zur Wahl – die Phase-1-Regel „nie zusammen“ gilt nur noch für Einträge, die noch nicht sitzen. Sätze werden ab Fach 2 meist nach Gehör gebaut.
- **Fortschritt wird nach jeder Antwort gespeichert**, ebenso die XP für richtige Antworten. Wer abbricht, verliert nichts; die Einheit macht beim nächsten Mal mit den noch nicht geübten Einträgen weiter, und Startseite und Lektion zeigen „3 von 5 geübt“. Gerechnet wird dabei immer vom Stand vor der Runde, damit ein Eintrag pro Runde höchstens ein Fach weiterrückt. Bonus-XP (Runde geschafft, fehlerfrei) und Zähler für Abzeichen gibt es weiterhin nur am Ende einer Runde.
- **Karteikarten**: vorne Surayt in Schrift und Ton, hinten Deutsch – so geht es auch ohne Ton. Neue Einträge zeigen gleich beide Seiten („Hör zu und merk es dir“), ohne Raten. Beim freien Üben sind Karten ab Fach 2 umgedreht: vorne Deutsch, hinten Surayt mit Ton („Sag es laut, dann deck auf“).

**21.11.2026 – Karteikasten als eigener Bereich**
- Der **Karteikasten** ist jetzt ein eigener Bereich (`#/karteikasten`) und ersetzt „Wiederholen“: Er zeigt, wie viele Karten heute dran sind, wie voll die sechs Fächer sind (in der App Fach 1–6) und erklärt in fünf Sätzen, wie er funktioniert. Auf der Startseite steht er als Karte mit der Zahl der fälligen Karten, sobald etwas darin liegt.
- Lernprinzip: **Active Recall** (erst selbst erinnern, dann aufdecken) plus **Spaced Repetition** nach Leitner (Abstände 0, 1, 3, 7, 14, 30 Tage). Ein aufwendigerer Algorithmus (SM-2, FSRS) lohnt sich bei dieser Menge nicht; Leitner ist leicht zu verstehen und lässt sich in der App erklären.
- Eine **Kartenrunde** hat bis zu 20 fällige Karten, schwächste und am längsten fällige zuerst – nur Karteikarten, keine anderen Aufgaben. Wer mehr will, tippt „Weitere Karten“. Was sitzt (ab Fach 3), kommt umgedreht.
- Bewertet wird mit drei Knöpfen: **Nicht gewusst** (zurück in Fach 1, kommt am Ende der Runde noch einmal), **Knapp** (bleibt im Fach, mindestens Fach 2), **Gewusst** (ein Fach weiter). Unter jedem Knopf steht, wann die Karte wiederkommt („morgen“, „in 1 Woche“ …). Dasselbe gilt für die Karteikarten beim freien Üben einer Lektion.
- In der Kartenrunde wird nur selbst bewertet, nicht geprüft. Objektiv geprüft wird weiter in den Einheiten (je zwei fällige Wiederholungen pro Runde).
- **„Hören & Auswählen“ als eigene Übungsart beim freien Üben entfällt** – es war im Grunde eine einfachere Karteikarte. Hör-Aufgaben gibt es weiter in den Einheiten (erste Abfrage nach Gehör, „Genau hinhören“). Alte Links führen zum Reiter „Üben“.

**21.11.2026 – Phase 4 (Wörterbuch)**
- **Navigation:** Unten gibt es jetzt eine Leiste mit den drei Hauptbereichen **Lernen**, **Wörterbuch** und **Karteikasten** (mit der Zahl der fälligen Karten). Sie steht nur auf diesen drei Seiten; Lektionen, Runden, Erfolge und „Über die App“ behalten ihren Zurück-Pfeil. Der Karteikasten hat deshalb keinen Zurück-Pfeil mehr. Beim Tippen ins Suchfeld verschwindet die Leiste, damit die Tastatur Platz hat.
- **Was durchsucht wird:** Wortschatz aller Lektionen, die Beispielwörter und Hörpaare aus Lektion 1–2, alle Sätze aus Dialogen, Lesetexten und Einleitungen (ohne die mit `nur-mit-bild`) und das Glossar A. Gleiche Einträge (gleiche Schreibweise, gleiche Bedeutung ohne Klammerzusatz) stehen nur einmal da, mit allen Lektionen. Glossar-Wendungen, die schon im Wortschatz stehen, fallen weg; beschreiben sie ein Wort nur ausführlicher (mit Pluralform oder weiteren Bedeutungen), erscheinen sie als „Mehr dazu im Glossar“ auf der Seite des Wortes und in der Trefferliste nur, wenn das Wort selbst nicht dasteht.
- **Aufnahmen fürs Glossar:** Das Glossar hat keine eigenen. Steht dasselbe Stichwort (gleiche Umschrift) im Wortschatz oder als Satz, wird dessen Aufnahme genutzt – die Umschrift ist ja dieselbe. Sonst steht da „Zu diesem Eintrag gibt es keine Aufnahme“ (betrifft gut 450 Glossar-Wendungen, vor allem Verbformen).
- **Suche:** Deutsch und Surayt in einem Feld, ohne Umschalten; enthält die Suche Zeichen wie š oder ë, wird nur Surayt durchsucht. Sonderzeichen und Groß-/Kleinschreibung zählen nicht, „sch“/„sh“ gehen für „š“, „tsch“ für „č“, „ch“ für „x“, „ae/oe/ue“ für Umlaute. Wortanfänge und Wortteile werden gefunden, Tippfehler ab 4 Buchstaben (einer) bzw. 7 Buchstaben (zwei). Jedes gesuchte Wort muss vorkommen, nur Artikel nicht. Ganze, kurze Treffer stehen vor langen Sätzen.
- **Ehrlich bleiben:** Passt nichts genau, sondern nur über Tippfehler, steht darüber „So nicht im Wörterbuch … nur ähnlich geschrieben“. Findet sich zu einer längeren Suche nichts, zeigt die App einzelne Wörter daraus, jedes für sich – sie setzt daraus nie einen Satz zusammen.
- **Eintragsseite:** großer Lautsprecher, Umschrift, Zusatz, Deutsch, Herkunft („Aus Šlomo Surayt · Wortschatz, Lektion 3 …“, Link zur Lektion; Community-Einträge bekommen ein eigenes Schild „Community“) und ein Beispielsatz aus den Lektionen, in dem das Wort genau so vorkommt (bevorzugt aus derselben Lektion, möglichst kurz). Bei Sätzen stehen stattdessen die Wörter des Satzes aus dem Wortschatz da. Die syrische Schrift bleibt wie überall bis Phase 6 ausgeblendet.
- **Wort anfragen:** unter jeder Suche; mit Wort (vorausgefüllt) und freiwilliger Situation, Hinweis „keine Namen“. Bis zu 30 Anfragen bleiben auf dem Gerät und stehen im Wörterbuch unter „Deine Anfragen“ (löschbar). Verschickt werden sie mit Phase 5. „Zuletzt nachgeschlagen“ merkt sich 8 Einträge. Beides liegt in `surayt.woerterbuch.v1` und wird von „Lernstand zurücksetzen“ nicht gelöscht.
- **Offline:** Die Lektionen stecken ohnehin in der App. Das Glossar ist ein eigener Teil (etwa 60 KB komprimiert), der erst beim Öffnen des Wörterbuchs geladen wird, damit der Start schnell bleibt; der Service Worker legt ihn trotzdem beim Installieren ab. Geprüft: App einmal laden, Internet aus, neu laden – Suche samt Glossar geht.

**22.11.2026 – Phase 4b (Übersetzer), Schritt 5: Baukasten, Teil 2 – Regeln aus der Grammatik**
- **Wann:** wie in Schritt 4 – ein deutscher Satz, der nicht als Bedeutung in den Daten steht. Passen ein Satzbau (Schritt 4) und Regeln, kommt zuerst der Satzbau; gleiche Ergebnisse nur einmal. Jede Karte hat orangen Rand und Schild, keine Aufnahme, darunter den Bauplan (bei der ersten Karte offen, sonst zum Aufklappen): jede angewandte Regel mit Kapitel, einem Erklärsatz wörtlich aus dem Lehrbuch (ohne syrische Schrift) und einem Beispiel mit Aufnahme (am liebsten eines, das die Gegenprobe getroffen hat), dann „Die Wörter“ mit Herkunft und Aufnahme; zusammengesetzte Wörter zeigen ihre Teile („baytayḏan“ = „bayt-“ aus bayto + „-ayḏan“ unser; „kodomaxno“ = ko- + domaxno).
- **Die Regeln** (jede nur mit Formen aus den Daten; welche Form zu welcher Person gehört, steht in der Beschriftung der Tabellen):
  - *Kopula* (G4b „Dafür wird eine Kurzform des Personalpronomens verwendet, die dem betreffenden Wort oder Satzteil folgt“): „ich bin müde“ = Adjektiv + no. Formen aus der Formentabelle „Pseudo- und Hilfsverben“ (Gegenwart, Vergangenheit), wo dort Einzahl/Mehrzahl fehlt, aus der Bedeutung in Grammatik 9 („lathat – du bist nicht“). Verneint steht latno usw. vorn (Beispiele in 9c) – nur in der Gegenwart, für die Vergangenheit zeigt das Lehrbuch keine Beispiele. Ergänzung: Adjektiv in Geschlecht und Zahl wie das Subjekt (G11a), Substantiv mit oder ohne „ein/kein“ in der Zahl des Subjekts, Präposition mit Artikel, oder „hier/dort“. Mit Substantiv als Subjekt wie „der Bruder ist groß“ = u aḥuno rabo yo (G11a).
  - *Possessivsuffix, allgemeine Reihe* (G5a): Artikel + Substantiv ohne Endung (-o, in der Mehrzahl -e) + Suffix. Nicht gebaut: Verwandtschaft und Körperteile (eingeschränkte Reihe – deren Tafeln widersprechen sich im Lehrbuch: G5a.2 nennt -ayxu/-ayye, die Formentabelle B4 -ayna/-aṯṯe), erkannt an den genannten Ausnahmen (xabro, ëšmo, šuġlo, cëmro), an Einträgen wie „ëšmi – mein Name“ oder „leba – ihr Herz“ und am Wortschatz der Lektionen 4 und 7; außerdem weibliche Wörter auf -to, weil das Lehrbuch das t mal behält (i aṯtayḏi), mal nicht (i qrayayḏe), ohne es zu erklären. „ihr“ gibt zwei Fassungen („von ihr“/„von ihnen“), „dein“ zwei („zu einem Jungen/Mädchen“).
  - *Artikel* (G3a): u, i, a + Anfangsbuchstabe, an vor Vokal – nur mit belegtem Geschlecht und belegter Zahl (wie in Schritt 4).
  - *Zahl* (G8b): Geschlecht wie das Gezählte, ab zwei Mehrzahl; ab 11 eine Form für beide.
  - *Adjektiv* (G11a): nach dem Substantiv, in Zahl und Geschlecht gleich; Mehrzahl „eine gemeinsame Pluralform“.
  - *Präposition mit Artikel* (G11b): nur wie in den Beispielen – „im/in dem/in der“ = b, „ins/in das/in die“ = l, „aus/von“ = m, „bei“ = s. „zum/zur/zu/für“ nicht: „zum Schluss“ heißt im Lehrbuch bi ḥarayto.
  - *„haben“* (G9b): Form nach Person + Objekt ohne Artikel, verneint mit „kein“ (latli …); auch mit Substantiv als Subjekt („die Wände haben Ohren“).
  - *„es gibt“* (G9a): kit/layt + Substantiv; mit „dort/hier“ vorn wie in den Beispielen die langen Formen am Anfang und das Ortswort am Ende (kito kṯowe tamo); mit Präposition vorn kit dahinter (bu banyo kit duš). kit/kito und layt/layto aus dem Glossar.
  - *Futur und Präsens* (G7b): gëd bzw. ko- + Grundform des Präsens aus den Verbtabellen, auch mit Objekt ohne Artikel oder Präposition („ich werde im Zimmer schlafen“). Das Präsens nur bei Verben, deren Grundform mit einem Konsonanten beginnt: Für Vokale nennt das Lehrbuch keine Form des Präsensmarkers (im Text steht k-, z. B. kuxlina). Objekte mit bestimmtem Artikel nicht, wegen der Objektmarkierung (G16e). „sein“, „haben“, „werden“ nur über ihre eigenen Regeln.
  - *„Das ist …“* (G5b): hano/haṯe/hani + Substantiv + Kopula. Gebaut, aber ausgeschaltet: Keines der Beispiele (haṯe i aṯtayḏi yo, hani suryoye ne, Haṯe iqarṯo Suryayto yo) lässt sich ohne die oben genannten Grenzen bauen.
- **Deutsch verstehen** (`src/lib/deutsch.ts`, nur Deutsch): Pronomen und Verbform zusammen bestimmen die Person („sie ist“ = eine Person, weiblich; „sie sind“ = mehrere; „es“ bleibt draußen). Präsens deutscher Verben mit den starken Formen („isst“, „schläft“) und Vorsilben. Mehrzahl: Steht das Wort selbst als Substantiv im Übersetzer, ist es keine Mehrzahl eines anderen („Arbeiter“ ≠ Mehrzahl von „Arbeit“); sonst „Häuser“ → Haus, „Brüder“ → Bruder. Bei „die Lehrer“, „meine Lehrer“ oder „niederländische Schüler“ ist offen, ob einer oder mehrere gemeint sind – dann nichts. Klammern im Deutschen des Lehrbuchs werden als Hinweis gelesen („dein (f.)“, „ihre (Pl.)“), „(dass) wir machen“ ist die Grundform ohne ko-.
- **„Ich bin: Junge / Mädchen“:** Hängt eine Form davon ab, wer spricht, zeigt der Übersetzer beide Fassungen („als Junge“/„als Mädchen“) und darüber die Frage. Die Antwort bleibt auf dem Handy (`surayt.woerterbuch.v1`, Feld `ich`) und lässt sich mit „ändern“ zurücknehmen. Bei „du“ gibt es immer beide Fassungen, wenn sie sich unterscheiden („zu einem Jungen“/„zu einem Mädchen“), sonst eine.
- **Gegenprobe** (wie in Schritt 4, die App rechnet sie selbst): Jeder deutsche Satz der Daten wird gebaut, ohne dass der Baukasten ihn kennt. Getroffen, wenn eine Fassung genau gleich ist; Wörterbuch-Einträge ohne Artikel („mawlodayḏax – dein (f.) Geburtstag“, „lwošo – das Kleiden“) gelten als getroffen, wenn nur der Artikel fehlt. **Nicht vergleichbar** (weder Treffer noch Fehler), wenn das Lehrbuch an der Stelle ein anderes Wort nimmt als der Baukasten (z. B. „kosoyam talafon – er telefoniert“ statt einer Form von mtalfan, „komtalfëni“, das in keiner Tabelle steht, „yawmo basimo – schöner Tag“ mit basimo statt ḥalyo) – solche Sätze prüfen die Wortwahl, nicht die Regel. Liegt ein Satz daneben, bekommt die Regel die Schuld, deren Stück nicht im echten Satz vorkommt (sonst die äußere); die Regel mit den meisten Fehlgriffen wird abgeschaltet, bis keine mehr danebenliegt. Eine Regel ohne genau getroffenen Beleg bleibt aus. Wörterbuch-Einträge werden an Kommas in ihre Bedeutungen getrennt, Sätze nicht („E, ḥozina – Gut, wir werden sehen“ übersetzt „wir werden sehen“ ohne gëd).
- **Trefferquote (Stand 22.11.2026):** 103 deutsche Sätze des Lehrbuchs gebaut, 94 genau getroffen, 9 nicht vergleichbar, 0 daneben. Pro Regel getroffen: Artikel 50, Präsens 21, Possessiv 15, Präposition 13, Kopula 10, Adjektiv 8, Futur 8, Zahl 4, „es gibt“ 2, „haben“ 1. Unterwegs hat die Gegenprobe echte Fehler gefunden, die jetzt behoben sind: „wir sind“ als Verb „werden, sein“ (kohowina), „Arbeiter“ als Mehrzahl von „Arbeit“, „zum Schluss“ mit l, das ko-Präsens der Zeitformen statt der Grundform.
- **Grenzen:** Viele Alltagswörter stehen in Level A nicht als einzelnes Wort mit Bedeutung (Auto, Geld, Brot, Wasser, Tee) – dann wird nichts gebaut; das große Glossar (Schritt 7) hilft. Fragen, Nebensätze, „es“, Vergangenheit von Verben und verneinte Verben baut der Baukasten nicht. Bei gleichbedeutenden Wörtern zeigt er bis zu zwei.
- **Zeit:** Die Gegenprobe der Regeln dauert am Rechner etwa 0,1 s; der Übersetzer bereitet Wort für Wort, Satzbaupläne und Regeln nacheinander in kleinen Schritten vor, kurz nachdem er geöffnet ist.

**22.11.2026 – Phase 4b (Übersetzer), Schritt 4: Baukasten, Teil 1 – ein Wort tauschen**
- **Wann:** Tippt man im Übersetzer einen deutschen Satz, der nicht als Bedeutung eines Eintrags in den Daten steht (Artikel egal), und passt ein Satzbau aus dem Lehrbuch genau, kommt zuerst „Zusammengesetzt“ mit einer Karte pro Fassung (höchstens 3), darunter wie bisher „Einträge mit diesen Wörtern“ und „Satz anfragen“ („Willst du sicher sein, dass man es so sagt?“). Steht der Satz im Lehrbuch („zwei Männer“, „er wird schlafen“), wird nichts zusammengesetzt. Käme genau ein Lehrbuch-Satz heraus („2 Männer“ → tre gawre), auch nicht.
- **Satzbau:** Zwei Einträge der Daten (Sätze, Wendungen, Grammatik-Beispiele, Glossar) sind gleich gebaut, wenn sie sich auf Surayt in genau einem Wort unterscheiden und auf Deutsch genau in dessen Bedeutung (laut eigenem Eintrag des Wortes, z. B. „domax – schlafen“). Alle übrigen Wörter müssen gleich sein; deutsche Artikel zählen nur direkt vor dem getauschten Wort („Glas Wein“ = „ein Glas Bier“ bis aufs Wort, aber „die vier Männer“ ≠ „vier Männer“). Das Deutsche braucht außer dem Wort noch mindestens ein weiteres – „yawme d ḥušabo – Sonntag“ zeigt keinen Satzbau. Als Vorlage taugt ein Satzbau nur, wenn das Lehrbuch ihn mindestens zweimal mit verschiedenen Wörtern zeigt. Gefunden: 13.
- **Gleichartig** ist das neue Wort, wenn das Lehrbuch dasselbe über es sagt wie über das alte: *Verbformen* gleiche Zeit und Person laut Beschriftung der Verbtabellen („Präsens, Sg., 3. m.“ → „Präsens · er“; „Präsensbasis“ in den Formentabellen ist dasselbe wie „Präsens“ in der Verbkonjugation, die Form mit ko- „Präsens (G.7b)“ in den Zeitformen nicht). *Zahlen* gleiches Geschlecht laut Zahlentabelle („Maskulin“/„Feminin“, nur 1–10); die Eins steht im Lehrbuch mit der Einzahl („ḥḏo aṯto – eine Frau“), die übrigen mit der Mehrzahl, deshalb wird „1 Frauen“ nicht gebaut. „sieben“ und „7“ gelten als gleich, weil sie im Wortschatz und in der Zahlentabelle dasselbe Wort übersetzen. *Alles andere* gleiches Geschlecht und gleiche Zahl, und zwar nur, wenn das Lehrbuch sie zeigt: am Artikel davor (u, i, aK, auch in bu, lak … – „Das Geschlecht der Substantive erkennt man eindeutig am Artikel“, Grammatik 4), an Zusätzen („aḏno (f.), Pl. aḏne“, „ṭawwo – gut (m.Sg.)“), an den Tabellen der Pluralbildung (Grammatik 6: „Maskuline/Feminine Substantive“, Singular/Plural), der Adjektive (Grammatik 11: m.Sg., f.Sg. und „eine gemeinsame Pluralform“) und an Beispielen mit Beschriftung („ḥḏo aṯto“ f.). Zeigt das Lehrbuch ein Wort einmal männlich und einmal weiblich, bleibt es offen. Die Endungsregel „-to/-ṯo ist weiblich“ zählt nicht, weil das Lehrbuch selbst Ausnahmen nennt (u bayto). So sind 209 der 492 Substantive im Wortschatz bestimmt; ohne Geschlecht und Zahl wird nichts getauscht.
- **Gegenprobe:** Jeder deutsche Satz der Daten wird mit allen 13 Satzbauplänen zusammengesetzt, ohne dass der Baukasten ihn kennt – nicht als Vorlage, nicht als Beleg für ein Merkmal, nicht als Wort. Dass der Satzbau zweimal im Lehrbuch steht, zählt dabei weiter, sonst ließe sich kein Satzbau mit genau zwei Belegen prüfen. Ein Satzbau wird eingeschaltet, wenn er mindestens einen seiner Belege genau trifft und nie danebenliegt; findet er für einen Beleg ohne diesen kein Merkmal, zählt das als „nicht gebaut“, nicht als Fehler. Die App rechnet das selbst aus (auf dem Rechner etwa 0,15 s, einmal, kurz nach dem Öffnen des Übersetzers), ändern sich die Daten, rechnet sie neu.
- **Trefferquote (Stand 22.11.2026):** 4 von 13 Satzbauplänen eingeschaltet. Gebaut wurden 8 deutsche Sätze des Lehrbuchs, alle 8 genau getroffen, keiner daneben. Eingeschaltet: „gëd _ – er wird _“ (gëd goraš, gëd domax) und „gëd _ – wir werden _“ (gëd ḥozina, gëd uxlina), je 47 Verben aus den Verbtabellen; „_ gawre – _ Männer“ (tre, tloṯo) und „_ niše – _ Frauen“ (tarte, tlëṯ), je die Zahlen 4–10 als Wort oder Ziffer. Ausgeschaltet, weil kein Beleg ohne sich selbst gebaut werden kann: „koso d _ – Glas _“ und „layt _ – kein _“ (Geschlecht von ḥamro, këlyono, qëṭro unbekannt), „tarte _ – zwei _“ (kore), „_ na – wir sind _“ (gawire), drei Satzbaupläne, in denen die Kopula getauscht wird (yo/wa, ne/wayne, hat/wayt – das ist Schritt 5), „gawire _ – wir _ verheiratet“ und „_ cam šërkat ġalabe“. Ein früher Entwurf mit dem Satzbau „gëd _ – <Verb>“ aus den Zeitformen lag 106-mal daneben – solche Pläne, bei denen das Deutsche nur aus dem Wort besteht, sind jetzt ganz ausgeschlossen.
- **Anzeige:** Karte mit orangem Rand und Schild, Surayt groß, Deutsch (der Satz der Vorlage mit dem getippten Wort), der Warnsatz des Schildes, „Keine Aufnahme – zusammengesetzte Sätze hat niemand eingesprochen.“ Darunter „Bauplan“: „Ein Wort getauscht: statt goraš steht oxal. Beide: Präsens · er.“, „Gleich gebaut wie“ mit den Lehrbuch-Sätzen samt Aufnahme (die Vorlage zuerst, am liebsten eine mit Aufnahme), „Getauscht“ mit beiden Wörtern, ihren Merkmalen und woher sie stammen („laut Verbtabelle“, „am Artikel in „u bayto““), und „Wort für Wort“ des neuen Satzes. Kein großer Lautsprecher, nichts wird zusammengeschnitten. Unter „So findest du alles“ steht ein Satz dazu.
- **Nur im Übersetzer:** Zusammengesetztes hat keine Kennung, kommt nicht in „Zuletzt nachgeschlagen“ und wird nur von `src/screens/Woerterbuch.tsx` und `src/components/Zusammengesetzt.tsx` benutzt; ein Test schlägt an, wenn ein anderer Teil der App den Baukasten einbindet.
- **Noch offen:** „Ich bin: Junge / Mädchen“ kam mit Schritt 5. Die Sperrliste für Sätze, die ein Muttersprachler verbessert hat, kommt mit Schritt 6.

**21.11.2026 – Phase 4b (Übersetzer), Schritt 3: Wort für Wort**
- **Wann:** Tippt man im Übersetzer einen Surayt-Satz (ab zwei Wörtern), der so nicht in den Daten steht, kommt zuerst „Nicht als Ganzes gefunden“ und darunter „Wort für Wort“: jedes Wort in der Reihenfolge des Satzes, rechts daneben bis zu drei Bedeutungen, jede mit Schild, Herkunft und Aufnahme. Darunter stehen wie bisher Einträge, in denen die Wörter vorkommen, und „Satz anfragen“. Auf der Seite jedes Satzes (und mehrteiliger Grammatik-Beispiele) ersetzt „Wort für Wort“ die bisherige Liste „Wörter aus diesem Satz“. Deutsche Suchen bleiben, wie sie waren.
- **Surayt oder Deutsch?** Die App zählt Wort für Wort: Surayt ist ein Wort mit Sonderzeichen der Umschrift oder eines, das als Surayt-Wort bekannt ist; Deutsch eines aus den deutschen Bedeutungen (nur deutsch geschriebene Wörter, damit Namen wie „Abrohëm“ nicht mitzählen). Wörter, die es in beiden Sprachen gibt („hat“, „Saro“), zählen nicht. Geprüft: 316 von 318 Sätzen der Lektionen werden ohne Sonderzeichen als Surayt erkannt, keiner ihrer deutschen Sätze.
- **So wird jedes Wort gesucht** (das erste, was passt, gilt): 1. Wendungen aus mehreren Wörtern, die genau so in den Daten stehen („u gawro – der Mann“, „gëd goraš“), auf der Seite eines Satzes höchstens 4 Wörter lang. 2. Das Wort selbst: Stichwort, Form aus einer Tabelle oder eine Form, die ein Eintrag aufzählt (Mehrzahl im Zusatz wie „aḏno (f.), Pl. aḏne“, Formen im Glossar wie „cal+Suffix: Sg. acli, acle …“). 3. Zerlegt nach einer Regel (siehe unten). 4. „Steht nicht einzeln im Übersetzer. Kommt so vor in:“ mit einem kurzen Satz aus den Lektionen. 5. Nur in der Suche: „Ähnlich geschrieben“ (ein Tippfehler, ab 5 Buchstaben) – bei Sätzen aus dem Lehrbuch nicht, dort führten ähnliche Wörter in die Irre („Marta“ → „marca“). Sonst „Nicht im Übersetzer“.
- **Sonderzeichen:** Mit Sonderzeichen getippt („ṭalyo“) zählen nur Einträge mit genau diesen Zeichen; ohne („talyo“) alle, die so aussehen, die genau gleich geschriebenen zuerst. „sch“, „sh“ usw. gehen wie in der Suche.
- **Kleinwörter aus den Erklärtexten:** Die häufigsten unerklärten Wörter waren Artikel und Präpositionen – das Lehrbuch erklärt sie im Text, nicht in Tabellen mit deutscher Spalte. `npm run extract -- grammatik` liest jetzt zusätzlich wörtlich: die 13 Präpositionen aus „Die häufigsten Präpositionen sind b ܒـ „in“, …“ (Grammatik 11; bei „m, me „von, aus““ gilt die Bedeutung für beide), Wörter hinter einer Bezeichnung („der Präsensmarker ko-“, „der Futurmarker gëd“, Grammatik 13; „die Genitivpartikel /d/“, Grammatik 10; „die Konjunktion d“, Grammatik 7 – die Bezeichnung ist dann die Bedeutung), die 4 Formen der Tabelle „Der bestimmte Artikel“ (die Überschrift ist die Bedeutung, „Sg., m.“ usw. die Beschriftung; „aK“ steht für a + ersten Konsonanten des Substantivs) und 12 Beispiele mit Aufnahme, deren Bedeutung in derselben Zelle steht („bu bayto – im Haus“). Zusammen 33 neue Einträge; sie bekommen ihre Kennung nach allen übrigen, damit deren Kennungen bleiben. Die Website war seit Schritt 2 unverändert (Neu-Einlesen ergab dieselbe Datei). „Genitivpartikel d“ hat als einziger Eintrag keine syrische Schrift, weil sie dort auch im Lehrbuch fehlt.
- **Vier Regeln zum Zerlegen**, jede aus dem Lehrbuch: *Präposition + Artikel* („lu“ = l + u, „bak“ = b + aK; Grammatik 11: „Die kurzen Präpositionen werden mit dem Artikel zusammengeschrieben“; die Genitivpartikel d ebenso: „du“, „di“), *Präsensmarker + Verbform* („kosaymono“ = ko- + saymono; nur vor einer Grundform des Präsens aus den Verbtabellen oder vor dem Strich der Zitierform, Grammatik 7b), *Substantiv + Possessivsuffix* und *Substantiv + Demonstrativsuffix* („cwodayḏe“ = cwodo + -ayḏe; Grammatik 5: an das endungslose Substantiv, also ohne -o/-e/-a). Welche Wörter Präpositionen, Artikel oder Suffixe sind, kommt aus den Daten, nicht aus dem Code. Jedes Teil muss genau in den Daten stehen. Die Regeln des Lehrbuchs gelten auch als Grenze: Die allgemeine Reihe und das Demonstrativsuffix nur mit Artikel davor, die eingeschränkte Reihe nur ohne – und nur für Verwandtschaft und Körperteile (Wortschatz von Lektion 4 „Familie“ und 7 „Körper“) sowie die Ausnahmen, die Grammatik 5 nennt (xabro, ëšmo, šuġlo, cëmro). Sonst wäre jede Mehrzahl auf -e („yawme“, Tage) auch „sein Tag“. „aK“ gilt nur, wenn das nächste Wort mit diesem Konsonanten beginnt.
- **Anzeige einer Zerlegung:** oranges Schild „Nicht geprüft“ (die Teile stehen im Lehrbuch, die Zerlegung hat niemand geprüft), die Regel mit Kapitel („Präposition + Artikel · nach Grammatik 11“), darunter die Teile mit ihren Bedeutungen und, wenn es ihn gibt, „So im Lehrbuch:“ mit einem Eintrag, in dem das Wort genau so vorkommt („lu bayto – ins Haus“).
- **Trefferquote** an allen 318 Sätzen der Lektionen (jeder Satz ohne sich selbst erklärt): von 3.438 Wörtern 2.851 als Eintrag oder Wendung und 252 zerlegt, zusammen 90 %; 230 (7 %) kommen in anderen Sätzen vor, 100 (3 %) bleiben unerklärt, vor allem Namen, seltene Formen und „dë/bë/lë“, für die das Lehrbuch keine Regel nennt. Ohne Sonderzeichen getippt genauso (90 %). Nicht erkannt werden z. B. „k-“ vor Vokal („kuxlina“) und Formen mit Objekt- oder L-Suffixen, die nicht in den Tabellen stehen.
- Der Übersetzer hat jetzt 4.345 Einträge. Wort für Wort läuft offline und braucht etwa 1 ms pro Satz.

**21.11.2026 – Phase 4b (Übersetzer), Schritt 2: Grammatik, Verb- und Formentabellen**
- **Eingelesen** werden die Grammatik-Seiten der Lektionen 3–16, die Verbkonjugation „Surcofo“ (Kapitel 1.17) und die 12 Formentabellen aus Teil 4 (Artikel, Pronomina, Hilfsverben, regelmäßige und unregelmäßige Verben, Passiv, L-Suffixe, Objektsuffixe, Zeitformen, Zahlen, Wochentage/Monate/Jahreszeiten): `npm run extract -- grammatik` → `src/data/grammatik.json`. Jede Seite steht dort als Folge von Überschriften, Absätzen und Tabellen, wörtlich, damit die App sie zeigen kann.
- **Einträge aus den Tabellen:** Jede Umschrift mit ihrer syrischen Schrift wird ein Eintrag, mit Aufnahme, wenn die Website eine hat. Die deutsche Bedeutung kommt aus derselben Tabellenzeile; bei Verbtabellen ohne deutsche Spalte aus der Zeile darüber, die das Verb vorstellt („grš ܓܪܫ I: goraš – grëšle “ziehen”“, bzw. der Überschrift „“sagen”“). Anführungszeichen um eine ganze Bedeutung fallen weg („„ziehen““ → „ziehen“). Tabellen ohne beides (z. B. die Zeitformen von goraš) erben die Bedeutung eines Verbs, wenn mindestens zwei ihrer Formen genau mit dessen Formen übereinstimmen. Formen, für die es so keine Bedeutung gibt (258, vor allem Endungen und Präpositionen mit Suffixen), stehen nur in den Tabellen.
- **Die Beschriftung** (`merkmal`) setzt sich wörtlich aus den Kopf- und Zeilenbeschriftungen der Tabelle zusammen: „Präsens, Sg., 1. f.“, „Singular, 2. Person (f.)“, „Plural“, „Subjekt 3. m. sg., Objekt 2. f. sg.“. Stehen in einer Zelle zwei Formen untereinander („diḏux / diḏax“), werden sie zwei Einträge mit je ihrer Zeile der Beschriftung. Die App ergänzt bei Verbformen die Person in Worten („ich, weiblich“) – das ist deutsche Oberfläche, kein Surayt.
- **„er kaufte“ ist keine Verbbedeutung:** Übersetzt eine Zeile nur eine einzelne Form („šql ܫܩܠ I, Präteritum: šqile „er kaufte““), wird das nicht auf die ganze Tabelle übertragen; die Tabelle erbt dann die Bedeutung des Verbs („nehmen, kaufen“) von einer anderen Seite. Ein Test wacht darüber.
- **Nicht übernommen:** 4 Sätze der Erklärtexte, die „aramäisch“ enthalten (Vergleiche mit dem älteren Aramäischen, z. B. „Die aktiven Verbalstämme des Surayt setzen die älteren aramäischen Stämme Pʿal … fort.“) – wie bei Lektion 1–2, solange die Entscheidung zu den Bezeichnungen offen ist. Beispielsätze in den Tabellen bleiben wörtlich wie die Sätze der Lektionen (5 davon mit „Aramäer/Assyrer“, siehe Abschnitt 7).
- **Im Übersetzer** sind Beispiele und Formen ganz normale Einträge mit Schild „Lehrbuch“. Gleiche Formen (gleiche Umschrift, gleiche Bedeutung) stehen einmal da und kennen alle ihre Stellen; so bekommen viele Formen der Verbtabellen (die keine Aufnahmen haben) die Aufnahme derselben Form aus der Grammatik einer Lektion. Die Grammatik kommt vor dem Glossar: Glossar-Wendungen, die eine Form nur wiederholen, fallen weg.
- **Suche nach Verbformen:** „ich schlafe“, „du schläfst“, „wir kommen“ finden die Formen für diese Person; dafür zählen deutsche Wortstämme („schlafe“, „schläfst“ → „schlaf“). Unregelmäßige deutsche Formen („isst“, „gibst“) klappen nicht. Wer nur „schlafen“ sucht, bekommt von jedem Verb nur die Grundform (die erste Form, mit der das Lehrbuch das Verb vorstellt) – die übrigen stehen auf deren Eintragsseite.
- **Eintragsseite:** unter dem Deutschen die Beschriftung („Präsens, Sg., 1. f. · ich, weiblich“), darunter „So steht es im Lehrbuch“ bzw. „Alle Formen von domax – damëx“ mit der ganzen Tabelle, die Form gelb hervorgehoben, Aufnahmen zum Antippen. Bei Grammatik-Beispielen lässt sich die Erklärung des Abschnitts aufklappen, bei Verben stehen Imperativ und Infinitiv darunter, und es gibt einen Link „Diese Seite im Lehrbuch öffnen“. Verbformen zeigen die Verb- oder Formentabelle (alle Personen einheitlich beschriftet), alles andere die Grammatik der Lektion (mit Aufnahmen). Spalten mit syrischer Schrift sind bis Phase 6 ausgeblendet; breite Tabellen scrollen in sich.
- **Größe:** Die Grammatik ist ein eigener Teil der App (etwa 145 KB komprimiert), der wie das Glossar erst beim Öffnen des Übersetzers geladen und vom Service Worker für offline abgelegt wird. Geprüft: Internet aus, neu laden – „du gehst“ findet die Formen.
- Grammatik und Formen erscheinen nur im Übersetzer, nicht in Lernpfad, Übungen oder Karteikasten.

**21.11.2026 – Phase 4b (Übersetzer), Schritt 1**
- **Grundsatz geändert:** Der Übersetzer darf Sätze aus Lehrbuch-Bausteinen nach Lehrbuch-Regeln zusammensetzen. Sie tragen immer das orange Schild „Zusammengesetzt – nicht geprüft“, haben keine Aufnahme und erscheinen nur im Übersetzer, nie in Übungen, Karteikasten oder Satz der Woche. Eine KI übersetzt weiterhin nichts, und Claude schreibt keine Surayt-Sätze von Hand. `CLAUDE.md` ist angepasst.
- **Zusammengesetztes wird gleich gezeigt**, aber nur, wenn kein geprüfter Eintrag passt.
- **Eine Bestätigung reicht:** Bestätigt ein eingetragener Prüfer einen Satz, bekommt er das Schild „Muttersprachler“. Abweichende Fassungen aus anderen Orten werden zusätzlich mit Ort gespeichert.
- Der Bereich heißt jetzt **„Übersetzer“** (Leiste, Überschrift, Kurzbefehl auf Android), die Adresse `#/uebersetzer`. Alte Links auf `#/woerterbuch` führen weiter. Im Code heißen Dateien und der Speicher `surayt.woerterbuch.v1` weiter wie bisher, damit nichts verloren geht.
- **Drei Schilder** mit Symbol, Farbe und Text, damit sie auch ohne Farbsehen zu unterscheiden sind: „Lehrbuch“ (grün, Haken), „Muttersprachler“ (blaugrün, Haken), „Zusammengesetzt – nicht geprüft“ (orange, Warndreieck; in Listen kurz „Nicht geprüft“). Das bisherige Schild „Community“ geht in „Muttersprachler“ auf; Einträge mit `quelle: 'community'` bekommen dieses Schild. Orange bedeutet in der App jetzt immer „nicht geprüft“.
- Wo die Schilder stehen: in jeder Trefferzeile vor „Satz · Lektion 3“, oben auf der Karte der Eintragsseite (darunter wie bisher die genaue Herkunft) und erklärt auf der Startseite des Übersetzers unter „Was die Schilder bedeuten“.
