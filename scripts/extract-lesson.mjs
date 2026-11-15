#!/usr/bin/env node
// Extraktions-Skript: liest eine Lektion von textbook.surayt.com (Šlomo Surayt,
// Level A) und schreibt sie als JSON nach src/data/lektion-NN.json.
//
//   node scripts/extract-lesson.mjs 3
//
// Es wird nichts übersetzt oder ergänzt: Umschrift, syrische Schrift, Deutsch
// und Audio-Links stehen genau so in der Datei, wie sie auf der Website stehen.
// Von Hand gepflegte `tags` in einer bestehenden Datei bleiben erhalten.
//
// Hinter einem Proxy (z. B. in Claude Code): NODE_USE_ENV_PROXY=1 voranstellen.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { slug } from './slug.mjs';

const BASE = 'https://textbook.surayt.com/de/Online%20Course/';
const PAUSE_MS = 1000; // Rücksicht auf den Server

const nr = Number(process.argv[2]);
if (!Number.isInteger(nr) || nr < 1) {
  console.error('Aufruf: node scripts/extract-lesson.mjs <Lektionsnummer>');
  process.exit(1);
}
const pad = String(nr).padStart(2, '0');
const outFile = fileURLToPath(new URL(`../src/data/lektion-${pad}.json`, import.meta.url));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function load(path) {
  const url = BASE + path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  await sleep(PAUSE_MS);
  return { $: cheerio.load(await res.text()), url: res.url };
}

/** Whitespace vereinheitlichen, weiche Trennstriche und unsichtbare Zeichen entfernen. */
function clean(s) {
  return s
    .replace(/[­​-‍﻿]/g, '')
    .replace(/[ \s]+/g, ' ')
    .trim();
}

const audioUrl = (href, pageUrl) => (href ? new URL(href, pageUrl).href : undefined);

// --- Inhaltsverzeichnis: Titel und Unterseiten der Lektion -------------------

const toc = await load('0');
const chapter = `1.${nr}`;
const subpages = [];
let chapterTitle = '';
toc.$('a[data-content-fragment-id]').each((_, a) => {
  const num = clean(toc.$(a).find('.chapter').text());
  const title = clean(toc.$(a).text()).slice(num.length).trim();
  if (num === chapter) chapterTitle = title;
  else if (num.startsWith(chapter + '.')) subpages.push({ num, title });
});
if (!chapterTitle) throw new Error(`Lektion ${chapter} nicht im Inhaltsverzeichnis gefunden`);
const dialogPage = subpages[0];
const vocabPage = subpages.find((p) => p.title === 'Wortschatz');
if (!dialogPage || !vocabPage) throw new Error('Dialog- oder Wortschatzseite nicht gefunden');

// --- Dialogseite -------------------------------------------------------------

const dlg = await load(dialogPage.num);
const $d = dlg.$;
const isSyr = (td) => $d(td).attr('lang') === 'syr';

// Die Seite besteht aus Tabellen-Paaren: erst syrische Schrift, dann Umschrift
// mit Deutsch. Tabellen mit Klasse `header_table` sind Überschriften.
const syrTables = [];
const latTables = [];
let titel = null;
$d('main#articles section > table').each((_, table) => {
  const rows = $d(table).find('tr').toArray();
  const firstTd = $d(rows[0]).find('td').first();
  if (($d(table).attr('class') ?? '').includes('header_table')) {
    if (!isSyr(firstTd)) {
      const tds = $d(rows[0]).find('td');
      titel = {
        latein: clean(tds.eq(0).text()),
        deutsch: clean(tds.eq(1).text()),
        audio: audioUrl(tds.eq(0).find('a').attr('href'), dlg.url),
      };
    } else if (titel === null) {
      titel = { syrisch: clean(firstTd.text()) };
    }
    return;
  }
  (isSyr(firstTd) ? syrTables : latTables).push(rows);
});

const syrTitle = clean($d('main#articles header td[lang=syr]').first().text());

function parseLatRow(tr) {
  const tds = $d(tr).find('td');
  const sur = tds.eq(0);
  const de = tds.eq(1);
  const links = sur.find('a').toArray();
  const hrefs = [...new Set(links.map((a) => $d(a).attr('href')))];
  if (hrefs.length > 1) console.warn('  ! mehrere Audios in einer Zeile:', clean(sur.text()));
  const deText = clean(de.text());
  const strongDe = clean(de.find('strong').text());
  const speaker = clean(sur.find('strong').first().text()).replace(/\s*:$/, '');
  return {
    heading: strongDe !== '' && strongDe === deText,
    sprecher: speaker || undefined,
    latein: clean(links.map((a) => $d(a).text()).join(' ')),
    // Im Deutschen steht der Sprechername noch einmal davor ("Afrem: …").
    deutsch: speaker ? deText.replace(/^[^:]{1,40}:\s*/, '') : deText,
    audio: audioUrl(hrefs[0], dlg.url),
  };
}

function parseSyrRow(tr) {
  const td = $d(tr).find('td').first();
  return clean(td.find('a').toArray().map((a) => $d(a).text()).join(''));
}

const einleitung = [];
const dialog = [];
latTables.forEach((rows, t) => {
  const syrRows = syrTables[t] ?? [];
  if (syrRows.length !== rows.length) {
    console.warn(`  ! Tabelle ${t + 1}: ${rows.length} Zeilen Umschrift, ${syrRows.length} syrisch`);
  }
  rows.forEach((tr, i) => {
    const row = parseLatRow(tr);
    if (row.heading) return;
    const syrisch = syrRows.length === rows.length ? parseSyrRow(syrRows[i]) : '';
    const { heading, ...rest } = row;
    (row.sprecher ? dialog : einleitung).push({ ...rest, syrisch });
  });
});

// --- Wortschatzseite ---------------------------------------------------------

const voc = await load(vocabPage.num);
const $v = voc.$;
const wortschatz = [];
$v('main#articles section table.three_columns tr').each((_, tr) => {
  const tds = $v(tr).find('td');
  if (tds.length < 3) return;
  const links = tds.eq(0).find('a').toArray();
  const latein = clean(links.map((a) => $v(a).text()).join(''));
  if (!latein) return;
  const hinweis = clean(tds.eq(0).clone().find('a').remove().end().text());
  const syrLink = tds.eq(2).find('a').first();
  wortschatz.push({
    latein,
    hinweis: hinweis || undefined,
    deutsch: clean(tds.eq(1).text()),
    syrisch: clean(syrLink.text() || tds.eq(2).text()),
    audio: audioUrl($v(links[0]).attr('href'), voc.url),
    audio2: audioUrl(syrLink.attr('href'), voc.url),
  });
});

// --- Einträge im einheitlichen Format ---------------------------------------

let oldTags = {};
try {
  const old = JSON.parse(await readFile(outFile, 'utf8'));
  for (const e of [...old.einleitung, ...old.dialog, ...old.wortschatz]) oldTags[e.id] = e.tags;
} catch {
  // noch keine Datei vorhanden
}

const usedIds = new Set();
function entry(id, art, fields) {
  let unique = id;
  for (let n = 2; usedIds.has(unique); n++) unique = `${id}-${n}`;
  usedIds.add(unique);
  const { latein, syrisch, deutsch, audio, ...extra } = fields;
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
    tags: oldTags[unique] ?? [],
  };
}

const num2 = (i) => String(i + 1).padStart(2, '0');
const lesson = {
  nr,
  titel: { latein: titel?.latein ?? '', syrisch: syrTitle, deutsch: titel?.deutsch ?? '', audio: titel?.audio },
  quelle: {
    name: 'Šlomo Surayt',
    url: BASE + chapter,
    abgerufen: new Date().toISOString().slice(0, 10),
  },
  einleitung: einleitung.map((e, i) => entry(`L${pad}-E-${num2(i)}`, 'satz', e)),
  dialog: dialog.map((e, i) => entry(`L${pad}-D-${num2(i)}`, 'satz', e)),
  wortschatz: wortschatz.map((e) => entry(`L${pad}-W-${slug(e.latein)}`, 'wort', e)),
};

await writeFile(outFile, JSON.stringify(lesson, null, 2) + '\n');
console.log(
  `Lektion ${nr} „${lesson.titel.latein}“: ${lesson.einleitung.length} Einleitungssätze, ` +
    `${lesson.dialog.length} Dialogzeilen, ${lesson.wortschatz.length} Wörter → ${outFile}`,
);
