// Übersetzer / Schnell-Wörterbuch (Fahrplan, Phase 4): durchsucht den
// Wortschatz, die Sätze aus Dialogen und Lesetexten und das Glossar aller
// Lektionen – auf Deutsch und auf Surayt.
//
// Die Suche ist tolerant: Sonderzeichen sind egal („slomo“ findet „šlomo“),
// „sch“ oder „sh“ gehen für „š“, Wortteile und kleine Tippfehler werden
// erkannt. Gefunden wird aber nur, was in den Daten steht – nichts wird
// zusammengesetzt, übersetzt oder geraten.

import { useEffect, useState } from 'react';
import { alleLektionen, NUR_MIT_BILD } from '../data';
import type { Eintrag, Glossar, Lektion, Quelle } from '../types';
import { fold, kern, woerter, zerlege } from './text';

/** Woher ein Fund in den Daten stammt. */
export type Herkunft = 'wortschatz' | 'aussprache' | 'text' | 'einleitung' | 'glossar';

/** Ein Wort oder Satz im Wörterbuch. */
export interface Fund {
  /** Kennung des Eintrags; bei Glossar-Wendungen `G-…` (mit „.2“ usw. für die weiteren Wendungen einer Zeile). */
  id: string;
  latein: string;
  hinweis?: string;
  deutsch: string;
  audio?: string;
  art: 'wort' | 'satz';
  quelle: Quelle;
  herkunft: Herkunft;
  /** Lektion, aus der dieser Eintrag stammt; fehlt bei Glossar-Wendungen ohne Verweis. */
  lektion?: number;
  /** Alle Lektionen, in denen derselbe Eintrag (gleiche Schreibweise, gleiche Bedeutung) vorkommt. */
  lektionen: number[];
  sprecher?: string;
}

/** Ein durchsuchbarer Teil eines Fundes, schon zerlegt. */
interface Feld {
  woerter: string[];
  ganz: string;
  sprache: 'sur' | 'de';
  /** Zusätze (Pluralformen, Klammern) zählen weniger als das Stichwort selbst. */
  gewicht: number;
}

export interface Woerterbuch {
  funde: readonly Fund[];
  /** Auch zusammengeführte Doppelgänger sind über ihre Kennung zu finden. */
  nachId: ReadonlyMap<string, Fund>;
  /** Alle Sätze aus Dialogen, Lesetexten und Einleitungen – für Beispielsätze. */
  saetze: readonly Fund[];
  /** Ist das Glossar schon dabei? */
  mitGlossar: boolean;
  /**
   * Glossar-Wendungen, die ein Wort aus dem Wortschatz nur ausführlicher
   * beschreiben („aṯro, Pl. aṯrawoṯe – Heimat, Ort, Dorf, Land“ zu „aṯro – Heimat,
   * Ort, Dorf“): Glossar-Fund → Wortschatz-Fund. Sie erscheinen in der
   * Trefferliste nur, wenn ihr Wortschatz-Wort nicht ohnehin dasteht.
   */
  zwilling: ReadonlyMap<Fund, Fund>;
  /** Umgekehrt: Wortschatz-Fund → seine ausführlicheren Glossar-Wendungen. */
  imGlossar: ReadonlyMap<Fund, Fund[]>;
  felder: ReadonlyMap<Fund, Feld[]>;
}

// --- Text aufbereiten ----------------------------------------------------------

/** Für die Suche: ohne Sonderzeichen und klein, „ß“ → „ss“. */
const falte = (text: string) => fold(text).replace(/ß/g, 'ss');
const zerteile = (text: string) => falte(text).split(/[^a-z0-9]+/).filter(Boolean);

/** Die Wörter eines Surayt-Textes, wie sie dastehen, aber klein und ohne Satzzeichen – für genaue Vergleiche. */
const genau = (text: string) =>
  woerter(text)
    .map((w) => zerlege(w).kern.normalize('NFC').toLowerCase())
    .filter(Boolean);

/** Das Stichwort einer Glossar-Wendung: „abro, Pl. abne“ → „abro“, „aḏno (f.), …“ → „aḏno“. */
export const stichwort = (latein: string) => latein.split(/\s*[,;(]/)[0].trim();

/** Kommen die Wörter `teil` in dieser Reihenfolge in `ganz` vor? */
function enthaelt(ganz: readonly string[], teil: readonly string[]): number {
  if (!teil.length) return -1;
  for (let i = 0; i + teil.length <= ganz.length; i++) {
    if (teil.every((w, k) => ganz[i + k] === w)) return i;
  }
  return -1;
}

/** Klammerzusätze der deutschen Bedeutung: „Hallo (Antwort auf …)“ → „Antwort auf …“. */
const klammern = (deutsch: string) => [...deutsch.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).join(' ');

function feld(text: string, sprache: Feld['sprache'], gewicht: number): Feld[] {
  const w = zerteile(text);
  return w.length ? [{ woerter: w, ganz: w.join(' '), sprache, gewicht }] : [];
}

function felderVon(f: Fund): Feld[] {
  const kopf = f.herkunft === 'glossar' ? stichwort(f.latein) : f.latein;
  const rest = f.herkunft === 'glossar' ? f.latein.slice(kopf.length) : (f.hinweis ?? '');
  return [
    ...feld(kopf, 'sur', 1),
    ...feld(rest, 'sur', 0.7),
    ...feld(f.deutsch.replace(/\([^)]*\)/g, ' '), 'de', 1),
    ...feld(klammern(f.deutsch), 'de', 0.6),
  ];
}

// --- Wörterbuch aufbauen -------------------------------------------------------

/** Welcher von zwei gleichen Einträgen gezeigt wird: Wortschatz vor Beispielen, Sätzen und Glossar. */
const RANG: Record<Herkunft, number> = { wortschatz: 0, aussprache: 1, text: 2, einleitung: 2, glossar: 3 };

const ausEintrag = (e: Eintrag, herkunft: Herkunft): Fund => ({
  id: e.id,
  latein: e.latein,
  ...(e.hinweis ? { hinweis: e.hinweis } : {}),
  deutsch: e.deutsch,
  ...(e.audio ? { audio: e.audio } : {}),
  art: e.art,
  quelle: e.quelle,
  herkunft,
  lektion: e.lektion,
  lektionen: [e.lektion],
  ...(e.sprecher ? { sprecher: e.sprecher } : {}),
});

/** Gleiche Schreibweise und gleiche Bedeutung (ohne Klammerzusätze) – derselbe Eintrag. */
const schluessel = (latein: string, deutsch: string) => `${genau(latein).join(' ')}|${kern(deutsch)}`;

/** Deckt die Bedeutung `b` die Bedeutung `a` schon ab? („Hand“ in „Hand“, aber nicht „Sohn“ in „Söhne“) */
function abgedeckt(a: string, b: string): boolean {
  const wa = zerteile(kern(a));
  const wb = new Set(zerteile(kern(b)));
  return wa.length > 0 && wa.every((w) => wb.has(w));
}

export function baueWoerterbuch(lektionen: readonly Lektion[], glossar?: Glossar): Woerterbuch {
  const funde: Fund[] = [];
  const nachId = new Map<string, Fund>();
  const nachSchluessel = new Map<string, Fund>();

  function aufnehmen(f: Fund) {
    const k = schluessel(f.latein, f.deutsch);
    const da = nachSchluessel.get(k);
    if (!da) {
      nachSchluessel.set(k, f);
      funde.push(f);
      nachId.set(f.id, f);
      return;
    }
    // Doppelgänger: die Lektionen zusammenführen; gezeigt wird der aussagekräftigere Eintrag.
    const lektionenZusammen = [...new Set([...da.lektionen, ...f.lektionen])].sort((a, b) => a - b);
    const besser =
      RANG[f.herkunft] < RANG[da.herkunft] ||
      (RANG[f.herkunft] === RANG[da.herkunft] && !!f.hinweis && !da.hinweis) ||
      (!!f.audio && !da.audio);
    const sieger = besser ? f : da;
    const zusammen: Fund = { ...sieger, audio: sieger.audio ?? da.audio ?? f.audio, lektionen: lektionenZusammen };
    if (!zusammen.audio) delete zusammen.audio;
    funde[funde.indexOf(da)] = zusammen;
    nachSchluessel.set(k, zusammen);
    for (const [id, x] of nachId) if (x === da) nachId.set(id, zusammen);
    nachId.set(f.id, zusammen);
  }

  for (const l of lektionen) {
    for (const e of l.wortschatz) aufnehmen(ausEintrag(e, 'wortschatz'));
    const a = l.aussprache;
    const laute = [...(a?.schrift ?? []), ...(a?.neueBuchstaben ?? []), ...(a?.konsonanten ?? []), ...(a?.vokale ?? [])];
    for (const e of laute.flatMap((laut) => laut.beispiele)) if (e.deutsch) aufnehmen(ausEintrag(e, 'aussprache'));
    for (const e of (a?.hoerpaare ?? []).flatMap((p) => p.woerter)) if (e.deutsch) aufnehmen(ausEintrag(e, 'aussprache'));
  }
  for (const l of lektionen) {
    for (const e of l.einleitung) if (!e.tags.includes(NUR_MIT_BILD)) aufnehmen(ausEintrag(e, 'einleitung'));
    for (const e of l.text) if (!e.tags.includes(NUR_MIT_BILD)) aufnehmen(ausEintrag(e, 'text'));
  }

  if (glossar) {
    // Das Glossar hat keine Aufnahmen. Gibt es das Stichwort im Wortschatz oder
    // als Satz, wird dessen Aufnahme genutzt – die Umschrift ist dieselbe.
    const nachWort = new Map<string, Fund[]>();
    for (const f of funde) {
      const k = genau(f.art === 'wort' ? stichwort(f.latein) : f.latein).join(' ');
      nachWort.set(k, [...(nachWort.get(k) ?? []), f]);
    }
    for (const zeile of glossar.eintraege) {
      zeile.teile.forEach((teil, i) => {
        if (!teil.deutsch.trim()) return;
        const kopf = genau(stichwort(teil.latein)).join(' ');
        const ganz = genau(teil.latein).join(' ');
        const gleiche = [...(nachWort.get(ganz) ?? []), ...(ganz === kopf ? [] : (nachWort.get(kopf) ?? []))];
        // Steht dasselbe Wort mit derselben Bedeutung schon im Wortschatz, reicht das.
        const schonDa = gleiche.find((f) => abgedeckt(teil.deutsch, f.deutsch));
        if (schonDa) {
          for (const nr of teil.lektionen) if (!schonDa.lektionen.includes(nr)) schonDa.lektionen.push(nr);
          schonDa.lektionen.sort((a, b) => a - b);
          return;
        }
        const ton = gleiche.find((f) => f.audio && teil.lektionen.includes(f.lektion ?? 0)) ?? gleiche.find((f) => f.audio);
        aufnehmen({
          id: zeile.teile.length > 1 ? `${zeile.id}.${i + 1}` : zeile.id,
          latein: teil.latein,
          deutsch: teil.deutsch,
          ...(ton?.audio ? { audio: ton.audio } : {}),
          art: genau(teil.latein).length > 3 && !/[,;]/.test(teil.latein) ? 'satz' : 'wort',
          quelle: 'lehrbuch',
          herkunft: 'glossar',
          ...(teil.lektionen.length ? { lektion: teil.lektionen[0] } : {}),
          lektionen: [...teil.lektionen].sort((a, b) => a - b),
        });
      });
    }
  }

  // Glossar-Wendungen, die ein Wort aus dem Wortschatz ausführlicher beschreiben
  const zwilling = new Map<Fund, Fund>();
  const imGlossar = new Map<Fund, Fund[]>();
  const woerterNachStichwort = new Map<string, Fund[]>();
  for (const f of funde) {
    if (f.herkunft === 'glossar' || f.art !== 'wort') continue;
    const k = genau(stichwort(f.latein)).join(' ');
    woerterNachStichwort.set(k, [...(woerterNachStichwort.get(k) ?? []), f]);
  }
  for (const g of funde) {
    if (g.herkunft !== 'glossar') continue;
    const kandidaten = (woerterNachStichwort.get(genau(stichwort(g.latein)).join(' ')) ?? []).filter((w) =>
      abgedeckt(w.deutsch, g.deutsch),
    );
    const w = kandidaten.find((x) => g.lektionen.some((nr) => x.lektionen.includes(nr))) ?? kandidaten[0];
    if (!w) continue;
    zwilling.set(g, w);
    imGlossar.set(w, [...(imGlossar.get(w) ?? []), g]);
  }

  return {
    funde,
    nachId,
    saetze: funde.filter((f) => f.herkunft === 'text' || f.herkunft === 'einleitung'),
    mitGlossar: !!glossar,
    zwilling,
    imGlossar,
    felder: new Map(funde.map((f) => [f, felderVon(f)])),
  };
}

// --- Suchen --------------------------------------------------------------------

/** Wie man Surayt auf einer deutschen Tastatur schreibt: „schlomo“ → „slomo“ (wie „šlomo“ ohne Haken). */
const DEUTSCH_GETIPPT: [RegExp, string][] = [
  [/tsch/g, 'c'],
  [/dsch/g, 'j'],
  [/sch/g, 's'],
  [/ch/g, 'x'],
  [/ae/g, 'a'],
];
/** … und auf Englisch: „shlomo“, „chanta“, „idho“. */
const ENGLISCH_GETIPPT: [RegExp, string][] = [
  [/sh/g, 's'],
  [/ch/g, 'c'],
  [/th/g, 't'],
  [/dh/g, 'd'],
  [/gh/g, 'g'],
  [/kh/g, 'x'],
  [/zh/g, 'z'],
];
/** Umlaute ohne Umlaut-Taste: „Maedchen“ → „madchen“ (wie „Mädchen“ ohne Punkte). */
const UMLAUTE: [RegExp, string][] = [
  [/ae/g, 'a'],
  [/oe/g, 'o'],
  [/ue/g, 'u'],
];

const ersetze = (text: string, regeln: [RegExp, string][]) => regeln.reduce((t, [muster, neu]) => t.replace(muster, neu), text);

/** Artikel müssen nicht gefunden werden: „der Vater“ findet auch „Vater“. */
const FUELLWOERTER = new Set(['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines']);

/** Enthält die Suche Buchstaben, die es nur in der Umschrift gibt (š, ṭ, ë …)? Dann ist sie Surayt. */
const istUmschrift = (text: string) =>
  [...text.normalize('NFC')].some((z) => /\p{L}/u.test(z) && z > '\u{7F}' && !'\u{E4}\u{F6}\u{FC}\u{DF}\u{C4}\u{D6}\u{DC}'.includes(z));

/** Abstand zweier Wörter in Tippfehlern (vertauschte Nachbarn zählen als einer); bricht ab, sobald er `grenze` übersteigt. */
export function abstand(a: string, b: string, grenze: number): number {
  if (Math.abs(a.length - b.length) > grenze) return grenze + 1;
  let vorvorige: number[] = [];
  let vorige = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const zeile = [i];
    let kleinste = i;
    for (let j = 1; j <= b.length; j++) {
      const kosten = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(vorige[j] + 1, zeile[j - 1] + 1, vorige[j - 1] + kosten);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, vorvorige[j - 2] + 1);
      zeile.push(d);
      kleinste = Math.min(kleinste, d);
    }
    if (kleinste > grenze) return grenze + 1;
    vorvorige = vorige;
    vorige = zeile;
  }
  return vorige[b.length];
}

/** Wie gut passt ein gesuchtes Wort zu einem Wort im Eintrag? 1 = genau, 0 = gar nicht. */
function passt(gesucht: string, wort: string): number {
  if (gesucht === wort) return 1;
  // Wortanfang: „tawd“ → „tawdi“ (beim Tippen). Zählt weniger als ein ganzes Wort,
  // damit „Oma“ zuerst die Oma findet und nicht ein Wort, das mit „oma“ anfängt.
  if (gesucht.length >= 2 && wort.startsWith(gesucht)) return 0.55 + 0.3 * (gesucht.length / wort.length);
  // Wortteil: „haus“ in „krankenhaus“
  if (gesucht.length >= 3 && wort.includes(gesucht)) return 0.4;
  return 0;
}

/** Wie `passt`, aber mit Tippfehlern: „tawdy“ → „tawdi“. Solche Treffer sind nur ähnlich geschrieben. */
function passtUngefaehr(gesucht: string, wort: string): number {
  const erlaubt = gesucht.length >= 7 ? 2 : gesucht.length >= 4 ? 1 : 0;
  if (!erlaubt) return 0;
  const d = abstand(gesucht, wort, erlaubt);
  if (d <= erlaubt) return 0.75 - 0.15 * d;
  // Tippfehler im angefangenen Wort: „tawwu“ → „tawwone“
  if (wort.length > gesucht.length && abstand(gesucht, wort.slice(0, gesucht.length), 1) <= 1) return 0.4;
  return 0;
}

interface Suchwort {
  woerter: string[];
  /** Füllwörter müssen nicht vorkommen. */
  optional: boolean[];
  ganz: string;
  /** Leicht abgewertet, wenn die Suche erst umgeschrieben werden musste („sch“ → „s“). */
  faktor: number;
}

function suchwort(text: string, faktor: number): Suchwort | null {
  const w = text.split(/[^a-z0-9]+/).filter(Boolean);
  if (!w.length) return null;
  const optional = w.map((x) => x.length === 1 || FUELLWOERTER.has(x));
  return { woerter: w, optional: optional.every(Boolean) ? optional.map(() => false) : optional, ganz: w.join(' '), faktor };
}

interface Bewertung {
  wert: number;
  /** Nur über Tippfehler gefunden – also bloß ähnlich geschrieben. */
  ungefaehr: boolean;
}

const NICHTS: Bewertung = { wert: 0, ungefaehr: false };

function feldWert(s: Suchwort, f: Feld, mitTippfehlern: boolean): Bewertung {
  let summe = 0;
  let noetig = 0;
  let ungefaehr = false;
  // Wie gut jedes Wort des Eintrags getroffen wurde: Je mehr vom Eintrag gesucht
  // wurde, desto besser passt er („Haus“ passt besser zu „Haus“ als zu einem langen Satz).
  const getroffen = new Map<number, number>();
  for (let k = 0; k < s.woerter.length; k++) {
    const gesucht = s.woerter[k];
    let best = 0;
    let wo = -1;
    let tippfehler = false;
    f.woerter.forEach((wort, i) => {
      const p = passt(gesucht, wort);
      if (p > best) [best, wo, tippfehler] = [p, i, false];
    });
    if (mitTippfehlern && best < 1) {
      f.woerter.forEach((wort, i) => {
        const p = passtUngefaehr(gesucht, wort);
        if (p > best) [best, wo, tippfehler] = [p, i, true];
      });
    }
    if (wo >= 0) getroffen.set(wo, Math.max(best, getroffen.get(wo) ?? 0));
    if (s.optional[k]) continue;
    if (best === 0) return NICHTS;
    noetig++;
    summe += best;
    ungefaehr ||= tippfehler;
  }
  const abdeckung = [...getroffen.values()].reduce((a, b) => a + b, 0) / f.woerter.length;
  const ganz = s.ganz === f.ganz ? 0.3 : s.woerter.length > 1 && f.ganz.startsWith(s.ganz) ? 0.1 : 0;
  return { wert: ((summe / noetig) * 0.7 + abdeckung * 0.3 + ganz) * f.gewicht * s.faktor, ungefaehr };
}

interface Treffer extends Bewertung {
  fund: Fund;
}

/** Unter diesem Wert gilt ein Eintrag nicht als gefunden … */
const MINDESTENS = 0.4;
/** … und auch nicht, wenn er weniger als halb so gut passt wie der beste Treffer (dann ist er nur zufällig ähnlich). */
const ABSTAND_ZUM_BESTEN = 0.5;

/**
 * Erst ohne Tippfehler suchen; passt dabei nichts richtig gut, ein zweites Mal
 * mit. Das spart auf dem Handy Zeit, denn die meisten Suchen treffen genau.
 */
function bewerte(wb: Woerterbuch, anfrage: string): Treffer[] {
  const ohne = durchsuche(wb, anfrage, false);
  return ohne.length && ohne[0].wert >= GUT_GENUG ? ohne : durchsuche(wb, anfrage, true);
}

/** Ab diesem Wert braucht es keine Suche nach Tippfehlern mehr (z. B. ein ganzes Wort genau getroffen). */
const GUT_GENUG = 1;

function durchsuche(wb: Woerterbuch, anfrage: string, mitTippfehlern: boolean): Treffer[] {
  const roh = falte(anfrage);
  const varianten = (regeln: [RegExp, string][][]): Suchwort[] => {
    const texte = [roh, ...regeln.map((r) => ersetze(roh, r))];
    return [...new Set(texte)].map((t, i) => suchwort(t, i === 0 ? 1 : 0.95)).filter((s): s is Suchwort => s !== null);
  };
  const sur = varianten([DEUTSCH_GETIPPT, ENGLISCH_GETIPPT]);
  const de = istUmschrift(anfrage) ? [] : varianten([UMLAUTE]);
  if (!sur.length) return [];

  const treffer: Treffer[] = [];
  for (const fund of wb.funde) {
    let best = NICHTS;
    for (const f of wb.felder.get(fund) ?? []) {
      for (const s of f.sprache === 'sur' ? sur : de) {
        const b = feldWert(s, f, mitTippfehlern);
        if (b.wert > best.wert) best = b;
      }
    }
    if (best.wert >= MINDESTENS) treffer.push({ fund, wert: best.wert + (fund.audio ? 0.02 : 0), ungefaehr: best.ungefaehr });
  }
  const bester = Math.max(0, ...treffer.map((t) => t.wert));
  const gefunden = new Set(treffer.map((t) => t.fund));
  return treffer
    .filter((t) => t.wert >= bester * ABSTAND_ZUM_BESTEN)
    // Steht das Wort selbst schon da, braucht es seinen Glossar-Zwilling nicht auch noch.
    .filter((t) => !gefunden.has(wb.zwilling.get(t.fund)!))
    .sort(
      (a, b) =>
        b.wert - a.wert ||
        Number(a.fund.art === 'satz') - Number(b.fund.art === 'satz') ||
        RANG[a.fund.herkunft] - RANG[b.fund.herkunft] ||
        a.fund.latein.length - b.fund.latein.length ||
        (a.fund.lektion ?? 99) - (b.fund.lektion ?? 99),
    );
}

export interface Suchergebnis {
  /** Die passendsten Einträge, die besten zuerst. */
  funde: Fund[];
  /**
   * Nichts passt genau, die Treffer sind nur ähnlich geschrieben („Brot“ → „rot“).
   * Die Oberfläche sagt das dazu, damit niemand sie für die Übersetzung hält.
   */
  nurAehnlich: boolean;
}

export function suche(wb: Woerterbuch, anfrage: string, hoechstens = 40): Suchergebnis {
  const treffer = bewerte(wb, anfrage);
  return {
    funde: treffer.slice(0, hoechstens).map((t) => t.fund),
    nurAehnlich: treffer.length > 0 && treffer.every((t) => t.ungefaehr),
  };
}

/**
 * Findet sich zu einer Suche aus mehreren Wörtern kein ganzer Eintrag, helfen
 * vielleicht die einzelnen Wörter weiter – jedes für sich nachgeschlagen, nicht
 * zu einem Satz zusammengesetzt.
 */
export function einzelneWoerter(wb: Woerterbuch, anfrage: string): { wort: string; funde: Fund[] }[] {
  const s = suchwort(falte(anfrage), 1);
  if (!s || s.optional.filter((o) => !o).length < 2) return [];
  const original = anfrage.split(/\s+/).filter(Boolean);
  const gesehen = new Set<string>();
  return s.woerter
    .filter((w, k) => !s.optional[k] && !gesehen.has(w) && gesehen.add(w))
    .slice(0, 6)
    .map((w) => ({
      wort: original.find((o) => falte(o).includes(w)) ?? w,
      funde: bewerte(wb, w)
        .filter((t) => t.fund.art === 'wort' && !t.ungefaehr && t.wert >= 0.9)
        .slice(0, 2)
        .map((t) => t.fund),
    }))
    .filter((g) => g.funde.length > 0);
}

// --- Rund um einen Eintrag -----------------------------------------------------

/**
 * Ein Satz aus den Lektionen, in dem das Wort genau so vorkommt – am liebsten
 * aus derselben Lektion und möglichst kurz.
 */
export function beispielsatz(wb: Woerterbuch, fund: Fund): Fund | undefined {
  if (fund.art === 'satz') return undefined;
  const gesucht = genau(stichwort(fund.latein));
  const passende = wb.saetze.filter((s) => s.id !== fund.id && enthaelt(genau(s.latein), gesucht) >= 0);
  const eigene = (s: Fund) => (fund.lektionen.includes(s.lektion ?? 0) ? 0 : 1);
  return passende.sort((a, b) => eigene(a) - eigene(b) || a.latein.length - b.latein.length)[0];
}

/** Wörter aus dem Wortschatz, die in einem Satz vorkommen – in der Reihenfolge des Satzes. */
export function woerterImSatz(wb: Woerterbuch, satz: Fund, hoechstens = 8): Fund[] {
  const ganz = genau(satz.latein);
  const gefunden: { fund: Fund; wo: number }[] = [];
  for (const f of wb.funde) {
    if (f.art !== 'wort' || f.herkunft === 'glossar') continue;
    const wo = enthaelt(ganz, genau(stichwort(f.latein)));
    if (wo >= 0) gefunden.push({ fund: f, wo });
  }
  const eigene = (f: Fund) => (f.lektionen.includes(satz.lektion ?? 0) ? 0 : 1);
  gefunden.sort((a, b) => a.wo - b.wo || eigene(a.fund) - eigene(b.fund));
  // Pro Stelle im Satz nur ein Wort, am liebsten aus derselben Lektion.
  const stellen = new Set<number>();
  return gefunden
    .filter((g) => !stellen.has(g.wo) && stellen.add(g.wo))
    .slice(0, hoechstens)
    .map((g) => g.fund);
}

// --- Laden ---------------------------------------------------------------------

// Das Glossar ist groß und wird erst geladen, wenn man das Wörterbuch öffnet.
// Es steckt trotzdem in der App und ist offline da (der Service Worker legt
// alle Teile der App beim Installieren ab).
let ohneGlossar: Woerterbuch | null = null;
let mitGlossar: Woerterbuch | null = null;
let laden: Promise<Woerterbuch> | null = null;

const grundbestand = () => (ohneGlossar ??= baueWoerterbuch(alleLektionen));

function ladeGlossar(): Promise<Woerterbuch> {
  laden ??= import('../data/glossar-a.json')
    .then((m) => (mitGlossar = baueWoerterbuch(alleLektionen, m.default as Glossar)))
    .catch(() => {
      laden = null; // beim nächsten Öffnen nochmal versuchen
      return grundbestand();
    });
  return laden;
}

/** Das Wörterbuch für die Oberfläche: sofort mit den Lektionen, kurz danach auch mit dem Glossar. */
export function useWoerterbuch(): Woerterbuch {
  const [wb, setWb] = useState(() => mitGlossar ?? grundbestand());
  useEffect(() => {
    if (mitGlossar) return;
    let aktiv = true;
    void ladeGlossar().then((neu) => {
      if (aktiv) setWb(neu);
    });
    return () => {
      aktiv = false;
    };
  }, []);
  return wb;
}
