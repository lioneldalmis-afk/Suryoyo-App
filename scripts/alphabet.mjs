// Lektion 1 (Olafbeṯ I) und 2 (Olafbeṯ II): Alphabet, Laute und Hörpaare.
//
// Diese Lektionen haben keinen Dialog, sondern erklären Buchstaben und
// Aussprache. Übernommen wird, was zum Hören und Lesen der Umschrift hilft:
//   Lektion 1: die Buchstaben der Umschrift, die syrischen Buchstaben mit
//              Namen und die drei für Surayt neuen Buchstaben č, j, ž
//   Lektion 2: die besonderen Konsonanten und die Vokale mit Beispielen,
//              die Betonungsregel und die Hörpaare („talyo – ṭalyo“)
// Nicht übernommen werden Abschnitte über das Schreiben der syrischen Schrift
// und Vergleiche mit dem klassischen Syrisch.

import {
  alteTags,
  audioUrl,
  clean,
  datei,
  eintragsBauer,
  load,
  quelle,
  schreibe,
  SYRISCH,
  unterseiten,
  wortId,
  wortschatzSeite,
} from './lehrbuch.mjs';

const MARKE_AN = '\u{E000}';
const MARKE_AUS = '\u{E001}';

/**
 * Umschrift eines Beispielworts samt hervorgehobenem Laut. Die Website
 * markiert ihn mit `<span class="highlight">` innerhalb des Links
 * („kä<span class="highlight">č</span>al“).
 */
function beispielwort($, td, pageUrl) {
  const link = $(td).find('a').first();
  const quelle = link.length ? link : $(td);
  let roh = '';
  const lauf = (knoten, markiert) => {
    for (const k of knoten.childNodes ?? []) {
      if (k.type === 'text') roh += markiert ? MARKE_AN + k.data + MARKE_AUS : k.data;
      else lauf(k, markiert || $(k).hasClass('highlight'));
    }
  };
  lauf(quelle[0], false);
  const mitMarken = clean(roh).replaceAll(MARKE_AUS + MARKE_AN, '');
  const von = mitMarken.indexOf(MARKE_AN);
  const latein = mitMarken.replaceAll(MARKE_AN, '').replaceAll(MARKE_AUS, '');
  const bis = von < 0 ? -1 : mitMarken.indexOf(MARKE_AUS) - 1;
  return {
    latein,
    hervor: von >= 0 && bis > von ? [von, bis] : undefined,
    audio: audioUrl(link.attr('href'), pageUrl),
  };
}

/** Der Absatz, der mit `beginn` anfängt (die Absätze stehen wörtlich im Lehrbuch). */
function absatz($, beginn) {
  const p = $('main#articles section p')
    .toArray()
    .map((p) => clean($(p).text()))
    .find((t) => t.startsWith(beginn));
  if (!p) throw new Error(`Absatz „${beginn} …“ nicht gefunden`);
  return p;
}

const tabellenIn = ($) => $('main#articles section table').toArray();
const zellen = ($, tr) => $(tr).find('td').toArray();
const text = ($, el) => clean($(el).text());

export async function extrahiereAlphabet(kapitel, nr) {
  const pad = String(nr).padStart(2, '0');
  const outFile = datei(`lektion-${pad}.json`);
  const seiten = unterseiten(kapitel, nr);
  const seite = (titel) => {
    const s = seiten.find((p) => p.title === titel);
    if (!s) throw new Error(`Lektion ${nr}: Seite „${titel}“ nicht gefunden`);
    return load(s.num);
  };

  // Titel aus der Kopfseite der Lektion: „Olafbeṯ I ║ Alphabet I ║ ܐܳܠܰܦܒܶܝܬ̣ ܐ“
  const kopf = await load(`1.${nr}`);
  const [tLat, tDe, tSyr] = zellen(kopf.$, kopf.$('main#articles table tr').first()).map((td) => text(kopf.$, td));
  const titel = { latein: tLat, syrisch: tSyr, deutsch: tDe };

  const tags = await alteTags(outFile, (alt) => [
    ...alt.wortschatz,
    ...Object.values(alt.aussprache ?? {})
      .filter(Array.isArray)
      .flat()
      .flatMap((x) => x.beispiele ?? x.woerter ?? []),
  ]);
  const eintrag = eintragsBauer(nr, tags);
  const num2 = (i) => String(i + 1).padStart(2, '0');
  const aussprache = { texte: {} };

  /** Beispielzeile [Wort, Deutsch, syrisch] → Eintrag. */
  const beispiel = ($, url, id, [wort, de, syr]) =>
    eintrag(id, 'wort', {
      ...beispielwort($, wort, url),
      syrisch: text($, syr),
      deutsch: text($, de),
      audio2: audioUrl($(syr).find('a').first().attr('href'), url),
    });

  if (nr === 1) {
    // Das Alphabet der Umschrift
    const s1 = await seite('Eine Sprache, zwei Alphabete');
    aussprache.texte.alphabet = [absatz(s1.$, 'Das Latein-Alphabet des Surayt')];
    aussprache.alphabet = absatz(s1.$, 'Aa, Ää')
      .replace(/\.$/, '')
      .split(/,\s*/);

    // Die syrischen Buchstaben: Name (mit Aufnahme), Lautwert, Buchstabe
    const s2 = await seite('Surayt in syrisch-aramäischer Schrift');
    const { $ } = s2;
    const buchstaben = tabellenIn($).find((t) => text($, $(t).find('tr').first()).startsWith('Name'));
    aussprache.schrift = $(buchstaben)
      .find('tr')
      .slice(1)
      .toArray()
      .map((tr, i) => {
        const [name, wert, zeichen] = zellen($, tr);
        return {
          id: `L01-S-${num2(i)}`,
          zeichen: text($, wert),
          syrisch: text($, zeichen),
          name: text($, name),
          audio: audioUrl($(name).find('a').first().attr('href'), s2.url),
          beispiele: [],
        };
      });

    // Neue Buchstaben für Laute, die es im Syrischen nicht gibt: Čč, Jj, Žž
    const neu = tabellenIn($).find((t) => /^Čč/.test(text($, $(t).find('tr').first())));
    aussprache.neueBuchstaben = $(neu)
      .find('tr')
      .toArray()
      .map((tr, i) => {
        const [zeichen, wort, de, syrWort, syr] = zellen($, tr);
        return {
          id: `L01-N-${num2(i)}`,
          zeichen: text($, zeichen),
          syrisch: text($, syr),
          beispiele: [beispiel($, s2.url, `L01-N-${num2(i)}-1`, [wort, de, syrWort])],
        };
      });
  }

  if (nr === 2) {
    // Konsonanten: je Tabelle eine Kopfzeile [Buchstabe, Beschreibung, syrisch]
    // und drei Beispielzeilen [Wort, Deutsch, syrisches Wort].
    const k = await seite('Das Lautsystem – Konsonanten');
    aussprache.texte.konsonanten = [absatz(k.$, 'Das Surayt verfügt über konsonantische Laute')];
    aussprache.konsonanten = tabellenIn(k.$)
      .map((t) => k.$(t).find('tr').toArray())
      .filter((rows) => rows.length === 4 && zellen(k.$, rows[0]).length === 3)
      .map((rows, i) => {
        const [zeichen, beschreibung, syr] = zellen(k.$, rows[0]);
        const id = `L02-K-${num2(i)}`;
        const z = text(k.$, zeichen);
        const beispiele = rows.slice(1).map((tr, j) => beispiel(k.$, k.url, `${id}-${j + 1}`, zellen(k.$, tr)));
        // Die Markierung ist nur eine Lesehilfe. Trifft sie einen anderen Buchstaben
        // (beim ḥ ist in „qaḥwa“ das q markiert), wird sie weggelassen.
        for (const b of beispiele) {
          if (b.hervor && b.latein.slice(...b.hervor).toLowerCase() !== z) {
            console.log(`  · Markierung „${b.latein.slice(...b.hervor)}“ in „${b.latein}“ passt nicht zu ${z}, weggelassen`);
            delete b.hervor;
          }
        }
        return { id, zeichen: z, syrisch: text(k.$, syr), beschreibung: text(k.$, beschreibung), beispiele };
      });

    // Vokale: Überblickstabelle [Buchstabe, Wort, Deutsch, syrisches Wort, Vokalzeichen]
    const v = await seite('Die Vokalzeichen');
    const vl = await seite('Das Lautsystem – Vokale');
    aussprache.texte.vokale = [absatz(vl.$, 'Das Surayt hat die Vokale')];
    const beschreibungen = {
      ë: absatz(vl.$, 'Der Kurzvokal /ë'),
      // Aus der Tabelle der Vokalzeichen: „Ftoḥo karyo ║ kurzes /a/ (= ä)“
      ä: tabellenIn(v.$)
        .flatMap((t) => v.$(t).find('tr').toArray())
        .map((tr) => zellen(v.$, tr).map((td) => text(v.$, td)))
        .find((z) => z[0] === 'Ftoḥo karyo')?.[1],
    };
    const ueberblick = tabellenIn(v.$).find((t) => /^A a/.test(text(v.$, v.$(t).find('tr').first())));
    aussprache.vokale = v
      .$(ueberblick)
      .find('tr')
      .toArray()
      .map((tr, i) => {
        const [zeichen, wort, de, syrWort, syr] = zellen(v.$, tr);
        const id = `L02-V-${num2(i)}`;
        const z = text(v.$, zeichen);
        return {
          id,
          zeichen: z,
          syrisch: text(v.$, syr),
          beschreibung: beschreibungen[z.at(-1)],
          beispiele: [beispiel(v.$, v.url, `${id}-1`, [wort, de, syrWort])],
        };
      });

    // Betonung
    const b = await seite('Besonderheiten des Schriftsystems');
    aussprache.texte.betonung = [absatz(b.$, 'Im Surayt wird in der Regel die vorletzte Silbe')];

    // Hörpaare: [Laute, „talyo - ṭalyo“, „versteckt - Junge“, syrisch]
    const u = await seite('Übungen');
    const paare = tabellenIn(u.$).find((t) => u.$(t).find('tr').length === 16);
    aussprache.hoerpaare = u
      .$(paare)
      .find('tr')
      .toArray()
      .map((tr, i) => {
        const [laute, woerter, de, syr] = zellen(u.$, tr);
        const links = u.$(woerter).find('a').toArray();
        const syrLinks = u.$(syr).find('a').toArray();
        const bedeutungen = text(u.$, de).split(/\s+[-–]\s+/);
        if (links.length !== 2 || syrLinks.length !== 2 || bedeutungen.length !== 2) {
          throw new Error(`Hörpaar ${i + 1} unvollständig: ${text(u.$, tr)}`);
        }
        const id = `L02-P-${num2(i)}`;
        return {
          id,
          laute: text(u.$, laute),
          woerter: [0, 1].map((j) =>
            eintrag(`${id}-${j + 1}`, 'wort', {
              latein: text(u.$, links[j]),
              syrisch: text(u.$, syrLinks[j]),
              deutsch: bedeutungen[j],
              audio: audioUrl(u.$(links[j]).attr('href'), u.url),
              audio2: audioUrl(u.$(syrLinks[j]).attr('href'), u.url),
            }),
          ),
        };
      });
  }

  const wortschatz = wortschatzSeite(await seite('Wortschatz'));
  const lesson = {
    nr,
    titel,
    quelle: quelle(`1.${nr}`),
    einleitung: [],
    text: [],
    aussprache,
    wortschatz: wortschatz.map((e) => eintrag(wortId(pad, e.latein), 'wort', e)),
  };
  if (lesson.wortschatz.some((w) => !SYRISCH.test(w.syrisch))) throw new Error('Wort ohne syrische Schrift');

  await schreibe(outFile, lesson);
  const a = aussprache;
  console.log(
    `Lektion ${nr} „${titel.latein}“: ` +
      [
        a.alphabet && `${a.alphabet.length} Buchstaben`,
        a.schrift && `${a.schrift.length} syrische Buchstaben`,
        a.neueBuchstaben && `${a.neueBuchstaben.length} neue Buchstaben`,
        a.konsonanten && `${a.konsonanten.length} Konsonanten`,
        a.vokale && `${a.vokale.length} Vokale`,
        a.hoerpaare && `${a.hoerpaare.length} Hörpaare`,
        `${lesson.wortschatz.length} Wörter`,
      ]
        .filter(Boolean)
        .join(', '),
  );
}
