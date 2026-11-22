// Wort für Wort (Fahrplan, Phase 4b, Schritt 3): jedes Wort eines Surayt-Satzes
// mit seinen Bedeutungen aus den Daten. Zerlegte Wörter tragen das orange
// Schild – die Teile stehen im Lehrbuch, die Zerlegung hat niemand geprüft.
// Einen deutschen Satz baut die App daraus nicht.

import { href } from '../lib/router';
import { fold, vorHinweis } from '../lib/text';
import { ausTabelle, herkunftKurz, merkmalText, stufeVon, type Fund } from '../lib/woerterbuch';
import type { Erklaerung, Wortteil } from '../lib/wortfuerwort';
import { AudioButton } from './AudioButton';
import { IconPfeil } from './Icons';
import { Schild } from './Schild';
import { Surayt } from './Surayt';

interface Props {
  erklaerung: Erklaerung;
  /** Wird aufgerufen, bevor ein Eintrag geöffnet wird (die Suche merkt sich dann, wo man war). */
  oeffnen?: () => void;
}

export function WortFuerWort({ erklaerung, oeffnen }: Props) {
  return (
    <>
      <ol className="wfw" aria-label="Wort für Wort">
        {erklaerung.teile.map((t, i) => (
          <li key={i} className={`wfw__zeile wfw__zeile--${t.art}`}>
            <p className="wfw__wort">
              <Surayt>{t.text}</Surayt>
            </p>
            <div className="wfw__erklaerung">
              <Teil teil={t} oeffnen={oeffnen} />
            </div>
          </li>
        ))}
      </ol>
      {erklaerung.gekuerzt && <p className="wfw__fuss">Erklärt sind die ersten {erklaerung.woerter} Wörter.</p>}
    </>
  );
}

function Teil({ teil, oeffnen }: { teil: Wortteil; oeffnen?: () => void }) {
  switch (teil.art) {
    case 'eintrag':
      return (
        <ul>
          {teil.funde.map((f) => (
            <Bedeutung key={f.id} fund={f} wort={teil.text} oeffnen={oeffnen} />
          ))}
        </ul>
      );
    case 'zerlegt':
      return (
        <>
          <p className="wfw__regel">
            <Schild stufe="zusammengesetzt" klein />
            <span>
              {teil.regel.name} · nach {teil.regel.kapitel}
            </span>
          </p>
          <ul>
            {teil.stuecke.map((s, k) =>
              s.funde.slice(0, 1).map((f) => <Bedeutung key={`${k}-${f.id}`} fund={f} mitForm ohneSchild oeffnen={oeffnen} />),
            )}
          </ul>
          {teil.beleg && (
            <>
              <p className="wfw__hinweis">So im Lehrbuch:</p>
              <ul>
                <Bedeutung fund={teil.beleg} mitForm oeffnen={oeffnen} />
              </ul>
            </>
          )}
        </>
      );
    case 'im-satz':
      return (
        <>
          <p className="wfw__hinweis">Steht nicht einzeln im Übersetzer. Kommt so vor in:</p>
          <ul>
            {teil.saetze.map((f) => (
              <Bedeutung key={f.id} fund={f} mitForm oeffnen={oeffnen} />
            ))}
          </ul>
        </>
      );
    case 'aehnlich':
      return (
        <>
          <p className="wfw__hinweis">Nicht genau so gefunden. Ähnlich geschrieben:</p>
          <ul>
            {teil.funde.map((f) => (
              <Bedeutung key={f.id} fund={f} mitForm oeffnen={oeffnen} />
            ))}
          </ul>
        </>
      );
    case 'unbekannt':
      return <p className="wfw__hinweis">Nicht im Übersetzer.</p>;
  }
}

/** Gleiche Wörter, nur anders geschrieben (Großbuchstaben, Sonderzeichen, Satzzeichen)? */
const gleich = (a: string, b: string) => fold(a).replace(/[^a-z0-9]+/g, ' ').trim() === fold(b).replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Eine Bedeutung als Link zum Eintrag. Die Umschrift des Eintrags steht nur da,
 * wenn sie nicht ohnehin das Wort links ist (`mitForm`: immer). `zusatz` ersetzt
 * die Beschriftung aus der Tabelle (der Baukasten sagt dort, was das Wort ist).
 */
export function Bedeutung({
  fund,
  wort,
  mitForm = false,
  ohneSchild = false,
  zusatz,
  form: andereForm,
  oeffnen,
}: {
  fund: Fund;
  wort?: string;
  mitForm?: boolean;
  ohneSchild?: boolean;
  zusatz?: string;
  /** Diese Form statt des Stichworts zeigen (eine Form, die der Eintrag nur aufzählt, z. B. die Mehrzahl). */
  form?: string;
  oeffnen?: () => void;
}) {
  const form = mitForm || !wort || !gleich(fund.latein, wort);
  const merkmal = zusatz ?? (ausTabelle(fund) && fund.merkmal ? merkmalText(fund) : '');
  return (
    <li className="wfw__bedeutung">
      <a className="wfw__link" href={href({ name: 'uebersetzer', id: fund.id })} onClick={oeffnen}>
        <span className="wfw__text">
          {form && (
            <span className="wfw__form">
              <Surayt>{andereForm ?? fund.latein}</Surayt>
              {fund.hinweis && !andereForm && (
                <span className="wort__hinweis">
                  {vorHinweis(fund.hinweis)}
                  {fund.hinweis}
                </span>
              )}
            </span>
          )}
          <span className="wfw__de">{fund.deutsch}</span>
          {merkmal && <span className="wfw__merkmal">{merkmal}</span>}
          {!ohneSchild && (
            <span className="fund__wo">
              <Schild stufe={stufeVon(fund)} klein />
              {herkunftKurz(fund)}
            </span>
          )}
        </span>
        <IconPfeil size={16} />
      </a>
      {fund.audio && <AudioButton url={fund.audio} label={fund.latein} klein />}
    </li>
  );
}
