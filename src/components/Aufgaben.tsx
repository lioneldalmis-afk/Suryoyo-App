// Die drei Übungstypen: Karteikarte, Multiple Choice und Hören & Auswählen.
// Multiple Choice und Hören teilen sich eine Komponente – sie unterscheiden
// sich nur darin, was als Frage zu sehen ist.

import { useEffect, useState } from 'react';
import { spiele, useAudioStatus } from '../lib/audio';
import type { Schritt } from '../lib/session';
import { vorHinweis } from '../lib/text';
import type { Eintrag } from '../types';
import { AudioButton } from './AudioButton';
import { IconHaken, IconSchliessen } from './Icons';
import { Surayt } from './Surayt';

type KarteSchritt = Extract<Schritt, { typ: 'karte' }>;
type AuswahlSchritt = Exclude<Schritt, { typ: 'karte' }>;

/** Karteikarte: erst nur hören, dann aufdecken. */
export function Karte({ schritt, onFertig }: { schritt: KarteSchritt; onFertig: (gewusst: boolean | null) => void }) {
  const e = schritt.eintrag;
  // Ohne Aufnahme gibt es nichts zu hören – dann steht das Wort gleich da.
  const [offen, setOffen] = useState(!e.audio);

  useEffect(() => {
    if (e.audio) void spiele(e.audio);
  }, [e]);

  return (
    <div className="aufgabe">
      <div className="aufgabe__inhalt">
        <p className="aufgabe__art">{schritt.neu ? (e.art === 'satz' ? 'Neuer Satz' : 'Neues Wort') : 'Karteikarte'}</p>
        <h1 className="aufgabe__frage">{offen ? 'Das heißt:' : 'Hör zu. Was könnte das heißen?'}</h1>
        <div className={`karte${offen ? ' karte--offen' : ''}`}>
          <AudioButton gross url={e.audio} label={offen ? e.latein : 'das gesuchte Wort'} />
          {offen ? (
            <>
              <p className="karte__sur">
                <Surayt>{e.latein}</Surayt>
                {e.hinweis && (
                  <span className="karte__hinweis">
                    {vorHinweis(e.hinweis)}
                    {e.hinweis}
                  </span>
                )}
              </p>
              <p className="karte__de">{e.deutsch}</p>
            </>
          ) : (
            <p className="karte__verdeckt">Tippe auf den Lautsprecher, um es nochmal zu hören.</p>
          )}
        </div>
      </div>

      <footer className="aufgabe__fuss">
        {!offen ? (
          <button type="button" className="knopf" onClick={() => setOffen(true)}>
            Aufdecken
          </button>
        ) : schritt.neu ? (
          <button type="button" className="knopf" onClick={() => onFertig(null)}>
            Weiter
          </button>
        ) : (
          <div className="zwei">
            <button type="button" className="knopf knopf--zweit" onClick={() => onFertig(false)}>
              Noch nicht
            </button>
            <button type="button" className="knopf" onClick={() => onFertig(true)}>
              Wusste ich
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}

interface AuswahlProps {
  schritt: AuswahlSchritt;
  antwort: { richtig: boolean; gewaehlt: string } | null;
  onAntwort: (gewaehlt: Eintrag) => void;
  onWeiter: () => void;
}

/** Multiple Choice (Surayt ↔ Deutsch) und Hören & Auswählen. */
export function Auswahl({ schritt, antwort, onAntwort, onWeiter }: AuswahlProps) {
  const e = schritt.eintrag;
  const nurHoeren = schritt.typ === 'hoeren';
  // Gefragt wird auf Surayt (gelesen oder gehört), geantwortet auf Deutsch – oder umgekehrt.
  const frageAufSurayt = nurHoeren || schritt.richtung === 'sur-de';

  useEffect(() => {
    if (frageAufSurayt && e.audio) void spiele(e.audio);
  }, [e, frageAufSurayt]);

  // Lädt die Aufnahme nicht (z. B. offline), steht das Wort stattdessen da –
  // aus der Hör-Aufgabe wird dann eine Lese-Aufgabe.
  const status = useAudioStatus();
  const [tonFehlt, setTonFehlt] = useState(false);
  useEffect(() => {
    if (status.zustand === 'fehler' && status.url === e.audio) setTonFehlt(true);
  }, [status, e.audio]);

  const waehle = (option: Eintrag) => {
    if (antwort) return;
    onAntwort(option);
    // Nach der Antwort auf „Wie sagt man …?“ die richtige Lösung vorspielen.
    if (!frageAufSurayt && e.audio) void spiele(e.audio);
  };

  return (
    <div className="aufgabe">
      <div className="aufgabe__inhalt">
        <p className="aufgabe__art">{nurHoeren ? 'Hören & Auswählen' : 'Multiple Choice'}</p>
        <h1 className="aufgabe__frage">
          {nurHoeren ? 'Was hörst du?' : frageAufSurayt ? 'Was bedeutet das?' : 'Wie sagt man das auf Surayt?'}
        </h1>

        <div className="frage">
          {nurHoeren ? (
            <>
              <AudioButton gross url={e.audio} label="die Aufnahme" />
              {(antwort || tonFehlt) && <Surayt className="frage__sur">{e.latein}</Surayt>}
            </>
          ) : frageAufSurayt ? (
            <>
              <AudioButton url={e.audio} label={e.latein} />
              <Surayt className="frage__sur">{e.latein}</Surayt>
            </>
          ) : (
            <span className="frage__de">{e.deutsch}</span>
          )}
        </div>

        <ul className="optionen">
          {schritt.optionen.map((option) => {
            const richtige = option.id === e.id;
            const zustand = !antwort
              ? ''
              : richtige
                ? ' option--richtig'
                : option.id === antwort.gewaehlt
                  ? ' option--falsch'
                  : ' option--blass';
            return (
              <li key={option.id}>
                <button
                  type="button"
                  className={`option${zustand}`}
                  aria-disabled={antwort !== null}
                  onClick={() => waehle(option)}
                >
                  {frageAufSurayt ? option.deutsch : <Surayt>{option.latein}</Surayt>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <footer
        className={`aufgabe__fuss${antwort ? (antwort.richtig ? ' aufgabe__fuss--richtig' : ' aufgabe__fuss--falsch') : ''}`}
        aria-live="polite"
      >
        {antwort && (
          <>
            <div className="urteil">
              <span className="urteil__icon">{antwort.richtig ? <IconHaken /> : <IconSchliessen />}</span>
              <div>
                <strong>{antwort.richtig ? 'Richtig!' : 'Richtig ist:'}</strong>
                <p>
                  <Surayt>{e.latein}</Surayt> = {e.deutsch}
                </p>
              </div>
            </div>
            <button type="button" className="knopf" autoFocus onClick={onWeiter}>
              Weiter
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
