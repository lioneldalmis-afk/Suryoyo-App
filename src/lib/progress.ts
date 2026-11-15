import { useSyncExternalStore } from 'react';

/** Lernstand eines Eintrags. Stufe 0 = neu, ab 1 = geübt, 3 = sitzt. */
export interface Stand {
  stufe: number;
  richtig: number;
  falsch: number;
  zuletzt: number;
}

export type Fortschritt = Readonly<Record<string, Stand>>;

export const MAX_STUFE = 3;
const KEY = 'surayt.fortschritt.v1';

function lesen(): Fortschritt {
  try {
    const roh = localStorage.getItem(KEY);
    return roh ? (JSON.parse(roh) as Fortschritt) : {};
  } catch {
    return {}; // z. B. privater Modus oder beschädigter Eintrag
  }
}

let aktuell: Fortschritt = lesen();
const zuhoerer = new Set<() => void>();

function setzen(neu: Fortschritt) {
  aktuell = neu;
  try {
    localStorage.setItem(KEY, JSON.stringify(neu));
  } catch {
    // Speichern nicht möglich – der Stand gilt dann nur bis zum Schließen der App.
  }
  zuhoerer.forEach((f) => f());
}

export const stufe = (f: Fortschritt, id: string) => f[id]?.stufe ?? 0;

/** Neuer Lernstand nach einer Übungsrunde (ändert nichts, gibt nur zurück). */
export function nachRunde(
  f: Fortschritt,
  ergebnisse: { id: string; fehlerfrei: boolean }[],
  jetzt: number,
): Fortschritt {
  const neu: Record<string, Stand> = { ...f };
  for (const { id, fehlerfrei } of ergebnisse) {
    const alt = f[id] ?? { stufe: 0, richtig: 0, falsch: 0, zuletzt: 0 };
    neu[id] = {
      stufe: fehlerfrei ? Math.min(MAX_STUFE, alt.stufe + 1) : Math.max(0, alt.stufe - 1),
      richtig: alt.richtig + (fehlerfrei ? 1 : 0),
      falsch: alt.falsch + (fehlerfrei ? 0 : 1),
      zuletzt: jetzt,
    };
  }
  return neu;
}

export function verbuche(ergebnisse: { id: string; fehlerfrei: boolean }[]) {
  setzen(nachRunde(aktuell, ergebnisse, Date.now()));
}

export function zuruecksetzen() {
  setzen({});
}

/** Momentaufnahme außerhalb von React, z. B. beim Zusammenstellen einer Übungsrunde. */
export const aktuellerFortschritt = () => aktuell;

function abonnieren(f: () => void) {
  zuhoerer.add(f);
  return () => zuhoerer.delete(f);
}

/** Der Lernstand – nur auf diesem Gerät gespeichert, ohne Konto. */
export function useFortschritt(): Fortschritt {
  return useSyncExternalStore(abonnieren, () => aktuell);
}
