// Karteikasten: alle gelernten Wörter und Sätze als Karten in sechs Fächern.
// Hier sieht man, was heute dran ist, wie voll die Fächer sind und wie das
// Lernen mit dem Kasten funktioniert.

import { IconKarten, IconZurueck } from '../components/Icons';
import { alleLektionen } from '../data';
import { entsperren } from '../lib/audio';
import { karteikasten } from '../lib/einheiten';
import { INTERVALL_TAGE, SITZT, useFortschritt, wannWieder } from '../lib/progress';
import { href } from '../lib/router';
import { SCHWER_AB } from '../lib/session';
import { tagNummer } from '../lib/zeit';

/** Kurze Beschriftung unter einem Fach: nach wie vielen Tagen die Karten wiederkommen. */
function takt(fach: number): string {
  const tage = INTERVALL_TAGE[fach];
  if (tage === 0) return 'sofort';
  if (tage % 30 === 0) return tage === 30 ? '1 Monat' : `${tage / 30} Monate`;
  if (tage % 7 === 0) return tage === 7 ? '1 Woche' : `${tage / 7} Wochen`;
  return tage === 1 ? '1 Tag' : `${tage} Tage`;
}

export function KarteikastenScreen() {
  const f = useFortschritt();
  const k = karteikasten(alleLektionen, f, tagNummer(Date.now()));
  const voll = Math.max(1, ...k.faecher);
  const sitzen = k.faecher.slice(SITZT).reduce((a, b) => a + b, 0);

  return (
    <div className="seite kasten">
      <header className="kopf">
        <a className="kopf__zurueck" href={href({ name: 'start' })} aria-label="Zurück zum Lernpfad">
          <IconZurueck />
        </a>
        <div className="kopf__titel">
          <h1>Karteikasten</h1>
          <span>
            {k.gesamt} {k.gesamt === 1 ? 'Karte' : 'Karten'} im Kasten
          </span>
        </div>
      </header>

      <main className="kasten__inhalt">
        <section className="kasten__heute">
          <span className="kasten__icon">
            <IconKarten size={30} />
          </span>
          {k.gesamt === 0 ? (
            <>
              <p className="kasten__zahl">Noch leer</p>
              <p>Neue Karten kommen dazu, sobald du in den Einheiten Wörter und Sätze lernst.</p>
              <a className="knopf knopf--sonne" href={href({ name: 'start' })}>
                Zum Lernpfad
              </a>
            </>
          ) : k.heuteDran > 0 ? (
            <>
              <p className="kasten__zahl">
                {k.heuteDran} {k.heuteDran === 1 ? 'Karte' : 'Karten'}
              </p>
              <p>sind heute dran. Eine Runde hat bis zu 20 Karten und dauert ein paar Minuten.</p>
              <a className="knopf knopf--sonne" href={href({ name: 'kartenrunde' })} onClick={entsperren}>
                Karten lernen
              </a>
            </>
          ) : (
            <>
              <p className="kasten__zahl">Alles gelernt</p>
              <p>
                Für heute ist nichts mehr dran.{' '}
                {k.morgenDran > 0 ? `Morgen kommen ${k.morgenDran} Karten wieder.` : 'Schau in ein paar Tagen wieder vorbei.'}
              </p>
            </>
          )}
        </section>

        {k.gesamt > 0 && (
          <section>
            <h2 className="zwischentitel">Deine Fächer</h2>
            <ol className="faecher">
              {k.faecher.map((anzahl, fach) => (
                <li key={fach} className="fach">
                  <span className="fach__zahl">{anzahl}</span>
                  <span className="fach__kasten" aria-hidden="true">
                    <span style={{ height: `${(anzahl / voll) * 100}%` }} />
                  </span>
                  <span className="fach__name">Fach {fach + 1}</span>
                  <span className="fach__takt">{takt(fach)}</span>
                  <span className="nur-vorlesen">
                    {anzahl} Karten, kommen {wannWieder(fach)} wieder
                  </span>
                </li>
              ))}
            </ol>
            <p className="kasten__klein">
              {sitzen} von {k.gesamt} Karten sitzen schon (ab Fach {SITZT + 1}).
            </p>
          </section>
        )}

        <section className="kasten__erklaerung">
          <h2 className="zwischentitel">So funktioniert’s</h2>
          <ol>
            <li>
              <strong>Erst selbst überlegen, dann aufdecken.</strong> Genau dieses Erinnern („Active Recall“) bringt ein
              Wort ins Langzeitgedächtnis – viel mehr als nur Lesen.
            </li>
            <li>
              <strong>Gewusst:</strong> Die Karte rückt ein Fach weiter und kommt seltener wieder – nach{' '}
              {INTERVALL_TAGE.slice(1, -1).join(', ')} und {INTERVALL_TAGE.at(-1)} Tagen.
            </li>
            <li>
              <strong>Knapp:</strong> Die Karte bleibt in ihrem Fach.
            </li>
            <li>
              <strong>Nicht gewusst:</strong> Zurück in Fach 1 – sie kommt gleich noch einmal.
            </li>
            <li>
              Ab Fach {SCHWER_AB + 1} dreht sich die Karte um: Dann steht Deutsch vorne, und du musst selbst auf Surayt
              kommen. Sag es laut, bevor du aufdeckst.
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}
