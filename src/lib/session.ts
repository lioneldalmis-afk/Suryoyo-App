// Übungen werden automatisch aus Wortschatz und Dialog erzeugt – eine neue
// Lektion braucht nur Daten, keine eigens programmierten Aufgaben.

import type { Eintrag, Lektion } from '../types';
import { stufe, type Fortschritt } from './progress';
import { fold, kern, tokens } from './text';

export type Uebungsart = 'gemischt' | 'karten' | 'wahl' | 'hoeren';
export type Richtung = 'sur-de' | 'de-sur';

export type Schritt =
  /** Karteikarte: hören → aufdecken. `neu` = Wort wird zum ersten Mal vorgestellt. */
  | { typ: 'karte'; eintrag: Eintrag; neu: boolean }
  /** Multiple Choice, Surayt → Deutsch oder umgekehrt. */
  | { typ: 'wahl'; eintrag: Eintrag; richtung: Richtung; optionen: Eintrag[] }
  /** Hören & Auswählen: nur Audio, Bedeutung wählen. */
  | { typ: 'hoeren'; eintrag: Eintrag; optionen: Eintrag[] };

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
 * Dialog vorkommen, und jede Dialogzeile gleich nach ihren Wörtern. Wörter,
 * die im Dialog nicht vorkommen, stehen am Ende.
 */
export function lernreihenfolge(lektion: Lektion): Eintrag[] {
  let reihenfolge = gemerkt.get(lektion);
  if (!reihenfolge) gemerkt.set(lektion, (reihenfolge = berechneReihenfolge(lektion)));
  return reihenfolge;
}

const gemerkt = new WeakMap<Lektion, Eintrag[]>();

function berechneReihenfolge(lektion: Lektion): Eintrag[] {
  const zeilen = lektion.dialog.map((z) => tokens(z.latein));
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

  const imDialog: { eintrag: Eintrag; zeile: number; pos: number }[] = [];
  const rest: Eintrag[] = [];
  for (const wort of lektion.wortschatz) {
    const ort = erstesVorkommen(wort);
    if (ort) imDialog.push({ eintrag: wort, zeile: ort[0], pos: ort[1] });
    else rest.push(wort);
  }
  lektion.dialog.forEach((zeile, z) => imDialog.push({ eintrag: zeile, zeile: z, pos: Infinity }));
  imDialog.sort((a, b) => a.zeile - b.zeile || a.pos - b.pos);
  return [...imDialog.map((x) => x.eintrag), ...rest];
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

/** Dieselbe Aufgabe noch einmal, mit neu gemischten Antworten (nach einem Fehler). */
export function nochmal(schritt: Schritt, vorrat: readonly Eintrag[], zufall: Zufall = Math.random): Schritt {
  if (schritt.typ === 'karte') return schritt;
  return { ...schritt, optionen: optionenFuer(schritt.eintrag, vorrat, zufall) };
}

/** Wie weit eine Lektion geübt ist: Einträge, die mindestens einmal fehlerfrei dran waren. */
export function lektionsstand(lektion: Lektion, f: Fortschritt) {
  const alle = lernreihenfolge(lektion);
  const geuebt = alle.filter((e) => stufe(f, e.id) > 0).length;
  return { gesamt: alle.length, geuebt, anteil: alle.length ? geuebt / alle.length : 0 };
}
