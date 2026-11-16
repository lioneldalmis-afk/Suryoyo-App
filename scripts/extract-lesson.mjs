#!/usr/bin/env node
// Extraktions-Skript: liest Lektionen von textbook.surayt.com (Šlomo Surayt,
// Level A) und schreibt sie als JSON nach src/data/lektion-NN.json.
//
//   node scripts/extract-lesson.mjs 4          eine Lektion
//   node scripts/extract-lesson.mjs 3-16       mehrere Lektionen
//
// Es wird nichts übersetzt oder ergänzt: Umschrift, syrische Schrift, Deutsch
// und Audio-Links stehen genau so in der Datei, wie sie auf der Website stehen.
// Einzige Ausnahme: unsichtbare Zeichen werden entfernt und das kyrillische „ё“,
// das auf der Website stellenweise statt „ë“ steht, wird durch „ë“ ersetzt
// (sieht gleich aus, würde aber Suche und Wortzuordnung stören).
// Von Hand gepflegte `tags` in einer bestehenden Datei bleiben erhalten.
//
// Hinter einem Proxy (z. B. in Claude Code): NODE_USE_ENV_PROXY=1 voranstellen.
// Mit EXTRAKT_CACHE=<Ordner> werden abgerufene Seiten dort zwischengespeichert,
// damit wiederholte Läufe den Server nicht erneut belasten.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { slug } from './slug.mjs';

const BASE = 'https://textbook.surayt.com/de/Online%20Course/';
const PAUSE_MS = 1000; // Rücksicht auf den Server
const CACHE = process.env.EXTRAKT_CACHE;
const SYRISCH = /[܀-ݏ]/;
const LATEIN = /[A-Za-zÀ-ɏḀ-ỿ]/;

const nummern = process.argv.slice(2).flatMap((arg) => {
  const [von, bis = von] = arg.split('-').map(Number);
  return Array.from({ length: bis - von + 1 }, (_, i) => von + i);
});
if (!nummern.length || nummern.some((n) => !Number.isInteger(n) || n < 1)) {
  console.error('Aufruf: node scripts/extract-lesson.mjs <Nr> [<Nr> …]   oder   <von>-<bis>');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function load(path) {
  const url = BASE + path;
  const datei = CACHE && join(CACHE, encodeURIComponent(path) + '.html');
  if (datei) {
    try {
      return { $: cheerio.load(await readFile(datei, 'utf8')), url };
    } catch {
      // noch nicht im Zwischenspeicher
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const html = await res.text();
  await sleep(PAUSE_MS);
  if (datei) {
    await mkdir(CACHE, { recursive: true });
    await writeFile(datei, html);
  }
  return { $: cheerio.load(html), url: res.url };
}

/** Whitespace vereinheitlichen, unsichtbare Zeichen entfernen, kyrillisches ё → ë. */
function clean(s) {
  return s
    .replace(/[­​-‍﻿]/g, '')
    .replace(/ё/g, 'ë')
    .replace(/Ё/g, 'Ë')
    .replace(/[ \s]+/g, ' ')
    .trim()
    .normalize('NFC');
}

const audioUrl = (href, pageUrl) => (href ? new URL(href, pageUrl).href : undefined);

// --- Inhaltsverzeichnis ------------------------------------------------------

const toc = await load('0');
const kapitel = new Map();
toc.$('a[data-content-fragment-id]').each((_, a) => {
  const num = clean(toc.$(a).find('.chapter').text());
  kapitel.set(num, clean(toc.$(a).text()).slice(num.length).trim());
});

function unterseiten(nr) {
  const prefix = `1.${nr}.`;
  return [...kapitel].filter(([num]) => num.startsWith(prefix)).map(([num, title]) => ({ num, title }));
}

// --- Bausteine zum Lesen der Tabellen ---------------------------------------

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

// --- Eine Lektion ------------------------------------------------------------

async function extrahiere(nr) {
  const pad = String(nr).padStart(2, '0');
  const outFile = fileURLToPath(new URL(`../src/data/lektion-${pad}.json`, import.meta.url));
  const chapter = `1.${nr}`;
  if (!kapitel.has(chapter)) throw new Error(`Lektion ${chapter} nicht im Inhaltsverzeichnis gefunden`);
  const seiten = unterseiten(nr);
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

  // Wortschatzseite: drei Spalten – Umschrift, Deutsch, syrische Schrift.
  const voc = await load(wortSeite.num);
  const $v = voc.$;
  const wortschatz = [];
  $v('main#articles section table.three_columns tr').each((_, tr) => {
    const tds = $v(tr).find('td');
    if (tds.length < 3) return;
    const voll = clean(tds.eq(0).text());
    if (!voll) return;
    const { latein, hinweis } = stichwort(voll);
    wortschatz.push({
      latein,
      hinweis,
      deutsch: clean(tds.eq(1).text()),
      syrisch: clean(tds.eq(2).text()),
      audio: audioUrl(tds.eq(0).find('a').first().attr('href'), voc.url),
      audio2: audioUrl(tds.eq(2).find('a').first().attr('href'), voc.url),
    });
  });
  // Wörter aus Bildtafeln, die nicht schon im Wortschatz stehen, kommen ans Ende.
  const bekannt = new Set(wortschatz.map((w) => slug(w.latein)));
  const zusatz = bildwoerter.filter((w) => !bekannt.has(slug(w.latein)));
  if (zusatz.length) console.log(`  · ${zusatz.length} Wörter aus einer Bildtafel: ${zusatz.map((w) => w.latein).join(', ')}`);

  // Einträge im einheitlichen Format
  let oldTags = {};
  try {
    const old = JSON.parse(await readFile(outFile, 'utf8'));
    for (const e of [...old.einleitung, ...(old.text ?? old.dialog), ...old.wortschatz]) oldTags[e.id] = e.tags;
  } catch {
    // noch keine Datei vorhanden
  }

  const usedIds = new Set();
  function entry(id, art, fields, tags = []) {
    let unique = id;
    for (let n = 2; usedIds.has(unique); n++) unique = `${id}-${n}`;
    usedIds.add(unique);
    const { latein, syrisch, deutsch, audio, ...extra } = fields;
    for (const k of Object.keys(extra)) if (extra[k] === undefined) delete extra[k];
    return {
      id: unique,
      latein,
      syrisch,
      deutsch,
      audio,
      ...extra,
      lektion: nr,
      art,
      quelle: 'lehrbuch',
      tags: oldTags[unique] ?? tags,
    };
  }

  const num2 = (i) => String(i + 1).padStart(2, '0');
  const lesson = {
    nr,
    titel,
    ...(textTitel && { textTitel }),
    quelle: {
      name: 'Šlomo Surayt',
      url: BASE + chapter,
      abgerufen: new Date().toISOString().slice(0, 10),
    },
    einleitung: koerper[1] ? einleitungRoh.map((e, i) => entry(`L${pad}-E-${num2(i)}`, 'satz', e)) : [],
    // Kennung „D“ wie Dialog – auch bei Lesetexten, damit der Lernstand gültig bleibt.
    text: textRoh.map((e, i) => entry(`L${pad}-D-${num2(i)}`, 'satz', e)),
    wortschatz: [
      ...wortschatz.map((e) => entry(`L${pad}-W-${slug(e.latein)}`, 'wort', e)),
      ...zusatz.map((e) => entry(`L${pad}-W-${slug(e.latein)}`, 'wort', e, ['bildtafel'])),
    ],
  };

  await writeFile(outFile, JSON.stringify(lesson, null, 2) + '\n');
  const sprecher = new Set(lesson.text.map((z) => z.sprecher).filter(Boolean));
  console.log(
    `Lektion ${nr} „${lesson.titel.latein}“: ${lesson.einleitung.length} Einleitungssätze, ` +
      `${lesson.text.length} Textzeilen${sprecher.size ? ` (Dialog: ${[...sprecher].join(', ')})` : ''}, ` +
      `${lesson.wortschatz.length} Wörter`,
  );
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

/**
 * Trennt das Stichwort von Zusätzen, die im Lehrbuch dahinter stehen:
 * „aḏno (f.), Pl. aḏne, aḏnoṯe“ → „aḏno“ + „(f.), Pl. aḏne, aḏnoṯe“,
 * „cammo, pl. cammone“ → „cammo“ + „, pl. cammone“.
 * Wendungen mit Doppelpunkt („cayni: b cayni zabno“) bleiben ganz, weil die
 * Bedeutung zur ganzen Wendung gehört. Stichwort und Zusatz ergeben zusammen
 * wieder genau den Text der Website.
 */
function stichwort(voll) {
  if (voll.includes(':')) return { latein: voll };
  const klammer = voll.indexOf(' (');
  if (klammer > 0) return { latein: voll.slice(0, klammer), hinweis: voll.slice(klammer + 1) };
  const plural = voll.search(/, pl\. /i);
  if (plural > 0) return { latein: voll.slice(0, plural), hinweis: voll.slice(plural) };
  return { latein: voll };
}

for (const nr of nummern) await extrahiere(nr);
