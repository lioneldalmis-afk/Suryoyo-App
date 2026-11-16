// Gemeinsame Bausteine zum Auslesen von textbook.surayt.com (Šlomo Surayt).
//
// Es wird nichts übersetzt oder ergänzt: Umschrift, syrische Schrift, Deutsch
// und Audio-Links stehen genau so in den Dateien, wie sie auf der Website stehen.
// Einzige Ausnahme: unsichtbare Zeichen werden entfernt und das kyrillische „ё“,
// das auf der Website stellenweise statt „ë“ steht, wird durch „ë“ ersetzt
// (sieht gleich aus, würde aber Suche und Wortzuordnung stören).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { slug } from './slug.mjs';

export const BASE = 'https://textbook.surayt.com/de/Online%20Course/';
const PAUSE_MS = 1000; // Rücksicht auf den Server
const CACHE = process.env.EXTRAKT_CACHE;

export const SYRISCH = /[\u{700}-\u{74F}]/u;
export const LATEIN = /[A-Za-z\u{C0}-\u{24F}\u{1E00}-\u{1EFF}]/u;
const UNSICHTBAR = /[\u{AD}\u{200B}-\u{200D}\u{FEFF}]/gu;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lädt eine Seite des Online-Kurses, z. B. „1.4.1“. */
export async function load(path) {
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
export function clean(s) {
  return s
    .replace(UNSICHTBAR, '')
    .replace(/ё/g, 'ë')
    .replace(/Ё/g, 'Ë')
    .replace(/[\u{A0}\s]+/gu, ' ')
    .trim()
    .normalize('NFC');
}

export const audioUrl = (href, pageUrl) => (href ? new URL(href, pageUrl).href : undefined);

/** Kapitelnummer → Titel, z. B. „1.4.6“ → „Wortschatz“. */
export async function inhaltsverzeichnis() {
  const toc = await load('0');
  const kapitel = new Map();
  toc.$('a[data-content-fragment-id]').each((_, a) => {
    const num = clean(toc.$(a).find('.chapter').text());
    kapitel.set(num, clean(toc.$(a).text()).slice(num.length).trim());
  });
  return kapitel;
}

export function unterseiten(kapitel, nr) {
  const prefix = `1.${nr}.`;
  return [...kapitel].filter(([num]) => num.startsWith(prefix)).map(([num, title]) => ({ num, title }));
}

/**
 * Trennt das Stichwort von Zusätzen, die im Lehrbuch dahinter stehen:
 * „aḏno (f.), Pl. aḏne, aḏnoṯe“ → „aḏno“ + „(f.), Pl. aḏne, aḏnoṯe“,
 * „cammo, pl. cammone“ → „cammo“ + „, pl. cammone“.
 * Wendungen mit Doppelpunkt („cayni: b cayni zabno“) bleiben ganz, weil die
 * Bedeutung zur ganzen Wendung gehört. Stichwort und Zusatz ergeben zusammen
 * wieder genau den Text der Website.
 */
export function stichwort(voll) {
  if (voll.includes(':')) return { latein: voll };
  const klammer = voll.indexOf(' (');
  if (klammer > 0) return { latein: voll.slice(0, klammer), hinweis: voll.slice(klammer + 1) };
  const plural = voll.search(/, pl\. /i);
  if (plural > 0) return { latein: voll.slice(0, plural), hinweis: voll.slice(plural) };
  return { latein: voll };
}

/**
 * Wortschatzseite: Zeilen mit drei Spalten – Umschrift, Deutsch, syrische Schrift.
 * Die erste Aufnahme gehört zur Umschrift, die zweite zur syrischen Schrift.
 */
export function wortschatzSeite({ $, url }) {
  const woerter = [];
  $('main#articles section table tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length !== 3) return;
    const voll = clean(tds.eq(0).text());
    if (!voll || !SYRISCH.test(tds.eq(2).text())) return;
    woerter.push({
      ...stichwort(voll),
      deutsch: clean(tds.eq(1).text()),
      syrisch: clean(tds.eq(2).text()),
      audio: audioUrl(tds.eq(0).find('a').first().attr('href'), url),
      audio2: audioUrl(tds.eq(2).find('a').first().attr('href'), url),
    });
  });
  return woerter;
}

export const datei = (name) => fileURLToPath(new URL(`../src/data/${name}`, import.meta.url));

/** Von Hand gesetzte Markierungen (`tags`) aus einer bestehenden Datei, nach Kennung. */
export async function alteTags(pfad, sammeln) {
  try {
    const alt = JSON.parse(await readFile(pfad, 'utf8'));
    return Object.fromEntries(sammeln(alt).map((e) => [e.id, e.tags]));
  } catch {
    return {}; // noch keine Datei vorhanden
  }
}

/**
 * Baut Einträge im einheitlichen Format der App. Doppelte Kennungen bekommen
 * „-2“, „-3“ … angehängt; vorhandene Markierungen bleiben erhalten.
 */
export function eintragsBauer(nr, tagsNachId) {
  const vergeben = new Set();
  return function eintrag(id, art, felder, tags = []) {
    let eindeutig = id;
    for (let n = 2; vergeben.has(eindeutig); n++) eindeutig = `${id}-${n}`;
    vergeben.add(eindeutig);
    const { latein, syrisch, deutsch, audio, ...extra } = felder;
    for (const k of Object.keys(extra)) if (extra[k] === undefined) delete extra[k];
    return {
      id: eindeutig,
      latein,
      syrisch,
      deutsch,
      audio,
      ...extra,
      lektion: nr,
      art,
      quelle: 'lehrbuch',
      tags: tagsNachId[eindeutig] ?? tags,
    };
  };
}

export const wortId = (pad, latein) => `L${pad}-W-${slug(latein)}`;

export const quelle = (kapitel) => ({
  name: 'Šlomo Surayt',
  url: BASE + kapitel,
  abgerufen: new Date().toISOString().slice(0, 10),
});

export async function schreibe(pfad, daten) {
  await writeFile(pfad, JSON.stringify(daten, null, 2) + '\n');
}
