// Satz bauen (Wortbausteine) und Lückentext. Beide üben ganze Sätze aus dem
// Dialog oder Lesetext der Lektion.

import { useEffect, useState } from 'react';
import { spiele, useAudioStatus } from '../lib/audio';
import { richtigGebaut, type Schritt } from '../lib/session';
import { zerlege } from '../lib/text';
import type { Eintrag } from '../types';
import { Urteil, type Antwort } from './Aufgaben';
import { AudioButton } from './AudioButton';
import { Surayt } from './Surayt';

type BauenSchritt = Extract<Schritt, { typ: 'bauen' }>;
type LueckeSchritt = Extract<Schritt, { typ: 'luecke' }>;

interface Props<S> {
  schritt: S;
  antwort: Antwort | null;
  onAntwort: (richtig: boolean, gewaehlt: string) => void;
  onWeiter: () => void;
}

/** Lädt die Aufnahme nicht (z. B. offline), wird aus der Hör-Aufgabe eine Lese-Aufgabe. */
function useTonFehlt(e: Eintrag) {
  const status = useAudioStatus();
  const [fehlt, setFehlt] = useState(false);
  useEffect(() => {
    if (status.zustand === 'fehler' && status.url === e.audio) setFehlt(true);
  }, [status, e.audio]);
  return fehlt;
}

/** Satz bauen: Wortbausteine in die richtige Reihenfolge tippen. */
export function Bauen({ schritt, antwort, onAntwort, onWeiter }: Props<BauenSchritt>) {
  const e = schritt.eintrag;
  // Gewählte Bausteine in der Reihenfolge, in der sie angetippt wurden.
  const [gewaehlt, setGewaehlt] = useState<number[]>([]);
  const tonFehlt = useTonFehlt(e);
  const nachGehoer = schritt.nachGehoer && !tonFehlt;

  useEffect(() => {
    if (schritt.nachGehoer && e.audio) void spiele(e.audio);
  }, [e, schritt.nachGehoer]);

  const text = (id: number) => schritt.bausteine.find((b) => b.id === id)?.text ?? '';
  const nimm = (id: number) => !antwort && setGewaehlt((g) => [...g, id]);
  const legeZurueck = (id: number) => !antwort && setGewaehlt((g) => g.filter((x) => x !== id));

  const pruefe = () => {
    const gebaut = gewaehlt.map(text);
    onAntwort(richtigGebaut(schritt.loesung, gebaut), gebaut.join(' '));
    if (e.audio) void spiele(e.audio);
  };

  return (
    <div className="aufgabe">
      <div className="aufgabe__inhalt">
        <p className="aufgabe__art">Satz bauen</p>
        <h1 className="aufgabe__frage">{nachGehoer ? 'Hör zu und bau den Satz' : 'Bau den Satz auf Surayt'}</h1>

        <div className="frage">
          {nachGehoer ? (
            <>
              <AudioButton gross url={e.audio} label="den Satz" />
              {antwort && <span className="frage__de">{e.deutsch}</span>}
            </>
          ) : (
            <span className="frage__de">{e.deutsch}</span>
          )}
        </div>

        <div
          className={`bau__zeile${antwort ? (antwort.richtig ? ' bau__zeile--richtig' : ' bau__zeile--falsch') : ''}`}
          aria-label="Dein Satz"
        >
          {gewaehlt.length === 0 && <span className="bau__leer">Tippe die Wörter unten in der richtigen Reihenfolge an.</span>}
          {gewaehlt.map((id) => (
            <button
              key={id}
              type="button"
              className="baustein"
              aria-disabled={antwort !== null}
              onClick={() => legeZurueck(id)}
            >
              <Surayt>{text(id)}</Surayt>
            </button>
          ))}
        </div>

        <div className="bau__bank">
          {schritt.bausteine.map((b) =>
            gewaehlt.includes(b.id) ? (
              // Der Platz bleibt frei, damit die anderen Bausteine nicht verrutschen.
              <span key={b.id} className="baustein baustein--weg" aria-hidden="true">
                {b.text}
              </span>
            ) : (
              <button
                key={b.id}
                type="button"
                className="baustein"
                aria-disabled={antwort !== null}
                onClick={() => nimm(b.id)}
              >
                <Surayt>{b.text}</Surayt>
              </button>
            ),
          )}
        </div>
      </div>

      <Urteil antwort={antwort} eintrag={e} onWeiter={onWeiter}>
        <button type="button" className="knopf" disabled={gewaehlt.length === 0} onClick={pruefe}>
          Prüfen
        </button>
      </Urteil>
    </div>
  );
}

/** Lückentext: Welches Wort fehlt im Satz? */
export function Luecke({ schritt, antwort, onAntwort, onWeiter }: Props<LueckeSchritt>) {
  const e = schritt.eintrag;
  const { vor, nach } = zerlege(schritt.teile[schritt.luecke]);

  const waehle = (wort: string) => {
    if (antwort) return;
    onAntwort(wort === schritt.loesung, wort);
    if (e.audio) void spiele(e.audio);
  };

  return (
    <div className="aufgabe">
      <div className="aufgabe__inhalt">
        <p className="aufgabe__art">Lückentext</p>
        <h1 className="aufgabe__frage">Welches Wort fehlt?</h1>

        <div className="frage frage--luecke">
          <p className="luecke__satz">
            <Surayt>
              {schritt.teile.map((teil, i) => (
                <span key={i}>
                  {i > 0 && ' '}
                  {i === schritt.luecke ? (
                    <>
                      {vor}
                      <span className={`luecke__platz${antwort ? ' luecke__platz--voll' : ''}`}>
                        {antwort ? schritt.loesung : <span className="nur-vorlesen">Lücke</span>}
                      </span>
                      {nach}
                    </>
                  ) : (
                    teil
                  )}
                </span>
              ))}
            </Surayt>
          </p>
          <p className="luecke__de">{e.deutsch}</p>
        </div>

        <ul className="optionen optionen--woerter">
          {schritt.optionen.map((wort) => {
            const zustand = !antwort
              ? ''
              : wort === schritt.loesung
                ? ' option--richtig'
                : wort === antwort.gewaehlt
                  ? ' option--falsch'
                  : ' option--blass';
            return (
              <li key={wort}>
                <button
                  type="button"
                  className={`option option--mitte${zustand}`}
                  aria-disabled={antwort !== null}
                  onClick={() => waehle(wort)}
                >
                  <Surayt>{wort}</Surayt>
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
