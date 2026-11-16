import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { AudioButton } from '../components/AudioButton';
import { IconKarten, IconOhr, IconPfeil, IconPlay, IconStopp, IconWahl, IconZurueck } from '../components/Icons';
import { ProgressRing } from '../components/ProgressRing';
import { Surayt } from '../components/Surayt';
import { istDialog, verfuegbar } from '../data';
import { entsperren, spiele, stopp, useAudioStatus } from '../lib/audio';
import { stufe, useFortschritt } from '../lib/progress';
import { ersetze, href, type LektionTab } from '../lib/router';
import { lektionsstand, type Uebungsart } from '../lib/session';
import { AusspracheAnsicht } from './Aussprache';
import { vorHinweis } from '../lib/text';
import type { Eintrag, Lektion } from '../types';

export function LektionScreen({ nr, tab, anker }: { nr: number; tab: LektionTab; anker?: string }) {
  const lektion = verfuegbar.get(nr);
  if (!lektion) {
    return (
      <div className="seite leer">
        <p>Diese Lektion gibt es noch nicht.</p>
        <a className="knopf" href={href({ name: 'start' })}>
          Zum Lernpfad
        </a>
      </div>
    );
  }

  const reiter: { tab: LektionTab; name: string }[] = [
    { tab: 'text', name: ersterReiter(lektion) },
    { tab: 'woerter', name: 'Wörter' },
    { tab: 'ueben', name: 'Üben' },
  ];

  // Reiterwechsel ersetzt die Adresse: „Zurück“ führt so direkt zum Lernpfad.
  const wechsle = (ziel: LektionTab) => (ereignis: MouseEvent) => {
    ereignis.preventDefault();
    ersetze({ name: 'lektion', nr, tab: ziel });
  };

  return (
    <div className="seite lektion">
      <header className="kopf">
        <a className="kopf__zurueck" href={href({ name: 'start' })} aria-label="Zurück zum Lernpfad">
          <IconZurueck />
        </a>
        <div className="kopf__titel">
          <h1>
            <Surayt>{lektion.titel.latein}</Surayt>
          </h1>
          <span>
            Lektion {nr} · {lektion.titel.deutsch}
          </span>
        </div>
        <AudioButton url={lektion.titel.audio} label={lektion.titel.latein} />
      </header>

      <nav className="reiter" aria-label="Bereiche der Lektion">
        {reiter.map((r) => (
          <a
            key={r.tab}
            href={href({ name: 'lektion', nr, tab: r.tab })}
            className={r.tab === tab ? 'reiter__aktiv' : undefined}
            aria-current={r.tab === tab ? 'page' : undefined}
            onClick={wechsle(r.tab)}
          >
            {r.name}
          </a>
        ))}
      </nav>

      <main>
        {tab === 'text' &&
          (lektion.aussprache ? <AusspracheAnsicht lektion={lektion} anker={anker} /> : <Text lektion={lektion} />)}
        {tab === 'woerter' && <Woerter lektion={lektion} />}
        {tab === 'ueben' && <Ueben lektion={lektion} />}
      </main>
    </div>
  );
}

/** Der erste Reiter heißt nach seinem Inhalt. */
function ersterReiter(lektion: Lektion) {
  if (lektion.aussprache) return lektion.aussprache.alphabet ? 'Alphabet' : 'Laute';
  return istDialog(lektion) ? 'Dialog' : 'Text';
}

// --- Dialog oder Lesetext ----------------------------------------------------

function Text({ lektion }: { lektion: Lektion }) {
  const [mitDeutsch, setMitDeutsch] = useState(true);
  const [laeuft, setLaeuft] = useState(false);
  const status = useAudioStatus();
  // Zählt hoch, sobald „Alles anhören“ neu gestartet oder abgebrochen wird.
  const durchlauf = useRef(0);
  useEffect(() => () => void durchlauf.current++, []);

  const dialog = istDialog(lektion);
  // Die Überschrift des Textes nur zeigen, wenn sie nicht schon der Lektionstitel ist.
  const ueberschrift = lektion.textTitel?.latein !== lektion.titel.latein ? lektion.textTitel : undefined;

  async function allesAnhoeren() {
    const meiner = ++durchlauf.current;
    setLaeuft(true);
    for (const zeile of lektion.text) {
      if (!zeile.audio) continue;
      document.getElementById(zeile.id)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const ausgang = await spiele(zeile.audio);
      if (ausgang !== 'ende' || durchlauf.current !== meiner) break;
      await new Promise((r) => setTimeout(r, 400));
      if (durchlauf.current !== meiner) break;
    }
    if (durchlauf.current === meiner) setLaeuft(false);
  }

  function anhalten() {
    durchlauf.current++;
    setLaeuft(false);
    stopp();
  }

  // Eine Zeile antippen spielt sie ab; nochmal antippen hält sie an.
  const aktiv = (zeile: Eintrag) => status.url === zeile.audio && status.zustand !== 'fehler';
  const tippe = (zeile: Eintrag) => {
    if (aktiv(zeile) && !laeuft) stopp();
    else if (zeile.audio) void spiele(zeile.audio);
  };

  return (
    <>
      <div className="werkzeug">
        <button type="button" className="knopf knopf--klein" onClick={laeuft ? anhalten : allesAnhoeren}>
          {laeuft ? <IconStopp size={18} /> : <IconPlay size={18} />}
          {laeuft ? 'Anhalten' : 'Alles anhören'}
        </button>
        <label className="schalter">
          <input type="checkbox" checked={mitDeutsch} onChange={(e) => setMitDeutsch(e.target.checked)} />
          <span>Deutsch zeigen</span>
        </label>
      </div>

      {lektion.einleitung.length > 0 && (
        <section className="situation">
          <h2>Worum geht’s?</h2>
          {lektion.einleitung.map((satz) => (
            <div key={satz.id} className="situation__satz">
              <AudioButton url={satz.audio} label={satz.latein} />
              <p>
                <Surayt>{satz.latein}</Surayt>
                {mitDeutsch && <span>{satz.deutsch}</span>}
              </p>
            </div>
          ))}
        </section>
      )}

      {ueberschrift && (
        <div className="textkopf">
          <AudioButton url={ueberschrift.audio} label={ueberschrift.latein} />
          <h2>
            <Surayt>{ueberschrift.latein}</Surayt>
            {mitDeutsch && <span>{ueberschrift.deutsch}</span>}
          </h2>
        </div>
      )}

      {dialog ? (
        <Gespraech zeilen={lektion.text} mitDeutsch={mitDeutsch} aktiv={aktiv} tippe={tippe} />
      ) : (
        <ol className="lesetext">
          {lektion.text.map((zeile) => (
            <li key={zeile.id} id={zeile.id}>
              <button
                type="button"
                className={`lesetext__satz${aktiv(zeile) ? ' lesetext__satz--aktiv' : ''}`}
                aria-label={`${zeile.latein} – anhören`}
                onClick={() => tippe(zeile)}
              >
                <Surayt className="lesetext__sur">{zeile.latein}</Surayt>
                {mitDeutsch && <span className="lesetext__de">{zeile.deutsch}</span>}
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="weiter-zu">
        <a className="knopf" href={href({ name: 'runde', nr: lektion.nr, art: 'gemischt' })} onClick={entsperren}>
          Jetzt üben
        </a>
      </div>
    </>
  );
}

interface GespraechProps {
  zeilen: Eintrag[];
  mitDeutsch: boolean;
  aktiv: (zeile: Eintrag) => boolean;
  tippe: (zeile: Eintrag) => void;
}

/** Dialog als Sprechblasen: die erste Person links, alle anderen rechts. */
function Gespraech({ zeilen, mitDeutsch, aktiv, tippe }: GespraechProps) {
  const sprecher = [...new Set(zeilen.map((z) => z.sprecher))];
  return (
    <ol className="gespraech">
      {zeilen.map((zeile) => {
        const wer = sprecher.indexOf(zeile.sprecher);
        return (
          <li key={zeile.id} id={zeile.id} className={`zeile zeile--${wer === 0 ? 'links' : 'rechts'}`}>
            <button
              type="button"
              className={`blase blase--${wer % 4}${aktiv(zeile) ? ' blase--aktiv' : ''}`}
              aria-label={`${zeile.sprecher}: ${zeile.latein} – anhören`}
              onClick={() => tippe(zeile)}
            >
              <span className="blase__wer">{zeile.sprecher}</span>
              <Surayt className="blase__sur">{zeile.latein}</Surayt>
              {mitDeutsch && <span className="blase__de">{zeile.deutsch}</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// --- Wörter ------------------------------------------------------------------

const STAND = ['neu', 'geübt', 'geübt', 'sitzt'];

function Woerter({ lektion }: { lektion: Lektion }) {
  const f = useFortschritt();
  return (
    <>
      <p className="legende">
        {lektion.wortschatz.length} Wörter aus dieser Lektion. Tippe auf den Lautsprecher, um sie zu hören.
      </p>
      <ul className="woerter">
        {lektion.wortschatz.map((wort) => {
          const s = stufe(f, wort.id);
          return (
            <li key={wort.id} className="wort">
              <AudioButton url={wort.audio} label={wort.latein} />
              <div className="wort__text">
                <span>
                  <Surayt className="wort__sur">{wort.latein}</Surayt>
                  {wort.hinweis && (
                    <span className="wort__hinweis">
                      {vorHinweis(wort.hinweis)}
                      {wort.hinweis}
                    </span>
                  )}
                </span>
                <span className="wort__de">{wort.deutsch}</span>
              </div>
              <span className={`punkt punkt--${s}`}>
                <span className="nur-vorlesen">{STAND[s]}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// --- Üben --------------------------------------------------------------------

function Ueben({ lektion }: { lektion: Lektion }) {
  const f = useFortschritt();
  const stand = lektionsstand(lektion, f);
  const zu = (art: Uebungsart) => href({ name: 'runde', nr: lektion.nr, art });

  return (
    <>
      <a className="lernkarte" href={zu('gemischt')} onClick={entsperren}>
        <ProgressRing anteil={stand.anteil} groesse={72} dicke={8}>
          {Math.round(stand.anteil * 100)}%
        </ProgressRing>
        <span className="lernkarte__text">
          <strong>{stand.geuebt > 0 ? 'Weiter lernen' : 'Lektion starten'}</strong>
          <span>
            {stand.anteil < 1
              ? 'Neue Wörter kennenlernen und gleich abfragen. Dauert etwa 3 Minuten.'
              : 'Alles einmal geübt – jetzt wird wiederholt.'}
          </span>
          <span className="lernkarte__stand">
            {stand.geuebt} von {stand.gesamt} geübt
          </span>
        </span>
        <IconPfeil />
      </a>

      <h2 className="zwischentitel">Frei üben</h2>
      <div className="arten">
        {lektion.aussprache?.hoerpaare && (
          <Art href={zu('paare')} icon={<IconOhr size={28} />} name="Hörst du den Unterschied?">
            Zwei Wörter, ein kleiner Unterschied
          </Art>
        )}
        <Art href={zu('karten')} icon={<IconKarten size={28} />} name="Karteikarten">
          Hören, überlegen, aufdecken
        </Art>
        <Art href={zu('wahl')} icon={<IconWahl size={28} />} name="Multiple Choice">
          Surayt ↔ Deutsch
        </Art>
        <Art href={zu('hoeren')} icon={<IconOhr size={28} />} name="Hören & Auswählen">
          Was hast du gehört?
        </Art>
      </div>
    </>
  );
}

function Art({ href, icon, name, children }: { href: string; icon: ReactNode; name: string; children: ReactNode }) {
  return (
    <a className="art" href={href} onClick={entsperren}>
      <span className="art__icon">{icon}</span>
      <span className="art__text">
        <strong>{name}</strong>
        <span>{children}</span>
      </span>
      <IconPfeil size={20} />
    </a>
  );
}
