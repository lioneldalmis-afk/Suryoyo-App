// Übersetzer (Fahrplan, Phase 4 und 4b; bis November 2026 „Wörterbuch“):
// durchsucht den Wortschatz, die Sätze aus Dialogen und Lesetexten, das
// Glossar aller Lektionen und die Beispiele und Formen aus Grammatik,
// Verb- und Formentabellen – auf Deutsch und auf Surayt.
//
// Die Suche ist tolerant: Sonderzeichen sind egal („slomo“ findet „šlomo“),
// „sch“ oder „sh“ gehen für „š“, Wortteile und kleine Tippfehler werden
// erkannt. Gefunden wird aber nur, was in den Daten steht – hier wird nichts
// zusammengesetzt, übersetzt oder geraten. Zusammensetzen darf nur der
// Baukasten (Phase 4b), und was er baut, trägt immer das Schild
// „Zusammengesetzt – nicht geprüft“.

import { useEffect, useState } from 'react';
import { alleLektionen, NUR_MIT_BILD } from '../data';
import type { Eintrag, Glossar, Grammatik, GrammatikEintrag, GrammatikSeite, GrossesGlossar, Lektion, Quelle } from '../types';
import { grundformen, synonymeVon } from './deutsch';
import { fold, kern, woerter, zerlege } from './text';

/** Woher ein Fund in den Daten stammt; `formen` sind Verbkonjugation (Surcofo) und Formentabellen. */
export type Herkunft = 'wortschatz' | 'aussprache' | 'text' | 'einleitung' | 'glossar' | 'grammatik' | 'formen';

/** Wo ein Eintrag in Grammatik, Verb- oder Formentabellen steht. */
export interface Stelle {
  /** Kennung des Grammatik-Eintrags */
  id: string;
  /** Kapitelnummer der Seite, z. B. „1.4.3“ */
  seite: string;
  /** Block (Tabelle oder Absatz) auf der Seite */
  block: number;
  merkmal?: string;
  verb?: string;
}

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
  /** Wo derselbe Eintrag in Grammatik, Verb- oder Formentabellen steht. */
  stellen?: Stelle[];
  /** Beschriftung aus der Tabelle, z. B. „Präsens, Sg., 1. f.“ */
  merkmal?: string;
  /** Bei Verbformen das Verb, wie es das Lehrbuch vorstellt („goraš – grëšle“). */
  verb?: string;
  /** Kurz, woher aus der Grammatik: „Grammatik 4“, „Verbtabelle“, „Pronomina“. */
  tabelle?: string;
}

/**
 * Wie sicher eine Übersetzung ist – das Schild an jedem Treffer (Fahrplan, Phase 4b):
 * `lehrbuch` steht wörtlich in Šlomo Surayt, `muttersprachler` hat ein Muttersprachler
 * eingereicht oder bestätigt (und ein Mensch vor der Aufnahme geprüft),
 * `zusammengesetzt` hat der Baukasten nach Lehrbuch-Regeln gebaut und niemand geprüft.
 */
export type Stufe = 'lehrbuch' | 'muttersprachler' | 'zusammengesetzt';

/** Einträge aus den Daten sind immer geprüft; Zusammengesetztes steht nie in den Daten. */
export const stufeVon = (f: Pick<Fund, 'quelle'>): Stufe => (f.quelle === 'community' ? 'muttersprachler' : 'lehrbuch');

/** Ein durchsuchbarer Teil eines Fundes, schon zerlegt. */
interface Feld {
  woerter: string[];
  ganz: string;
  sprache: 'sur' | 'de';
  /** Zusätze (Pluralformen, Klammern) zählen weniger als das Stichwort selbst. */
  gewicht: number;
  /** Deutsche Verbform mit Person („ich schlafen“): Wortstämme zählen („schlafe“, „schläfst“ → „schlaf“). */
  verb?: true;
}

export interface Woerterbuch {
  funde: readonly Fund[];
  /** Auch zusammengeführte Doppelgänger sind über ihre Kennung zu finden. */
  nachId: ReadonlyMap<string, Fund>;
  /** Alle Sätze aus Dialogen, Lesetexten und Einleitungen – für Beispielsätze. */
  saetze: readonly Fund[];
  /** Ist das Glossar schon dabei? */
  mitGlossar: boolean;
  /** Sind Grammatik, Verb- und Formentabellen schon dabei? */
  mitGrammatik: boolean;
  /** Ist das große Glossar (Teil 5) schon dabei? */
  mitGrossemGlossar: boolean;
  /**
   * Wortliste „Deutsch > Surayt“ des großen Glossars: deutsches Stichwort (klein) →
   * Grundformen auf Surayt, wie sie dort stehen („lang“ → yarixo).
   */
  wortliste: ReadonlyMap<string, string[]>;
  /** Die Seiten der Grammatik nach Kapitelnummer – für die Anzeige der Tabellen. */
  seiten: ReadonlyMap<string, GrammatikSeite>;
  /** Alle Formen eines Verbs („goraš – grëšle“ → Funde), in der Reihenfolge der Tabellen. */
  gruppen: ReadonlyMap<string, Fund[]>;
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
export const stichwort = (latein: string) => latein.split(/\s*[,;([]/)[0].trim();

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
  // Wortteile aus der Grammatik („goraš-“, „-ayḏi“) sind keine ganzen Wörter und zählen etwas weniger.
  const teil = /(^-|-$|-,)/.test(f.latein);
  const felder = [
    ...feld(kopf, 'sur', teil ? 0.85 : 1),
    ...feld(rest, 'sur', 0.7),
    ...feld(f.deutsch.replace(/\([^)]*\)/g, ' '), 'de', teil ? 0.6 : 1),
    ...feld(klammern(f.deutsch), 'de', 0.6),
  ];
  // Verbformen: „ich schlafe“ findet die Form für „ich“ (Person aus der Beschriftung der Tabelle).
  const wer = f.verb ? person(f.merkmal) : undefined;
  if (wer) for (const x of feld(`${wer.pronomen} ${f.deutsch.replace(/\([^)]*\)/g, ' ')}`, 'de', 1)) felder.push({ ...x, verb: true });
  return felder;
}

// --- Person einer Verbform -------------------------------------------------------

/**
 * Welche Person eine Verbform hat, gelesen aus der Beschriftung der Tabelle
 * („Präsens, Sg., 1. f.“ → ich, weiblich). Fehlt die Zahl oder sind es zwei
 * Personen (Subjekt und Objekt), bleibt es offen.
 */
export function person(merkmal: string | undefined): { pronomen: string; klar: string } | undefined {
  if (!merkmal || /Subjekt|Objekt/.test(merkmal)) return undefined;
  const personen = [...new Set([...merkmal.matchAll(/(?:^|[\s,/])([123])\.(?=\s|,|$)/g)].map((m) => m[1]))];
  const sg = /\b(?:Sg|sg)\.|Singular/.test(merkmal);
  const pl = /\b(?:Pl|pl)\.|Plural/.test(merkmal);
  if (personen.length !== 1 || sg === pl) return undefined;
  const geschlechter = new Set([...merkmal.matchAll(/(?:\(|\b)([mf])\.(?:\))?(?!\s?(?:Sg|Pl))/g)].map((m) => m[1]));
  const g = geschlechter.size === 1 ? [...geschlechter][0] : undefined;
  const mw = g === 'm' ? ', männlich' : g === 'f' ? ', weiblich' : '';
  switch (`${personen[0]}${sg ? 's' : 'p'}`) {
    case '1s':
      return { pronomen: 'ich', klar: `ich${mw}` };
    case '2s':
      return { pronomen: 'du', klar: `du${mw}` };
    case '3s':
      return g === 'm'
        ? { pronomen: 'er', klar: 'er' }
        : g === 'f'
          ? { pronomen: 'sie', klar: 'sie (eine Person)' }
          : { pronomen: 'er sie es', klar: 'er, sie, es' };
    case '1p':
      return { pronomen: 'wir', klar: 'wir' };
    case '2p':
      return { pronomen: 'ihr', klar: 'ihr' };
    default:
      return { pronomen: 'sie', klar: 'sie (mehrere)' };
  }
}

/**
 * Die Beschriftungen gleicher Formen zusammenfassen: „Präsens, Sg., 2. m.“ und
 * „Präsens, Sg., 2. f.“ → „Präsens, Sg., 2. m. / 2. f.“
 */
export function merkmaleZusammen(merkmale: readonly string[]): string | undefined {
  const liste = [...new Set(merkmale.filter(Boolean))];
  if (liste.length <= 1) return liste[0];
  const teile = liste.map((m) => m.split(', '));
  let gleich = 0;
  while (teile.every((t) => t.length > gleich + 1 && t[gleich] === teile[0][gleich])) gleich++;
  const vorne = teile[0].slice(0, gleich);
  return [...vorne, teile.map((t) => t.slice(gleich).join(', ')).join(' / ')].join(', ');
}

// --- Wörterbuch aufbauen -------------------------------------------------------

/** Welcher von zwei gleichen Einträgen gezeigt wird: Wortschatz vor Beispielen, Sätzen, Grammatik, Glossar und Formentabellen. */
export const RANG: Record<Herkunft, number> = { wortschatz: 0, aussprache: 1, text: 2, einleitung: 2, grammatik: 3, glossar: 4, formen: 5 };

/**
 * Die Stelle, nach der ein Fund beschriftet und gezeigt wird: Verbformen nach
 * der Verb- oder Formentabelle (dort stehen alle Personen und Zeitformen
 * einheitlich beschriftet), alles andere nach der Grammatik der Lektion (dort
 * mit Aufnahmen und Erklärung).
 */
export function hauptStelle(f: Pick<Fund, 'stellen'>, seiten: ReadonlyMap<string, GrammatikSeite>): Stelle | undefined {
  const stellen = f.stellen ?? [];
  const verb = stellen.some((st) => st.verb);
  const reihe: GrammatikSeite['art'][] = verb ? ['verben', 'formen', 'grammatik'] : ['grammatik', 'verben', 'formen'];
  const rang = (st: Stelle) => reihe.indexOf(seiten.get(st.seite)?.art ?? 'grammatik');
  return [...stellen].sort((a, b) => rang(a) - rang(b))[0];
}

/** Beschriftung und Verb eines Fundes aus seinen Stellen (siehe `hauptStelle`). */
function ausStellen(f: Fund, seiten: ReadonlyMap<string, GrammatikSeite>): Fund {
  const stellen = f.stellen ?? [];
  const beste = hauptStelle(f, seiten);
  if (!beste) return f;
  const dort = stellen.filter((st) => st.seite === beste.seite && st.block === beste.block);
  const merkmal = merkmaleZusammen(dort.map((st) => st.merkmal ?? ''));
  const verb = stellen.find((st) => st.verb)?.verb;
  const neu: Fund = { ...f };
  const seite = seiten.get(beste.seite);
  if (seite) neu.tabelle = seite.art === 'verben' ? 'Verbtabelle' : seite.titel;
  if (merkmal) neu.merkmal = merkmal;
  else delete neu.merkmal;
  if (verb) neu.verb = verb;
  return neu;
}

function ausGrammatik(e: GrammatikEintrag, seite: GrammatikSeite, seiten: ReadonlyMap<string, GrammatikSeite>): Fund {
  const stelle: Stelle = { id: e.id, seite: seite.id, block: e.block };
  if (e.merkmal) stelle.merkmal = e.merkmal;
  if (e.verb) stelle.verb = e.verb;
  return ausStellen(
    {
      id: e.id,
      latein: e.latein,
      ...(e.hinweis ? { hinweis: e.hinweis } : {}),
      deutsch: e.deutsch,
      ...(e.audio ? { audio: e.audio } : {}),
      art: e.art,
      quelle: e.quelle,
      herkunft: seite.art === 'grammatik' ? 'grammatik' : 'formen',
      ...(e.lektion ? { lektion: e.lektion } : {}),
      lektionen: e.lektion ? [e.lektion] : [],
      stellen: [stelle],
    },
    seiten,
  );
}

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

/** „(L.4)“, „L.10.4“, „G.20“ → Lektion 4, 10, 20; „Q.4,43“ (Lesestück) → keine. */
const lektionAusVerweis = (v: string) => {
  const m = /^(?:L|G)\.?\s?(\d+)/.exec(v);
  return m ? Number(m[1]) : undefined;
};

/** Steckt im Kopf mehr als das Stichwort – Geschlecht, Mehrzahl, weibliche Form, Wurzel? */
const hatZusatz = (latein: string) => /[,([]/.test(latein);

export function baueWoerterbuch(lektionen: readonly Lektion[], glossar?: Glossar, grammatik?: Grammatik, gross?: GrossesGlossar): Woerterbuch {
  const seiten = new Map((grammatik?.seiten ?? []).map((s) => [s.id, s]));
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
    let zusammen: Fund = { ...sieger, audio: sieger.audio ?? da.audio ?? f.audio, lektionen: lektionenZusammen };
    if (!zusammen.audio) delete zusammen.audio;
    const stellen = [...(da.stellen ?? []), ...(f.stellen ?? [])];
    if (stellen.length) zusammen = ausStellen({ ...zusammen, stellen }, seiten);
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

  // Grammatik vor dem Glossar: Glossar-Wendungen, die eine Grammatik-Form nur wiederholen,
  // fallen dann weg, und das Glossar findet dort weitere Aufnahmen.
  for (const seite of grammatik?.seiten ?? []) {
    for (const e of seite.eintraege) aufnehmen(ausGrammatik(e, seite, seiten));
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

  // Das große Glossar (Teil 5): Haupt- und Untereinträge, dazu jedes Beispiel als eigener Eintrag.
  // Was dort steht, ist zum größten Teil schon da (Wortschatz, Glossar A); doppelt wird nichts.
  if (gross) {
    const nachWort = new Map<string, Fund[]>();
    for (const f of funde) {
      const k = genau(f.art === 'wort' ? stichwort(f.latein) : f.latein).join(' ');
      nachWort.set(k, [...(nachWort.get(k) ?? []), f]);
    }
    const ton = (latein: string, lektionenHier: number[]) => {
      const gleiche = nachWort.get(genau(latein).join(' ')) ?? [];
      return (gleiche.find((f) => f.audio && lektionenHier.includes(f.lektion ?? 0)) ?? gleiche.find((f) => f.audio))?.audio;
    };
    const neu = (id: string, latein: string, deutsch: string, verweise: readonly string[]) => {
      const lektionenHier = [...new Set(verweise.map(lektionAusVerweis).filter((n): n is number => n !== undefined))].sort((a, b) => a - b);
      const audio = ton(latein, lektionenHier) ?? ton(stichwort(latein), lektionenHier);
      aufnehmen({
        id,
        latein,
        deutsch,
        ...(audio ? { audio } : {}),
        art: genau(latein).length > 3 && !/[,;[]/.test(latein) ? 'satz' : 'wort',
        quelle: 'lehrbuch',
        herkunft: 'glossar',
        ...(lektionenHier.length ? { lektion: lektionenHier[0] } : {}),
        lektionen: lektionenHier,
      });
    };
    for (const e of gross.eintraege) {
      const deutsch = e.sinne.map((x) => x.deutsch).filter(Boolean).join('; ');
      if (deutsch) {
        // Ein Stichwort ohne Zusätze, das es mit dieser Bedeutung schon gibt, braucht es nicht noch einmal.
        const gleiche = nachWort.get(genau(stichwort(e.latein)).join(' ')) ?? [];
        const schonDa = gleiche.find((f) => abgedeckt(deutsch, f.deutsch) && (!hatZusatz(e.latein) || genau(f.latein).join(' ') === genau(e.latein).join(' ')));
        if (!schonDa) neu(e.id, e.latein, deutsch, e.verweise ?? []);
      }
      e.sinne.forEach((x, i) =>
        x.beispiele.forEach((b, k) => {
          if (b.latein && b.deutsch) neu(`${e.id}.${i + 1}.${k + 1}`, b.latein, b.deutsch, b.verweis ? [b.verweis] : []);
        }),
      );
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

  // Alle Formen eines Verbs, damit die Trefferliste nicht von 18 gleichbedeutenden Formen überläuft.
  const gruppen = new Map<string, Fund[]>();
  for (const f of funde) {
    if (f.verb) gruppen.set(f.verb, [...(gruppen.get(f.verb) ?? []), f]);
  }

  return {
    funde,
    nachId,
    // Beispielsätze: aus den Texten der Lektionen und die Beispiele der Grammatik
    saetze: funde.filter((f) => f.herkunft === 'text' || f.herkunft === 'einleitung' || (f.herkunft === 'grammatik' && f.art === 'satz')),
    mitGlossar: !!glossar,
    mitGrammatik: !!grammatik,
    mitGrossemGlossar: !!gross,
    wortliste: wortlisteAus(gross),
    seiten,
    gruppen,
    zwilling,
    imGlossar,
    felder: new Map(funde.map((f) => [f, felderVon(f)])),
  };
}

/** Die Wortliste „Deutsch > Surayt“: „laufen“ → rohaṭ, malax, mhalax; „sich langweilen“ steht unter „sich langweilen“. */
function wortlisteAus(gross?: GrossesGlossar): Map<string, string[]> {
  const aus = new Map<string, string[]>();
  for (const z of gross?.wortliste ?? []) {
    const k = z.deutsch.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (k) aus.set(k, [...new Set([...(aus.get(k) ?? []), ...z.latein])]);
  }
  return aus;
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

/** Wie ein Surayt-Wort ohne Sonderzeichen getippt sein könnte: „schlomo“ → „slomo“, „shlomo“ → „slomo“ (Eingabe schon gefaltet). */
export const getipptVarianten = (gefaltet: string) =>
  [...new Set([ersetze(gefaltet, DEUTSCH_GETIPPT), ersetze(gefaltet, ENGLISCH_GETIPPT)])].filter((v) => v !== gefaltet);

/** Artikel müssen nicht gefunden werden: „der Vater“ findet auch „Vater“. */
const FUELLWOERTER = new Set(['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines']);

/** Enthält die Suche Buchstaben, die es nur in der Umschrift gibt (š, ṭ, ë …)? Dann ist sie Surayt. */
export const istUmschrift = (text: string) =>
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

/** Deutsche Verbendungen: „schlafe“, „schläfst“, „schläft“, „schlafen“ haben denselben Stamm „schlaf“. */
const stamm = (w: string) => (w.length >= 4 ? w.replace(/(?:est|en|st|et|e|n|t)$/, '') : w);
const gleicherStamm = (a: string, b: string) => {
  const x = stamm(a);
  return x.length >= 3 && x === stamm(b);
};

/** Fragt die Suche nach einer Person („ich schlafe“)? Dann zählen die Formen für diese Person. */
const PRONOMEN = /(?:^|[^a-z])(ich|du|er|sie|es|wir|ihr)(?:$|[^a-z])/;

/** Die Grundform eines Verbs ist die erste Form, mit der es das Lehrbuch vorstellt („goraš“ in „goraš – grëšle“). */
export const istGrundform = (f: Fund) => !!f.verb && f.verb.split(/\s+[–-]\s+/)[0] === f.latein;

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
      const p = Math.max(passt(gesucht, wort), f.verb && gleicherStamm(gesucht, wort) ? 0.9 : 0);
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
    if (best.wert >= MINDESTENS) {
      // Die Grundform eines Verbs steht vor seinen übrigen Formen.
      const bonus = (fund.audio ? 0.02 : 0) + (istGrundform(fund) ? 0.005 : 0);
      treffer.push({ fund, wert: best.wert + bonus, ungefaehr: best.ungefaehr });
    }
  }
  const bester = Math.max(0, ...treffer.map((t) => t.wert));
  const gefunden = new Set(treffer.map((t) => t.fund));
  const ausTabelle = (f: Fund) => f.herkunft === 'grammatik' || f.herkunft === 'formen';
  const sortiert = treffer
    .filter((t) => t.wert >= bester * ABSTAND_ZUM_BESTEN)
    // Steht das Wort selbst schon da, braucht es seinen Glossar-Zwilling nicht auch noch.
    .filter((t) => !gefunden.has(wb.zwilling.get(t.fund)!))
    .sort(
      (a, b) =>
        b.wert - a.wert ||
        Number(a.fund.art === 'satz') - Number(b.fund.art === 'satz') ||
        RANG[a.fund.herkunft] - RANG[b.fund.herkunft] ||
        // Formen aus Tabellen bleiben in der Reihenfolge der Tabelle.
        (ausTabelle(a.fund) && ausTabelle(b.fund) ? 0 : a.fund.latein.length - b.fund.latein.length) ||
        (a.fund.lektion ?? 99) - (b.fund.lektion ?? 99),
    );
  // Von einem Verb nur die Grundform – außer die Suche nennt eine Person, dann deren Formen.
  const mitPerson = PRONOMEN.test(roh);
  const proVerb = new Map<string, number>();
  return sortiert.filter((t) => {
    if (!t.fund.verb) return true;
    const n = proVerb.get(t.fund.verb) ?? 0;
    if (n >= (mitPerson ? 6 : 1)) return false;
    proVerb.set(t.fund.verb, n + 1);
    return true;
  });
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
export function einzelneWoerter(wb: Woerterbuch, anfrage: string): { wort: string; funde: Fund[]; als?: string }[] {
  const s = suchwort(falte(anfrage), 1);
  if (!s || s.optional.filter((o) => !o).length < 2) return [];
  const original = anfrage.split(/[\s,.;:!?]+/).filter(Boolean);
  const gesehen = new Set<string>();
  const gut = (w: string) =>
    bewerte(wb, w)
      .filter((t) => t.fund.art === 'wort' && !t.ungefaehr && t.wert >= 0.9)
      .slice(0, 2)
      .map((t) => t.fund);
  return s.woerter
    .filter((w, k) => !s.optional[k] && !gesehen.has(w) && gesehen.add(w))
    .slice(0, 8)
    .map((w) => {
      const wort = original.find((o) => falte(o).includes(w)) ?? w;
      const funde = gut(w);
      if (funde.length) return { wort, funde };
      // Nicht so im Übersetzer: die Grundform („gespielt“ → spielen) oder ein gleichbedeutendes Wort (deutsch.ts)
      const ersatz = [...grundformen(wort), ...synonymeVon(wort), ...grundformen(wort).flatMap(synonymeVon)];
      for (const als of ersatz) {
        const da = gut(falte(als));
        if (da.length) return { wort, funde: da, als };
      }
      return { wort, funde: [] };
    })
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

// --- Beschreibungen für die Oberfläche -----------------------------------------------

/** Steht der Fund (vor allem) in einer Tabelle der Grammatik, Verb- oder Formentabellen? */
export const ausTabelle = (f: Fund) => f.herkunft === 'grammatik' || f.herkunft === 'formen';

/** „Präsens, Sg., 1. f. · ich, weiblich“: die Beschriftung der Tabelle, bei Verbformen mit der Person in Worten. */
export function merkmalText(f: Fund): string {
  const wer = f.verb ? person(f.merkmal) : undefined;
  return [f.merkmal, wer?.klar].filter(Boolean).join(' · ');
}

/** „Lektion 3“, „Satz · Lektion 4“, „Glossar“, „Grammatik 4“, „Verbtabelle“ … (das Schild davor sagt, ob Lehrbuch oder Muttersprachler) */
export function herkunftKurz(f: Fund): string {
  const teile: string[] = [];
  if (f.art === 'satz') teile.push('Satz');
  if (f.herkunft === 'glossar') teile.push('Glossar');
  if (ausTabelle(f) && f.tabelle) {
    // „Der bestimmte Artikel“ ist zugleich Bedeutung und Name der Tabelle – nicht zweimal.
    teile.push(f.tabelle === f.deutsch ? 'Formentabellen' : f.tabelle);
    return teile.join(' · ');
  }
  if (f.lektionen.length) {
    const nr = f.lektionen.slice(0, 3);
    teile.push(`Lektion ${nr.join(', ')}${f.lektionen.length > 3 ? ' …' : ''}`);
  }
  return teile.join(' · ');
}

// --- Laden ---------------------------------------------------------------------

// Glossar und Grammatik sind groß und werden erst geladen, wenn man den
// Übersetzer öffnet. Sie stecken trotzdem in der App und sind offline da (der
// Service Worker legt alle Teile der App beim Installieren ab).
let ohneZusatz: Woerterbuch | null = null;
let mitZusatz: Woerterbuch | null = null;
let laden: Promise<Woerterbuch> | null = null;

const grundbestand = () => (ohneZusatz ??= baueWoerterbuch(alleLektionen));

function ladeZusatz(): Promise<Woerterbuch> {
  laden ??= Promise.all([import('../data/glossar-a.json'), import('../data/grammatik.json'), import('../data/glossar.json')])
    .then(
      ([g, gr, gg]) =>
        (mitZusatz = baueWoerterbuch(alleLektionen, g.default as Glossar, gr.default as unknown as Grammatik, gg.default as unknown as GrossesGlossar)),
    )
    .catch(() => {
      laden = null; // beim nächsten Öffnen nochmal versuchen
      return grundbestand();
    });
  return laden;
}

/** Das Wörterbuch für die Oberfläche: sofort mit den Lektionen, kurz danach auch mit Glossar und Grammatik. */
export function useWoerterbuch(): Woerterbuch {
  const [wb, setWb] = useState(() => mitZusatz ?? grundbestand());
  useEffect(() => {
    if (mitZusatz) return;
    let aktiv = true;
    void ladeZusatz().then((neu) => {
      if (aktiv) setWb(neu);
    });
    return () => {
      aktiv = false;
    };
  }, []);
  return wb;
}
