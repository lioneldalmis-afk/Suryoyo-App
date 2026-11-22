// Zusammengesetzte Sätze (Fahrplan, Phase 4b, Schritt 4 und 5): Der Baukasten hat
// sie gebaut – nach einem Lehrbuch-Satz, in dem ein Wort getauscht ist
// (`ZusammengesetztKarte`), oder nach Regeln aus der Grammatik (`RegelKarte`).
// Beide tragen das orange Schild, haben keine Aufnahme und keinen großen
// Lautsprecher. Darunter steht der Bauplan: was gebaut wurde und warum, welche
// Lehrbuch-Sätze es belegen (mit Aufnahme) und jedes Wort einzeln.

import { useMemo, type ReactNode } from 'react';
import { merkmalText, type Beleg, type Merkmale, type Zusammengesetzt } from '../lib/baukasten';
import { beispielFuer, regelVon, type Regelsatz, type Stueck } from '../lib/regeln';
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
  /** Bauplan aufgeklappt (bei der ersten Karte) */
  offen?: boolean;
  /** Wird aufgerufen, bevor ein Eintrag geöffnet wird (die Suche merkt sich dann, wo man war). */
  oeffnen?: () => void;
}

export function ZusammengesetztKarte({ z, wb, offen = true, oeffnen }: Props) {
  const woerter = useMemo(() => erklaere(wb, z.latein), [wb, z.latein]);
  // Die Vorlage zuerst, dann die übrigen Lehrbuch-Sätze dieses Satzbaus
  const vorlagen = [...new Set<Fund>([z.vorlage.fund, ...z.satzbau.belege.map((b) => b.fund)])];
  const form = (genau: string, f: Fund) => (genau === f.latein.normalize('NFC').toLowerCase() ? undefined : genau);

  return (
    <Karte latein={z.latein} deutsch={z.deutsch} offen={offen}>
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
    </Karte>
  );
}

/** Kopf jeder Karte: Schild, Satz, Warnung – darunter der Bauplan. */
function Karte({ latein, deutsch, variante, offen, children }: { latein: string; deutsch: string; variante?: string; offen: boolean; children: ReactNode }) {
  return (
    <article className="bau">
      <div className="bau__schilder">
        <Schild stufe="zusammengesetzt" />
        {variante && <span className="bau__variante">{variante}</span>}
      </div>
      <p className="bau__sur">
        <Surayt>{latein}</Surayt>
      </p>
      <p className="bau__de">{deutsch}</p>
      <p className="bau__warnung">{SCHILDER.zusammengesetzt.erklaerung}</p>
      <p className="bau__still">Keine Aufnahme – zusammengesetzte Sätze hat niemand eingesprochen.</p>
      <details className="bau__plan" open={offen}>
        <summary className="bau__titel">Bauplan</summary>
        {children}
      </details>
    </article>
  );
}

/** Ein Wort des gebauten Satzes: Eintrag mit Herkunft und Aufnahme, bei zusammengesetzten Wörtern die Teile. */
function Wort({ s, oeffnen }: { s: Stueck; oeffnen?: () => void }) {
  const zusatz = [s.rolle, s.merkmal].filter(Boolean).join(' · ');
  if (s.fund && !s.aus) {
    const form = s.text.normalize('NFC').toLowerCase() === s.fund.latein.normalize('NFC').toLowerCase() ? undefined : s.text;
    return <Bedeutung fund={s.fund} form={form} mitForm zusatz={zusatz} oeffnen={oeffnen} />;
  }
  return (
    <li className="bau__wortgruppe">
      <p className="bau__teilwort">
        <Surayt className="bau__wort">{s.text}</Surayt> <span>{zusatz}</span>
      </p>
      <ul className="bau__teile">
        {(s.aus ?? []).map((t, i) => (
          <Bedeutung key={i} fund={t.fund} form={t.text} mitForm zusatz={t.rolle} oeffnen={oeffnen} />
        ))}
      </ul>
    </li>
  );
}

/** Ein Satz nach Regeln aus der Grammatik (Phase 4b, Schritt 5). */
export function RegelKarte({ r, wb, offen = true, oeffnen }: { r: Regelsatz; wb: Woerterbuch; offen?: boolean; oeffnen?: () => void }) {
  // Jede Regel einmal, die äußere zuerst
  const regeln = [...new Set(r.regeln.map((x) => x.regel))].map((id) => regelVon(wb, id));
  return (
    <Karte latein={r.latein} deutsch={r.deutsch} variante={r.variante} offen={offen}>
      <h4 className="bau__zwischen">{regeln.length === 1 ? 'Regel aus dem Lehrbuch' : 'Regeln aus dem Lehrbuch'}</h4>
      <ol className="bau__regeln">
        {regeln.map((regel) => {
          const beispiel = beispielFuer(wb, regel.id);
          return (
            <li key={regel.id} className="bau__regel-eintrag">
              <p className="bau__regelname">
                {regel.name} <span>· {regel.kapitel}</span>
              </p>
              {regel.zitat[0] && <blockquote className="bau__zitat">{regel.zitat[0]}</blockquote>}
              {beispiel && (
                <ul className="bau__liste">
                  <Bedeutung fund={beispiel} mitForm zusatz="Beispiel im Lehrbuch" oeffnen={oeffnen} />
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <h4 className="bau__zwischen">Die Wörter</h4>
      <ul className="bau__liste">
        {r.stuecke.map((s, i) => (
          <Wort key={i} s={s} oeffnen={oeffnen} />
        ))}
      </ul>
    </Karte>
  );
}
