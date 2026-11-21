// Falsche Antwortmöglichkeiten („Ablenker“), die nicht auf den ersten Blick
// ausscheiden: ähnlich geschrieben, dieselbe Art von Wendung (Frage, Verbform,
// Nomen …) und ungefähr zur selben Zeit gelernt. Sie bleiben trotzdem fair:
// Zwei Möglichkeiten mit derselben deutschen Bedeutung oder derselben
// Schreibweise kommen nie zusammen vor.

import type { Eintrag } from '../types';
import { fold, kern } from './text';

/** Auf welcher Sprache die Antwortmöglichkeiten stehen. */
export type Seite = 'surayt' | 'deutsch';

function bigramme(text: string): Map<string, number> {
  const t = ` ${text} `;
  const m = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i++) {
    const b = t.slice(i, i + 2);
    m.set(b, (m.get(b) ?? 0) + 1);
  }
  return m;
}

/** Wie ähnlich zwei Texte geschrieben sind: 0 (nichts gemeinsam) bis 1 (gleich). */
export function aehnlichkeit(a: string, b: string): number {
  const x = bigramme(a);
  const y = bigramme(b);
  let gemeinsam = 0;
  let gesamt = 0;
  for (const [bg, n] of x) {
    gemeinsam += Math.min(n, y.get(bg) ?? 0);
    gesamt += n;
  }
  for (const n of y.values()) gesamt += n;
  return gesamt ? (2 * gemeinsam) / gesamt : 0;
}

/** Grobe Art einer deutschen Bedeutung, damit z. B. Fragen mit Fragen zur Wahl stehen. */
export function form(deutsch: string): string {
  const k = deutsch.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (k.endsWith('?')) return 'frage';
  if (k.endsWith('!')) return 'ausruf';
  if (/^(ich|du|er|sie|es|wir|ihr)\s/i.test(k)) return 'verb';
  if (/^(der|die|das|ein|eine|mein|meine|dein|deine|sein|seine|ihr|ihre)\s/i.test(k)) return 'nomen';
  const woerter = k.split(' ').length;
  if (woerter === 1) return /^\p{Lu}/u.test(k) ? 'nomen' : 'wort';
  return woerter > 3 ? 'satz' : 'wendung';
}

const anzahlWoerter = (t: string) => t.trim().split(/\s+/).length;

/** Wie gut sich `e` als falsche Antwort zu `ziel` eignet – je höher, desto eher verwechselbar. */
export function verwechselbar(ziel: Eintrag, e: Eintrag, seite: Seite): number {
  const sur = aehnlichkeit(fold(ziel.latein), fold(e.latein));
  const de = aehnlichkeit(kern(ziel.deutsch), kern(e.deutsch));
  const gleicheForm = form(ziel.deutsch) === form(e.deutsch) ? 1 : 0;
  const gleicheLaenge = anzahlWoerter(ziel.latein) === anzahlWoerter(e.latein) ? 1 : 0;
  const gleichesEnde = fold(ziel.latein).slice(-2) === fold(e.latein).slice(-2) ? 1 : 0;
  return seite === 'surayt'
    ? sur + 0.15 * gleichesEnde + 0.15 * gleicheLaenge + 0.3 * gleicheForm
    : 0.5 * gleicheForm + 0.35 * de + 0.35 * sur + 0.1 * gleicheLaenge;
}

/** Gleiche deutsche Bedeutung samt Klammerzusatz – das wäre doppeldeutig. */
const deutschGenau = (deutsch: string) =>
  deutsch
    .toLowerCase()
    .replace(/[!?.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export interface Ablenkerwahl {
  seite: Seite;
  /**
   * Schwer: Auch Einträge mit derselben Bedeutung, die sich nur im Klammerzusatz
   * unterscheiden („gut (m.Sg.)“ / „gut (pl.)“ → „ṭawwo“ / „ṭawwe“), dürfen
   * zusammen vorkommen. Für Einträge, die schon sitzen.
   */
  schwer?: boolean;
}

/**
 * Wählt `anzahl` falsche Antworten aus `vorrat`. Bevorzugt werden verwechselbare
 * Einträge und solche, die in der Lernreihenfolge kurz vor dem gesuchten stehen
 * (die hat man gerade gelernt). Ein bisschen Zufall sorgt für Abwechslung.
 */
export function ablenker(
  ziel: Eintrag,
  vorrat: readonly Eintrag[],
  anzahl: number,
  { seite, schwer = false }: Ablenkerwahl,
  zufall: () => number,
): Eintrag[] {
  const position = vorrat.indexOf(ziel);
  const naehe = (i: number) => {
    if (position < 0 || i < 0) return 0;
    const abstand = position - i;
    // Kurz vorher gelernt: stark; kurz danach (noch nicht gelernt): etwas.
    if (abstand > 0 && abstand <= 12) return 0.3 * (1 - abstand / 13);
    if (abstand < 0 && abstand >= -6) return 0.1;
    return 0;
  };

  const bewertet = vorrat
    .map((e, i) => ({ e, wert: verwechselbar(ziel, e, seite) + naehe(i) + 0.35 * zufall() }))
    .filter(({ e }) => e.art === ziel.art && e.id !== ziel.id)
    .sort((a, b) => b.wert - a.wert);

  const bedeutungen = new Set([schwer ? deutschGenau(ziel.deutsch) : kern(ziel.deutsch)]);
  const genau = new Set([deutschGenau(ziel.deutsch)]);
  const formen = new Set([fold(ziel.latein)]);
  const gewaehlt: Eintrag[] = [];
  for (const { e } of bewertet) {
    if (gewaehlt.length === anzahl) break;
    const bedeutung = schwer ? deutschGenau(e.deutsch) : kern(e.deutsch);
    if (bedeutungen.has(bedeutung) || genau.has(deutschGenau(e.deutsch)) || formen.has(fold(e.latein))) continue;
    bedeutungen.add(bedeutung);
    genau.add(deutschGenau(e.deutsch));
    formen.add(fold(e.latein));
    gewaehlt.push(e);
  }
  return gewaehlt;
}
