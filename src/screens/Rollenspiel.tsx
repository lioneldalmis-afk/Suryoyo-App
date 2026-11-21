// Dialog-Rollenspiel: „Du bist Afrem – antworte Aday“. Die anderen sprechen
// ihre Zeilen, bei den eigenen wählt man aus, was man sagt.

import { useEffect, useRef, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { IconPfeil, IconRolle, IconSchliessen, IconZurueck } from '../components/Icons';
import { Rundenende } from '../components/Rundenende';
import { Surayt } from '../components/Surayt';
import { alleLektionen, istDialog, verfuegbar } from '../data';
import { entsperren, spiele, stopp } from '../lib/audio';
import { gutschreiben, motivation, schliesseRundeAb, type Bericht } from '../lib/motivation';
import { aktuellerFortschritt, verbucheAusRunde } from '../lib/progress';
import { href } from '../lib/router';
import { baueRollenspiel, rollen, type Zug } from '../lib/rollenspiel';
import type { Eintrag, Lektion } from '../types';

export function RollenspielScreen({ nr }: { nr: number }) {
  const lektion = verfuegbar.get(nr);
  const [rolle, setRolle] = useState<string | null>(null);
  const [lauf, setLauf] = useState(0);
  const zurLektion = href({ name: 'lektion', nr, tab: 'ueben' });

  if (!lektion || !istDialog(lektion)) {
    return (
      <div className="seite leer">
        <p>Diese Lektion hat keinen Dialog zum Mitspielen.</p>
        <a className="knopf" href={zurLektion}>
          Zur Lektion
        </a>
      </div>
    );
  }
  if (!rolle) return <Rollenwahl lektion={lektion} onWahl={setRolle} />;
  return (
    <Spiel
      key={`${rolle}-${lauf}`}
      lektion={lektion}
      rolle={rolle}
      onNochmal={() => setLauf((n) => n + 1)}
      onAndereRolle={() => setRolle(null)}
    />
  );
}

function Rollenwahl({ lektion, onWahl }: { lektion: Lektion; onWahl: (rolle: string) => void }) {
  return (
    <div className="seite rollenwahl">
      <header className="kopf">
        <a className="kopf__zurueck" href={href({ name: 'lektion', nr: lektion.nr, tab: 'ueben' })} aria-label="Zurück zur Lektion">
          <IconZurueck />
        </a>
        <div className="kopf__titel">
          <h1>Rollenspiel</h1>
          <span>
            Lektion {lektion.nr} · <Surayt>{lektion.titel.latein}</Surayt>
          </span>
        </div>
      </header>
      <main className="rollenwahl__inhalt">
        <p className="rollenwahl__text">
          Spiel den Dialog mit: Die anderen sprechen ihre Sätze, und wenn du dran bist, wählst du aus, was du sagst.
        </p>
        <h2 className="zwischentitel">Wer möchtest du sein?</h2>
        <div className="arten">
          {rollen(lektion.text).map((r) => (
            <button
              key={r.name}
              type="button"
              className="art"
              onClick={() => {
                entsperren();
                onWahl(r.name);
              }}
            >
              <span className="art__icon">
                <IconRolle size={28} />
              </span>
              <span className="art__text">
                <strong>Du bist {r.name}</strong>
                <span>
                  {r.zeilen} Sätze{r.gegenueber.length > 0 && <> · du sprichst mit {aufzaehlen(r.gegenueber)}</>}
                </span>
              </span>
              <IconPfeil size={20} />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

/** „Aday, Saro und Matay“ */
const aufzaehlen = (namen: string[]) =>
  namen.length < 2 ? namen.join('') : `${namen.slice(0, -1).join(', ')} und ${namen.at(-1)}`;

const PAUSE_MS = 450;

function Spiel(props: { lektion: Lektion; rolle: string; onNochmal: () => void; onAndereRolle: () => void }) {
  const { lektion, rolle } = props;
  const [zuege] = useState<Zug[]>(() => baueRollenspiel(lektion.text, rolle));
  /** Der Zug, der gerade dran ist; alle davor stehen schon im Gespräch. */
  const [index, setIndex] = useState(0);
  /** Die eigene Zeile an dieser Stelle ist richtig gewählt und wird gerade gesprochen. */
  const [geloest, setGeloest] = useState(-1);
  /** Antworten, die beim aktuellen Zug falsch waren. */
  const [daneben, setDaneben] = useState<string[]>([]);
  const [fehler, setFehler] = useState<string[]>([]);
  /** Die Aufnahme lief nicht (z. B. offline): dann geht es per Knopf weiter. */
  const [haengt, setHaengt] = useState(false);
  const [mitDeutsch, setMitDeutsch] = useState(true);
  const [bericht, setBericht] = useState<Bericht | null>(null);
  const ende = useRef<HTMLLIElement>(null);

  const zug = zuege[index];
  const fertig = index >= zuege.length;
  const zeigen = zug && (!zug.eigene || geloest === index);

  // Zeile vorspielen und danach von selbst weiter.
  useEffect(() => {
    if (!zug || !zeigen) return;
    let ab = false;
    setHaengt(false);
    void (async () => {
      const ausgang = zug.zeile.audio ? await spiele(zug.zeile.audio) : 'ende';
      if (ab) return;
      if (ausgang !== 'ende') return setHaengt(true);
      await new Promise((r) => setTimeout(r, PAUSE_MS));
      if (!ab) setIndex((i) => i + 1);
    })();
    return () => {
      ab = true;
    };
  }, [zug, zeigen]);

  useEffect(() => () => stopp(), []);

  useEffect(() => {
    ende.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [index, geloest]);

  // Stand vom Anfang: Jede eigene Zeile wird gespeichert, sobald sie gesagt ist.
  const basis = useRef(aktuellerFortschritt());
  const start = useRef(motivation());

  // Am Ende: Bonus-XP und Abzeichen vergeben.
  const verbucht = useRef(false);
  useEffect(() => {
    if (!fertig || verbucht.current) return;
    verbucht.current = true;
    const eigene = zuege.filter((z) => z.eigene).map((z) => z.zeile.id);
    setBericht(
      schliesseRundeAb(
        {
          art: 'rollenspiel',
          richtige: eigene.length - fehler.length,
          aufgaben: eigene.length,
          fehler: fehler.length,
          nachgesprochen: 0,
        },
        alleLektionen,
        start.current,
      ),
    );
  });

  const zurLektion = href({ name: 'lektion', nr: lektion.nr, tab: 'ueben' });

  if (fertig) {
    const falsche = zuege
      .filter((z) => fehler.includes(z.zeile.id))
      .map((z) => z.zeile)
      .filter((e, i, a) => a.indexOf(e) === i);
    return (
      <Rundenende
        bericht={bericht}
        gesamt={zuege.filter((z) => z.eigene).length}
        falsche={falsche}
        titel={`Rollenspiel als ${rolle} geschafft`}
      >
        <button type="button" className="knopf" onClick={props.onNochmal}>
          Nochmal spielen
        </button>
        <div className="zwei">
          <button type="button" className="knopf knopf--zweit" onClick={props.onAndereRolle}>
            Andere Rolle
          </button>
          <a className="knopf knopf--zweit" href={zurLektion}>
            Zur Lektion
          </a>
        </div>
      </Rundenende>
    );
  }

  const waehle = (option: Eintrag) => {
    if (geloest === index || daneben.includes(option.id)) return;
    if (option.id === zug.zeile.id) {
      // Gleich speichern und XP gutschreiben – wer abbricht, verliert nichts.
      const aufAnhieb = !fehler.includes(zug.zeile.id);
      verbucheAusRunde(basis.current, [{ id: zug.zeile.id, fehlerfrei: aufAnhieb }]);
      if (aufAnhieb) gutschreiben(1);
      setDaneben([]);
      setGeloest(index);
    } else {
      setDaneben((d) => [...d, option.id]);
      setFehler((f) => (f.includes(zug.zeile.id) ? f : [...f, zug.zeile.id]));
    }
  };

  const sichtbar = zuege.slice(0, zeigen ? index + 1 : index);

  return (
    <div className="seite runde rollenspiel">
      <header className="runde__kopf">
        <a className="runde__zu" href={zurLektion} aria-label="Rollenspiel beenden">
          <IconSchliessen />
        </a>
        <div
          className="balken"
          role="progressbar"
          aria-label="Fortschritt im Dialog"
          aria-valuemin={0}
          aria-valuemax={zuege.length}
          aria-valuenow={index}
        >
          <span style={{ width: `${(index / zuege.length) * 100}%` }} />
        </div>
      </header>

      <div className="rollenspiel__inhalt">
        <div className="werkzeug">
          <p className="rollenspiel__rolle">
            Du bist <strong>{rolle}</strong>
          </p>
          <label className="schalter">
            <input type="checkbox" checked={mitDeutsch} onChange={(e) => setMitDeutsch(e.target.checked)} />
            <span>Deutsch</span>
          </label>
        </div>

        <ol className="gespraech">
          {sichtbar.map((z, i) => (
            <li key={i} ref={i === sichtbar.length - 1 ? ende : undefined} className={`zeile zeile--${z.eigene ? 'rechts' : 'links'}`}>
              <div className={`blase${z.eigene ? ' blase--1' : ''}${i === index ? ' blase--aktiv' : ''}`}>
                <span className="blase__wer">{z.eigene ? `Du (${z.zeile.sprecher})` : z.zeile.sprecher}</span>
                <Surayt className="blase__sur">{z.zeile.latein}</Surayt>
                {mitDeutsch && <span className="blase__de">{z.zeile.deutsch}</span>}
                {i < index && (
                  <span className="blase__ton">
                    <AudioButton url={z.zeile.audio} label={z.zeile.latein} />
                  </span>
                )}
              </div>
            </li>
          ))}
          {zug.eigene && geloest !== index && (
            <li ref={ende} className="zeile zeile--rechts">
              <div className="blase blase--1 blase--wartet" aria-label="Du bist dran">
                <span className="blase__punkte" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </li>
          )}
        </ol>
      </div>

      <footer className="aufgabe__fuss rollenspiel__fuss" aria-live="polite">
        {zug.eigene && geloest !== index ? (
          <>
            <p className="rollenspiel__frage">
              Du sagst: <span>„{zug.zeile.deutsch}“</span>
            </p>
            <ul className="optionen">
              {zug.optionen.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className={`option${daneben.includes(o.id) ? ' option--falsch' : ''}`}
                    aria-disabled={daneben.includes(o.id)}
                    onClick={() => waehle(o)}
                  >
                    <Surayt>{o.latein}</Surayt>
                  </button>
                </li>
              ))}
            </ul>
            {daneben.length > 0 && <p className="rollenspiel__tipp">Nicht ganz – versuch’s nochmal.</p>}
          </>
        ) : haengt ? (
          <button type="button" className="knopf" onClick={() => setIndex((i) => i + 1)}>
            Weiter
          </button>
        ) : (
          <p className="rollenspiel__hoer">{zug.eigene ? 'Hör dir an, wie du es sagst …' : `${zug.zeile.sprecher} spricht …`}</p>
        )}
      </footer>
    </div>
  );
}
