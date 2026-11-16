// Lektionen 3–16: Einleitung, Dialog oder Lesetext und Wortschatz.

import { slug } from './slug.mjs';
import {
  alteTags,
  audioUrl,
  clean,
  datei,
  eintragsBauer,
  LATEIN,
  load,
  quelle,
  schreibe,
  SYRISCH,
  unterseiten,
  wortId,
  wortschatzSeite,
} from './lehrbuch.mjs';

/**
 * Sprechername am Zeilenanfang: der Text vor dem ersten Audio-Link, wenn er
 * mit einem Doppelpunkt endet („**Afrem**: …“, „**Aday:** …“). Die Website
 * zerlegt manche Namen in mehrere fette Stücke, deshalb zählt nur der Text.
 */
function sprecherIn($, td) {
  const link = $(td).find('a').first();
  if (!link.length) return undefined;
  const roh = $(td).text();
  const vorLink = clean(roh.slice(0, roh.indexOf(link.text())));
  const treffer = /^(.{1,30}?)\s*:$/.exec(vorLink);
  return treffer ? treffer[1] : undefined;
}

const ohneSprecher = (text) => text.replace(/^[^:]{1,40}:\s*/, '');

/** Eine Zeile mit Umschrift und Deutsch. */
function lateinZeile($, tr, pageUrl) {
  const tds = $(tr).find('td');
  const sur = tds.eq(0);
  const hrefs = [...new Set(sur.find('a').toArray().map((a) => $(a).attr('href')))];
  if (hrefs.length > 1) console.warn('  ! mehrere Audios in einer Zeile:', clean(sur.text()));
  const sprecher = sprecherIn($, sur);
  const latein = clean(sur.text());
  const deutsch = clean(tds.eq(1).text());
  return {
    sprecher,
    latein: sprecher ? ohneSprecher(latein) : latein,
    // Im Deutschen steht der Sprechername noch einmal davor („Afrem: …“).
    deutsch: sprecher ? ohneSprecher(deutsch) : deutsch,
    audio: audioUrl(hrefs[0], pageUrl),
  };
}

/**
 * Tabellen der Textseite einordnen. Jede Tabelle ist entweder syrisch, in
 * Umschrift oder gemischt (Bildtafeln mit beschrifteten Bildern).
 */
function tabellen($) {
  return $('main#articles section > table')
    .toArray()
    .map((table) => {
      const text = $(table).text();
      const syr = SYRISCH.test(text);
      const lat = LATEIN.test(text);
      return {
        rows: $(table).find('tr').toArray(),
        kopf: ($(table).attr('class') ?? '').includes('header_table'),
        schrift: syr && lat ? 'gemischt' : syr ? 'syrisch' : 'latein',
      };
    });
}

/**
 * Bildtafeln: Bilder mit Beschriftung, Spalte für Spalte untereinander erst
 * syrische Schrift, dann Umschrift (mit Audio), dann Deutsch (z. B. die Gerichte
 * in Lektion 10). Übernommen werden nur Tafeln mit deutscher Zeile – bei den
 * anderen steht die Bedeutung nur im Bild.
 */
function bildtafel($, rows, pageUrl) {
  const zellen = (tr) => $(tr).find('td').toArray();
  const art = (tr) => {
    const tds = zellen(tr).filter((td) => clean($(td).text()));
    if (!tds.length) return 'leer';
    if (tds.every((td) => SYRISCH.test($(td).text()) && !LATEIN.test($(td).text()))) return 'syrisch';
    if (tds.some((td) => SYRISCH.test($(td).text()))) return 'gemischt';
    return tds.every((td) => $(td).find('a').length) ? 'latein' : 'deutsch';
  };
  const woerter = [];
  for (let i = 0; i + 2 < rows.length; i++) {
    if (art(rows[i]) !== 'syrisch' || art(rows[i + 1]) !== 'latein' || art(rows[i + 2]) !== 'deutsch') continue;
    const [syr, lat, de] = [rows[i], rows[i + 1], rows[i + 2]].map(zellen);
    lat.forEach((td, j) => {
      const latein = clean($(td).text());
      if (!latein || !de[j] || !syr[j]) return;
      woerter.push({
        latein,
        deutsch: clean($(de[j]).text()),
        syrisch: clean($(syr[j]).text()),
        audio: audioUrl($(td).find('a').first().attr('href'), pageUrl),
        audio2: audioUrl($(syr[j]).find('a').first().attr('href'), pageUrl),
      });
    });
    i += 2;
  }
  if (!woerter.length) console.log(`  · Bildtafel ohne deutsche Zeile übersprungen (${rows.length} Zeilen)`);
  return woerter;
}

export async function extrahiereLektion(kapitel, nr) {
  const pad = String(nr).padStart(2, '0');
  const outFile = datei(`lektion-${pad}.json`);
  const chapter = `1.${nr}`;
  if (!kapitel.has(chapter)) throw new Error(`Lektion ${chapter} nicht im Inhaltsverzeichnis gefunden`);
  const seiten = unterseiten(kapitel, nr);
  const textSeite = seiten[0];
  const wortSeite = seiten.find((p) => p.title === 'Wortschatz');
  if (!textSeite || !wortSeite) throw new Error(`Lektion ${nr}: Text- oder Wortschatzseite nicht gefunden`);

  // Textseite: Tabellen-Paare aus syrischer Schrift und Umschrift. Das erste
  // Paar ist die Einleitung (erste Zeile = Lektionstitel), das zweite der
  // eigentliche Dialog oder Lesetext mit eigener Überschrift.
  const seite = await load(textSeite.num);
  const $d = seite.$;
  const alle = tabellen($d);
  const bildwoerter = alle.filter((t) => t.schrift === 'gemischt').flatMap((t) => bildtafel($d, t.rows, seite.url));
  const auswahl = (kopf, schrift) => alle.filter((t) => t.kopf === kopf && t.schrift === schrift);
  const paare = (kopf) => {
    const syr = auswahl(kopf, 'syrisch');
    const lat = auswahl(kopf, 'latein');
    if (syr.length !== lat.length) console.warn(`  ! ${syr.length} syrische, ${lat.length} lateinische Tabellen`);
    return lat.map((l, i) => ({ lat: l.rows, syr: syr[i]?.rows ?? [] }));
  };
  const koerper = paare(false);
  const koepfe = paare(true);
  if (koerper.length > 2) console.warn(`  ! ${koerper.length} Textabschnitte, erwartet höchstens 2`);

  function zeilen({ lat, syr }) {
    if (syr.length !== lat.length) console.warn(`  ! ${lat.length} Zeilen Umschrift, ${syr.length} syrisch`);
    return lat.map((tr, i) => {
      const zeile = lateinZeile($d, tr, seite.url);
      let syrisch = syr.length === lat.length ? clean($d(syr[i]).text()) : '';
      if (zeile.sprecher) syrisch = ohneSprecher(syrisch);
      return { ...zeile, syrisch };
    });
  }

  function ueberschrift(paar) {
    if (!paar) return undefined;
    const tds = $d(paar.lat[0]).find('td');
    return {
      latein: clean(tds.eq(0).text()),
      syrisch: clean($d(paar.syr[0]).text()),
      deutsch: clean(tds.eq(1).text()),
      audio: audioUrl(tds.eq(0).find('a').attr('href'), seite.url),
    };
  }

  const [titelZeile, ...einleitungRoh] = zeilen(koerper[0]);
  const titel = {
    latein: titelZeile.latein,
    syrisch: titelZeile.syrisch,
    deutsch: titelZeile.deutsch,
    audio: titelZeile.audio,
  };
  // Ohne eigenen Textabschnitt (z. B. Lektion 9) ist die Einleitung selbst der Text.
  const textRoh = koerper[1] ? zeilen(koerper[1]) : einleitungRoh;
  const textTitel = koerper[1] ? ueberschrift(koepfe[0]) : undefined;

  const wortschatz = wortschatzSeite(await load(wortSeite.num));
  // Wörter aus Bildtafeln, die nicht schon im Wortschatz stehen, kommen ans Ende.
  const bekannt = new Set(wortschatz.map((w) => slug(w.latein)));
  const zusatz = bildwoerter.filter((w) => !bekannt.has(slug(w.latein)));
  if (zusatz.length) console.log(`  · ${zusatz.length} Wörter aus einer Bildtafel: ${zusatz.map((w) => w.latein).join(', ')}`);

  const tags = await alteTags(outFile, (alt) => [...alt.einleitung, ...(alt.text ?? alt.dialog), ...alt.wortschatz]);
  const eintrag = eintragsBauer(nr, tags);
  const num2 = (i) => String(i + 1).padStart(2, '0');
  const lesson = {
    nr,
    titel,
    ...(textTitel && { textTitel }),
    quelle: quelle(chapter),
    einleitung: koerper[1] ? einleitungRoh.map((e, i) => eintrag(`L${pad}-E-${num2(i)}`, 'satz', e)) : [],
    // Kennung „D“ wie Dialog – auch bei Lesetexten, damit der Lernstand gültig bleibt.
    text: textRoh.map((e, i) => eintrag(`L${pad}-D-${num2(i)}`, 'satz', e)),
    wortschatz: [
      ...wortschatz.map((e) => eintrag(wortId(pad, e.latein), 'wort', e)),
      ...zusatz.map((e) => eintrag(wortId(pad, e.latein), 'wort', e, ['bildtafel'])),
    ],
  };

  await schreibe(outFile, lesson);
  const sprecher = new Set(lesson.text.map((z) => z.sprecher).filter(Boolean));
  console.log(
    `Lektion ${nr} „${lesson.titel.latein}“: ${lesson.einleitung.length} Einleitungssätze, ` +
      `${lesson.text.length} Textzeilen${sprecher.size ? ` (Dialog: ${[...sprecher].join(', ')})` : ''}, ` +
      `${lesson.wortschatz.length} Wörter`,
  );
}
