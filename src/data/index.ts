import type { KursLektion, Lektion } from '../types';
import kursJson from './kurs.json';
import lektion03 from './lektion-03.json';

/** Alle Lektionen von Level A in Lehrbuch-Reihenfolge. */
export const kurs = kursJson as KursLektion[];

// Eine neue Lektion braucht nur ihre JSON-Datei und eine Zeile hier.
const lektionen: Lektion[] = [lektion03 as Lektion];

export const verfuegbar = new Map(lektionen.map((l) => [l.nr, l]));

// Lob am Ende einer Übungsrunde – wörtlich aus dem Dialog von Lektion 3,
// damit auch hier nichts Erfundenes steht.
const dialog3 = lektion03 as Lektion;
export const LOB = {
  sehrGut: dialog3.dialog.find((z) => z.id === 'L03-D-17'), // „Ġalabe ṭawwo.“ – Sehr gut.
  gut: dialog3.dialog.find((z) => z.id === 'L03-D-08'), // „Ṭawwo.“ – Gut.
};
