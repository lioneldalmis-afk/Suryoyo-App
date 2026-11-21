// Das Schild an jeder Übersetzung: Woher stammt sie, und hat sie ein Mensch
// geprüft, der Surayt spricht? (Fahrplan, Phase 4b)

import { QUELLE } from '../config';
import type { Stufe } from '../lib/woerterbuch';
import { IconHaken, IconWarnung } from './Icons';

export const SCHILDER: Record<Stufe, { name: string; kurz: string; erklaerung: string }> = {
  lehrbuch: {
    name: 'Lehrbuch',
    kurz: 'Lehrbuch',
    erklaerung: `Steht genau so im Lehrbuch ${QUELLE.name}, meist mit Aufnahme.`,
  },
  muttersprachler: {
    name: 'Muttersprachler',
    kurz: 'Muttersprachler',
    erklaerung: 'Von einem Muttersprachler eingereicht oder bestätigt und vor der Aufnahme in die App geprüft.',
  },
  zusammengesetzt: {
    name: 'Zusammengesetzt – nicht geprüft',
    kurz: 'Nicht geprüft',
    erklaerung:
      'Nach Regeln aus dem Lehrbuch zusammengesetzt. Kann falsch sein oder ungewöhnlich klingen – frag nach, bevor du es benutzt.',
  },
};

/** `klein`: für Trefferlisten, mit kurzem Namen. */
export function Schild({ stufe, klein = false }: { stufe: Stufe; klein?: boolean }) {
  const s = SCHILDER[stufe];
  return (
    <span className={`schild schild--${stufe}${klein ? ' schild--klein' : ''}`}>
      {stufe === 'zusammengesetzt' ? <IconWarnung size={klein ? 13 : 16} /> : <IconHaken size={klein ? 13 : 16} />}
      {klein ? s.kurz : s.name}
    </span>
  );
}
