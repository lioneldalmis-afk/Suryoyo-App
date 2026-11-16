// Motivation: Erfahrungspunkte (XP), Tagesziel, Tagesserie, Abzeichen und der
// Satz der Woche für den Familientisch. Bewusst ohne „Leben“ oder „Herzen“ –
// Fehler kosten nichts, sie kommen nur zum Wiederholen wieder.
// Alles bleibt auf dem Gerät.

import type { Eintrag, Lektion } from '../types';
import { alleAbzeichen, erreichteAbzeichen, type Abzeichen } from './abzeichen';
import { aktuellerFortschritt } from './progress';
import { speicher } from './speicher';
import { serie, tagNummer, tagSchluessel } from './zeit';

export interface Zaehler {
  runden: number;
  fehlerfrei: number;
  wiederholungen: number;
  rollenspiele: number;
  nachgesprochen: number;
}

export interface Motivation {
  /** Alle XP zusammen. */
  xp: number;
  /** XP pro Tag: „2026-11-16“ → 25. Daraus ergeben sich Tagesziel und Serie. */
  tage: Record<string, number>;
  /** Tagesziel in XP. */
  ziel: number;
  /** Erreichte Abzeichen mit Zeitpunkt. */
  abzeichen: Record<string, number>;
  zaehler: Zaehler;
  /** Sätze, die zu Hause ausprobiert wurden („Hab ich gesagt!“), mit Zeitpunkt. */
  familientisch: Record<string, number>;
  /** Der Satz der Woche, einmal pro Woche ausgewählt. */
  satzDerWoche: { woche: string; id: string } | null;
  /** Nachsprechen-Aufgaben in den Einheiten? */
  sprechen: boolean;
  /** „Kann gerade nicht sprechen“: bis dahin keine Nachsprechen-Aufgaben. */
  sprechenPauseBis: number;
}

export const TAGESZIELE = [
  { xp: 10, name: 'Locker' },
  { xp: 20, name: 'Normal' },
  { xp: 30, name: 'Ernsthaft' },
  { xp: 50, name: 'Intensiv' },
] as const;

/** XP-Regeln: 1 XP pro richtiger Antwort (zählt die Übungsrunde selbst), dazu diese Boni. */
export const XP = {
  /** Für jede abgeschlossene Runde – auch wenn viel schiefging. */
  abschluss: 5,
  /** Für eine Runde ohne Fehler (ab 3 Aufgaben). */
  fehlerfrei: 5,
  /** Für „Hab ich gesagt!“ beim Satz der Woche. */
  familientisch: 10,
} as const;

const PAUSE_MS = 60 * 60 * 1000;

const leer = (): Motivation => ({
  xp: 0,
  tage: {},
  ziel: 20,
  abzeichen: {},
  zaehler: { runden: 0, fehlerfrei: 0, wiederholungen: 0, rollenspiele: 0, nachgesprochen: 0 },
  familientisch: {},
  satzDerWoche: null,
  sprechen: true,
  sprechenPauseBis: 0,
});

// Neue Felder späterer Versionen bekommen beim Laden ihren Standardwert.
const aufbereiten = (roh: unknown): Motivation => {
  const m = roh as Partial<Motivation>;
  return { ...leer(), ...m, zaehler: { ...leer().zaehler, ...m.zaehler } };
};

const zustand = speicher<Motivation>('surayt.motivation.v1', leer, aufbereiten);

export const useMotivation = zustand.use;
export const motivation = zustand.lies;

export type Rundenart = 'einheit' | 'frei' | 'wiederholung' | 'rollenspiel';

export interface Rundenergebnis {
  art: Rundenart;
  /** Richtige Antworten in der Runde. */
  richtige: number;
  /** Aufgaben, die für den Lernstand zählen. */
  aufgaben: number;
  fehler: number;
  /** Wie oft nachgesprochen wurde. */
  nachgesprochen: number;
}

/** XP einer Runde, aufgeschlüsselt – für die Anzeige am Ende. */
export function xpFuer(r: Rundenergebnis) {
  const fehlerfrei = r.fehler === 0 && r.aufgaben >= 3;
  const bonus = fehlerfrei ? XP.fehlerfrei : 0;
  return { antworten: r.richtige, abschluss: XP.abschluss, bonus, fehlerfrei, gesamt: r.richtige + XP.abschluss + bonus };
}

/** XP gutschreiben (ändert nichts, gibt nur zurück). */
export function mitXp(m: Motivation, xp: number, jetzt: number): Motivation {
  const tag = tagSchluessel(tagNummer(jetzt));
  return { ...m, xp: m.xp + xp, tage: { ...m.tage, [tag]: (m.tage[tag] ?? 0) + xp } };
}

/** Neuer Stand nach einer Runde, noch ohne Abzeichen. */
export function nachRunde(m: Motivation, r: Rundenergebnis, jetzt: number): Motivation {
  const { gesamt, fehlerfrei } = xpFuer(r);
  const z = m.zaehler;
  return {
    ...mitXp(m, gesamt, jetzt),
    zaehler: {
      runden: z.runden + 1,
      fehlerfrei: z.fehlerfrei + (fehlerfrei ? 1 : 0),
      wiederholungen: z.wiederholungen + (r.art === 'wiederholung' ? 1 : 0),
      rollenspiele: z.rollenspiele + (r.art === 'rollenspiel' ? 1 : 0),
      nachgesprochen: z.nachgesprochen + r.nachgesprochen,
    },
  };
}

/** Was nach einer Runde (oder nach „Hab ich gesagt!“) angezeigt wird. */
export interface Bericht {
  xp: number;
  xpHeute: number;
  ziel: number;
  /** Das Tagesziel wurde gerade eben erreicht. */
  zielGeradeErreicht: boolean;
  serie: number;
  /** Heute ist der erste Übungstag-Eintrag: Die Serie ist gerade gewachsen. */
  serieGewachsen: boolean;
  neueAbzeichen: Abzeichen[];
}

/** Speichert einen neuen Stand, vergibt fällige Abzeichen und berichtet, was sich getan hat. */
function uebernimm(vorher: Motivation, nachher: Motivation, lektionen: readonly Lektion[], jetzt: number): Bericht {
  const erreicht = erreichteAbzeichen({ m: nachher, f: aktuellerFortschritt(), lektionen });
  const neu = erreicht.filter((id) => !(id in nachher.abzeichen));
  const gespeichert = { ...nachher, abzeichen: { ...nachher.abzeichen, ...Object.fromEntries(neu.map((id) => [id, jetzt])) } };
  zustand.setze(gespeichert);

  const heute = tagNummer(jetzt);
  const tag = tagSchluessel(heute);
  const xpVorher = vorher.tage[tag] ?? 0;
  const xpHeute = gespeichert.tage[tag] ?? 0;
  const katalog = alleAbzeichen(lektionen);
  return {
    xp: gespeichert.xp - vorher.xp,
    xpHeute,
    ziel: gespeichert.ziel,
    zielGeradeErreicht: xpVorher < gespeichert.ziel && xpHeute >= gespeichert.ziel,
    serie: serie(gespeichert.tage, heute).laenge,
    serieGewachsen: xpVorher === 0 && xpHeute > 0,
    neueAbzeichen: katalog.filter((a) => neu.includes(a.id)),
  };
}

/**
 * Am Ende einer Runde aufrufen – nachdem der Lernstand verbucht ist, damit
 * Abzeichen wie „Lektion geschafft“ ihn schon sehen.
 */
export function schliesseRundeAb(r: Rundenergebnis, lektionen: readonly Lektion[], jetzt = Date.now()): Bericht {
  const vorher = zustand.lies();
  return uebernimm(vorher, nachRunde(vorher, r, jetzt), lektionen, jetzt);
}

/** „Hab ich gesagt!“: Der Satz der Woche wurde zu Hause ausprobiert. */
export function hakeFamilientischAb(id: string, lektionen: readonly Lektion[], jetzt = Date.now()): Bericht {
  const vorher = zustand.lies();
  if (id in vorher.familientisch) return uebernimm(vorher, vorher, lektionen, jetzt);
  const nachher = mitXp({ ...vorher, familientisch: { ...vorher.familientisch, [id]: jetzt } }, XP.familientisch, jetzt);
  return uebernimm(vorher, nachher, lektionen, jetzt);
}

// --- Satz der Woche ----------------------------------------------------------

/** Markierung für Sätze, die man zu Hause direkt verwenden kann (von einem Menschen geprüft). */
export const FAMILIENTISCH = 'familientisch';

/** Alle geprüften Familientisch-Sätze und -Wendungen. */
export function familientischSaetze(lektionen: readonly Lektion[]): Eintrag[] {
  return lektionen.flatMap((l) => [...l.einleitung, ...l.text, ...l.wortschatz]).filter((e) => e.tags.includes(FAMILIENTISCH));
}

/**
 * Wählt den Satz der Woche: einmal pro Woche neu, bevorzugt einer, der noch
 * nicht ausprobiert wurde und aus einer Lektion stammt, die man schon kennt.
 * Gibt die Kennung zurück, oder `null`, wenn es noch keine geprüften Sätze gibt.
 */
export function waehleSatzDerWoche(
  m: Motivation,
  kandidaten: readonly Eintrag[],
  woche: string,
  bisLektion: number,
  zufall: () => number = Math.random,
): string | null {
  if (m.satzDerWoche?.woche === woche && kandidaten.some((e) => e.id === m.satzDerWoche?.id)) return m.satzDerWoche.id;
  const offen = kandidaten.filter((e) => !(e.id in m.familientisch));
  const pool = [offen.filter((e) => e.lektion <= bisLektion), offen, kandidaten].find((p) => p.length > 0);
  return pool ? pool[Math.floor(zufall() * pool.length)].id : null;
}

export function merkeSatzDerWoche(woche: string, id: string) {
  const m = zustand.lies();
  if (m.satzDerWoche?.woche === woche && m.satzDerWoche.id === id) return;
  zustand.setze({ ...m, satzDerWoche: { woche, id } });
}

// --- Einstellungen -----------------------------------------------------------

export function setzeZiel(xp: number) {
  zustand.setze({ ...zustand.lies(), ziel: xp });
}

export const sprechenMoeglich = (m: Motivation, jetzt = Date.now()) => m.sprechen && m.sprechenPauseBis <= jetzt;

/** „Kann gerade nicht sprechen“: eine Stunde lang keine Nachsprechen-Aufgaben. */
export function sprechenPausieren(jetzt = Date.now()) {
  zustand.setze({ ...zustand.lies(), sprechenPauseBis: jetzt + PAUSE_MS });
}

export function setzeSprechen(an: boolean) {
  zustand.setze({ ...zustand.lies(), sprechen: an, sprechenPauseBis: 0 });
}

/** Setzt XP, Serie und Abzeichen zurück. Tagesziel und Einstellungen bleiben. */
export function motivationZuruecksetzen() {
  const { ziel, sprechen } = zustand.lies();
  zustand.setze({ ...leer(), ziel, sprechen });
}
