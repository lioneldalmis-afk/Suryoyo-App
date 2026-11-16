// Kleiner Hash-Router (#/lektion/3/text). Hash-Adressen funktionieren auf
// GitHub Pages ohne Zusatzkonfiguration, und die Zurück-Taste des Handys geht.

import { useSyncExternalStore } from 'react';
import type { Uebungsart } from './session';

export type LektionTab = 'text' | 'woerter' | 'ueben';

export type Route =
  | { name: 'start' }
  | { name: 'info' }
  /** `anker`: Sprungziel auf der Seite, z. B. der Laut „ḥ“ in Lektion 2. */
  | { name: 'lektion'; nr: number; tab: LektionTab; anker?: string }
  | { name: 'runde'; nr: number; art: Uebungsart };

const TABS: readonly string[] = ['text', 'woerter', 'ueben'];
const ARTEN: readonly string[] = ['gemischt', 'karten', 'wahl', 'hoeren', 'paare'];

export function parse(hash: string): Route {
  const [a, b, c, d] = hash.replace(/^#\/?/, '').split('/');
  if (a === 'info') return { name: 'info' };
  if (a === 'lektion' && /^\d+$/.test(b ?? '')) {
    const nr = Number(b);
    if (c === 'ueben' && ARTEN.includes(d)) return { name: 'runde', nr, art: d as Uebungsart };
    // Unbekannte Reiter (auch das frühere „dialog“) führen zum Text.
    const tab = TABS.includes(c) ? (c as LektionTab) : 'text';
    const anker = tab === 'text' && d ? entschluessle(d) : undefined;
    return anker ? { name: 'lektion', nr, tab, anker } : { name: 'lektion', nr, tab };
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
      return `#/lektion/${route.nr}/${route.tab}${route.anker ? '/' + encodeURIComponent(route.anker) : ''}`;
    case 'runde':
      return `#/lektion/${route.nr}/ueben/${route.art}`;
  }
}

/** Browser liefern Sonderzeichen in der Adresse teils kodiert („%C4%8D“ für „č“). */
function entschluessle(teil: string) {
  try {
    return decodeURIComponent(teil).normalize('NFC');
  } catch {
    return teil;
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
