// Dialog-Rollenspiel: Man übernimmt eine Person aus dem Dialog. Die anderen
// sprechen ihre Zeilen (Aufnahme aus dem Lehrbuch), bei den eigenen Zeilen
// wählt man aus, was man sagt – und hört es dann.

import type { Eintrag } from '../types';
import { mische, type Zufall } from './session';
import { fold, kern } from './text';

/** Gemeinsame Zeilen heißen im Lehrbuch z. B. „Saro w Aday“ („Saro und Aday“). */
const sprecherVon = (zeile: Eintrag) => (zeile.sprecher ?? '').split(' w ');

/** Gehört die Zeile (auch) zu dieser Rolle? */
export const gehoertZu = (zeile: Eintrag, rolle: string) => sprecherVon(zeile).includes(rolle);

export interface Rolle {
  name: string;
  /** Wie viele Zeilen man in dieser Rolle sagt. */
  zeilen: number;
  /** Mit wem man spricht. */
  gegenueber: string[];
}

/** Rollen, die man spielen kann: jede Person mit mindestens zwei eigenen Zeilen. */
export function rollen(text: readonly Eintrag[]): Rolle[] {
  const namen = [...new Set(text.flatMap(sprecherVon))].filter(Boolean);
  return namen
    .map((name) => ({
      name,
      zeilen: text.filter((z) => gehoertZu(z, name)).length,
      gegenueber: namen.filter((n) => n !== name && text.some((z) => gehoertZu(z, n) && !gehoertZu(z, name))),
    }))
    .filter((r) => r.zeilen >= 2);
}

export interface Zug {
  zeile: Eintrag;
  /** Sagt man diese Zeile selbst? */
  eigene: boolean;
  /** Bei eigenen Zeilen: die richtige und zwei andere zur Auswahl. */
  optionen: Eintrag[];
}

const ANTWORTEN = 3;

/**
 * Der Ablauf eines Rollenspiels. Falsche Antworten sind andere Zeilen derselben
 * Person (die klingen am ehesten nach ihr), sonst Zeilen der anderen.
 */
export function baueRollenspiel(text: readonly Eintrag[], rolle: string, zufall: Zufall = Math.random): Zug[] {
  const eigene = text.filter((z) => gehoertZu(z, rolle));
  const andere = text.filter((z) => !gehoertZu(z, rolle));
  return text.map((zeile) => {
    if (!gehoertZu(zeile, rolle)) return { zeile, eigene: false, optionen: [] };
    const bedeutungen = new Set([kern(zeile.deutsch)]);
    const formen = new Set([fold(zeile.latein)]);
    const falsche: Eintrag[] = [];
    for (const z of [...mische(eigene, zufall), ...mische(andere, zufall)]) {
      if (falsche.length === ANTWORTEN - 1) break;
      if (bedeutungen.has(kern(z.deutsch)) || formen.has(fold(z.latein))) continue;
      bedeutungen.add(kern(z.deutsch));
      formen.add(fold(z.latein));
      falsche.push(z);
    }
    return { zeile, eigene: true, optionen: mische([zeile, ...falsche], zufall) };
  });
}
