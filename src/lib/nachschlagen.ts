// Was beim Nachschlagen im Wörterbuch auf dem Gerät bleibt: die zuletzt
// angesehenen Einträge und eigene Wortanfragen („Wort anfragen“).
//
// Die Anfragen werden vorerst nur hier gesammelt. Sobald es die Einreichungen
// gibt (Fahrplan, Phase 5), werden sie dorthin verschickt; bis dahin verlässt
// nichts das Gerät.

import { speicher } from './speicher';

export interface Anfrage {
  /** Wort oder Satz, nach dem gefragt wird – so, wie er eingetippt wurde. */
  text: string;
  /** Wofür man es braucht, z. B. „beim Essen“ (freiwillig). */
  situation: string;
  /** Zeitpunkt der Anfrage (ms). */
  zeit: number;
  /** Ist die Anfrage schon bei den Einreichungen angekommen? */
  verschickt: boolean;
}

export interface Nachschlagen {
  /** Kennungen der zuletzt angesehenen Einträge, der neueste zuerst. */
  verlauf: string[];
  anfragen: Anfrage[];
}

/** So viele Einträge merkt sich „Zuletzt nachgeschlagen“. */
export const VERLAUF_LAENGE = 8;
/** Mehr Anfragen auf einmal braucht niemand – das hält auch Spielereien klein. */
export const ANFRAGEN_HOECHSTENS = 30;
export const ANFRAGE_LAENGE = 120;

const leer = (): Nachschlagen => ({ verlauf: [], anfragen: [] });

// Neue Felder späterer Versionen bekommen beim Laden ihren Standardwert.
export function aufbereiten(roh: unknown): Nachschlagen {
  const n = (roh ?? {}) as { verlauf?: unknown; anfragen?: unknown };
  const verlauf = Array.isArray(n.verlauf) ? n.verlauf.filter((id): id is string => typeof id === 'string') : [];
  const anfragen: Anfrage[] = Array.isArray(n.anfragen)
    ? n.anfragen
        .filter((a): a is Partial<Anfrage> & { text: string } => typeof a?.text === 'string')
        .map((a) => ({ ...a, situation: a.situation ?? '', zeit: a.zeit ?? 0, verschickt: a.verschickt ?? false }))
    : [];
  return { ...leer(), ...(n as object), verlauf, anfragen };
}

const zustand = speicher<Nachschlagen>('surayt.woerterbuch.v1', leer, aufbereiten);

export const useNachschlagen = zustand.use;

/** Einen angesehenen Eintrag vorne in „Zuletzt nachgeschlagen“ ablegen. */
export function merke(id: string) {
  const n = zustand.lies();
  if (n.verlauf[0] === id) return;
  zustand.setze({ ...n, verlauf: [id, ...n.verlauf.filter((x) => x !== id)].slice(0, VERLAUF_LAENGE) });
}

export function vergiss() {
  zustand.setze({ ...zustand.lies(), verlauf: [] });
}

/** Text einer Anfrage aufräumen: Leerzeichen zusammenziehen, Länge begrenzen. */
export const sauber = (text: string, laenge = ANFRAGE_LAENGE) => text.replace(/\s+/g, ' ').trim().slice(0, laenge);

/** Eine Wortanfrage speichern. Dieselbe Frage zweimal zählt nur einmal. */
export function frageAn(text: string, situation: string, jetzt = Date.now()): boolean {
  const t = sauber(text);
  if (!t) return false;
  const n = zustand.lies();
  const ohne = n.anfragen.filter((a) => a.text.toLowerCase() !== t.toLowerCase());
  const anfrage: Anfrage = { text: t, situation: sauber(situation), zeit: jetzt, verschickt: false };
  zustand.setze({ ...n, anfragen: [anfrage, ...ohne].slice(0, ANFRAGEN_HOECHSTENS) });
  return true;
}

export function zuruecknehmen(zeit: number) {
  const n = zustand.lies();
  zustand.setze({ ...n, anfragen: n.anfragen.filter((a) => a.zeit !== zeit) });
}
