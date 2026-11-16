import type { KursLektion, Lektion } from '../types';
import kursJson from './kurs.json';

/** Alle Lektionen von Level A in Lehrbuch-Reihenfolge. */
export const kurs = kursJson as KursLektion[];

/**
 * Markierung für Sätze, die sich auf ein Bild der Website beziehen („Lassen Sie
 * die Maus über die Bilder gleiten …“). Die App hat diese Bilder nicht, deshalb
 * werden solche Sätze ausgeblendet. Sie bleiben in den Daten erhalten.
 */
export const NUR_MIT_BILD = 'nur-mit-bild';

// Jede Datei lektion-NN.json in diesem Ordner wird automatisch geladen –
// eine neue Lektion braucht nur ihre JSON-Datei.
const dateien = import.meta.glob<Lektion>('./lektion-*.json', { eager: true, import: 'default' });
const lektionen = Object.values(dateien)
  .sort((a, b) => a.nr - b.nr)
  .map((l) => ({ ...l, einleitung: l.einleitung.filter((e) => !e.tags.includes(NUR_MIT_BILD)) }));

export const verfuegbar = new Map(lektionen.map((l) => [l.nr, l]));

/** Ein Dialog hat Sprecher, ein Lesetext nicht. */
export const istDialog = (l: Lektion) => l.text.some((z) => z.sprecher);

// Lob am Ende einer Übungsrunde – wörtlich aus dem Dialog von Lektion 3,
// damit auch hier nichts Erfundenes steht.
const dialog3 = verfuegbar.get(3)?.text ?? [];
export const LOB = {
  sehrGut: dialog3.find((z) => z.id === 'L03-D-17'), // „Ġalabe ṭawwo.“ – Sehr gut.
  gut: dialog3.find((z) => z.id === 'L03-D-08'), // „Ṭawwo.“ – Gut.
};
