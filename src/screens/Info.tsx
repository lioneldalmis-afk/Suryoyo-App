import { useState } from 'react';
import { IconZurueck } from '../components/Icons';
import { APP_NAME, QUELLE } from '../config';
import { verfuegbar } from '../data';
import { useFortschritt, zuruecksetzen } from '../lib/progress';
import { href } from '../lib/router';

export function InfoScreen() {
  const f = useFortschritt();
  const [sicher, setSicher] = useState(false);
  const hatStand = Object.keys(f).length > 0;
  const stand = [...verfuegbar.values()].map((l) => l.quelle.abgerufen).sort().at(-1);

  return (
    <div className="seite info">
      <header className="kopf">
        <a className="kopf__zurueck" href={href({ name: 'start' })} aria-label="Zurück">
          <IconZurueck />
        </a>
        <div className="kopf__titel">
          <h1>Über die App</h1>
        </div>
      </header>

      <main className="info__text">
        <p>
          Mit {APP_NAME} lernst du gesprochenes Surayt (Turoyo), damit du am Familientisch mitreden und dich mit
          deinen Großeltern unterhalten kannst. Das hier ist ein früher Prototyp mit den Lektionen{' '}
          {lektionsbereich()} aus Level A des Lehrbuchs.
        </p>

        <h2>Woher die Inhalte kommen</h2>
        <p>
          Alle Wörter, Sätze, Übersetzungen und Aufnahmen stammen aus dem Online-Lehrbuch{' '}
          <a href={QUELLE.url}>{QUELLE.name}</a> ({QUELLE.herausgeber}){stand && <>, abgerufen am {datum(stand)}</>}.
          Es wird nichts frei übersetzt oder dazuerfunden.
        </p>

        <h2>Deine Daten</h2>
        <p>
          Dein Lernstand wird nur auf diesem Gerät gespeichert. Es gibt kein Konto und keine Anmeldung. Die
          Aufnahmen werden beim Abspielen direkt von der Lehrbuch-Website geladen; dafür brauchst du Internet.
        </p>

        {hatStand && (
          <>
            <h2>Lernstand</h2>
            {sicher ? (
              <div className="zwei">
                <button type="button" className="knopf knopf--zweit" onClick={() => setSicher(false)}>
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="knopf knopf--warn"
                  onClick={() => {
                    zuruecksetzen();
                    setSicher(false);
                  }}
                >
                  Wirklich löschen
                </button>
              </div>
            ) : (
              <button type="button" className="knopf knopf--zweit" onClick={() => setSicher(true)}>
                Lernstand zurücksetzen
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const datum = (iso: string) => iso.split('-').reverse().join('.');

/** „3 bis 16“ – welche Lektionen schon in der App sind. */
function lektionsbereich() {
  const nummern = [...verfuegbar.keys()];
  return nummern.length === 1 ? nummern[0] : `${Math.min(...nummern)} bis ${Math.max(...nummern)}`;
}
