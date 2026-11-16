// Übungen werden automatisch aus Wortschatz und Dialog erzeugt – eine neue
// Lektion braucht nur Daten, keine eigens programmierten Aufgaben.

import type { Eintrag, Hoerpaar, Lektion } from '../types';
import { geuebt, stufe, type Fortschritt } from './progress';
import { bausteineAus, fold, kern, tokens, woerter, zerlege } from './text';

/** Freie Übungsarten einer Lektion. „gemischt“ führt zur nächsten Einheit. */
export type Uebungsart = 'gemischt' | 'karten' | 'wahl' | 'hoeren' | 'paare' | 'saetze' | 'sprechen';
export type Richtung = 'sur-de' | 'de-sur';

export interface Baustein {
  id: number;
  text: string;
}

export type Schritt =
  /** Karteikarte: hören → aufdecken. `neu` = Wort wird zum ersten Mal vorgestellt. */
  | { typ: 'karte'; eintrag: Eintrag; neu: boolean }
  /** Multiple Choice, Surayt → Deutsch oder umgekehrt. */
  | { typ: 'wahl'; eintrag: Eintrag; richtung: Richtung; optionen: Eintrag[] }
  /** Hören & Auswählen: nur Audio, Bedeutung wählen. */
  | { typ: 'hoeren'; eintrag: Eintrag; optionen: Eintrag[] }
  /** Hörpaar: eins von zwei fast gleich klingenden Wörtern hören und erkennen. */
  | { typ: 'paar'; eintrag: Eintrag; optionen: Eintrag[]; laute: string }
  /**
   * Satz bauen: die Wörter des Satzes (und ein paar zu viel) in die richtige
   * Reihenfolge tippen. `nachGehoer`: Der Satz wird vorgespielt statt auf Deutsch gezeigt.
   */
  | { typ: 'bauen'; eintrag: Eintrag; bausteine: Baustein[]; loesung: string[]; nachGehoer: boolean }
  /** Lückentext: In `teile` (die Wörter des Satzes) fehlt das Wort an Stelle `luecke`. */
  | { typ: 'luecke'; eintrag: Eintrag; teile: string[]; luecke: number; loesung: string; optionen: string[] }
  /** Nachsprechen: Original hören, sich selbst aufnehmen, vergleichen und selbst bewerten. */
  | { typ: 'sprechen'; eintrag: Eintrag };

export type Zufall = () => number;

/** Woher die Antwortmöglichkeiten für einen Eintrag kommen: in der Regel aus seiner Lektion. */
export type VorratFuer = (e: Eintrag) => readonly Eintrag[];

const FREI_UEBEN = 10;
const FREI_SPRECHEN = 6;
/** Längere Sätze lassen sich auf dem Handy nicht mehr gut aus Bausteinen bauen – dafür gibt es den Lückentext. */
export const MAX_BAUSTEINE = 9;

export function mische<T>(liste: readonly T[], zufall: Zufall): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const waehleAus = <T>(liste: readonly T[], zufall: Zufall): T => liste[Math.floor(zufall() * liste.length)];

/**
 * Reihenfolge, in der eine Lektion gelernt wird: die Wörter so, wie sie im
 * Dialog oder Lesetext vorkommen, und jede Textzeile gleich nach ihren Wörtern.
 * Wörter, die im Text nicht vorkommen, stehen am Ende.
 */
export function lernreihenfolge(lektion: Lektion): Eintrag[] {
  let reihenfolge = gemerkt.get(lektion);
  if (!reihenfolge) gemerkt.set(lektion, (reihenfolge = berechneReihenfolge(lektion)));
  return reihenfolge;
}

const gemerkt = new WeakMap<Lektion, Eintrag[]>();

function berechneReihenfolge(lektion: Lektion): Eintrag[] {
  const zeilen = lektion.text.map((z) => tokens(z.latein));
  const erstesVorkommen = (wort: Eintrag): [number, number] | null => {
    const gesucht = tokens(wort.latein);
    for (let z = 0; z < zeilen.length; z++) {
      const zeile = zeilen[z];
      for (let i = 0; i + gesucht.length <= zeile.length; i++) {
        if (gesucht.every((t, k) => zeile[i + k] === t)) return [z, i];
      }
    }
    return null;
  };

  const imText: { eintrag: Eintrag; zeile: number; pos: number }[] = [];
  const rest: Eintrag[] = [];
  for (const wort of lektion.wortschatz) {
    const ort = erstesVorkommen(wort);
    if (ort) imText.push({ eintrag: wort, zeile: ort[0], pos: ort[1] });
    else rest.push(wort);
  }
  lektion.text.forEach((zeile, z) => imText.push({ eintrag: zeile, zeile: z, pos: Infinity }));
  imText.sort((a, b) => a.zeile - b.zeile || a.pos - b.pos);
  return [...imText.map((x) => x.eintrag), ...rest];
}

// --- Die einzelnen Aufgaben --------------------------------------------------

/**
 * Antwortmöglichkeiten: der richtige Eintrag plus falsche derselben Art.
 * Zum Verwechseln ähnliche Einträge („gut (m.Sg.)“ / „gut (pl.)“) kommen nie
 * zusammen vor – das wäre für den Anfang unfair.
 */
export function optionenFuer(ziel: Eintrag, vorrat: readonly Eintrag[], zufall: Zufall): Eintrag[] {
  const anzahl = ziel.art === 'satz' ? 3 : 4;
  const bedeutungen = new Set([kern(ziel.deutsch)]);
  const formen = new Set([fold(ziel.latein)]);
  const falsche: Eintrag[] = [];
  for (const e of mische(vorrat, zufall)) {
    if (falsche.length === anzahl - 1) break;
    if (e.art !== ziel.art || bedeutungen.has(kern(e.deutsch)) || formen.has(fold(e.latein))) continue;
    bedeutungen.add(kern(e.deutsch));
    formen.add(fold(e.latein));
    falsche.push(e);
  }
  return mische([ziel, ...falsche], zufall);
}

export function wahl(eintrag: Eintrag, richtung: Richtung, vorrat: readonly Eintrag[], zufall: Zufall): Schritt {
  return { typ: 'wahl', eintrag, richtung, optionen: optionenFuer(eintrag, vorrat, zufall) };
}

export function hoeren(eintrag: Eintrag, vorrat: readonly Eintrag[], zufall: Zufall): Schritt {
  // Ohne Audio geht Hören nicht – dann wird andersherum abgefragt.
  if (!eintrag.audio) return wahl(eintrag, 'de-sur', vorrat, zufall);
  return { typ: 'hoeren', eintrag, optionen: optionenFuer(eintrag, vorrat, zufall) };
}

/** Einzelne Wörter (ohne Leerzeichen) aus dem Wortschatz – Material für Bausteine und Lücken. */
function einzelwoerter(vorrat: readonly Eintrag[]): string[] {
  return vorrat
    .filter((e) => e.art === 'wort')
    .map((e) => bausteineAus(e.latein))
    .filter((b) => b.length === 1)
    .map((b) => b[0]);
}

/**
 * Füllwörter, die nicht in den Satz gehören: erst Wörter aus dem Wortschatz,
 * dann aus anderen Sätzen. Nichts, was einem Wort im Satz zum Verwechseln ähnlich ist.
 */
function fuellwoerter(
  satz: Eintrag,
  vorrat: readonly Eintrag[],
  anzahl: number,
  zufall: Zufall,
  passt: (wort: string) => boolean = () => true,
): string[] {
  const vergeben = new Set(bausteineAus(satz.latein).map(fold));
  const andereSaetze = vorrat.filter((e) => e.art === 'satz' && e.id !== satz.id).flatMap((e) => bausteineAus(e.latein));
  const gewaehlt: string[] = [];
  for (const wort of [...mische(einzelwoerter(vorrat), zufall), ...mische(andereSaetze, zufall)]) {
    if (gewaehlt.length === anzahl) break;
    if (vergeben.has(fold(wort)) || !passt(wort)) continue;
    vergeben.add(fold(wort));
    gewaehlt.push(wort);
  }
  return gewaehlt;
}

/** Satz bauen – nur für Sätze mit 2 bis `MAX_BAUSTEINE` Wörtern, sonst `null`. */
export function bauen(satz: Eintrag, vorrat: readonly Eintrag[], zufall: Zufall, nachGehoer = false): Schritt | null {
  const loesung = bausteineAus(satz.latein);
  if (loesung.length < 2 || loesung.length > MAX_BAUSTEINE) return null;
  const extra = fuellwoerter(satz, vorrat, loesung.length <= 4 ? 2 : 3, zufall);
  const bausteine = mische(
    [...loesung, ...extra].map((text, id) => ({ id, text })),
    zufall,
  );
  return { typ: 'bauen', eintrag: satz, bausteine, loesung, nachGehoer: nachGehoer && !!satz.audio };
}

const kleinGeschrieben = (wort: string) => wort.length >= 2 && /^\p{Ll}/u.test(wort);

/**
 * Lückentext: ein Wort des Satzes fehlt, vier stehen zur Wahl. Bevorzugt fehlt
 * ein Wort aus `bevorzugt` (z. B. ein gerade gelerntes). Großgeschriebene Wörter
 * (Namen, Satzanfänge) fehlen nie – das würde die Lösung verraten.
 */
export function luecke(
  satz: Eintrag,
  vorrat: readonly Eintrag[],
  zufall: Zufall,
  bevorzugt: readonly Eintrag[] = [],
): Schritt | null {
  const teile = woerter(satz.latein);
  if (teile.length < 3) return null;
  const kerne = teile.map((t) => zerlege(t).kern);
  const moeglich = kerne.map((_, i) => i).filter((i) => kleinGeschrieben(kerne[i]));
  if (moeglich.length === 0) return null;

  const neu = new Set(einzelwoerter(bevorzugt).map(fold));
  const bekannt = new Set(einzelwoerter(vorrat).map(fold));
  const auswahl = [
    moeglich.filter((i) => neu.has(fold(kerne[i]))),
    moeglich.filter((i) => bekannt.has(fold(kerne[i]))),
    moeglich,
  ].find((liste) => liste.length > 0)!;
  const stelle = waehleAus(auswahl, zufall);
  const loesung = kerne[stelle];

  const falsche = fuellwoerter(satz, vorrat, 3, zufall, kleinGeschrieben);
  if (falsche.length < 2) return null;
  return { typ: 'luecke', eintrag: satz, teile, luecke: stelle, loesung, optionen: mische([loesung, ...falsche], zufall) };
}

/** Eine Übung zu einem Satz: bauen, Lücke füllen oder hören – je nachdem, was der Satz hergibt. */
function satzUebung(satz: Eintrag, vorrat: readonly Eintrag[], zufall: Zufall, bevorzugt: readonly Eintrag[]): Schritt {
  const wurf = zufall();
  const moeglich = [
    bauen(satz, vorrat, zufall, wurf < 0.25),
    luecke(satz, vorrat, zufall, bevorzugt),
  ].filter((s): s is Schritt => s !== null);
  if (moeglich.length === 0) return hoeren(satz, vorrat, zufall);
  // Bauen kommt öfter dran als die Lücke, solange beides geht.
  return moeglich.length === 1 || wurf < 0.65 ? moeglich[0] : moeglich[1];
}

/** Die zweite Begegnung mit einem neuen Eintrag: Wörter nach Gehör, Sätze bauen oder ergänzen. */
export function festige(e: Eintrag, vorrat: readonly Eintrag[], zufall: Zufall, bevorzugt: readonly Eintrag[] = []): Schritt {
  return e.art === 'satz' ? satzUebung(e, vorrat, zufall, bevorzugt) : hoeren(e, vorrat, zufall);
}

/** Irgendeine Aufgabe zu einem schon bekannten Eintrag – zum Wiederholen. */
export function irgendeine(e: Eintrag, vorrat: readonly Eintrag[], zufall: Zufall, bevorzugt: readonly Eintrag[] = []): Schritt {
  const wurf = zufall();
  if (e.art === 'satz' && wurf < 0.6) return satzUebung(e, vorrat, zufall, bevorzugt);
  if (wurf < 0.8 && e.audio) return hoeren(e, vorrat, zufall);
  return wahl(e, zufall() < 0.5 ? 'sur-de' : 'de-sur', vorrat, zufall);
}

export function sprechen(e: Eintrag): Schritt | null {
  return e.audio ? { typ: 'sprechen', eintrag: e } : null;
}

// --- Runden ------------------------------------------------------------------

/** Schwächste zuerst: niedriges Fach, dann am längsten nicht geübt; Gleichstand zufällig. */
export function schwaechsteZuerst(vorrat: readonly Eintrag[], f: Fortschritt, zufall: Zufall): Eintrag[] {
  return mische(vorrat, zufall).sort(
    (a, b) => stufe(f, a.id) - stufe(f, b.id) || (f[a.id]?.zuletzt ?? 0) - (f[b.id]?.zuletzt ?? 0),
  );
}

/** Lässt sich ein Satz bauen oder als Lückentext üben? */
export const satzUebbar = (satz: Eintrag, vorrat: readonly Eintrag[]) =>
  satz.art === 'satz' && (bauen(satz, vorrat, () => 0) !== null || luecke(satz, vorrat, () => 0) !== null);

/**
 * Stellt eine Runde zum freien Üben einer Übungsart zusammen.
 * @param vorrat Einträge der Lektion in Lernreihenfolge (siehe `lernreihenfolge`).
 */
export function baueRunde(
  art: Exclude<Uebungsart, 'gemischt' | 'paare'>,
  vorrat: readonly Eintrag[],
  f: Fortschritt,
  zufall: Zufall = Math.random,
): Schritt[] {
  switch (art) {
    case 'karten':
      return schwaechsteZuerst(vorrat, f, zufall)
        .slice(0, FREI_UEBEN)
        .map((eintrag) => ({ typ: 'karte', eintrag, neu: false }));
    case 'wahl':
      return schwaechsteZuerst(vorrat, f, zufall)
        .slice(0, FREI_UEBEN)
        .map((e) => wahl(e, zufall() < 0.5 ? 'sur-de' : 'de-sur', vorrat, zufall));
    case 'hoeren':
      return schwaechsteZuerst(
        vorrat.filter((e) => e.audio),
        f,
        zufall,
      )
        .slice(0, FREI_UEBEN)
        .map((e) => hoeren(e, vorrat, zufall));
    case 'saetze':
      return schwaechsteZuerst(
        vorrat.filter((e) => satzUebbar(e, vorrat)),
        f,
        zufall,
      )
        .slice(0, FREI_UEBEN)
        .map((e) => satzUebung(e, vorrat, zufall, []));
    case 'sprechen':
      // Erst die Sätze, dann die Wörter, jeweils die am wenigsten geübten.
      return [
        ...schwaechsteZuerst(
          vorrat.filter((e) => e.art === 'satz'),
          f,
          zufall,
        ),
        ...schwaechsteZuerst(
          vorrat.filter((e) => e.art === 'wort'),
          f,
          zufall,
        ),
      ]
        .map(sprechen)
        .filter((s): s is Schritt => s !== null)
        .slice(0, FREI_SPRECHEN);
  }
}

/**
 * Übungsrunde mit Hörpaaren: Zu hören ist eins der beiden Wörter, zur Wahl
 * stehen beide. Die Paare, bei denen am meisten schiefging, kommen zuerst.
 */
export function baueHoerrunde(paare: readonly Hoerpaar[], f: Fortschritt, zufall: Zufall = Math.random): Schritt[] {
  const schwaecher = (p: Hoerpaar) => Math.min(...p.woerter.map((w) => stufe(f, w.id)));
  return mische(paare, zufall)
    .sort((a, b) => schwaecher(a) - schwaecher(b))
    .slice(0, FREI_UEBEN)
    .map((p) => {
      const [a, b] = p.woerter;
      // Das schwächere Wort wird gespielt, bei Gleichstand eins von beiden.
      const eintrag = stufe(f, a.id) !== stufe(f, b.id) ? (stufe(f, a.id) < stufe(f, b.id) ? a : b) : zufall() < 0.5 ? a : b;
      return { typ: 'paar', eintrag, optionen: [a, b], laute: p.laute };
    });
}

/** Dieselbe Aufgabe noch einmal, mit neu gemischten Antworten (nach einem Fehler). */
export function nochmal(schritt: Schritt, zufall: Zufall = Math.random): Schritt {
  switch (schritt.typ) {
    case 'wahl':
    case 'hoeren':
      return { ...schritt, optionen: mische(schritt.optionen, zufall) };
    case 'luecke':
      return { ...schritt, optionen: mische(schritt.optionen, zufall) };
    case 'bauen':
      return { ...schritt, bausteine: mische(schritt.bausteine, zufall) };
    default:
      // Karten haben keine Antworten, Hörpaare immer dieselben zwei.
      return schritt;
  }
}

/** Ist die Antwort beim Satzbauen richtig? Gleiche Wörter dürfen die Plätze tauschen. */
export function richtigGebaut(loesung: readonly string[], gebaut: readonly string[]): boolean {
  return loesung.length === gebaut.length && loesung.every((w, i) => w.toLowerCase() === gebaut[i].toLowerCase());
}

// --- Stand einer Lektion -----------------------------------------------------

/** Wie weit eine Lektion geübt ist: Einträge, die mindestens einmal in einer Übung dran waren. */
export function lektionsstand(lektion: Lektion, f: Fortschritt) {
  const alle = lernreihenfolge(lektion);
  const anzahl = alle.filter((e) => geuebt(f, e.id)).length;
  return { gesamt: alle.length, geuebt: anzahl, anteil: alle.length ? anzahl / alle.length : 0 };
}

/**
 * Wo es auf der Startseite weitergeht: in der zuletzt geübten Lektion, solange
 * sie nicht fertig ist – sonst in der ersten Lektion mit Text, die noch nicht
 * fertig geübt ist.
 */
export function aktuelleLektion(lektionen: readonly Lektion[], f: Fortschritt): Lektion {
  let zuletzt: Lektion | undefined;
  let zeit = 0;
  for (const l of lektionen) {
    for (const e of lernreihenfolge(l)) {
      const t = f[e.id]?.zuletzt ?? 0;
      if (t > zeit) [zeit, zuletzt] = [t, l];
    }
  }
  if (zuletzt && lektionsstand(zuletzt, f).anteil < 1) return zuletzt;
  // Lektion 1 und 2 (Alphabet, Aussprache) sind zum Nachschlagen da – der
  // Einstieg ist die erste Lektion mit Dialog oder Text.
  const hauptlektionen = lektionen.filter((l) => !l.aussprache);
  return hauptlektionen.find((l) => lektionsstand(l, f).anteil < 1) ?? hauptlektionen[0] ?? lektionen[0];
}
