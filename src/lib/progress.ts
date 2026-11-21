// Lernstand jedes Eintrags nach dem Karteikasten-Prinzip (Leitner):
// Wer ein Wort richtig hat, schiebt es ein Fach weiter, und es kommt erst nach
// ein paar Tagen wieder dran – je höher das Fach, desto später. Wer es falsch
// hat, legt es zurück ins erste Fach, und es ist gleich wieder zum Wiederholen da.

import { speicher } from './speicher';
import { tagNummer } from './zeit';

/** Lernstand eines Eintrags. */
export interface Stand {
  /** Fach im Karteikasten: 0 = noch nicht gekonnt (neu oder zuletzt falsch) bis `MAX_STUFE`. */
  stufe: number;
  richtig: number;
  falsch: number;
  /** Zeitpunkt der letzten Übung (ms); 0 = noch nie geübt. */
  zuletzt: number;
}

export type Fortschritt = Readonly<Record<string, Stand>>;

export const MAX_STUFE = 5;
/** Ab diesem Fach „sitzt“ ein Eintrag. */
export const SITZT = 3;
/** Nach so vielen Tagen ist ein Eintrag im jeweiligen Fach wieder dran. */
export const INTERVALL_TAGE = [0, 1, 3, 7, 14, 30] as const;

const lernstand = speicher<Fortschritt>('surayt.fortschritt.v1', () => ({}));

export const stufe = (f: Fortschritt, id: string) => f[id]?.stufe ?? 0;

/** Ein Eintrag gilt als geübt, sobald er einmal in einer Übung dran war – egal ob richtig oder falsch. */
export const geuebt = (f: Fortschritt, id: string) => (f[id]?.zuletzt ?? 0) > 0;

/** Tag, an dem ein geübter Eintrag wieder dran ist (siehe `tagNummer`). */
export function faelligAm(s: Stand): number {
  return tagNummer(s.zuletzt) + INTERVALL_TAGE[Math.min(Math.max(s.stufe, 0), MAX_STUFE)];
}

/** Ist der Eintrag heute zum Wiederholen dran? Nie geübte Einträge sind es nicht – die sind neu. */
export function istFaellig(f: Fortschritt, id: string, heute: number): boolean {
  const s = f[id];
  return !!s && s.zuletzt > 0 && faelligAm(s) <= heute;
}

/** „gleich nochmal“, „morgen“, „in 3 Tagen“ … – wann ein Eintrag aus diesem Fach wieder drankommt. */
export function wannWieder(fach: number): string {
  const tage = INTERVALL_TAGE[Math.min(Math.max(fach, 0), MAX_STUFE)];
  if (tage === 0) return 'gleich nochmal';
  if (tage === 1) return 'morgen';
  if (tage === 7) return 'in 1 Woche';
  if (tage === 14) return 'in 2 Wochen';
  if (tage === 30) return 'in 1 Monat';
  return `in ${tage} Tagen`;
}

/** Wie gut ein Eintrag sitzt – für die Punkte in der Wörterliste. */
export type Lage = 'neu' | 'nochmal' | 'geuebt' | 'sitzt';

export function lage(f: Fortschritt, id: string): Lage {
  if (!geuebt(f, id)) return 'neu';
  const s = stufe(f, id);
  return s === 0 ? 'nochmal' : s >= SITZT ? 'sitzt' : 'geuebt';
}

/** Ergebnis eines Eintrags in einer Runde. */
export interface Ergebnis {
  id: string;
  fehlerfrei: boolean;
  /** Bei Karteikarten: gewusst, aber nur knapp – der Eintrag bleibt in seinem Fach (mindestens im zweiten). */
  knapp?: boolean;
}

export type Bewertung = 'falsch' | 'knapp' | 'gewusst';

/** In welches Fach ein Eintrag nach einer Antwort kommt. */
export function neuesFach(vorher: number, bewertung: Bewertung): number {
  if (bewertung === 'falsch') return 0;
  if (bewertung === 'knapp') return Math.max(1, vorher);
  return Math.min(MAX_STUFE, vorher + 1);
}

/** Neuer Lernstand nach einer Übungsrunde (ändert nichts, gibt nur zurück). */
export function nachRunde(f: Fortschritt, ergebnisse: Ergebnis[], jetzt: number): Fortschritt {
  const neu: Record<string, Stand> = { ...f };
  for (const { id, fehlerfrei, knapp } of ergebnisse) {
    const alt = f[id] ?? { stufe: 0, richtig: 0, falsch: 0, zuletzt: 0 };
    neu[id] = {
      stufe: neuesFach(alt.stufe, !fehlerfrei ? 'falsch' : knapp ? 'knapp' : 'gewusst'),
      richtig: alt.richtig + (fehlerfrei ? 1 : 0),
      falsch: alt.falsch + (fehlerfrei ? 0 : 1),
      zuletzt: jetzt,
    };
  }
  return neu;
}

export function verbuche(ergebnisse: Ergebnis[], jetzt = Date.now()) {
  lernstand.setze(nachRunde(lernstand.lies(), ergebnisse, jetzt));
}

/**
 * Lernstand während einer Runde: nach jeder Antwort speichern, damit beim
 * Abbrechen nichts verloren geht. Gerechnet wird immer vom Stand vor der Runde
 * (`basis`) aus – so rückt ein Eintrag pro Runde höchstens ein Fach weiter, auch
 * wenn er mehrmals drankommt, und ein späterer Fehler in derselben Runde zählt.
 */
export function verbucheAusRunde(basis: Fortschritt, ergebnisse: Ergebnis[], jetzt = Date.now()) {
  const neu = nachRunde(basis, ergebnisse, jetzt);
  lernstand.setze({ ...lernstand.lies(), ...Object.fromEntries(ergebnisse.map(({ id }) => [id, neu[id]])) });
}

export function zuruecksetzen() {
  lernstand.setze({});
}

/** Momentaufnahme außerhalb von React, z. B. beim Zusammenstellen einer Übungsrunde. */
export const aktuellerFortschritt = lernstand.lies;

/** Der Lernstand – nur auf diesem Gerät gespeichert, ohne Konto. */
export const useFortschritt = lernstand.use;
