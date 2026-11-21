// Kleiner Hash-Router (#/lektion/3/text). Hash-Adressen funktionieren auf
// GitHub Pages ohne Zusatzkonfiguration, und die Zurück-Taste des Handys geht.

import { useSyncExternalStore } from 'react';
import type { Uebungsart } from './session';

export type LektionTab = 'text' | 'woerter' | 'ueben';

export type Route =
  | { name: 'start' }
  | { name: 'info' }
  | { name: 'erfolge' }
  /** Karteikasten: Fächer, fällige Karten. */
  | { name: 'karteikasten' }
  /** Eine Runde mit den fälligen Karten aller Lektionen. */
  | { name: 'kartenrunde' }
  /** Übersetzer (bis November 2026 „Wörterbuch“): Suche, mit `id` ein einzelner Eintrag. */
  | { name: 'uebersetzer'; id?: string }
  /** `anker`: Sprungziel auf der Seite, z. B. der Laut „ḥ“ in Lektion 2. */
  | { name: 'lektion'; nr: number; tab: LektionTab; anker?: string }
  /** Freies Üben einer Übungsart. */
  | { name: 'runde'; nr: number; art: Uebungsart }
  /** Übungsrunde einer Einheit im Lernpfad. */
  | { name: 'einheit'; nr: number; einheit: number }
  | { name: 'rollenspiel'; nr: number };

const TABS: readonly string[] = ['text', 'woerter', 'ueben'];
// „hoeren“ gab es bis November 2026 als eigene Übungsart; alte Links führen jetzt zum Reiter „Üben“.
const ARTEN: readonly string[] = ['gemischt', 'karten', 'wahl', 'paare', 'saetze', 'sprechen'];
const zahl = (teil: string | undefined) => (/^\d+$/.test(teil ?? '') ? Number(teil) : null);

export function parse(hash: string): Route {
  const [a, b, c, d] = hash.replace(/^#\/?/, '').split('/');
  if (a === 'info') return { name: 'info' };
  if (a === 'erfolge') return { name: 'erfolge' };
  if (a === 'karteikasten') return b === 'lernen' ? { name: 'kartenrunde' } : { name: 'karteikasten' };
  // Früher hieß die Runde mit den fälligen Einträgen „Wiederholen“.
  if (a === 'wiederholen') return { name: 'karteikasten' };
  // Bis November 2026 hieß der Übersetzer „Wörterbuch“; alte Links und Lesezeichen führen weiter.
  if (a === 'uebersetzer' || a === 'woerterbuch')
    return b ? { name: 'uebersetzer', id: entschluessle(b) } : { name: 'uebersetzer' };
  const nr = zahl(b);
  if (a === 'lektion' && nr !== null) {
    if (c === 'ueben' && ARTEN.includes(d)) return { name: 'runde', nr, art: d as Uebungsart };
    if (c === 'rollenspiel') return { name: 'rollenspiel', nr };
    if (c === 'einheit') {
      const einheit = zahl(d);
      return einheit !== null ? { name: 'einheit', nr, einheit } : { name: 'lektion', nr, tab: 'ueben' };
    }
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
    case 'erfolge':
    case 'karteikasten':
      return `#/${route.name}`;
    case 'kartenrunde':
      return '#/karteikasten/lernen';
    case 'uebersetzer':
      return route.id ? `#/uebersetzer/${encodeURIComponent(route.id)}` : '#/uebersetzer';
    case 'lektion':
      return `#/lektion/${route.nr}/${route.tab}${route.anker ? '/' + encodeURIComponent(route.anker) : ''}`;
    case 'runde':
      return `#/lektion/${route.nr}/ueben/${route.art}`;
    case 'einheit':
      return `#/lektion/${route.nr}/einheit/${route.einheit}`;
    case 'rollenspiel':
      return `#/lektion/${route.nr}/rollenspiel`;
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
