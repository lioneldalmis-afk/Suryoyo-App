// Lernpfad: Jede Lektion ist in kleine Einheiten aufgeteilt, die nacheinander
// freigeschaltet werden. Eine Einheit ist ein Stück der Lernreihenfolge – ein
// paar neue Wörter und der Satz, in dem sie vorkommen – und passt in eine
// Übungsrunde von wenigen Minuten.

import type { Eintrag, Lektion } from '../types';
import { faelligAm, geuebt, istFaellig, MAX_STUFE, stufe, type Fortschritt } from './progress';
import {
  ersteAbfrage,
  festige,
  irgendeine,
  lernreihenfolge,
  mische,
  SCHWER_AB,
  sprechen,
  type Schritt,
  type VorratFuer,
  type Zufall,
} from './session';
import { bausteineAus } from './text';

export interface Einheit {
  lektion: number;
  /** 1, 2, 3 … innerhalb der Lektion */
  nr: number;
  eintraege: Eintrag[];
}

/** Ab so vielen Einträgen endet eine Einheit beim nächsten Satz. */
const ZIEL = 4;
/** Mehr Einträge hat eine Einheit nicht (außer ein kleiner Rest wird angehängt). */
const HOECHSTENS = 6;
/** Wörter, die im Text nicht vorkommen, werden in Päckchen von etwa so vielen gelernt. */
const NUR_WOERTER = 5;
/** Eine kleinere Einheit wird an die vorige angehängt. */
const MINDESTENS = 3;
/** So viele fällige Einträge aus früheren Einheiten werden in eine Runde gemischt. */
const WIEDERHOLUNGEN_PRO_EINHEIT = 2;
/** So viele Karten hat eine Runde im Karteikasten. */
export const KARTEN_PRO_RUNDE = 20;

export function einheiten(lektion: Lektion): Einheit[] {
  let liste = gemerkt.get(lektion);
  if (!liste) gemerkt.set(lektion, (liste = teile(lektion)));
  return liste;
}

const gemerkt = new WeakMap<Lektion, Einheit[]>();

function teile(lektion: Lektion): Einheit[] {
  const reihe = lernreihenfolge(lektion);
  // Bis zum letzten Satz folgt die Reihenfolge dem Text, danach kommen nur noch Wörter.
  const grenze = reihe.map((e) => e.art).lastIndexOf('satz') + 1;
  const stuecke = [...nachSaetzen(reihe.slice(0, grenze)), ...gleichmaessig(reihe.slice(grenze), NUR_WOERTER)];
  // Zu kleine Stücke an das vorige hängen.
  for (let i = stuecke.length - 1; i > 0; i--) {
    if (stuecke[i].length < MINDESTENS) stuecke[i - 1].push(...stuecke.splice(i, 1)[0]);
  }
  return stuecke.map((eintraege, i) => ({ lektion: lektion.nr, nr: i + 1, eintraege }));
}

/** Text-Teil: Eine Einheit endet mit einem Satz, sobald sie groß genug ist. */
function nachSaetzen(reihe: readonly Eintrag[]): Eintrag[][] {
  const stuecke: Eintrag[][] = [];
  let aktuell: Eintrag[] = [];
  for (const e of reihe) {
    aktuell.push(e);
    if ((e.art === 'satz' && aktuell.length >= ZIEL) || aktuell.length >= HOECHSTENS) {
      stuecke.push(aktuell);
      aktuell = [];
    }
  }
  if (aktuell.length) stuecke.push(aktuell);
  return stuecke;
}

/** Wörter-Teil: gleich große Päckchen, damit am Ende kein Einzelstück übrig bleibt. */
function gleichmaessig(reihe: readonly Eintrag[], groesse: number): Eintrag[][] {
  const anzahl = Math.ceil(reihe.length / groesse);
  return Array.from({ length: anzahl }, (_, i) =>
    reihe.slice(Math.round((i * reihe.length) / anzahl), Math.round(((i + 1) * reihe.length) / anzahl)),
  );
}

/** Eine Einheit ist geschafft, wenn jeder ihrer Einträge einmal geübt wurde. */
export const einheitFertig = (einheit: Einheit, f: Fortschritt) => einheit.eintraege.every((e) => geuebt(f, e.id));

/** Wie viele Einträge einer Einheit schon geübt sind – z. B. nach einer abgebrochenen Runde. */
export const einheitGeuebt = (einheit: Einheit, f: Fortschritt) => einheit.eintraege.filter((e) => geuebt(f, e.id)).length;

export type EinheitZustand = 'fertig' | 'aktuell' | 'zu';

/**
 * Zustand jeder Einheit im Lernpfad: geschafft, als Nächstes dran oder noch
 * gesperrt. Freigeschaltet wird der Reihe nach; wer Einträge beim freien Üben
 * schon gelernt hat, sieht diese Einheiten trotzdem als geschafft.
 */
export function einheitenZustand(lektion: Lektion, f: Fortschritt): EinheitZustand[] {
  const fertig = einheiten(lektion).map((e) => einheitFertig(e, f));
  const aktuell = fertig.indexOf(false);
  return fertig.map((ok, i) => (ok ? 'fertig' : i === aktuell ? 'aktuell' : 'zu'));
}

/** Die erste Einheit einer Lektion, die noch nicht geschafft ist. */
export function naechsteEinheit(lektion: Lektion, f: Fortschritt): Einheit | undefined {
  return einheiten(lektion).find((e) => !einheitFertig(e, f));
}

/** Alle Einträge, die heute zum Wiederholen dran sind: die schwächsten und am längsten fälligen zuerst. */
export function faellige(lektionen: readonly Lektion[], f: Fortschritt, heute: number, zufall: Zufall = Math.random): Eintrag[] {
  const alle = lektionen.flatMap((l) => lernreihenfolge(l)).filter((e) => istFaellig(f, e.id, heute));
  return mische(alle, zufall).sort((a, b) => stufe(f, a.id) - stufe(f, b.id) || faelligAm(f[a.id]) - faelligAm(f[b.id]));
}

/** Kurze Sätze eignen sich am besten zum Nachsprechen. */
function zumNachsprechen(eintraege: readonly Eintrag[], zufall: Zufall): Eintrag | undefined {
  const mitTon = mische(
    eintraege.filter((e) => e.audio),
    zufall,
  );
  const kurz = (e: Eintrag) => bausteineAus(e.latein).length;
  return (
    mitTon.find((e) => e.art === 'satz' && kurz(e) >= 2 && kurz(e) <= 6) ??
    mitTon.find((e) => e.art === 'wort' && kurz(e) >= 2) ??
    mitTon[0]
  );
}

export interface EinheitOptionen {
  /** Fällige Einträge aus anderen Einheiten (siehe `faellige`). */
  faellige?: readonly Eintrag[];
  /** Woher die Antwortmöglichkeiten für Wiederholungen aus anderen Lektionen kommen. */
  vorratFuer: VorratFuer;
  /** Nachsprechen-Aufgabe einbauen? */
  sprechen?: boolean;
}

/**
 * Übungsrunde einer Einheit. Neue Einträge werden in Zweierpäckchen vorgestellt.
 * Abgefragt werden sie nicht gleich danach, sondern erst, wenn schon das nächste
 * Päckchen vorgestellt ist – zuerst nach Gehör („Was bedeutet das?“), beim
 * zweiten Mal muss man selbst auf Surayt kommen (Sätze bauen oder ergänzen).
 * Dazu kommen zwei fällige Wiederholungen und am Ende eine Aufgabe zum
 * Nachsprechen. Ist die Einheit schon (teilweise) geübt, kommen die geübten
 * Einträge als Wiederholung – je nach Fach im Karteikasten unterschiedlich schwer.
 */
export function baueEinheit(einheit: Einheit, f: Fortschritt, optionen: EinheitOptionen, zufall: Zufall = Math.random): Schritt[] {
  const { vorratFuer } = optionen;
  const alle = einheit.eintraege;
  const neue = alle.filter((e) => !geuebt(f, e.id));
  const bekannte = alle.filter((e) => geuebt(f, e.id));
  const vorrat = alle.length ? vorratFuer(alle[0]) : [];

  const inDerEinheit = new Set(alle.map((e) => e.id));
  const wiederholungen = (optionen.faellige ?? [])
    .filter((e) => !inDerEinheit.has(e.id))
    .slice(0, WIEDERHOLUNGEN_PRO_EINHEIT)
    .map((e) => irgendeine(e, vorratFuer(e), zufall, [], stufe(f, e.id)));

  // Zweite Runde: jeder Eintrag der Einheit noch einmal, dazu die Wiederholungen.
  const zweite = mische(
    [
      ...neue.map((e) => festige(e, vorrat, zufall, neue)),
      ...bekannte.map((e) => irgendeine(e, vorrat, zufall, alle, stufe(f, e.id))),
      ...wiederholungen,
    ],
    zufall,
  );

  const paare: Eintrag[][] = [];
  for (let i = 0; i < neue.length; i += 2) paare.push(neue.slice(i, i + 2));
  const abfrage = (paar: Eintrag[]) => mische(paar, zufall).map((e) => ersteAbfrage(e, vorrat, zufall));

  const schritte: Schritt[] = [];
  paare.forEach((paar, i) => {
    for (const eintrag of paar) schritte.push({ typ: 'karte', eintrag, neu: true });
    if (i > 0) schritte.push(...abfrage(paare[i - 1]));
  });
  if (paare.length) {
    // Auch das letzte Päckchen nicht direkt nach dem Kennenlernen abfragen:
    // Vorher kommen zwei andere Aufgaben aus der zweiten Runde.
    const letztes = new Set(paare.at(-1)!.map((e) => e.id));
    for (let n = 0; n < 2; n++) {
      const i = zweite.findIndex((s) => !letztes.has(s.eintrag.id));
      if (i >= 0) schritte.push(...zweite.splice(i, 1));
    }
    schritte.push(...abfrage(paare.at(-1)!));
  }
  schritte.push(...zweite);

  if (optionen.sprechen) {
    const e = zumNachsprechen(neue.length ? neue : alle, zufall);
    const s = e && sprechen(e);
    if (s) schritte.push(s);
  }
  return schritte;
}

/**
 * Runde im Karteikasten: die fälligen Karten aller Lektionen, schwächste und am
 * längsten fällige zuerst. Erst überlegen, dann aufdecken und selbst sagen, ob
 * man es wusste (Active Recall). Was schon sitzt, kommt umgedreht – vorne
 * Deutsch –, dann muss man selbst auf das Surayt-Wort kommen.
 */
export function baueKartenrunde(faellig: readonly Eintrag[], f: Fortschritt, zufall: Zufall = Math.random): Schritt[] {
  return mische(faellig.slice(0, KARTEN_PRO_RUNDE), zufall).map((eintrag) => ({
    typ: 'karte',
    eintrag,
    neu: false,
    umgekehrt: stufe(f, eintrag.id) >= SCHWER_AB,
  }));
}

/** Wie viele Karten in welchem Fach liegen (Fach 0 bis `MAX_STUFE`), und wie viele heute und morgen dran sind. */
export function karteikasten(lektionen: readonly Lektion[], f: Fortschritt, heute: number) {
  const faecher = Array.from({ length: MAX_STUFE + 1 }, () => 0);
  let heuteDran = 0;
  let morgenDran = 0;
  const gesehen = new Set<string>();
  for (const e of lektionen.flatMap((l) => lernreihenfolge(l))) {
    if (gesehen.has(e.id) || !geuebt(f, e.id)) continue;
    gesehen.add(e.id);
    faecher[stufe(f, e.id)]++;
    if (istFaellig(f, e.id, heute)) heuteDran++;
    else if (istFaellig(f, e.id, heute + 1)) morgenDran++;
  }
  return { faecher, gesamt: gesehen.size, heuteDran, morgenDran };
}
