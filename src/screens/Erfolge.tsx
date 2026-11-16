// Erfolge: Tagesserie, XP, Tagesziel, Lernstand und Abzeichen.

import { IconFlamme, IconStern, IconZurueck } from '../components/Icons';
import { Medaille } from '../components/Medaille';
import { Tagesziel } from '../components/Rundenende';
import { Surayt } from '../components/Surayt';
import { alleLektionen, verfuegbar } from '../data';
import { alleAbzeichen } from '../lib/abzeichen';
import { setzeZiel, TAGESZIELE, useMotivation } from '../lib/motivation';
import { geuebt, lage, useFortschritt } from '../lib/progress';
import { href } from '../lib/router';
import { lernreihenfolge } from '../lib/session';
import { laengsteSerie, serie, tagNummer, tagSchluessel, wochentag } from '../lib/zeit';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function ErfolgeScreen() {
  const m = useMotivation();
  const f = useFortschritt();
  const heute = tagNummer(Date.now());
  const { laenge, heuteDabei } = serie(m.tage, heute);
  const xpHeute = m.tage[tagSchluessel(heute)] ?? 0;

  const alle = alleLektionen.flatMap((l) => lernreihenfolge(l));
  const woerter = new Set(alle.filter((e) => e.art === 'wort' && geuebt(f, e.id)).map((e) => e.id)).size;
  const saetze = alle.filter((e) => e.art === 'satz' && geuebt(f, e.id)).length;
  const sitzen = alle.filter((e) => lage(f, e.id) === 'sitzt').length;

  const abzeichen = alleAbzeichen(alleLektionen);
  const erreicht = abzeichen.filter((a) => a.id in m.abzeichen).length;

  return (
    <div className="seite erfolge">
      <header className="kopf">
        <a className="kopf__zurueck" href={href({ name: 'start' })} aria-label="Zurück zum Lernpfad">
          <IconZurueck />
        </a>
        <div className="kopf__titel">
          <h1>Deine Erfolge</h1>
        </div>
      </header>

      <main className="erfolge__inhalt">
        <div className="kacheln">
          <div className={`kachel kachel--serie${heuteDabei ? ' kachel--an' : ''}`}>
            <IconFlamme size={30} />
            <strong>{laenge}</strong>
            <span>{laenge === 1 ? 'Tag in Folge' : 'Tage in Folge'}</span>
          </div>
          <div className="kachel kachel--xp">
            <IconStern size={30} />
            <strong>{m.xp.toLocaleString('de-DE')}</strong>
            <span>XP insgesamt</span>
          </div>
        </div>

        <p className="erfolge__serie">
          {heuteDabei
            ? 'Heute hast du schon geübt – deine Serie läuft.'
            : laenge > 0
              ? 'Üb heute noch eine Runde, damit deine Serie weiterläuft.'
              : 'Üb heute eine Runde, dann beginnt deine Serie.'}{' '}
          Längste Serie: {laengsteSerie(m.tage)} {laengsteSerie(m.tage) === 1 ? 'Tag' : 'Tage'}.
        </p>

        <ol className="woche" aria-label="Die letzten sieben Tage">
          {Array.from({ length: 7 }, (_, i) => heute - 6 + i).map((tag) => {
            const dabei = (m.tage[tagSchluessel(tag)] ?? 0) > 0;
            return (
              <li key={tag} className={`woche__tag${dabei ? ' woche__tag--dabei' : ''}${tag === heute ? ' woche__tag--heute' : ''}`}>
                <span className="woche__punkt">{dabei && <IconFlamme size={16} />}</span>
                <span>{WOCHENTAGE[wochentag(tag)]}</span>
                <span className="nur-vorlesen">{dabei ? 'geübt' : 'nicht geübt'}</span>
              </li>
            );
          })}
        </ol>

        <section className="erfolge__abschnitt">
          <h2 className="zwischentitel">Tagesziel</h2>
          <Tagesziel xp={xpHeute} ziel={m.ziel} titel="Heute" />
          <div className="ziele" role="radiogroup" aria-label="Tagesziel wählen">
            {TAGESZIELE.map((z) => (
              <button
                key={z.xp}
                type="button"
                role="radio"
                aria-checked={m.ziel === z.xp}
                className={`ziel${m.ziel === z.xp ? ' ziel--an' : ''}`}
                onClick={() => setzeZiel(z.xp)}
              >
                <strong>{z.name}</strong>
                <span>{z.xp} XP</span>
              </button>
            ))}
          </div>
          <p className="erfolge__klein">Eine Einheit bringt etwa 15 bis 25 XP.</p>
        </section>

        <section className="erfolge__abschnitt">
          <h2 className="zwischentitel">Gelernt</h2>
          <dl className="zahlen">
            <div>
              <dt>Wörter geübt</dt>
              <dd>{woerter}</dd>
            </div>
            <div>
              <dt>Sätze geübt</dt>
              <dd>{saetze}</dd>
            </div>
            <div>
              <dt>sitzen schon</dt>
              <dd>{sitzen}</dd>
            </div>
          </dl>
        </section>

        <section className="erfolge__abschnitt">
          <h2 className="zwischentitel">
            Abzeichen · {erreicht} von {abzeichen.length}
          </h2>
          <ul className="abzeichen">
            {abzeichen.map((a) => {
              const ok = a.id in m.abzeichen;
              const lektion = a.lektion ? verfuegbar.get(a.lektion) : undefined;
              return (
                <li key={a.id} className={`abzeichen__eintrag${ok ? '' : ' abzeichen__eintrag--zu'}`}>
                  <Medaille abzeichen={a} erreicht={ok} groesse={60} />
                  <strong>{a.name}</strong>
                  {lektion && <Surayt className="abzeichen__sur">{lektion.titel.latein}</Surayt>}
                  <span>{a.text}</span>
                  <span className="nur-vorlesen">{ok ? 'erreicht' : 'noch nicht erreicht'}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
