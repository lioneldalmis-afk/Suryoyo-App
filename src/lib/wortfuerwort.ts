// Wort für Wort (Fahrplan, Phase 4b, Schritt 3): Was jemand auf Surayt gesagt
// hat, wird Wort für Wort erklärt – mit den Einträgen aus den Daten, auch mit
// gebeugten Formen aus den Verb- und Formentabellen („dëmxono – schlafen,
// Präsens, Sg., 1. f.“). Einen deutschen Satz baut die App daraus nicht.
//
// So wird jedes Wort gesucht, das erste, was passt, gilt:
// 1. Wendungen aus mehreren Wörtern, die genau so in den Daten stehen („u gawro“,
//    „gëd goraš“, „bu bayto“) – das längste Stück zuerst.
// 2. Das Wort selbst: als Stichwort, als Form aus einer Tabelle oder als Form, die
//    ein Eintrag aufzählt („aḏne“ in „aḏno (f.), Pl. aḏne, aḏnoṯe“).
// 3. Zerlegt nach einer Regel, die das Lehrbuch erklärt: Präposition + Artikel
//    (Grammatik 11), Präsensmarker + Verbform (Grammatik 7/13), Substantiv +
//    Possessiv- oder Demonstrativsuffix (Grammatik 5). Jedes Teil muss genau in den
//    Daten stehen. Die Zerlegung selbst hat niemand geprüft – sie trägt das orange
//    Schild „Nicht geprüft“.
// 4. Ein Satz aus den Lektionen, in dem das Wort genau so vorkommt.
// 5. Ein ähnlich geschriebenes Wort (ein Tippfehler) – deutlich als solches gekennzeichnet.
// Sonst bleibt das Wort unerklärt. Geraten wird nichts.
//
// Welche Wörter Präpositionen, Artikel oder Suffixe sind, steht nicht hier im
// Code, sondern kommt aus den Daten (Kleinwörter aus den Erklärtexten, siehe
// scripts/grammatik.mjs).

import type { GrammatikSeite } from '../types';
import { fold, woerter, zerlege } from './text';
import { abstand, getipptVarianten, istUmschrift, RANG, type Fund, type Woerterbuch } from './woerterbuch';

// --- Wörter vergleichen --------------------------------------------------------------

/** Vergleichsschlüssel: ohne Sonderzeichen und Satzzeichen, klein („Ëšmi“ → „esmi“). */
const schluessel = (w: string) => fold(w).replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
/** Genau, wie es dasteht, nur klein („Ëšmi“ → „ëšmi“). */
const exakt = (w: string) => w.normalize('NFC').toLowerCase();
const VOKAL = /^[aeiouëä]/;

/** Ein Wort der Eingabe. */
interface Token {
  /** wie getippt, ohne Satzzeichen */
  text: string;
  genau: string;
  key: string;
  /** Hinter dem Wort endet ein Satz – Wendungen reichen nicht darüber hinweg. */
  satzende: boolean;
}

function tokens(text: string): Token[] {
  return woerter(text)
    .map((w) => {
      const z = zerlege(w);
      return { text: z.kern, genau: exakt(z.kern), key: schluessel(z.kern), satzende: /[.!?:;]/.test(z.nach) };
    })
    .filter((t) => t.key && !/^\d+$/.test(t.key));
}

/** Wie viele Wörter eine Eingabe hat (Zahlen und Satzzeichen zählen nicht). */
export const anzahlWoerter = (text: string) => tokens(text).length;

// --- Index ---------------------------------------------------------------------------

/** Eine Schreibweise, unter der ein Eintrag zu finden ist. */
interface Form {
  fund: Fund;
  genau: string;
  /** Das Stichwort selbst (nicht eine Form, die der Eintrag nur aufzählt). */
  ganz: boolean;
}

interface Wendung {
  fund: Fund;
  keys: string[];
}

type Reihe = 'allgemein' | 'eingeschraenkt' | 'demonstrativ';

interface Suffix {
  fund: Fund;
  key: string;
  reihe: Reihe;
}

interface WortIndex {
  formen: Map<string, Form[]>;
  /** Wendungen nach ihrem ersten Wort, die längsten zuerst. */
  wendungen: Map<string, Wendung[]>;
  /** Sätze, in denen ein Wort genau so vorkommt, die kürzesten zuerst. */
  inSaetzen: Map<string, Fund[]>;
  /** Alle Wörter der deutschen Bedeutungen – um zu erkennen, ob jemand Deutsch tippt. */
  deutsch: Set<string>;
  /** Formen des bestimmten Artikels (u, i, an); `platzhalter` ist „aK“ (a + erster Konsonant des Substantivs). */
  artikel: Set<Fund>;
  platzhalter?: Fund;
  /** Die kurzen Präpositionen (b, l, m, s) und die Genitivpartikel d, nach Schlüssel. */
  kurze: Map<string, Fund[]>;
  /** Präsensmarker „ko-“, nach Schlüssel („ko“). */
  praesens?: { key: string; fund: Fund };
  suffixe: Suffix[];
  /** Substantive, die das Lehrbuch als Ausnahmen der eingeschränkten Reihe nennt („xabro“, „ëšmo“ …), nach Schlüssel. */
  ausnahmen: Set<string>;
}

/** Zusätze vor einer Form: „f.“, „Pl.“, „Sg.“ … */
const MARKER = /^(?:(?:f|m|Pl|pl|Sg|sg|Inf)\.\s*)+/;
const EIN_WORT = /^[\p{L}\p{M}ʾʿ’']+$/u;
const ohneKlammern = (t: string) => t.replace(/\([^)]*\)/g, ' ');
const woerterVon = (t: string) => woerter(t).map((w) => zerlege(w).kern).filter(Boolean);

/** Unter welchen Schreibweisen ein Eintrag zu finden ist – einzelne Wörter und Wendungen. */
function formenVon(f: Fund): { einzeln: { genau: string; ganz: boolean }[]; wendungen: string[][] } {
  const einzeln: { genau: string; ganz: boolean }[] = [];
  const wendungen: string[][] = [];
  const nimm = (teil: string, ganz: boolean, mitWendung = true) => {
    const t = teil.trim().replace(MARKER, '').replace(/[…?!.]+$/u, '').trim();
    if (!t || /[+:…]/.test(t)) return;
    const w = woerterVon(t);
    if (w.length === 1) {
      // Endungen und Wortteile („-ayḏi“, „goraš-“) sind keine Wörter; „aK“ ist ein Platzhalter.
      if (/^-|-$/.test(t) || /^a\p{Lu}$/u.test(t) || !EIN_WORT.test(w[0])) return;
      einzeln.push({ genau: exakt(w[0]), ganz });
    } else if (mitWendung && w.length <= 12) wendungen.push(w);
  };

  if (f.herkunft === 'glossar' && f.art === 'wort') {
    // „obac, ëbco - abëc, abico [ʾbc I]“: Die Wurzel in eckigen Klammern ist kein Wort.
    ohneKlammern(f.latein)
      .replace(/\[[^\]]*\]/g, ' ')
      .split(/\s+[-–]\s+|[,;]/)
      .forEach((teil, i) => nimm(teil.replace(/^.*:/, ''), i === 0, !/[:+]/.test(teil)));
  } else if (f.herkunft === 'wortschatz' || f.herkunft === 'aussprache') {
    f.latein.split(/[,;:]/).forEach((teil) => nimm(teil, true));
    // Formen im Zusatz: „(f.), Pl. aḏne, aḏnoṯe“
    for (const teil of ohneKlammern(f.hinweis ?? '').split(/[,;:]/)) nimm(teil, false, false);
  } else {
    // Sätze, Beispiele und Formen der Grammatik: „ëšman/ëšmayna“ sind zwei Formen.
    for (const teil of f.latein.split(/\s*\/\s*/)) nimm(teil, true);
  }
  return { einzeln, wendungen };
}

/** Wo eine Form auf einer Grammatik-Seite steht: unter welcher Überschrift (für die Reihen der Suffixe). */
function ueberschriftVor(seite: GrammatikSeite, block: number): string {
  for (let i = block; i >= 0; i--) {
    const b = seite.bloecke[i];
    if (b?.art === 'titel') return b.text;
  }
  return '';
}

const absatzText = (seite: GrammatikSeite | undefined, block: number) => {
  const b = seite?.bloecke[block];
  return b?.art === 'absatz' ? b.teile.map((t) => t.text).join('') : '';
};

const indexe = new WeakMap<Woerterbuch, WortIndex>();

function wortIndex(wb: Woerterbuch): WortIndex {
  const da = indexe.get(wb);
  if (da) return da;
  const formen = new Map<string, Form[]>();
  const wendungen = new Map<string, Wendung[]>();
  const inSaetzen = new Map<string, Fund[]>();
  const deutsch = new Set<string>();
  const artikel = new Set<Fund>();
  let platzhalter: Fund | undefined;
  const kurze = new Map<string, Fund[]>();
  let praesens: WortIndex['praesens'];
  const suffixe: Suffix[] = [];
  const ausnahmen = new Set<string>();
  // „Diese Reihe ist auf Verwandtschaftsbezeichnungen und Körperteile beschränkt. Dazu kommen einige Ausnahmen wie xabro …“
  for (const seite of wb.seiten.values()) {
    for (const b of seite.bloecke) {
      if (b.art !== 'absatz' || !/Verwandtschaftsbezeichnungen und Körperteile/.test(b.teile.map((t) => t.text).join(''))) continue;
      for (const t of b.teile) if (t.sur) ausnahmen.add(schluessel(t.text));
    }
  }

  const dazu = <T,>(m: Map<string, T[]>, k: string, x: T) => m.set(k, [...(m.get(k) ?? []), x]);

  for (const f of wb.funde) {
    const { einzeln, wendungen: ws } = formenVon(f);
    const gesehen = new Set<string>();
    for (const e of einzeln) {
      const k = schluessel(e.genau);
      if (!k || gesehen.has(`${k}|${e.genau}`)) continue;
      gesehen.add(`${k}|${e.genau}`);
      dazu(formen, k, { fund: f, ...e });
    }
    for (const w of ws) {
      const keys = w.map(schluessel).filter(Boolean);
      if (keys.length >= 2) dazu(wendungen, keys[0], { fund: f, keys });
    }
    // Nur deutsch geschriebene Wörter: Namen wie „Abrohëm“ in einer Übersetzung sind kein Deutsch.
    for (const w of f.deutsch.split(/[^\p{L}]+/u)) if (/^[A-Za-zÄÖÜäöüß]+$/.test(w)) deutsch.add(schluessel(w));

    // Kleinwörter aus den Erklärtexten (scripts/grammatik.mjs) – erkannt an ihrer Stelle im Lehrbuch.
    const stellen = f.stellen ?? [];
    const seiteVon = (id: string) => wb.seiten.get(id);
    if (stellen.some((st) => seiteVon(st.seite)?.titel === f.deutsch && seiteVon(st.seite)?.art === 'formen')) {
      // Formentabelle „Der bestimmte Artikel“: Die Überschrift ist die Bedeutung.
      if (/^a\p{Lu}$/u.test(f.latein)) platzhalter = f;
      else artikel.add(f);
    }
    const ausListe = stellen.some((st) => /^Die häufigsten Präpositionen/.test(absatzText(seiteVon(st.seite), st.block)));
    if ((ausListe && woerterVon(f.latein)[0]?.length === 1) || f.deutsch === 'Genitivpartikel') dazu(kurze, schluessel(f.latein), f);
    if (f.deutsch === 'Präsensmarker' && /-$/.test(f.latein)) praesens = { key: schluessel(f.latein), fund: f };
    if (/^-[\p{L}\p{M}]+$/u.test(f.latein)) {
      for (const st of stellen) {
        const s = seiteVon(st.seite);
        const titel = s ? ueberschriftVor(s, st.block) : '';
        const reihe: Reihe | undefined = /allgemeine Reihe/i.test(titel)
          ? 'allgemein'
          : /eingeschränkte Reihe/i.test(titel)
            ? 'eingeschraenkt'
            : /Demonstrativ/i.test(titel)
              ? 'demonstrativ'
              : undefined;
        if (reihe) {
          suffixe.push({ fund: f, key: schluessel(f.latein), reihe });
          break;
        }
      }
    }
  }
  for (const s of wb.saetze) {
    const keys = new Set(woerterVon(s.latein).map(schluessel));
    for (const k of keys) dazu(inSaetzen, k, s);
  }
  for (const liste of wendungen.values()) liste.sort((a, b) => b.keys.length - a.keys.length);
  for (const liste of inSaetzen.values()) liste.sort((a, b) => Number(!!b.audio) - Number(!!a.audio) || a.latein.length - b.latein.length);
  // Längere Suffixe zuerst: „-ayḏan“ vor „-an“.
  suffixe.sort((a, b) => b.key.length - a.key.length);

  const index: WortIndex = { formen, wendungen, inSaetzen, deutsch, artikel, platzhalter, kurze, praesens, suffixe, ausnahmen };
  indexe.set(wb, index);
  return index;
}

// --- Für den Baukasten (Phase 4b, Schritt 4) ---------------------------------------------

/** Eine Schreibweise eines Eintrags; `ganz`: das Stichwort selbst, nicht eine Form, die der Eintrag nur aufzählt. */
export interface Schreibweise {
  fund: Fund;
  /** genau wie im Eintrag, nur klein („ëšmo“) */
  genau: string;
  ganz: boolean;
}

/** Alle einzelnen Wörter, unter denen die Einträge zu finden sind – Stichwörter, Formen aus Tabellen, aufgezählte Formen. */
export function alleSchreibweisen(wb: Woerterbuch): Schreibweise[] {
  return [...wortIndex(wb).formen.values()].flat();
}

/**
 * Steht vor `naechstes` ein bestimmter Artikel – allein („u“, „ak“) oder mit einer
 * kurzen Präposition zusammengeschrieben („bu“, „lak“; Grammatik 11)? Dann die Form
 * aus der Formentabelle „Der bestimmte Artikel“ mit ihrer Beschriftung („Sg., m.“).
 */
export function artikelVor(wb: Woerterbuch, wort: string, naechstes: string): Fund | undefined {
  const ix = wortIndex(wb);
  const k = schluessel(wort);
  const n = schluessel(naechstes);
  const form = (rest: string) => {
    // „ak kṯowe“: a + erster Konsonant des Substantivs
    if (rest.length === 2 && rest[0] === 'a' && !VOKAL.test(rest[1]) && n[0] === rest[1]) return ix.platzhalter;
    return [...ix.artikel].find((a) => schluessel(a.latein) === rest && (rest !== 'an' || VOKAL.test(n)));
  };
  // Mit Sonderzeichen ist es kein Artikel („bë“, „dë“ sind eigene Wörter).
  if (!n || istUmschrift(wort)) return undefined;
  const allein = form(k);
  if (allein) return allein;
  for (const p of ix.kurze.keys()) if (k.startsWith(p) && k.length > p.length) return form(k.slice(p.length));
  return undefined;
}

// --- Ein Wort nachschlagen ------------------------------------------------------------

/** Höchstens so viele Bedeutungen pro Wort. */
const BEDEUTUNGEN = 3;

/** Die Wörter einer Bedeutung, auch die in Klammern („er/sie ist (Kopula 3.Sg.)“ → er, sie, ist, kopula, 3, sg). */
const bedeutungsWoerter = (f: Fund) => new Set(f.deutsch.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));

/**
 * Die Einträge zu einer Schreibweise, die besten zuerst und ohne solche, die
 * nichts Neues sagen („(er, sie, es) ist“ neben „er/sie ist (Kopula 3.Sg.)“).
 */
function auswahl(formen: readonly Form[], genau: string | undefined, ohne?: Fund): Fund[] {
  const sortiert = formen
    .filter((x) => x.fund !== ohne)
    .sort(
      (a, b) =>
        Number(genau !== undefined && b.genau === genau) - Number(genau !== undefined && a.genau === genau) ||
        Number(b.ganz) - Number(a.ganz) ||
        RANG[a.fund.herkunft] - RANG[b.fund.herkunft] ||
        Number(!!b.fund.audio) - Number(!!a.fund.audio) ||
        a.fund.deutsch.length - b.fund.deutsch.length,
    );
  const gewaehlt: Fund[] = [];
  for (const { fund } of sortiert) {
    if (gewaehlt.includes(fund)) continue;
    const neu = bedeutungsWoerter(fund);
    const nichtsNeues = gewaehlt.some((g) => {
      const alt = bedeutungsWoerter(g);
      return [...neu].every((w) => alt.has(w)) && (!fund.merkmal || fund.merkmal === g.merkmal);
    });
    if (nichtsNeues) continue;
    gewaehlt.push(fund);
    if (gewaehlt.length >= BEDEUTUNGEN) break;
  }
  return gewaehlt;
}

interface Treffer {
  funde: Fund[];
  /** Nur ohne Sonderzeichen gleich („talyo“ für getipptes „ṭalyo“). */
  ungefaehr: boolean;
}

/**
 * Ein Wort genau nachschlagen. Mit Sonderzeichen getippt („ṭalyo“) zählen nur
 * Einträge mit denselben Sonderzeichen; ohne („talyo“) alle, die so aussehen.
 */
function schlageNach(ix: WortIndex, t: Pick<Token, 'genau' | 'key'>, ohne?: Fund, filter?: (x: Form) => boolean): Treffer {
  const genauGetippt = istUmschrift(t.genau);
  const passend = (liste: readonly Form[]) => (filter ? liste.filter(filter) : liste);
  let formen = passend(ix.formen.get(t.key) ?? []);
  if (!formen.length && !genauGetippt) {
    for (const v of getipptVarianten(t.key)) formen = [...formen, ...passend(ix.formen.get(v) ?? [])];
  }
  if (genauGetippt) {
    const gleich = formen.filter((x) => x.genau === t.genau);
    if (gleich.length) return { funde: auswahl(gleich, t.genau, ohne), ungefaehr: false };
    return { funde: auswahl(formen, undefined, ohne), ungefaehr: formen.length > 0 };
  }
  return { funde: auswahl(formen, t.genau, ohne), ungefaehr: false };
}

// --- Regeln aus dem Lehrbuch ------------------------------------------------------------

export type RegelArt = 'praeposition' | 'praesens' | 'possessiv' | 'demonstrativ';

export interface Regel {
  art: RegelArt;
  /** Was zusammengesetzt ist, auf Deutsch: „Präposition + Artikel“. */
  name: string;
  /** Wo das Lehrbuch das erklärt: „Grammatik 11“. */
  kapitel: string;
}

const REGELNAME: Record<RegelArt, string> = {
  praeposition: 'Präposition + Artikel',
  praesens: 'Präsensmarker + Verbform',
  possessiv: 'Substantiv + Possessivsuffix',
  demonstrativ: 'Substantiv + Demonstrativsuffix',
};

/**
 * Wo das Lehrbuch die Regel erklärt: die Grammatik-Seite des Belegs („Grammatik 11“),
 * sonst der Verweis in der Überschrift der Formentabelle („… (G.5a): Eingeschränkte Reihe“).
 */
function regel(wb: Woerterbuch, art: RegelArt, beleg: Fund, name = REGELNAME[art]): Regel {
  const stellen = beleg.stellen ?? [];
  const grammatik = stellen.map((st) => wb.seiten.get(st.seite)).find((s) => s?.art === 'grammatik');
  if (grammatik) return { art, name, kapitel: grammatik.titel };
  for (const st of stellen) {
    const seite = wb.seiten.get(st.seite);
    const verweis = seite && /\(G\.(\d+)/.exec(ueberschriftVor(seite, st.block));
    if (verweis) return { art, name, kapitel: `Grammatik ${verweis[1]}` };
  }
  return { art, name, kapitel: 'Grammatik' };
}

/** Ein Teil eines zerlegten Wortes mit seinen Bedeutungen. */
export interface Stueck {
  funde: Fund[];
}

interface Zerlegung {
  regel: Regel;
  stuecke: Stueck[];
}

/** Verben stellt das Lehrbuch mit Präsens – Präteritum vor: „coyaš, cayšo – cayëš, cayišo (cyš I)“. */
const ZITIERFORM = /\s–\s/;

/**
 * Eine Grundform des Präsens, vor die der Präsensmarker treten kann: eine Form
 * aus den Verbtabellen (nicht Präteritum, Imperativ …) oder eine der Formen vor
 * dem Strich, mit denen das Lehrbuch ein Verb vorstellt.
 */
const praesensForm = (x: Form) =>
  (!!x.fund.verb && !/Prät|Imperativ|Infinitiv|Perfekt|Partizip|Futur|Konditional|Präsens \(/.test(x.fund.merkmal ?? '')) ||
  (ZITIERFORM.test(x.fund.latein) && woerterVon(x.fund.latein.split(ZITIERFORM)[0]).some((w) => exakt(w) === x.genau));

/** Ein Wort, an das ein Suffix treten kann: keine Verbform, keine Endung, kein Satz. */
const substantiv = (x: Form) =>
  x.fund.art === 'wort' &&
  !x.fund.verb &&
  !ZITIERFORM.test(x.fund.latein) &&
  !/^-|-$/.test(x.fund.latein) &&
  x.fund.herkunft !== 'text' &&
  x.fund.herkunft !== 'einleitung';

/**
 * Die eingeschränkte Reihe ist „auf Verwandtschaftsbezeichnungen und Körperteile
 * beschränkt“, dazu einige Ausnahmen (Grammatik 5a.2). Verwandtschaft und Körper
 * sind die Themen der Lektionen 4 (Iqarṯo – Familie) und 7 (Gušmo – Körper); nur
 * Wörter aus deren Wortschatz und die genannten Ausnahmen bekommen diese Suffixe.
 * Sonst wäre z. B. jede Mehrzahl auf -e („yawme“, Tage) auch „sein …“.
 */
const LEKTIONEN_VERWANDTSCHAFT_KOERPER = [4, 7];
const eingeschraenkt = (ix: WortIndex) => (x: Form) =>
  substantiv(x) && (x.fund.lektionen.some((nr) => LEKTIONEN_VERWANDTSCHAFT_KOERPER.includes(nr)) || ix.ausnahmen.has(schluessel(x.genau)));

/** Endet das Wort auf einen Artikel nach einer kurzen Präposition („bu“, „lak“)? */
function mitArtikel(ix: WortIndex, k: string, naechstes: Token | undefined): boolean {
  for (const p of ix.kurze.keys()) {
    const rest = k.slice(p.length);
    if (!k.startsWith(p) || !rest) continue;
    if ([...ix.artikel].some((a) => schluessel(a.latein) === rest)) return true;
    if (rest.length === 2 && rest[0] === 'a' && naechstes?.key[0] === rest[1]) return true;
  }
  return false;
}

function zerlegeWort(wb: Woerterbuch, ix: WortIndex, t: Token, naechstes: Token | undefined, vorherArtikel: boolean): Zerlegung | undefined {
  const k = t.key;
  const artikelForm = (rest: string): Fund[] => {
    // „bak karme“: a + erster Konsonant des folgenden Substantivs (Formentabelle „Der bestimmte Artikel“)
    if (rest.length === 2 && rest[0] === 'a' && !VOKAL.test(rest[1]) && naechstes?.key[0] === rest[1] && ix.platzhalter) return [ix.platzhalter];
    return [...ix.artikel].filter((a) => schluessel(a.latein) === rest && (rest !== 'an' || VOKAL.test(naechstes?.key ?? '')));
  };

  // Präposition + Artikel: „lu“ = l + u, „bi“ = b + i, „dak“ = d + aK (Grammatik 11: „Die kurzen Präpositionen
  // werden mit dem Artikel zusammengeschrieben“; die Genitivpartikel d ebenso, Grammatik 9 und 10).
  for (const [p, kurz] of ix.kurze) {
    if (!k.startsWith(p) || k.length <= p.length) continue;
    const art = artikelForm(k.slice(p.length));
    if (!art.length) continue;
    const istPraeposition = kurz.some((f) => f.deutsch !== 'Genitivpartikel');
    return {
      regel: regel(wb, 'praeposition', kurz[0], istPraeposition ? REGELNAME.praeposition : 'Partikel + Artikel'),
      stuecke: [{ funde: kurz }, { funde: art }],
    };
  }

  // Präsensmarker + Grundform des Präsens: „kodomax“ = ko- + domax (Grammatik 7b).
  const p = ix.praesens;
  if (p && t.genau.startsWith(p.key) && k.length >= p.key.length + 3) {
    // Der Marker hat keine Sonderzeichen, der Rest bleibt so, wie er getippt ist.
    const rest = { genau: t.genau.slice(p.key.length), key: k.slice(p.key.length) };
    const verb = schlageNach(ix, rest, undefined, praesensForm).funde;
    if (verb.length) return { regel: regel(wb, 'praesens', p.fund), stuecke: [{ funde: [p.fund] }, { funde: verb }] };
  }

  // Substantiv + Suffix: „aṯtayḏi“ = aṯto + -ayḏi. Die Suffixe treten an das endungslose Substantiv
  // (ohne -o/-e); die allgemeine Reihe und das Demonstrativsuffix stehen immer mit Artikel, die
  // eingeschränkte Reihe nie (Grammatik 5).
  const genauGetippt = istUmschrift(t.genau);
  for (const s of ix.suffixe) {
    if (!k.endsWith(s.key) || k.length - s.key.length < 2) continue;
    if ((s.reihe === 'eingeschraenkt') === vorherArtikel) continue;
    // Mit Sonderzeichen getippt, muss auch der Stamm genau stimmen („maṯyaṯxu“ ist nicht „maṭyo“).
    const endungGenau = exakt(s.fund.latein.slice(1));
    if (genauGetippt && !t.genau.endsWith(endungGenau)) continue;
    const stamm = genauGetippt ? t.genau.slice(0, t.genau.length - endungGenau.length) : k.slice(0, k.length - s.key.length);
    const passt = s.reihe === 'eingeschraenkt' ? eingeschraenkt(ix) : substantiv;
    for (const endung of ['o', 'e', 'a']) {
      const nomen = schlageNach(ix, { genau: stamm + endung, key: schluessel(stamm + endung) }, undefined, passt).funde;
      if (!nomen.length) continue;
      const art: RegelArt = s.reihe === 'demonstrativ' ? 'demonstrativ' : 'possessiv';
      return { regel: regel(wb, art, s.fund), stuecke: [{ funde: nomen.slice(0, 2) }, { funde: [s.fund] }] };
    }
  }
  return undefined;
}

// --- Erklären ----------------------------------------------------------------------------

export type Wortteil =
  /** Ein Wort oder eine Wendung (`woerter` > 1), so in den Daten. */
  | { art: 'eintrag'; text: string; woerter: number; funde: Fund[] }
  /** Nach einer Regel des Lehrbuchs in Teile zerlegt – nicht geprüft. `beleg`: ein Lehrbuch-Eintrag, in dem das Wort genau so vorkommt. */
  | { art: 'zerlegt'; text: string; regel: Regel; stuecke: Stueck[]; beleg?: Fund }
  /** Kein Eintrag, aber in diesen Sätzen der Lektionen kommt das Wort genau so vor. */
  | { art: 'im-satz'; text: string; saetze: Fund[] }
  /** Nur ähnlich geschrieben – vielleicht ein Tippfehler. */
  | { art: 'aehnlich'; text: string; funde: Fund[] }
  | { art: 'unbekannt'; text: string };

export interface Erklaerung {
  teile: Wortteil[];
  /** Wie viele Wörter der Eingabe erklärt sind (eingetragen oder zerlegt). */
  erklaert: number;
  woerter: number;
  /** Nur die ersten `HOECHSTENS` Wörter werden erklärt. */
  gekuerzt: boolean;
}

export interface Optionen {
  /** Diesen Eintrag nicht als Erklärung nehmen (auf seiner eigenen Seite). */
  ohne?: Fund;
  /** Ganze Sätze als Wendung zulassen (in der Suche ja, auf der Seite eines Satzes nein). */
  mitSaetzen?: boolean;
  /**
   * Ähnlich geschriebene Wörter vorschlagen, wenn nichts passt (in der Suche, wo man sich
   * vertippt haben kann – nicht bei Sätzen aus dem Lehrbuch, die richtig geschrieben sind).
   */
  mitAehnlichen?: boolean;
}

/** Auch die langen Absätze der Lesetexte (bis gut 40 Wörter) werden ganz erklärt. */
const HOECHSTENS = 80;
/** Auf der Seite eines Satzes bleibt es Wort für Wort: Wendungen höchstens so lang. */
const WENDUNG_IM_SATZ = 4;
/** „Kommt so vor in“: am liebsten ein Satz mit höchstens so vielen Wörtern. */
const KURZER_SATZ = 12;

/** Passt eine Wendung an dieser Stelle? Sie darf nicht über ein Satzende hinwegreichen. */
function wendungAn(ix: WortIndex, ts: readonly Token[], i: number, opt: Optionen): Wendung | undefined {
  for (const w of ix.wendungen.get(ts[i].key) ?? []) {
    if (w.fund === opt.ohne || (!opt.mitSaetzen && (w.fund.art === 'satz' || w.keys.length > WENDUNG_IM_SATZ))) continue;
    if (i + w.keys.length > ts.length) continue;
    let ok = true;
    for (let j = 0; j < w.keys.length && ok; j++) {
      ok = ts[i + j].key === w.keys[j] && (j === w.keys.length - 1 || !ts[i + j].satzende);
    }
    if (ok) return w;
  }
  return undefined;
}

/** Kommt das Wort so in einem Eintrag vor? Mit Sonderzeichen getippt genau so, sonst ohne Sonderzeichen gleich. */
const kommtVor = (t: Token) => (f: Fund) =>
  woerterVon(f.latein).some((x) => (istUmschrift(t.genau) ? exakt(x) === t.genau : schluessel(x) === t.key));

/** Ein Lehrbuch-Eintrag, in dem das Wort genau so vorkommt – am liebsten ein kurzes Beispiel mit Aufnahme. */
function belegFuer(ix: WortIndex, t: Token, ohne?: Fund): Fund | undefined {
  const kandidaten: Fund[] = [];
  for (const liste of ix.wendungen.values()) {
    for (const w of liste) if (w.keys.includes(t.key) && w.fund !== ohne) kandidaten.push(w.fund);
  }
  return kandidaten
    .filter(kommtVor(t))
    .sort((a, b) => Number(!!b.audio) - Number(!!a.audio) || a.latein.length - b.latein.length)[0];
}

/** Ähnlich geschriebene Wörter: höchstens ein Buchstabe anders, ab 5 Buchstaben. */
function aehnliche(ix: WortIndex, t: Token, ohne?: Fund): Fund[] {
  if (t.key.length < 5) return [];
  const formen: Form[] = [];
  for (const [k, liste] of ix.formen) {
    if (Math.abs(k.length - t.key.length) > 1 || k[0] !== t.key[0]) continue;
    if (abstand(t.key, k, 1) <= 1) formen.push(...liste);
  }
  return auswahl(formen, undefined, ohne).slice(0, 2);
}

/** Erklärt einen Surayt-Text Wort für Wort. */
export function erklaere(wb: Woerterbuch, text: string, opt: Optionen = {}): Erklaerung {
  const ix = wortIndex(wb);
  const alle = tokens(text);
  const ts = alle.slice(0, HOECHSTENS);
  const teile: Wortteil[] = [];
  let erklaert = 0;
  let vorherArtikel = false;

  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    const naechstes = ts[i + 1];
    const wendung = wendungAn(ix, ts, i, opt);
    if (wendung) {
      const stueck = ts.slice(i, i + wendung.keys.length);
      teile.push({ art: 'eintrag', text: stueck.map((x) => x.text).join(' '), woerter: stueck.length, funde: [wendung.fund] });
      erklaert += stueck.length;
      i += stueck.length - 1;
      vorherArtikel = false;
      continue;
    }

    const direkt = schlageNach(ix, t, opt.ohne);
    if (direkt.funde.length && !direkt.ungefaehr) {
      teile.push({ art: 'eintrag', text: t.text, woerter: 1, funde: direkt.funde });
      erklaert++;
      // „bu“ steht als Wort im Wortschatz, enthält aber den Artikel.
      vorherArtikel = direkt.funde.some((f) => ix.artikel.has(f)) || mitArtikel(ix, t.key, naechstes);
      continue;
    }
    // „ab babe“: a + erster Konsonant des folgenden Substantivs
    if (ix.platzhalter && t.key.length === 2 && t.key[0] === 'a' && !VOKAL.test(t.key[1]) && naechstes?.key[0] === t.key[1]) {
      teile.push({ art: 'eintrag', text: t.text, woerter: 1, funde: [ix.platzhalter] });
      erklaert++;
      vorherArtikel = true;
      continue;
    }
    const zerlegt = zerlegeWort(wb, ix, t, naechstes, vorherArtikel);
    if (zerlegt) {
      teile.push({ art: 'zerlegt', text: t.text, ...zerlegt, beleg: belegFuer(ix, t, opt.ohne) });
      erklaert++;
      vorherArtikel = zerlegt.regel.art === 'praeposition';
      continue;
    }
    vorherArtikel = false;
    if (direkt.funde.length) {
      teile.push({ art: 'aehnlich', text: t.text, funde: direkt.funde });
      continue;
    }
    const saetze = (ix.inSaetzen.get(t.key) ?? []).filter((s) => s !== opt.ohne && kommtVor(t)(s));
    if (saetze.length) {
      const kurz = saetze.find((s) => woerterVon(s.latein).length <= KURZER_SATZ) ?? saetze[0];
      teile.push({ art: 'im-satz', text: t.text, saetze: [kurz] });
      continue;
    }
    const aehnlich = opt.mitAehnlichen ? aehnliche(ix, t, opt.ohne) : [];
    teile.push(aehnlich.length ? { art: 'aehnlich', text: t.text, funde: aehnlich } : { art: 'unbekannt', text: t.text });
  }
  return { teile, erklaert, woerter: ts.length, gekuerzt: alle.length > ts.length };
}

/**
 * Sieht die Eingabe nach Surayt aus? Gezählt wird Wort für Wort: Surayt ist ein
 * Wort mit Sonderzeichen der Umschrift (š, ë …) oder eines, das als Surayt-Wort
 * bekannt ist oder sich nach einer Regel zerlegen lässt; Deutsch eines aus den
 * deutschen Bedeutungen. Wörter, die es in beiden Sprachen gibt („hat“, „Saro“),
 * zählen nicht. Surayt ist es, wenn mehr Wörter nach Surayt aussehen.
 */
export function siehtNachSuraytAus(wb: Woerterbuch, text: string): boolean {
  const ix = wortIndex(wb);
  const ts = tokens(text);
  let sur = 0;
  let de = 0;
  ts.forEach((t, i) => {
    const istDeutsch = ix.deutsch.has(t.key);
    const istSurayt =
      istUmschrift(t.genau) || ix.formen.has(t.key) || ix.wendungen.has(t.key) || !!zerlegeWort(wb, ix, t, ts[i + 1], false);
    if (istSurayt && !istDeutsch) sur++;
    if (istDeutsch && !istSurayt) de++;
  });
  return sur > de;
}

/** Steht der Text als Ganzes so im Eintrag (gleiche Wörter, Satzzeichen egal)? */
export const ganzGleich = (a: string, b: string) => tokens(a).map((t) => t.key).join(' ') === tokens(b).map((t) => t.key).join(' ');
