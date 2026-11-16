// Nachsprechen: Original anhören, sich selbst aufnehmen, beides vergleichen und
// selbst sagen, ob es schon gut klingt. Die Aufnahme verlässt das Handy nicht
// und ist weg, sobald die Aufgabe vorbei ist.

import { useEffect, useRef, useState } from 'react';
import { kannAufnehmen, nimmAuf, type LaufendeAufnahme } from '../lib/aufnahme';
import { spiele, stopp, useAudioStatus } from '../lib/audio';
import type { Schritt } from '../lib/session';
import { vorHinweis } from '../lib/text';
import { AudioButton } from './AudioButton';
import { IconMikro, IconStopp, IconTon } from './Icons';
import { Surayt } from './Surayt';

type SprechenSchritt = Extract<Schritt, { typ: 'sprechen' }>;
type Phase = 'bereit' | 'startet' | 'nimmt' | 'fertig' | 'ohne';

interface Props {
  schritt: SprechenSchritt;
  /** Weiter zur nächsten Aufgabe; `gesprochen`: wirklich nachgesprochen (zählt für XP). */
  onFertig: (gesprochen: boolean) => void;
  /** „Kann gerade nicht sprechen“ */
  onAus: () => void;
}

export function Nachsprechen({ schritt, onFertig, onAus }: Props) {
  const e = schritt.eintrag;
  const [phase, setPhase] = useState<Phase>(kannAufnehmen() ? 'bereit' : 'ohne');
  const [eigene, setEigene] = useState<string | null>(null);
  const laufend = useRef<LaufendeAufnahme | null>(null);
  const status = useAudioStatus();

  useEffect(() => {
    if (e.audio) void spiele(e.audio);
  }, [e]);

  // Beim Verlassen: Aufnahme beenden, Mikrofon freigeben, Aufnahme verwerfen.
  const weg = useRef(false);
  useEffect(() => {
    weg.current = false;
    return () => {
      weg.current = true;
      laufend.current?.stoppe();
    };
  }, []);
  useEffect(
    () => () => {
      if (eigene) URL.revokeObjectURL(eigene);
    },
    [eigene],
  );

  async function starte() {
    stopp(); // sonst nimmt das Mikrofon das Original mit auf
    setPhase('startet');
    try {
      const aufnahme = await nimmAuf();
      laufend.current = aufnahme;
      setPhase('nimmt');
      const url = await aufnahme.fertig;
      laufend.current = null;
      if (url && weg.current) return URL.revokeObjectURL(url);
      if (!url) return setPhase('bereit');
      setEigene(url);
      setPhase('fertig');
      void spiele(url);
    } catch {
      // Mikrofon nicht erlaubt oder nicht vorhanden – dann eben ohne Aufnahme.
      setPhase('ohne');
    }
  }

  function nochmal() {
    stopp();
    setEigene(null);
    setPhase('bereit');
  }

  const spielt = (url: string | null | undefined) => !!url && status.url === url && status.zustand !== 'fehler';

  return (
    <div className="aufgabe">
      <div className="aufgabe__inhalt">
        <p className="aufgabe__art">Nachsprechen</p>
        <h1 className="aufgabe__frage">Hör zu und sprich nach</h1>

        <div className="karte karte--offen karte--sprechen">
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
          <p className="karte__de">{e.deutsch}</p>
        </div>

        <div className="sprechen" aria-live="polite">
          {(phase === 'bereit' || phase === 'startet') && (
            <>
              <button type="button" className="mikro" onClick={starte} disabled={phase === 'startet'}>
                <IconMikro size={34} />
                <span className="nur-vorlesen">Aufnahme starten</span>
              </button>
              <p className="sprechen__text">Tippe aufs Mikrofon und sprich nach.</p>
            </>
          )}
          {phase === 'nimmt' && (
            <>
              <button type="button" className="mikro mikro--an" onClick={() => laufend.current?.stoppe()}>
                <IconStopp size={30} />
                <span className="nur-vorlesen">Aufnahme beenden</span>
              </button>
              <p className="sprechen__text">Ich höre zu … Tippe zum Beenden.</p>
            </>
          )}
          {phase === 'fertig' && eigene && (
            <>
              <div className="vergleich">
                <button
                  type="button"
                  className={`vergleich__knopf${spielt(e.audio) ? ' vergleich__knopf--an' : ''}`}
                  onClick={() => e.audio && void spiele(e.audio)}
                >
                  <IconTon size={22} /> Original
                </button>
                <button
                  type="button"
                  className={`vergleich__knopf vergleich__knopf--du${spielt(eigene) ? ' vergleich__knopf--an' : ''}`}
                  onClick={() => void spiele(eigene)}
                >
                  <IconTon size={22} /> Du
                </button>
              </div>
              <p className="sprechen__text">Hör dir beides an. Klingt deins schon ähnlich?</p>
            </>
          )}
          {phase === 'ohne' && (
            <p className="sprechen__text">
              Das Mikrofon ist gerade nicht verfügbar. Sprich einfach laut nach – das hilft auch.
            </p>
          )}
          {phase !== 'ohne' && <p className="sprechen__datenschutz">Deine Aufnahme bleibt auf dem Handy und wird danach gelöscht.</p>}
        </div>
      </div>

      <footer className="aufgabe__fuss">
        {phase === 'fertig' ? (
          <div className="zwei">
            <button type="button" className="knopf knopf--zweit" onClick={nochmal}>
              Nochmal
            </button>
            <button type="button" className="knopf" onClick={() => onFertig(true)}>
              Klingt gut!
            </button>
          </div>
        ) : phase === 'ohne' ? (
          <div className="zwei">
            <button type="button" className="knopf knopf--zweit" onClick={() => onFertig(false)}>
              Überspringen
            </button>
            <button type="button" className="knopf" onClick={() => onFertig(true)}>
              Hab’s gesagt
            </button>
          </div>
        ) : (
          <button type="button" className="knopf knopf--zweit" onClick={onAus} disabled={phase === 'nimmt'}>
            Kann gerade nicht sprechen
          </button>
        )}
      </footer>
    </div>
  );
}
