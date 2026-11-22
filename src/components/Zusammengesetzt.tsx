// Ein zusammengesetzter Satz (Fahrplan, Phase 4b, Schritt 4): Der Baukasten hat
// ihn nach einem Lehrbuch-Satz gebaut, indem er ein Wort getauscht hat. Er trägt
// das orange Schild, hat keine Aufnahme und keinen großen Lautsprecher. Darunter
// steht der Bauplan: was getauscht wurde und warum das passt, welche Lehrbuch-Sätze
// genauso gebaut sind (mit Aufnahme) und jedes Wort einzeln.

import { useMemo } from 'react';
import { merkmalText, type Beleg, type Merkmale, type Zusammengesetzt } from '../lib/baukasten';
import { herkunftKurz, type Fund, type Woerterbuch } from '../lib/woerterbuch';
import { erklaere } from '../lib/wortfuerwort';
import { SCHILDER, Schild } from './Schild';
import { Surayt } from './Surayt';
import { Bedeutung, WortFuerWort } from './WortFuerWort';

/** So viele Lehrbuch-Sätze stehen unter „Gleich gebaut wie“. */
const VORLAGEN = 3;

/** Woran man das Merkmal im Lehrbuch sieht: „Verbtabelle“, „Artikel in: u bayto“ … */
function woher(b: Beleg | undefined): string {
  if (!b) return '';
  switch (b.art) {
    case 'verb':
      return 'laut Verbtabelle';
    case 'zahlen':
      return 'laut Zahlentabelle';
    case 'artikel':
      return `am Artikel in „${b.fund.latein}“`;
    default:
      return `laut ${herkunftKurz(b.fund) || 'Lehrbuch'}`;
  }
}

const beschreibung = (m: Merkmale) => [merkmalText(m), woher(m.belege[0])].filter(Boolean).join(' · ');

interface Props {
  z: Zusammengesetzt;
  wb: Woerterbuch;
  /** Wird aufgerufen, bevor ein Eintrag geöffnet wird (die Suche merkt sich dann, wo man war). */
  oeffnen?: () => void;
}

export function ZusammengesetztKarte({ z, wb, oeffnen }: Props) {
  const woerter = useMemo(() => erklaere(wb, z.latein), [wb, z.latein]);
  // Die Vorlage zuerst, dann die übrigen Lehrbuch-Sätze dieses Satzbaus
  const vorlagen = [...new Set<Fund>([z.vorlage.fund, ...z.satzbau.belege.map((b) => b.fund)])];
  const form = (genau: string, f: Fund) => (genau === f.latein.normalize('NFC').toLowerCase() ? undefined : genau);

  return (
    <article className="bau">
      <Schild stufe="zusammengesetzt" />
      <p className="bau__sur">
        <Surayt>{z.latein}</Surayt>
      </p>
      <p className="bau__de">{z.deutsch}</p>
      <p className="bau__warnung">{SCHILDER.zusammengesetzt.erklaerung}</p>
      <p className="bau__still">Keine Aufnahme – zusammengesetzte Sätze hat niemand eingesprochen.</p>

      <section className="bau__plan" aria-label="Bauplan">
        <h3 className="bau__titel">Bauplan</h3>
        <p className="bau__regel">
          Ein Wort getauscht: statt <Surayt className="bau__wort">{z.alt.wort.genau}</Surayt> steht{' '}
          <Surayt className="bau__wort">{z.neu.wort.genau}</Surayt>. Beide: {merkmalText(z.neu.merkmale)}.
        </p>

        <h4 className="bau__zwischen">Gleich gebaut wie</h4>
        <ul className="bau__liste">
          {vorlagen.slice(0, VORLAGEN).map((f) => (
            <Bedeutung key={f.id} fund={f} mitForm oeffnen={oeffnen} />
          ))}
        </ul>
        <p className="bau__klein">
          Das Lehrbuch zeigt diesen Satz {vorlagen.length}-mal mit verschiedenen Wörtern an derselben Stelle.
        </p>

        <h4 className="bau__zwischen">Getauscht</h4>
        <ul className="bau__liste">
          <Bedeutung
            fund={z.alt.wort.fund}
            form={form(z.alt.wort.genau, z.alt.wort.fund)}
            mitForm
            zusatz={`in der Vorlage · ${beschreibung(z.alt.merkmale)}`}
            oeffnen={oeffnen}
          />
          <Bedeutung
            fund={z.neu.wort.fund}
            form={form(z.neu.wort.genau, z.neu.wort.fund)}
            mitForm
            zusatz={`neu · ${beschreibung(z.neu.merkmale)}`}
            oeffnen={oeffnen}
          />
        </ul>

        <h4 className="bau__zwischen">Wort für Wort</h4>
        <WortFuerWort erklaerung={woerter} oeffnen={oeffnen} />
      </section>
    </article>
  );
}
