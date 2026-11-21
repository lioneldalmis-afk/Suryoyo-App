// Die Übungstypen: Karteikarte, Multiple Choice, Hören & Auswählen und Hörpaar.
// Alle außer der Karteikarte teilen sich eine Komponente – sie unterscheiden
// sich nur darin, was als Frage und als Antwort zu sehen ist. Satz bauen und
// Lückentext stehen in Satzaufgaben.tsx, Nachsprechen in Nachsprechen.tsx.

import { useEffect, useState, type ReactNode } from 'react';
import { spiele, useAudioStatus } from '../lib/audio';
import type { Schritt } from '../lib/session';
import { vorHinweis } from '../lib/text';
import type { Eintrag } from '../types';
import { AudioButton } from './AudioButton';
import { IconHaken, IconSchliessen } from './Icons';
import { Surayt } from './Surayt';

type KarteSchritt = Extract<Schritt, { typ: 'karte' }>;
type AuswahlSchritt = Extract<Schritt, { typ: 'wahl' | 'hoeren' | 'paar' }>;

export interface Antwort {
  richtig: boolean;
  gewaehlt: string;
}

/**
 * Fußleiste einer Aufgabe: vor der Antwort z. B. „Prüfen“ (`children`), danach
 * „Richtig!“ oder die Lösung, mit „Weiter“.
 */
export function Urteil(props: { antwort: Antwort | null; eintrag: Eintrag; onWeiter: () => void; children?: ReactNode }) {
  const { antwort, eintrag: e } = props;
  return (
    <footer
      className={`aufgabe__fuss${antwort ? (antwort.richtig ? ' aufgabe__fuss--richtig' : ' aufgabe__fuss--falsch') : ''}`}
      aria-live="polite"
    >
      {antwort ? (
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
          <button type="button" className="knopf" autoFocus onClick={props.onWeiter}>
            Weiter
          </button>
        </>
      ) : (
        props.children
      )}
    </footer>
  );
}

/**
 * Karteikarte. Vorne Surayt in Schrift und Ton, hinten Deutsch – so lässt sie
 * sich auch ohne Ton lernen. `umgekehrt` (für Einträge, die schon sitzen): vorne
 * Deutsch, hinten Surayt. Neue Einträge zeigen gleich beide Seiten.
 */
export function Karte({ schritt, onFertig }: { schritt: KarteSchritt; onFertig: (gewusst: boolean | null) => void }) {
  const e = schritt.eintrag;
  const umgekehrt = !!schritt.umgekehrt && !schritt.neu;
  const [offen, setOffen] = useState(schritt.neu);

  // Ist Surayt vorne, gleich vorspielen; bei der umgedrehten Karte erst beim Aufdecken.
  useEffect(() => {
    if (!umgekehrt && e.audio) void spiele(e.audio);
  }, [e, umgekehrt]);

  const aufdecken = () => {
    setOffen(true);
    if (umgekehrt && e.audio) void spiele(e.audio);
  };

  const surayt = (
    <>
      <AudioButton gross url={e.audio} label={e.latein} />
      <p className="karte__sur">
        <Surayt>{e.latein}</Surayt>
        {e.hinweis && (
          <span className="karte__hinweis">
            {vorHinweis(e.hinweis)}
            {e.hinweis}
          </span>
        )}
      </p>
    </>
  );

  return (
    <div className="aufgabe">
      <div className="aufgabe__inhalt">
        <p className="aufgabe__art">
          {schritt.neu ? (e.art === 'satz' ? 'Neuer Satz' : 'Neues Wort') : umgekehrt ? 'Karteikarte · umgedreht' : 'Karteikarte'}
        </p>
        <h1 className="aufgabe__frage">
          {schritt.neu
            ? 'Hör zu und merk es dir'
            : umgekehrt
              ? offen
                ? 'Auf Surayt heißt das:'
                : 'Wie heißt das auf Surayt?'
              : offen
                ? 'Das heißt:'
                : 'Was heißt das?'}
        </h1>
        <div className={`karte${offen ? ' karte--offen' : ''}`}>
          {umgekehrt ? (
            <>
              <p className="karte__de karte__de--vorne">{e.deutsch}</p>
              {offen ? surayt : <p className="karte__verdeckt">Sag es laut, dann deck auf.</p>}
            </>
          ) : (
            <>
              {surayt}
              {offen ? (
                <p className="karte__de">{e.deutsch}</p>
              ) : (
                <p className="karte__verdeckt">Überleg, was es heißt – dann deck auf.</p>
              )}
            </>
          )}
        </div>
      </div>

      <footer className="aufgabe__fuss">
        {!offen ? (
          <button type="button" className="knopf" onClick={aufdecken}>
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
  antwort: Antwort | null;
  onAntwort: (gewaehlt: Eintrag) => void;
  onWeiter: () => void;
}

/** Multiple Choice (Surayt ↔ Deutsch), Hören & Auswählen und Hörpaar. */
export function Auswahl({ schritt, antwort, onAntwort, onWeiter }: AuswahlProps) {
  const e = schritt.eintrag;
  const paar = schritt.typ === 'paar';
  const nurHoeren = schritt.typ === 'hoeren' || paar;
  // Genau hinhören: die richtige Schreibweise unter ähnlichen Wörtern finden.
  const schreibweise = schritt.typ === 'hoeren' && !!schritt.schreibweise;
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
        <p className="aufgabe__art">
          {paar ? (
            <>
              Hörpaar <Surayt>{schritt.laute}</Surayt>
            </>
          ) : schreibweise ? (
            'Genau hinhören'
          ) : nurHoeren ? (
            'Hören & Auswählen'
          ) : (
            'Multiple Choice'
          )}
        </p>
        <h1 className="aufgabe__frage">
          {paar || schreibweise
            ? e.art === 'satz'
              ? 'Welchen Satz hörst du?'
              : 'Welches Wort hörst du?'
            : nurHoeren
              ? 'Was hörst du?'
              : frageAufSurayt
                ? 'Was bedeutet das?'
                : 'Wie sagt man das auf Surayt?'}
        </h1>

        <div className="frage">
          {nurHoeren ? (
            <>
              <AudioButton gross url={e.audio} label="die Aufnahme" />
              {/* Ohne Ton: beim Hinhören die Bedeutung zeigen – das Wort selbst wäre die Lösung. */}
              {(antwort || tonFehlt) &&
                (schreibweise && !antwort ? (
                  <span className="frage__de">{e.deutsch}</span>
                ) : (
                  <Surayt className="frage__sur">{e.latein}</Surayt>
                ))}
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
                  {paar ? (
                    <span className="option__paar">
                      <Surayt className="option__sur">{option.latein}</Surayt>
                      <span className="option__de">{option.deutsch}</span>
                    </span>
                  ) : frageAufSurayt && !schreibweise ? (
                    option.deutsch
                  ) : (
                    <Surayt>{option.latein}</Surayt>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Urteil antwort={antwort} eintrag={e} onWeiter={onWeiter} />
    </div>
  );
}
