// Übungen werden automatisch aus Wortschatz und Dialog erzeugt – eine neue
// Lektion braucht nur Daten, keine eigens programmierten Aufgaben.

import type { Eintrag, Hoerpaar, Lektion } from '../types';
import { stufe, type Fortschritt } from './progress';
import { fold, kern, tokens } from './text';

export type Uebungsart = 'gemischt' | 'karten' | 'wahl' | 'hoeren' | 'paare';
export type Richtung = 'sur-de' | 'de-sur';

export type Schritt =
  /** Karteikarte: hören → aufdecken. `neu` = Wort wird zum ersten Mal vorgestellt. */
  | { typ: 'karte'; eintrag: Eintrag; neu: boolean }
  /** Multiple Choice, Surayt → Deutsch oder umgekehrt. */
  | { typ: 'wahl'; eintrag: Eintrag; richtung: Richtung; optionen: Eintrag[] }
  /** Hören & Auswählen: nur Audio, Bedeutung wählen. */
  | { typ: 'hoeren'; eintrag: Eintrag; optionen: Eintrag[] }
  /** Hörpaar: eins von zwei fast gleich klingenden Wörtern hören und erkennen. */
  | { typ: 'paar'; eintrag: Eintrag; optionen: Eintrag[]; laute: string };

export type Zufall = () => number;

const NEU_PRO_RUNDE = 4;
const EINTRAEGE_PRO_RUNDE = 6;
const NUR_WIEDERHOLUNG = 8;
const FREI_UEBEN = 10;

export function mische<T>(liste: readonly T[], zufall: Zufall): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

function wahl(eintrag: Eintrag, richtung: Richtung, vorrat: readonly Eintrag[], zufall: Zufall): Schritt {
  return { typ: 'wahl', eintrag, richtung, optionen: optionenFuer(eintrag, vorrat, zufall) };
}

function hoeren(eintrag: Eintrag, vorrat: readonly Eintrag[], zufall: Zufall): Schritt {
  // Ohne Audio geht Hören nicht – dann wird andersherum abgefragt.
  if (!eintrag.audio) return wahl(eintrag, 'de-sur', vorrat, zufall);
  return { typ: 'hoeren', eintrag, optionen: optionenFuer(eintrag, vorrat, zufall) };
}

function irgendeine(eintrag: Eintrag, vorrat: readonly Eintrag[], zufall: Zufall): Schritt {
  const wurf = zufall();
  if (wurf < 1 / 3) return hoeren(eintrag, vorrat, zufall);
  return wahl(eintrag, wurf < 2 / 3 ? 'sur-de' : 'de-sur', vorrat, zufall);
}

/** Schwächste zuerst: niedrige Stufe, dann am längsten nicht geübt; Gleichstand zufällig. */
function schwaechsteZuerst(vorrat: readonly Eintrag[], f: Fortschritt, zufall: Zufall): Eintrag[] {
  return mische(vorrat, zufall).sort(
    (a, b) => stufe(f, a.id) - stufe(f, b.id) || (f[a.id]?.zuletzt ?? 0) - (f[b.id]?.zuletzt ?? 0),
  );
}

/**
 * Stellt eine Übungsrunde zusammen.
 * @param vorrat Einträge der Lektion in Lernreihenfolge (siehe `lernreihenfolge`).
 */
export function baueRunde(
  art: Uebungsart,
  vorrat: readonly Eintrag[],
  f: Fortschritt,
  zufall: Zufall = Math.random,
): Schritt[] {
  if (art === 'karten') {
    return schwaechsteZuerst(vorrat, f, zufall)
      .slice(0, FREI_UEBEN)
      .map((eintrag) => ({ typ: 'karte', eintrag, neu: false }));
  }
  if (art === 'wahl') {
    return schwaechsteZuerst(vorrat, f, zufall)
      .slice(0, FREI_UEBEN)
      .map((e) => wahl(e, zufall() < 0.5 ? 'sur-de' : 'de-sur', vorrat, zufall));
  }
  if (art === 'hoeren') {
    const mitAudio = vorrat.filter((e) => e.audio);
    return schwaechsteZuerst(mitAudio, f, zufall)
      .slice(0, FREI_UEBEN)
      .map((e) => hoeren(e, vorrat, zufall));
  }

  // Gemischt: ein paar neue Einträge kennenlernen und ältere wiederholen.
  const neue = vorrat.filter((e) => stufe(f, e.id) === 0).slice(0, NEU_PRO_RUNDE);
  const bekannte = schwaechsteZuerst(
    vorrat.filter((e) => stufe(f, e.id) > 0),
    f,
    zufall,
  ).slice(0, neue.length ? EINTRAEGE_PRO_RUNDE - neue.length : NUR_WIEDERHOLUNG);

  const schritte: Schritt[] = [];
  // Neue in Zweierpäckchen: erst anhören und aufdecken, dann gleich abfragen.
  for (let i = 0; i < neue.length; i += 2) {
    const paar = neue.slice(i, i + 2);
    for (const eintrag of paar) schritte.push({ typ: 'karte', eintrag, neu: true });
    for (const eintrag of mische(paar, zufall)) schritte.push(wahl(eintrag, 'sur-de', vorrat, zufall));
  }
  // Zweite Runde: die neuen nur nach Gehör, dazu die Wiederholungen.
  const zweiteRunde = [
    ...neue.map((e) => hoeren(e, vorrat, zufall)),
    ...bekannte.map((e) => irgendeine(e, vorrat, zufall)),
  ];
  schritte.push(...mische(zweiteRunde, zufall));
  return schritte;
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
export function nochmal(schritt: Schritt, vorrat: readonly Eintrag[], zufall: Zufall = Math.random): Schritt {
  // Karten haben keine Antworten, Hörpaare immer dieselben zwei.
  if (schritt.typ === 'karte' || schritt.typ === 'paar') return schritt;
  return { ...schritt, optionen: optionenFuer(schritt.eintrag, vorrat, zufall) };
}

/** Wie weit eine Lektion geübt ist: Einträge, die mindestens einmal fehlerfrei dran waren. */
export function lektionsstand(lektion: Lektion, f: Fortschritt) {
  const alle = lernreihenfolge(lektion);
  const geuebt = alle.filter((e) => stufe(f, e.id) > 0).length;
  return { gesamt: alle.length, geuebt, anteil: alle.length ? geuebt / alle.length : 0 };
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
