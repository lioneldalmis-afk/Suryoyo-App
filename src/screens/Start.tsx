import type { CSSProperties } from 'react';
import { AudioButton } from '../components/AudioButton';
import { IconSchloss } from '../components/Icons';
import { InstallHint } from '../components/InstallHint';
import { ProgressRing } from '../components/ProgressRing';
import { Surayt } from '../components/Surayt';
import { APP_NAME, QUELLE } from '../config';
import { kurs, verfuegbar } from '../data';
import { entsperren } from '../lib/audio';
import { useFortschritt } from '../lib/progress';
import { href } from '../lib/router';
import { lektionsstand } from '../lib/session';

// Maße des Lernpfads in Pixeln. Die geschwungene Linie hinter den Knoten wird
// daraus berechnet, deshalb stehen sie hier und nicht nur im CSS.
const PFAD_BREITE = 320;
const STUFEN_HOEHE = 148;
const KNOTEN = 84;
const versatz = (i: number) => Math.round(Math.sin(i * 1.05) * 62);

function pfadLinie(anzahl: number): string {
  const punkt = (i: number) => ({ x: PFAD_BREITE / 2 + versatz(i), y: i * STUFEN_HOEHE + KNOTEN / 2 });
  let d = `M ${punkt(0).x} ${punkt(0).y}`;
  for (let i = 1; i < anzahl; i++) {
    const a = punkt(i - 1);
    const b = punkt(i);
    d += ` C ${a.x} ${a.y + STUFEN_HOEHE / 2}, ${b.x} ${b.y - STUFEN_HOEHE / 2}, ${b.x} ${b.y}`;
  }
  return d;
}

export function StartScreen() {
  const f = useFortschritt();
  const lektionen = [...verfuegbar.values()];
  // Weiter geht es in der ersten Lektion, die noch nicht fertig geübt ist.
  const aktuelle = lektionen.find((l) => lektionsstand(l, f).anteil < 1) ?? lektionen[0];
  const stand = lektionsstand(aktuelle, f);
  const begruessung = verfuegbar.get(3)?.titel;

  return (
    <div className="seite start">
      <header className="start__kopf">
        <div className="start__leiste">
          <span className="start__marke">{APP_NAME}</span>
          <a className="start__info" href={href({ name: 'info' })}>
            Über die App
          </a>
        </div>
        <div className="start__gruss">
          <h1>
            <Surayt>Šlomo!</Surayt>
          </h1>
          <AudioButton url={begruessung?.audio} label="Šlomo" />
        </div>
        <p className="start__text">Lerne Surayt – damit du am Familientisch mitreden kannst.</p>
        <a
          className="knopf knopf--sonne"
          href={href({ name: 'runde', nr: aktuelle.nr, art: 'gemischt' })}
          onClick={entsperren}
        >
          {stand.geuebt > 0 ? 'Weiter lernen' : 'Los geht’s'}
        </a>
        <p className="start__stand">
          Lektion {aktuelle.nr}: {stand.geuebt} von {stand.gesamt} Wörtern und Sätzen geübt
        </p>
      </header>

      <InstallHint />

      <main className="start__pfad">
        <h2>Dein Lernpfad</h2>
        <p className="start__pfadtext">
          Den Anfang macht Lektion 3. Die anderen Lektionen kommen nach und nach dazu.
        </p>
        <ol className="pfad" style={{ width: PFAD_BREITE }}>
          <svg
            className="pfad__linie"
            width={PFAD_BREITE}
            height={(kurs.length - 1) * STUFEN_HOEHE + KNOTEN}
            aria-hidden="true"
          >
            <path d={pfadLinie(kurs.length)} />
          </svg>
          {kurs.map((k, i) => {
            const lektion = verfuegbar.get(k.nr);
            const stil = { height: STUFEN_HOEHE, '--versatz': `${versatz(i)}px` } as CSSProperties;
            const titel = (
              <span className="pfad__text">
                <Surayt className="pfad__titel">{k.latein}</Surayt>
                <span className="pfad__deutsch">{k.deutsch}</span>
              </span>
            );
            if (!lektion) {
              return (
                <li key={k.nr} className="pfad__stufe pfad__stufe--zu" style={stil}>
                  <span className="knoten" style={{ width: KNOTEN, height: KNOTEN }}>
                    <IconSchloss size={26} />
                    <span className="nur-vorlesen">Lektion {k.nr}, kommt bald:</span>
                  </span>
                  {titel}
                </li>
              );
            }
            const { anteil } = lektionsstand(lektion, f);
            return (
              <li key={k.nr} className="pfad__stufe" style={stil}>
                <a
                  className="pfad__link"
                  href={href({ name: 'lektion', nr: k.nr, tab: 'dialog' })}
                  aria-label={`Lektion ${k.nr}: ${k.latein} – ${k.deutsch}, ${Math.round(anteil * 100)} Prozent geübt`}
                >
                  <span className="knoten knoten--offen" style={{ width: KNOTEN, height: KNOTEN }}>
                    <ProgressRing anteil={anteil} groesse={KNOTEN} dicke={7}>
                      {k.nr}
                    </ProgressRing>
                  </span>
                  {titel}
                </a>
              </li>
            );
          })}
        </ol>
      </main>

      <footer className="start__fuss">
        Inhalte und Audio: <a href={QUELLE.url}>{QUELLE.name}</a>, {QUELLE.herausgeber}
      </footer>
    </div>
  );
}
