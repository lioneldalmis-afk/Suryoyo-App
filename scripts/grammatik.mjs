// Grammatik der Lektionen 3–16, Verbtabellen „Surcofo“ (Kapitel 1.17) und
// Formentabellen aus Teil 4 (Fahrplan, Phase 4b, Schritt 2) → grammatik.json.
//
// Jede Seite wird als Folge von Blöcken gespeichert – Überschriften, Absätze
// und Tabellen –, so wie sie auf der Website stehen, damit die App sie
// wörtlich zeigen kann. Aus den Tabellen werden außerdem Einträge gewonnen:
// jede Surayt-Form mit Umschrift, syrischer Schrift, deutscher Bedeutung und
// Aufnahme. Das `merkmal` („Präsens, Sg., 1. f.“) setzt sich aus den
// Beschriftungen der Tabelle zusammen, ebenfalls wörtlich.
//
// Woher die deutsche Bedeutung kommt:
// - meist aus derselben Tabellenzeile („gawire na – wir sind verheiratet“),
// - bei Verbtabellen ohne deutsche Spalte aus der Zeile darüber, die das Verb
//   vorstellt („grš ܓܪܫ I: goraš – grëšle “ziehen”“),
// - bei Tabellen ohne beides von einer anderen Tabelle desselben Verbs, wenn
//   mindestens zwei Formen genau übereinstimmen (z. B. die Zeitformen von goraš).
// Formen ohne Bedeutung werden nur gezeigt, nicht zum Eintrag.
//
// Nicht übernommen (solange die Entscheidung zu den Bezeichnungen offen ist,
// Fahrplan Abschnitt 7): Sätze der Erklärtexte, die „aramäisch/assyrisch“
// enthalten – das sind Vergleiche mit dem älteren Aramäischen. Beispielsätze
// in den Tabellen bleiben wörtlich, wie die Sätze der Lektionen.

import { readFile, writeFile } from 'node:fs/promises';
import { slug } from './slug.mjs';
import { audioUrl, BASE, clean, datei, glatt, LATEIN, load, SYRISCH } from './lehrbuch.mjs';

const DATEI = 'grammatik.json';
const NICHT_UEBERNEHMEN = /aramä|assyr/i;

// --- Welche Seiten ----------------------------------------------------------------

/** Grammatik-Seiten der Lektionen, Verbkonjugation und Formentabellen in Lehrbuch-Reihenfolge. */
export function grammatikSeiten(kapitel) {
  const seiten = [];
  for (let nr = 3; nr <= 16; nr++) {
    const g = [...kapitel].find(([num, titel]) => num.startsWith(`1.${nr}.`) && /^Grammatik/.test(titel));
    if (!g) throw new Error(`Lektion ${nr}: keine Grammatik-Seite im Inhaltsverzeichnis`);
    seiten.push({ id: g[0], titel: g[1], art: 'grammatik', lektion: nr });
  }
  const ohneSchrift = (t) => clean(t.replace(/[\u{700}-\u{74F}]+/gu, ''));
  if (!kapitel.has('1.17')) throw new Error('Kapitel 1.17 (Surcofo) nicht im Inhaltsverzeichnis');
  seiten.push({ id: '1.17', titel: ohneSchrift(kapitel.get('1.17')), art: 'verben' });
  for (const [num, titel] of kapitel) {
    if (/^4\.\d+$/.test(num)) seiten.push({ id: num, titel: ohneSchrift(titel), art: 'formen' });
  }
  return seiten;
}

// --- Textstücke ---------------------------------------------------------------------

/** Syrische Wörter samt Verbindungsstrich (ـ) und Zeichen darüber/darunter. */
const SYR_LAUF = /([\u{700}-\u{74F}\u{640}][\u{700}-\u{74F}\u{640}\u{300}-\u{36F}]*(?:[ ,.:;\u{60C}\u{61F}!?/–-]*\s*[\u{700}-\u{74F}\u{640}][\u{700}-\u{74F}\u{640}\u{300}-\u{36F}]*)*)/u;

/** Ein Textstück mit Merkmalen: `sur` kursiv (Umschrift), `syr` syrische Schrift, `fett`. */
function stuecke(text, flags) {
  const t = glatt(text);
  if (!t) return [];
  return t
    .split(SYR_LAUF)
    .filter((x) => x !== '')
    .map((x) => {
      const s = { text: x };
      if (SYRISCH.test(x)) s.syr = true;
      else if (flags.sur && LATEIN.test(x)) s.sur = true;
      if (flags.fett && x.trim()) s.fett = true;
      return s;
    });
}

/** Benachbarte Stücke mit gleichen Merkmalen zusammenfassen, Rand-Leerzeichen weg. */
function verdichte(liste) {
  const aus = [];
  for (const s of liste) {
    const vorher = aus.at(-1);
    const gleich = vorher && !!vorher.sur === !!s.sur && !!vorher.syr === !!s.syr && !!vorher.fett === !!s.fett;
    // Leerzeichen zwischen zwei Stücken gehören zu keinem Merkmal.
    if (vorher && !s.text.trim()) {
      vorher.text += s.text;
      continue;
    }
    if (gleich) vorher.text += s.text;
    else aus.push({ ...s });
  }
  for (const s of aus) s.text = s.text.replace(/ {2,}/g, ' ');
  if (aus.length) {
    aus[0].text = aus[0].text.trimStart();
    aus[aus.length - 1].text = aus[aus.length - 1].text.trimEnd();
  }
  return aus.filter((s) => s.text);
}

const textVon = (teile) => teile.map((s) => s.text).join('');

/**
 * Entfernt ganze Sätze, auf die `muster` passt. Ein Satz endet mit . ! ? vor
 * einem Leerzeichen und einem Großbuchstaben.
 */
function ohneSaetze(teile, muster, gestrichen) {
  const text = textVon(teile);
  if (!muster.test(text)) return teile;
  const grenzen = [0];
  for (const m of text.matchAll(/[.!?]["“”]?\s+(?=[A-ZÄÖÜ„"])/g)) grenzen.push(m.index + m[0].length);
  grenzen.push(text.length);
  const weg = [];
  for (let i = 0; i + 1 < grenzen.length; i++) {
    const satz = text.slice(grenzen[i], grenzen[i + 1]);
    if (muster.test(satz)) {
      weg.push([grenzen[i], grenzen[i + 1]]);
      gestrichen.push(clean(satz));
    }
  }
  const aus = [];
  let pos = 0;
  for (const s of teile) {
    let neu = '';
    for (let k = 0; k < s.text.length; k++) {
      const i = pos + k;
      if (!weg.some(([a, b]) => i >= a && i < b)) neu += s.text[k];
    }
    pos += s.text.length;
    if (neu) aus.push({ ...s, text: neu });
  }
  return verdichte(aus);
}

// --- Tabellenzellen -------------------------------------------------------------------

/**
 * Eine Zelle als Liste von Teilen: jeder Audio-Link ist ein eigener Teil
 * („u Aday / Aday“ → zwei Teile mit je einer Aufnahme), sonst jede Zeile.
 * `fett` sind hervorgehobene Stellen (Anfang, Ende) im Text des Teils.
 */
function zelleAus($, td, pageUrl) {
  const roh = []; // { text, fett, sur, link, zeile }
  let zeile = 0;
  (function geh(node, flags) {
    for (const c of $(node).contents().toArray()) {
      if (c.type === 'text') {
        roh.push({ text: glatt($(c).text()), ...flags, zeile });
        continue;
      }
      if (c.type !== 'tag') continue;
      const tag = c.tagName.toLowerCase();
      if (tag === 'br') {
        zeile++;
        continue;
      }
      if (tag === 'p' || tag === 'div') {
        if (roh.some((r) => r.text.trim())) zeile++;
        geh(c, flags);
        continue;
      }
      const neu = { ...flags };
      if (tag === 'strong' || tag === 'b') neu.fett = true;
      if (tag === 'em' || tag === 'i') neu.sur = true;
      // Ein Wort ist auf der Website manchmal in mehrere Links mit derselben Aufnahme zerlegt („ko|gora|š“).
      if (tag === 'a' && /\.mp3$/i.test($(c).attr('href') ?? '')) {
        neu.href = $(c).attr('href');
        neu.link = neu.href;
      }
      geh(c, neu);
    }
  })(td, {});

  // Teile bilden: gleiche Zeile und gleicher Link gehören zusammen.
  const teile = [];
  for (const r of roh) {
    const vorher = teile.at(-1);
    if (vorher && vorher.zeile === r.zeile && vorher.link === r.link) vorher.stuecke.push(r);
    else teile.push({ zeile: r.zeile, link: r.link, href: r.href, stuecke: [r] });
  }
  const aus = [];
  let letzteZeile = null;
  for (const t of teile) {
    let text = '';
    const fett = [];
    let kursiv = false;
    for (const s of t.stuecke) {
      const start = text.length;
      text += s.text;
      if (s.fett && s.text.trim()) fett.push([start, text.length]);
      if (s.sur && LATEIN.test(s.text)) kursiv = true;
    }
    // Rand-Leerzeichen abschneiden und die Hervorhebungen mitverschieben.
    const vorne = text.length - text.trimStart().length;
    const sauber = text.trim().replace(/ {2,}/g, ' ');
    if (!sauber) continue;
    const teil = { text: sauber };
    if (t.href) teil.audio = audioUrl(t.href, pageUrl);
    if (kursiv) teil.sur = true;
    const bereiche = fett
      .map(([a, b]) => [Math.max(0, a - vorne), Math.min(sauber.length, b - vorne)])
      .filter(([a, b]) => b > a && sauber.slice(a, b).trim());
    if (bereiche.length) teil.fett = zusammenhaengend(sauber, bereiche);
    if (letzteZeile !== null && t.zeile !== letzteZeile) teil.neueZeile = true;
    letzteZeile = t.zeile;
    aus.push(teil);
  }
  const z = { teile: aus };
  if (td.tagName === 'th') z.kopf = true;
  const breit = Number($(td).attr('colspan') ?? 1);
  const hoch = Number($(td).attr('rowspan') ?? 1);
  if (breit > 1) z.breit = breit;
  if (hoch > 1) z.hoch = hoch;
  return z;
}

/** Hervorhebungen, die nur durch Leerzeichen getrennt sind, zusammenfassen und ohne Rand-Leerzeichen. */
function zusammenhaengend(text, bereiche) {
  const aus = [];
  for (const [a0, b0] of bereiche.sort((x, y) => x[0] - y[0])) {
    let a = a0;
    let b = b0;
    while (a < b && text[a] === ' ') a++;
    while (b > a && text[b - 1] === ' ') b--;
    const vorher = aus.at(-1);
    if (vorher && !text.slice(vorher[1], a).trim()) vorher[1] = b;
    else aus.push([a, b]);
  }
  return aus;
}

const zellText = (z) => z.teile.map((t) => t.text).join(' ');
const TRENNER = /^[\s/:;,܆|–-]+$/u;

// --- Blöcke einer Seite -----------------------------------------------------------------

/** Überschrift-Ebene: „A: …“/„D – …“ 0, „1) …“ 1, „a) …“ 2, „1. …“ und Sonstiges 3. */
function ebeneVon(text) {
  if (/^[A-L]\s*[:–-]\s/.test(text)) return 0;
  if (/^\d+\)/.test(text)) return 1;
  if (/^[a-h]\)/.test(text)) return 2;
  return 3;
}

function bloeckeAus($, wurzel, pageUrl, gestrichen) {
  const bloecke = [];
  let puffer = [];

  function fertig() {
    let teile = verdichte(puffer);
    puffer = [];
    if (!teile.length) return;
    teile = ohneSaetze(teile, NICHT_UEBERNEHMEN, gestrichen);
    if (!teile.length) return;
    const text = textVon(teile);
    const allesFett = teile.every((s) => s.fett || !s.text.trim() || /^[\s:.,]+$/.test(s.text));
    const nummeriert = /^(\d+[.)]|[a-h]\)|[A-L]\s*[:–-])\s*\S/.test(text) && text.length <= 90 && !/\.$/.test(text);
    if ((allesFett && text.length <= 120) || nummeriert) {
      bloecke.push({ art: 'titel', text: clean(text), ebene: ebeneVon(clean(text)) });
    } else {
      bloecke.push({ art: 'absatz', teile });
    }
  }

  function tabelle(table) {
    const zeilen = $(table)
      .find('tr')
      .toArray()
      .filter((tr) => $(tr).closest('table')[0] === table)
      .map((tr) =>
        $(tr)
          .children('td,th')
          .toArray()
          .map((td) => zelleAus($, td, pageUrl)),
      )
      .filter((z) => z.length);
    const voll = zeilen.flat().filter((z) => z.teile.length);
    // Tabellen mit nur einer beschrifteten Zelle sind Zwischenüberschriften („A: Regelmäßige Verben“).
    if (voll.length === 1 && !SYRISCH.test(zellText(voll[0])) && !voll[0].teile.some((t) => t.audio)) {
      const text = zellText(voll[0]);
      bloecke.push({ art: 'titel', text, ebene: ebeneVon(text) });
      return;
    }
    if (voll.length) bloecke.push({ art: 'tabelle', zeilen });
  }

  (function geh(node, flags) {
    for (const c of $(node).contents().toArray()) {
      if (c.type === 'text') {
        puffer.push(...stuecke($(c).text(), flags));
        continue;
      }
      if (c.type !== 'tag') continue;
      const tag = c.tagName.toLowerCase();
      if (tag === 'br') {
        fertig();
      } else if (tag === 'table') {
        fertig();
        tabelle(c);
      } else if (['p', 'div', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].includes(tag)) {
        fertig();
        geh(c, flags);
        fertig();
      } else {
        const neu = { ...flags };
        if (tag === 'strong' || tag === 'b') neu.fett = true;
        if (tag === 'em' || tag === 'i') neu.sur = true;
        geh(c, neu);
      }
    }
  })(wurzel, {});
  fertig();

  // „a)“ und die eigentliche Überschrift stehen manchmal getrennt: zusammenfügen.
  for (let i = bloecke.length - 2; i >= 0; i--) {
    const [a, b] = [bloecke[i], bloecke[i + 1]];
    if (a.art === 'titel' && b.art === 'titel' && /^(\d+[.)]|[a-h]\))$/.test(a.text)) {
      bloecke.splice(i, 2, { art: 'titel', text: `${a.text} ${b.text}`, ebene: a.ebene });
    }
  }
  for (const b of bloecke) if (b.art === 'absatz') for (const s of b.teile) if (!s.fett) delete s.fett;
  return bloecke;
}

// --- Einträge aus Tabellen -----------------------------------------------------------------

const SONDER_UMSCHRIFT = /[šṭḥṯḏëčġṣž]/u;
const DEUTSCH_ZEICHEN = /[äöüßÄÖÜ]/u;
/** Beschriftungen wie „3. Person (m.)“, „Sg.“, „1. f.“, „II“, „m.Sg.“, „vor Vokal“. */
const BESCHRIFTUNG =
  /^(?:(?:\d+\.?|Person|Pers\.|\(?[mf]\.\)?|[mf]\.\s?(?:Sg|Pl)\.|(?:Sg|Pl|sg|pl)\.?|Singular|Plural|I{1,3}p?|IV|vor|Konsonant|Vokal|aber:|\+)\s*)+$/;

/** Ein Raster der Tabelle, in dem jede Zelle an jeder Stelle steht, die sie über colspan/rowspan bedeckt. */
function raster(zeilen) {
  const r = [];
  zeilen.forEach((zeile, i) => {
    r[i] ??= [];
    let c = 0;
    for (const z of zeile) {
      while (r[i][c]) c++;
      const ref = { z, r: i, c };
      for (let di = 0; di < (z.hoch ?? 1); di++) {
        r[i + di] ??= [];
        for (let dc = 0; dc < (z.breit ?? 1); dc++) r[i + di][c + dc] = ref;
      }
      c += z.breit ?? 1;
    }
  });
  return r.map((zeile) => zeile ?? []);
}

function typVon(z) {
  const t = zellText(z);
  if (!t.trim()) return 'leer';
  const syr = SYRISCH.test(t);
  const lat = LATEIN.test(t);
  if (syr && lat) return 'gemischt';
  if (syr) return 'syr';
  if (lat) return 'text';
  return /\d/.test(t) ? 'zahl' : 'leer';
}

/** Wie sehr eine Textzelle nach Umschrift aussieht (statt nach Deutsch oder Beschriftung). */
function surayt(z) {
  if (z.kopf) return -10;
  const t = zellText(z);
  let s = 0;
  if (z.teile.some((x) => x.audio)) s += 3;
  if (z.teile.every((x) => x.sur)) s += 1;
  if (SONDER_UMSCHRIFT.test(t)) s += 1;
  if (DEUTSCH_ZEICHEN.test(t)) s -= 2;
  if (/^[„"“]/.test(t)) s -= 3;
  if (BESCHRIFTUNG.test(t)) s -= 5;
  return s;
}

/** Die Werte einer Zelle: jede Aufnahme einzeln, sonst jede Zeile. */
function werte(z) {
  if (z.teile.some((t) => t.audio)) {
    const aus = [];
    for (const t of z.teile) {
      const v = aus.at(-1);
      if (t.audio && v?.audio === t.audio) v.text += ' / ' + t.text; // eine Aufnahme für zwei Zeilen
      else if (t.audio) aus.push({ ...t });
      else if (v && !t.neueZeile && !TRENNER.test(t.text)) v.hinweis = v.hinweis ? `${v.hinweis} ${t.text}` : t.text;
    }
    return aus;
  }
  const zeilen = [];
  for (const t of z.teile) {
    if (t.neueZeile || !zeilen.length) zeilen.push({ ...t });
    else {
      const v = zeilen.at(-1);
      const versatz = v.text.length + 1;
      v.text += ' ' + t.text;
      if (t.fett) v.fett = [...(v.fett ?? []), ...t.fett.map(([a, b]) => [a + versatz, b + versatz])];
    }
  }
  return zeilen;
}

/** „„ziehen““ → „ziehen“: Anführungszeichen um eine ganze Bedeutung gehören nicht dazu. */
const ohneAnfuehrung = (t) => {
  const m = /^[„"“]([^„"“”]+)[“”"]\.?$/.exec(t.trim());
  return m ? m[1].trim() : t.trim();
};

/** Sucht in einer Tabelle Umschrift–Schrift-Paare, ihre deutsche Bedeutung und ihre Beschriftung. */
function paareAus(tab) {
  const g = raster(tab.zeilen);
  const breite = Math.max(...g.map((z) => z.length));
  const zelle = (i, c) => g[i]?.[c];
  const typ = new Map();
  const ref = (i, c) => {
    const x = zelle(i, c);
    if (x && !typ.has(x)) typ.set(x, typVon(x.z));
    return x;
  };
  for (let i = 0; i < g.length; i++) for (let c = 0; c < breite; c++) ref(i, c);
  const ist = (x, t) => x && typ.get(x) === t;

  const benutzt = new Set();
  const paare = [];
  for (let i = 0; i < g.length; i++) {
    for (let c = 0; c < breite; c++) {
      const s = zelle(i, c);
      // nur die Ursprungszelle (nicht ihre Kopien über rowspan/colspan)
      if (!s || s.r !== i || s.c !== c || !ist(s, 'syr') || s.z.kopf) continue;
      // Links daneben (L S), zwei links (L D S) oder darüber (Zeilen abwechselnd Umschrift und Schrift).
      // „Zwei links“ zählt in Zellen, nicht in Spalten: eine Zelle über zwei Spalten ist eine.
      const links = [];
      for (let k = c - 1; k >= 0 && links.length < 2; k--) {
        const x = zelle(i, k);
        if (x && x !== links.at(-1)) links.push(x);
      }
      const [links1, links2] = links;
      const kandidaten = [links1, links2, zelle(i - 1, c)].filter(
        (x) => x && x !== s && ist(x, 'text') && !benutzt.has(x) && !x.z.kopf,
      );
      let l;
      if (kandidaten.length) {
        const wert = (x) => surayt(x.z);
        l = kandidaten.reduce((a, b) => (wert(b) > wert(a) ? b : a));
        // Gleichstand zwischen „L D S“ und „? L S“: die übliche Reihenfolge des Lehrbuchs ist Umschrift, Deutsch, Schrift.
        if (l === links1 && kandidaten.includes(links2) && wert(links2) === wert(links1) && ist(links1, 'text')) l = links2;
        if (wert(l) < 0) l = undefined;
      }
      if (!l) continue;
      benutzt.add(l).add(s);
      paare.push({ l, s, zeile: i, vertikal: l.r < i && l.c === c });
    }
  }
  if (!paare.length) return [];

  // Kopfzeilen: Zeilen ohne Paare und ohne syrische Schrift vor der ersten Zeile mit Paaren.
  const mitPaar = new Set(paare.flatMap((p) => [p.l.r, p.s.r]));
  g.forEach((zeile, i) => {
    if (zeile.some((x) => x && ['syr', 'gemischt'].includes(typ.get(x)))) mitPaar.add(i);
  });
  const ersteDaten = Math.min(...mitPaar);
  const kopfZeilen = [...Array(ersteDaten).keys()];

  for (const p of paare) {
    // Deutsch: zwischen Umschrift und Schrift, direkt danach oder am Zeilenende (für alle Paare der Zeile).
    const i = p.l.r;
    const frei = (x) => x && ist(x, 'text') && !benutzt.has(x) && surayt(x.z) < 3;
    let de;
    const dazwischen = zelle(i, p.l.c + (p.l.z.breit ?? 1));
    if (!p.vertikal && dazwischen !== p.s && dazwischen?.c + (dazwischen?.z.breit ?? 1) === p.s.c && frei(dazwischen)) de = dazwischen;
    else if (frei(zelle(p.s.r, p.s.c + (p.s.z.breit ?? 1))) && !paare.some((q) => q.l === zelle(p.s.r, p.s.c + (p.s.z.breit ?? 1))))
      de = zelle(p.s.r, p.s.c + (p.s.z.breit ?? 1));
    else if (p.vertikal && frei(zelle(p.s.r + 1, p.s.c)) && tab.zeilen.length <= 4) de = zelle(p.s.r + 1, p.s.c);
    p.de = de;
  }
  // Gemeinsame Bedeutung am Zeilenende (Singular | Plural | Bedeutung) – nur in Tabellen mit Kopfzeile.
  if (kopfZeilen.length) {
    for (const p of paare.filter((x) => !x.de)) {
      const i = p.l.r;
      let ende;
      for (let c = breite - 1; c > p.s.c; c--) {
        const x = zelle(i, c);
        if (x && ist(x, 'text') && !benutzt.has(x) && x.c > Math.max(...paare.filter((q) => q.l.r === i).map((q) => q.s.c))) {
          ende = x;
          break;
        }
      }
      if (ende) p.de = ende;
    }
  }

  // Beschriftungen: Spaltenköpfe über der Umschrift, Zeilenbeschriftung links davon.
  const kopfText = (x) => (x && x.r < ersteDaten && !mitPaar.has(x.r) ? zellText(x.z) : '');
  // Die Ecke links oben beschriftet die Zeilen, nicht die Spalten („Subjekt → / Objekt ↓“).
  const ecke = paare.some((p) => p.l.c === 0)
    ? []
    : kopfZeilen.map((r) => zelle(r, 0)).filter((x) => x && (x.z.breit ?? 1) === 1).map(kopfText).filter(Boolean);
  const gruppe = new Map(); // Zeile → Zwischenbeschriftung („Singular“ mitten in der Tabelle)
  let aktuell;
  for (let i = ersteDaten; i < g.length; i++) {
    const inhalt = [...new Set(g[i].filter(Boolean))].filter((x) => typ.get(x) !== 'leer');
    if (!mitPaar.has(i) && inhalt.length === 1 && ist(inhalt[0], 'text') && !benutzt.has(inhalt[0])) aktuell = zellText(inhalt[0].z);
    gruppe.set(i, aktuell);
  }
  /** Text einer Beschriftung für den k-ten von n Werten: „2. Person (m.)<br>2. Person (f.)“ gehört zeilenweise zu „-ayḏux<br>-ayḏax“. */
  const zeilenweise = (x, k, n) => {
    const zeilen = werte(x.z).map((v) => v.text);
    return zeilen.length === n && n > 1 ? zeilen[k] : zeilen.join(' / ');
  };

  return paare.map((p) => {
    const spalten = [];
    for (const r of kopfZeilen) {
      const x = zelle(r, p.l.c);
      const t = kopfText(x);
      if (t && !spalten.includes(t) && !(p.l.c === 0 && ecke.includes(t))) spalten.push(t);
    }
    // Beschriftungszellen links der Umschrift, für jede Zeile, über die sie reicht (rowspan).
    const zeilenZellen = [];
    for (let i = p.l.r; i < p.l.r + (p.l.z.hoch ?? 1); i++) {
      const links = [];
      for (let c = 0; c < p.l.c; c++) {
        const x = zelle(i, c);
        if (!x || benutzt.has(x) || links.includes(x)) continue;
        if (!['text', 'zahl'].includes(typ.get(x))) continue;
        if (paare.some((q) => q.de === x)) continue;
        if (/:$/.test(zellText(x.z))) continue; // „aber:“ leitet nur über
        links.push(x);
      }
      zeilenZellen.push(links);
    }
    const gr = gruppe.get(p.l.r);
    const merkmal = (k, n) => {
      const texte = zeilenZellen.map((links) => links.map((x) => zeilenweise(x, k, n)));
      // Zeilen mit verschiedenen Beschriftungen (rowspan) Stelle für Stelle zusammenfassen.
      const laenge = Math.max(0, ...texte.map((z) => z.length));
      const zeilen = Array.from({ length: laenge }, (_, j) => [...new Set(texte.map((z) => z[j]).filter(Boolean))].join(' / '));
      let teile;
      if (ecke.length === 2 && /Subjekt/.test(ecke[0]) && /Objekt/.test(ecke[1])) {
        const ohnePfeil = (t) => t.replace(/[→↓]/g, '').trim();
        teile = [`${ohnePfeil(ecke[0])} ${spalten.join(', ')}`, `${ohnePfeil(ecke[1])} ${zeilen.join(', ')}`];
      } else {
        teile = [...spalten, ...(gr ? [gr] : []), ...zeilen];
      }
      return { merkmal: teile.filter(Boolean).join(', '), zahl: /^\d+$/.test(zeilen[0] ?? '') ? zeilen[0] : undefined };
    };
    return { ...p, merkmal };
  });
}

/** Aus einem Paar die einzelnen Einträge: mehrere Werte in einer Zelle („hiye / hiya“) werden einzeln. */
function eintraegeAusPaar(p) {
  const lv = werte(p.l.z);
  const sv = werte(p.s.z);
  const dv = p.de ? werte(p.de.z) : [];
  const ganz = (z) => {
    const w = werte(z);
    const toene = [...new Set(w.map((v) => v.audio).filter(Boolean))];
    return { text: w.map((v) => v.text).join(' / '), ...(toene.length === 1 && { audio: toene[0] }) };
  };
  let reihen;
  if (lv.length === sv.length && (dv.length === lv.length || dv.length <= 1)) {
    reihen = lv.map((l, k) => ({ l, s: sv[k], d: dv.length === lv.length ? dv[k] : dv[0] }));
  } else {
    reihen = [{ l: lv.length === 1 ? lv[0] : ganz(p.l.z), s: sv.length === 1 ? sv[0] : ganz(p.s.z), d: dv.length ? { text: dv.map((d) => d.text).join(' / ') } : undefined }];
  }
  return reihen.map(({ l, s, d }, k) => ({
    ...p.merkmal(k, reihen.length),
    latein: l.text,
    syrisch: s?.text ?? '',
    deutsch: d ? ohneAnfuehrung(d.text) : undefined,
    audio: l.audio,
    audio2: s?.audio,
    fett: l.fett,
    hinweis: l.hinweis,
  }));
}

// --- Verben auf den Seiten Surcofo und Formentabellen ----------------------------------------

/**
 * Zeile, die ein Verb vorstellt: „grš ܓܪܫ I: goraš – grëšle “ziehen” ܓܳܪܰܫ - ܓܪܷܫܠܶܗ“,
 * auch „tlfn I ܬܠܦܢ : mtalfan – mtalfanle “telefonieren”“ oder ohne Bedeutung
 * („ʾmr ܐܡܪ I: omar – mërle“, die Bedeutung steht dann in der Überschrift).
 * Das Zitat sind immer zwei Formen (Präsens – Präteritum).
 */
const STAMM = /(?:^|\s)(I{1,3}p?|IV)(?=[\s:,(]|$)/;
const ANFUEHRUNG = /[“"„]([^”“"„]+)[”“"]/;
/** „„er kaufte““ übersetzt eine einzelne Form, nicht das Verb – taugt nicht als Bedeutung für die ganze Tabelle. */
const nurEineForm = (de) => /^(ich|du|er|sie|es|wir|ihr)\b/.test(de);

function bedeutungIn(text) {
  const q = ANFUEHRUNG.exec(text);
  return q && !nurEineForm(q[1].trim()) ? clean(q[1]) : undefined;
}

function verbAus(text) {
  const stamm = STAMM.exec(text);
  if (!stamm) return null;
  let rest = text.slice(stamm.index + stamm[0].length);
  // Was zwischen Stamm und Doppelpunkt steht („(< lym ܠܝܡ < lmm ܠܡܡ)“, „+ L-suf.“), gehört nicht zum Zitat.
  const anfuehrung = rest.search(/[“"„]/);
  const doppelpunkt = rest.indexOf(':');
  if (doppelpunkt >= 0 && (anfuehrung < 0 || doppelpunkt < anfuehrung)) rest = rest.slice(doppelpunkt + 1);
  const zitat = /^[^“”"„\u{700}-\u{74F}]+/u.exec(rest.trimStart())?.[0].trim().replace(/\s+/g, ' ');
  if (!zitat || !/^\S+ [–-] \S+$/.test(zitat)) return null;
  return { zitat: clean(zitat), deutsch: bedeutungIn(rest) };
}

/**
 * Umschrift–Schrift-Paare eines Absatzes („Imperativ: mar! ܡܰܪ – maru! ܡܰܪܘ; Infinitiv: mamro ܡܰܡܪܐ“),
 * jeweils mit dem Text davor. Die Umschrift ist, was vor der Schrift nach dem letzten Trenner steht –
 * auf der Website sind Wörter oft in mehrere Stücke zerlegt (fette Endungen: „t|ux!“).
 */
function paareImAbsatz(teile) {
  const aus = [];
  let davor = '';
  for (const s of teile) {
    if (!s.syr) {
      davor += s.text;
      continue;
    }
    const trenner = [...davor.matchAll(/[:;–]|\s-(?=\s)|(?<=^|\s)(?:Sg|Pl|pl|m|f)\.(?=\s)/g)].at(-1);
    const bis = trenner ? trenner.index + trenner[0].length : 0;
    const latein = clean(davor.slice(bis));
    if (latein && LATEIN.test(latein) && !/[„“"]/.test(latein)) aus.push({ davor: clean(davor.slice(0, bis)), latein, syrisch: clean(s.text) });
    davor = '';
  }
  return aus;
}

// --- Kleinwörter aus Erklärtexten (Fahrplan, Phase 4b, Schritt 3) ----------------------------
//
// Einige der häufigsten Wörter stellt das Lehrbuch nicht in einer Tabelle mit deutscher
// Spalte vor, sondern im Text – ohne sie bliebe in fast jedem Satz etwas unerklärt
// („b“, „d“, „gëd“, der Artikel). Sie werden wörtlich übernommen:
// - die Präpositionen aus „Die häufigsten Präpositionen sind b ܒـ „in“, …“ (Grammatik 11);
//   bei „m ܡـ, me ܡܶܐ „von, aus““ gilt die Bedeutung dahinter für beide Formen,
// - Wörter direkt hinter einer grammatischen Bezeichnung („der Präsensmarker ko-“, „der
//   Futurmarker gëd“, „die Genitivpartikel /d/“, „die Konjunktion d“): Die Bezeichnung ist
//   dann die Bedeutung,
// - die Formen der Tabelle „Der bestimmte Artikel“ (u, i, aK, an), die dort keine eigene
//   deutsche Spalte haben: Die Überschrift der Tabelle ist die Bedeutung,
// - Beispiele, deren Bedeutung in derselben Zelle steht („bu bayto ܒܘ ܒܰܝܬܐ „im Haus““).
// Sie bekommen ihre Kennung erst nach allen übrigen Einträgen, damit deren Kennungen bleiben.

const PRAEPOSITIONEN = /^Die häufigsten Präpositionen sind /;
const BEZEICHNUNG = /(Präsensmarker|Futurmarker|Genitivpartikel|Konjunktion)\s*\/?$/;
const ARTIKEL_TABELLE = 'Der bestimmte Artikel';
const ZELL_BEDEUTUNG = /^\s*„([^“”]+)“[,.;]?\s*$/;

/** Kleinwörter aus einem Absatz der Grammatik: Präpositionen und Wörter hinter einer Bezeichnung. */
function kleinwoerterImAbsatz(teile) {
  const aus = [];
  if (PRAEPOSITIONEN.test(textVon(teile))) {
    let davor = '';
    teile.forEach((t, i) => {
      if (!t.syr) {
        davor += t.text;
        return;
      }
      const latein = /([\p{L}\p{M}]+)\s*$/u.exec(davor)?.[1];
      const de = /^\s*„([^“”]+)“/.exec(teile[i + 1]?.text ?? '')?.[1];
      if (latein) aus.push({ latein: clean(latein), syrisch: clean(t.text), deutsch: de && clean(de) });
      davor = '';
    });
    // „m ܡـ, me ܡܶܐ „von, aus““: Die Bedeutung gilt auch für die Form davor.
    for (let k = aus.length - 2; k >= 0; k--) aus[k].deutsch ??= aus[k + 1].deutsch;
  }
  teile.forEach((t, i) => {
    const b = !t.sur && !t.syr && BEZEICHNUNG.exec(t.text.trimEnd());
    const form = teile[i + 1];
    if (!b || !form?.sur) return;
    let latein = clean(form.text);
    if (/^-/.test(teile[i + 2]?.text ?? '') && !latein.endsWith('-')) latein += '-';
    const syr = teile.slice(i + 2, i + 4).find((x) => x.syr);
    aus.push({ latein, syrisch: syr ? clean(syr.text) : '', deutsch: b[1] });
  });
  return aus.filter((k) => k.latein && k.deutsch);
}

/** Beispiele mit der Bedeutung in derselben Zelle: Umschrift, Schrift, „Bedeutung“. */
function glossenInZellen(tab) {
  const aus = [];
  for (const zeile of tab.zeilen) {
    for (const z of zeile) {
      const t = z.teile;
      for (let i = 0; i + 2 < t.length; i++) {
        const [l, s, d] = [t[i], t[i + 1], t[i + 2]];
        const de = ZELL_BEDEUTUNG.exec(d.text)?.[1];
        if (!de || !LATEIN.test(l.text) || SYRISCH.test(l.text) || !SYRISCH.test(s.text) || LATEIN.test(s.text)) continue;
        aus.push({ latein: clean(l.text), syrisch: clean(s.text), deutsch: clean(de), audio: l.audio, audio2: s.audio });
      }
    }
  }
  return aus;
}

// --- Seite einlesen ------------------------------------------------------------------------

function seiteLesen($, seite, url, gestrichen) {
  const roh = [];
  $('main#articles article section').each((_, section) => {
    const box = $(section).children('table.infobox').find('> tbody > tr > td').first();
    roh.push(...bloeckeAus($, box.length ? box[0] : section, url, gestrichen));
  });
  return roh;
}

export async function extrahiereGrammatik(kapitel) {
  const seiten = grammatikSeiten(kapitel);
  const gestrichen = [];
  const ergebnis = [];
  for (const s of seiten) {
    const { $, url } = await load(s.id);
    ergebnis.push({ ...s, url, bloecke: seiteLesen($, s, url, gestrichen) });
  }

  // Alte Markierungen (`tags`) nach Kennung übernehmen.
  let alteTags = {};
  try {
    const alt = JSON.parse(await readFile(datei(DATEI), 'utf8'));
    alteTags = Object.fromEntries(alt.seiten.flatMap((s) => s.eintraege).map((e) => [e.id, e.tags]));
  } catch {
    // noch keine Datei
  }

  const vergeben = new Set();
  const kennung = (seite, latein) => {
    const vorne = seite.lektion ? `L${String(seite.lektion).padStart(2, '0')}-G` : seite.art === 'verben' ? 'V' : 'F';
    const basis = `${vorne}-${slug(latein) || 'x'}`;
    let id = basis;
    for (let n = 2; vergeben.has(id); n++) id = `${basis}-${n}`;
    vergeben.add(id);
    return id;
  };

  // Erster Durchgang: Paare finden, Bedeutungen aus Tabelle oder Verbzeile.
  const offen = []; // Tabellen ohne Bedeutung: { seite, block, paare, kontext }
  for (const seite of ergebnis) {
    seite.roh = [];
    const kette = [];
    let verb = null; // { zitat, deutsch }
    let verbenImAbschnitt = [];
    let einzeln = 0; // wie viele Infinitive unter der aktuellen Überschrift schon zugeordnet sind
    seite.bloecke.forEach((b, nr) => {
      if (b.art === 'titel') {
        einzeln = 0;
        while (kette.length && kette.at(-1).ebene >= b.ebene) kette.pop();
        kette.push(b);
        const v = verbAus(b.text);
        const de = bedeutungIn(b.text);
        verb = v ?? (de ? { deutsch: de } : null);
        if (b.ebene <= 1) verbenImAbschnitt = [];
        return;
      }
      const kontext = kette.map((t) => t.text);
      if (b.art === 'absatz') {
        if (seite.art === 'grammatik') {
          for (const k of kleinwoerterImAbsatz(b.teile)) seite.roh.push({ ...k, block: nr, kontext, klein: true });
          return;
        }
        const text = textVon(b.teile);
        // Eine Verbzeile oder Bedeutung zählt nur, wenn die Tabelle des Verbs direkt folgt
        // („… yqr ܝܩܪ II … werden analog zu ḥlq II flektiert“ stellt kein eigenes Verb vor).
        // Kurze Zwischenzeilen davor („Typ 1, mit Diphthong:“) zählen nicht.
        let naechster = nr + 1;
        while (seite.bloecke[naechster]?.art === 'absatz' && /:$/.test(textVon(seite.bloecke[naechster].teile)) && textVon(seite.bloecke[naechster].teile).length < 120) naechster++;
        const vorTabelle = seite.bloecke[naechster]?.art === 'tabelle';
        const v = verbAus(text);
        if (v) {
          if (vorTabelle) {
            verb = { ...v, deutsch: v.deutsch ?? verb?.deutsch };
            if (verb.deutsch) verbenImAbschnitt.push(verb);
          }
          return;
        }
        const de = bedeutungIn(text);
        if (de && vorTabelle && !/Imperativ|Infinitiv/.test(text) && text.length < 120) verb = { deutsch: de };
        // „šql ܫܩܠ I, Präteritum: šqile „er kaufte““: Die Tabelle danach hat keine eigene Bedeutung.
        else if (vorTabelle && ANFUEHRUNG.test(text) && !de) verb = null;
        // Imperativ und Infinitiv stehen als Text unter der Tabelle.
        const imAbschnitt = kontext.at(-1) ?? '';
        const formen = paareImAbsatz(b.teile);
        if (!formen.length) return;
        const art = (davor) =>
          /Infinitiv/.test(davor) ? 'Infinitiv' : /Imperativ/.test(davor) ? 'Imperativ' : null;
        const artImAbschnitt = art(imAbschnitt);
        const neu = (f, v, merkmal) =>
          seite.roh.push({ block: nr, kontext, latein: f.latein, syrisch: f.syrisch, deutsch: v.deutsch, verb: v.zitat, merkmal });
        if (/^(Imperativ|Infinitiv)/.test(text) && verb?.deutsch) {
          // ein Verb: „Imperativ: m. tux! – f. tax! – pl. toxu!; Infinitiv: maṯyo“
          let aktuell = null;
          for (const f of formen) {
            aktuell = art(f.davor) ?? aktuell;
            if (!aktuell) continue;
            const genauer = /(?:^|\s)(m|f|pl|Sg|Pl)\.\s*$/.exec(f.davor)?.[1];
            neu(f, verb, [aktuell, genauer && `${genauer}.`].filter(Boolean).join(', '));
          }
        } else if (artImAbschnitt && verbenImAbschnitt.length === formen.length) {
          // alle Verben des Abschnitts nacheinander: „Sg. graš! ܓܪܰܫ ; rḥam! ܪܚܰܡ ; dmax! ܕܡܰܟ݂“
          const zahl = /^(Sg|Pl)\./.exec(text)?.[1];
          formen.forEach((f, k) => neu(f, verbenImAbschnitt[k], [artImAbschnitt, zahl && `${zahl}.`].filter(Boolean).join(', ')));
        } else if (artImAbschnitt === 'Infinitiv' && formen.length === 1 && einzeln < verbenImAbschnitt.length) {
          // Infinitive untereinander, ein Absatz pro Verb
          neu(formen[0], verbenImAbschnitt[einzeln++], 'Infinitiv');
        }
        return;
      }
      // Tabelle
      const bedeutung = seite.art !== 'grammatik' ? verb : null;
      const paare = paareAus(b);
      const eintraege = [];
      for (const p of paare) {
        for (const e of eintraegeAusPaar(p)) {
          let deutsch = e.deutsch;
          let verbZitat;
          if (!deutsch && bedeutung?.deutsch) {
            deutsch = bedeutung.deutsch;
            verbZitat = bedeutung.zitat;
          }
          // Zahlentabellen: Die Zahl am Zeilenanfang ist die Bedeutung.
          let merkmal = e.merkmal;
          if (!deutsch && seite.art !== 'grammatik' && e.zahl) {
            deutsch = e.zahl;
            merkmal = merkmal.split(', ').filter((m) => m !== deutsch).join(', ');
          }
          delete e.zahl;
          // Der Artikel (u, i, aK, an) hat keine deutsche Spalte – die Überschrift sagt, was er ist.
          const artikel = !deutsch && seite.titel === ARTIKEL_TABELLE;
          if (artikel) deutsch = seite.titel;
          eintraege.push({ ...e, deutsch, verb: verbZitat, merkmal, block: nr, kontext, ...(artikel && { klein: true }) });
        }
      }
      if (eintraege.length && eintraege.every((e) => !e.deutsch)) offen.push({ seite, eintraege });
      seite.roh.push(...eintraege);
      for (const k of glossenInZellen(b)) seite.roh.push({ ...k, block: nr, kontext, klein: true });
    });
  }

  // Zweiter Durchgang: Tabellen ohne Bedeutung, deren Formen mit einem bekannten Verb übereinstimmen.
  for (let runde = 0; runde < 3; runde++) {
    const bekannt = new Map(); // Umschrift → Set „deutsch|verb“
    for (const s of ergebnis) {
      for (const r of s.roh) {
        if (!r.deutsch || !r.verb) continue; // nur Formen aus Verbtabellen
        const k = r.latein.toLowerCase();
        bekannt.set(k, (bekannt.get(k) ?? new Set()).add(`${r.deutsch}|${r.verb ?? ''}`));
      }
    }
    for (const t of offen) {
      if (t.eintraege[0].deutsch) continue;
      const zaehler = new Map();
      for (const e of t.eintraege) {
        const b = bekannt.get(e.latein.toLowerCase());
        if (b?.size === 1) {
          const k = [...b][0];
          zaehler.set(k, (zaehler.get(k) ?? 0) + 1);
        }
      }
      const [best] = [...zaehler].sort((a, b) => b[1] - a[1]);
      if (best && best[1] >= 2 && [...zaehler].filter(([, n]) => n === best[1]).length === 1) {
        const [deutsch, verb] = best[0].split('|');
        for (const e of t.eintraege) {
          e.deutsch = deutsch;
          if (verb) e.verb = verb;
          e.geerbt = true;
        }
      }
    }
  }

  // Einträge bauen – die Kleinwörter zuletzt, damit die Kennungen der übrigen Einträge bleiben.
  let ohneBedeutung = 0;
  let kleinwoerter = 0;
  const schonKlein = new Set();
  for (const seite of ergebnis) seite.eintraege = [];
  for (const runde of ['tabellen', 'klein']) for (const seite of ergebnis) {
    for (const r of seite.roh) {
      if (!!r.klein !== (runde === 'klein')) continue;
      if (!r.deutsch || !r.latein) {
        ohneBedeutung++;
        continue;
      }
      if (r.klein) {
        // „die Konjunktion d“ steht auf mehreren Seiten: nur die erste Stelle zählt.
        const k = `${r.latein}|${r.deutsch}`;
        if (schonKlein.has(k)) continue;
        schonKlein.add(k);
        kleinwoerter++;
      }
      const id = kennung(seite, r.latein);
      const woerter = r.latein.split(/\s+/).filter(Boolean).length;
      const e = {
        id,
        latein: r.latein,
        syrisch: r.syrisch,
        deutsch: r.deutsch,
        ...(r.audio && { audio: r.audio }),
        ...(r.audio2 && { audio2: r.audio2 }),
        ...(r.merkmal && { merkmal: r.merkmal }),
        ...(r.verb && { verb: r.verb }),
        ...(r.hinweis && { hinweis: r.hinweis }),
        ...(r.fett?.length && { fett: r.fett }),
        ...(seite.lektion && { lektion: seite.lektion }),
        art: woerter >= 3 || /[.!?]$/.test(r.latein) && woerter > 1 ? 'satz' : 'wort',
        quelle: 'lehrbuch',
        block: r.block,
        tags: alteTags[id] ?? [],
      };
      seite.eintraege.push(e);
    }
  }
  for (const seite of ergebnis) delete seite.roh;

  await writeFile(
    datei(DATEI),
    kompakt({ quelle: { name: 'Šlomo Surayt', url: BASE, abgerufen: new Date().toISOString().slice(0, 10) }, seiten: ergebnis }),
  );

  for (const s of ergebnis) {
    const tabellen = s.bloecke.filter((b) => b.art === 'tabelle').length;
    const mitTon = s.eintraege.filter((e) => e.audio).length;
    console.log(`${s.id.padEnd(7)} ${s.titel.padEnd(36)} ${String(tabellen).padStart(3)} Tabellen, ${String(s.eintraege.length).padStart(4)} Einträge (${mitTon} mit Aufnahme)`);
  }
  const alle = ergebnis.flatMap((s) => s.eintraege);
  console.log(`Zusammen: ${alle.length} Einträge, ${alle.filter((e) => e.audio).length} mit Aufnahme, ${ohneBedeutung} Formen ohne Bedeutung nur in den Tabellen`);
  console.log(`Davon ${kleinwoerter} Kleinwörter und Beispiele aus Erklärtexten (Präpositionen, Artikel, Marker, Partikeln)`);
  if (gestrichen.length) console.log(`Nicht übernommen (${gestrichen.length} Sätze):\n  ${gestrichen.join('\n  ')}`);
}

/**
 * JSON so, dass die Datei lesbar und Änderungen beim erneuten Einlesen gut
 * vergleichbar bleiben: ein Eintrag pro Zeile, Überschriften und Absätze in
 * einer Zeile, Tabellen mit einer Zeile pro Tabellenzeile.
 */
function kompakt(daten) {
  const j = (v) => JSON.stringify(v);
  const block = (b) =>
    b.art !== 'tabelle'
      ? j(b)
      : `{"art":"tabelle","zeilen":[\n${b.zeilen.map((z) => `        ${j(z)}`).join(',\n')}\n      ]}`;
  const seite = ({ bloecke, eintraege, ...kopf }) =>
    `    ${j(kopf).slice(0, -1)},\n    "bloecke":[\n${bloecke.map((b) => `      ${block(b)}`).join(',\n')}\n    ],\n` +
    `    "eintraege":[\n${eintraege.map((e) => `      ${j(e)}`).join(',\n')}\n    ]}`;
  return `{"quelle":${j(daten.quelle)},\n"seiten":[\n${daten.seiten.map(seite).join(',\n')}\n]}\n`;
}
