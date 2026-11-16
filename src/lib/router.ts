// Kleiner Hash-Router (#/lektion/3/text). Hash-Adressen funktionieren auf
// GitHub Pages ohne Zusatzkonfiguration, und die Zurück-Taste des Handys geht.

import { useSyncExternalStore } from 'react';
import type { Uebungsart } from './session';

export type LektionTab = 'text' | 'woerter' | 'ueben';

export type Route =
  | { name: 'start' }
  | { name: 'info' }
  | { name: 'lektion'; nr: number; tab: LektionTab }
  | { name: 'runde'; nr: number; art: Uebungsart };

const TABS: readonly string[] = ['text', 'woerter', 'ueben'];
const ARTEN: readonly string[] = ['gemischt', 'karten', 'wahl', 'hoeren'];

export function parse(hash: string): Route {
  const [a, b, c, d] = hash.replace(/^#\/?/, '').split('/');
  if (a === 'info') return { name: 'info' };
  if (a === 'lektion' && /^\d+$/.test(b ?? '')) {
    const nr = Number(b);
    if (c === 'ueben' && ARTEN.includes(d)) return { name: 'runde', nr, art: d as Uebungsart };
    // Unbekannte Reiter (auch das frühere „dialog“) führen zum Text.
    return { name: 'lektion', nr, tab: TABS.includes(c) ? (c as LektionTab) : 'text' };
  }
  return { name: 'start' };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'start':
      return '#/';
    case 'info':
      return '#/info';
    case 'lektion':
      return `#/lektion/${route.nr}/${route.tab}`;
    case 'runde':
      return `#/lektion/${route.nr}/ueben/${route.art}`;
  }
}

function abonnieren(f: () => void) {
  window.addEventListener('hashchange', f);
  return () => window.removeEventListener('hashchange', f);
}

export function useHash(): string {
  return useSyncExternalStore(abonnieren, () => window.location.hash);
}

/** Ersetzt die aktuelle Adresse, ohne einen Eintrag im Verlauf anzulegen (z. B. beim Wechsel zwischen Reitern). */
export function ersetze(route: Route) {
  window.location.replace(href(route));
}
