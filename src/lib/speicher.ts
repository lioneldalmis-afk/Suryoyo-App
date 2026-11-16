// Ein Wert im Browser-Speicher, den React-Komponenten beobachten können.
// Alles bleibt auf dem Gerät – es gibt kein Konto und keinen Server.

import { useSyncExternalStore } from 'react';

export interface Speicher<T> {
  /** Momentaufnahme, auch außerhalb von React. */
  lies: () => T;
  setze: (neu: T) => void;
  /** Der aktuelle Wert in einer Komponente; sie wird bei jeder Änderung neu gezeichnet. */
  use: () => T;
}

export function speicher<T>(schluessel: string, leer: () => T, aufbereiten: (roh: unknown) => T = (r) => r as T): Speicher<T> {
  let aktuell: T = (() => {
    try {
      const roh = localStorage.getItem(schluessel);
      return roh ? aufbereiten(JSON.parse(roh)) : leer();
    } catch {
      return leer(); // z. B. privater Modus oder beschädigter Eintrag
    }
  })();
  const zuhoerer = new Set<() => void>();

  const abonnieren = (f: () => void) => {
    zuhoerer.add(f);
    return () => zuhoerer.delete(f);
  };

  return {
    lies: () => aktuell,
    setze(neu) {
      aktuell = neu;
      try {
        localStorage.setItem(schluessel, JSON.stringify(neu));
      } catch {
        // Speichern nicht möglich – der Stand gilt dann nur bis zum Schließen der App.
      }
      zuhoerer.forEach((f) => f());
    },
    use: () => useSyncExternalStore(abonnieren, () => aktuell),
  };
}
