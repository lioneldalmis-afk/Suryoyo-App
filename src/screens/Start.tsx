import { AudioButton } from '../components/AudioButton';
import { IconFlamme, IconHaken, IconPfeil, IconSchloss, IconWiederholen } from '../components/Icons';
import { InstallHint } from '../components/InstallHint';
import { Pfad } from '../components/Pfad';
import { ProgressRing } from '../components/ProgressRing';
import { SatzDerWoche } from '../components/SatzDerWoche';
import { Surayt } from '../components/Surayt';
import { APP_NAME, QUELLE } from '../config';
import { alleLektionen, kurs, verfuegbar } from '../data';
import { entsperren } from '../lib/audio';
import { einheiten, faellige, naechsteEinheit } from '../lib/einheiten';
import { useMotivation } from '../lib/motivation';
import { useFortschritt } from '../lib/progress';
import { href, type Route } from '../lib/router';
import { aktuelleLektion, lektionsstand } from '../lib/session';
import { serie, tagNummer, tagSchluessel } from '../lib/zeit';

// Maße des Lernpfads in Pixeln.
const PFAD = { breite: 320, stufe: 148, knoten: 84, ausschlag: 62 };

export function StartScreen() {
  const f = useFortschritt();
  const m = useMotivation();
  const heute = tagNummer(Date.now());
  const aktuelle = aktuelleLektion(alleLektionen, f);
  const stand = lektionsstand(aktuelle, f);
  const naechste = naechsteEinheit(aktuelle, f);
  const begruessung = verfuegbar.get(3)?.titel;
  const zuWiederholen = faellige(alleLektionen, f, heute).length;
  const { laenge, heuteDabei } = serie(m.tage, heute);
  const xpHeute = m.tage[tagSchluessel(heute)] ?? 0;

  // Sind alle Lektionen geschafft, bleibt der Karteikasten.
  const los: Route = naechste
    ? { name: 'einheit', nr: aktuelle.nr, einheit: naechste.nr }
    : zuWiederholen > 0
      ? { name: 'wiederholen' }
      : { name: 'lektion', nr: aktuelle.nr, tab: 'ueben' };

  return (
    <div className="seite start">
      <header className="start__kopf">
        <div className="start__leiste">
          <span className="start__marke">{APP_NAME}</span>
          <a className="start__info" href={href({ name: 'info' })}>
            Über die App
          </a>
        </div>

        <a className="status" href={href({ name: 'erfolge' })} aria-label="Deine Erfolge ansehen">
          <span className={`status__serie${heuteDabei ? ' status__serie--an' : ''}`}>
            <IconFlamme size={22} />
            {laenge}
            <span className="nur-vorlesen">{laenge === 1 ? 'Tag in Folge' : 'Tage in Folge'}</span>
          </span>
          <span className="status__ziel">
            <ProgressRing anteil={xpHeute / m.ziel} groesse={30} dicke={4}>
              {xpHeute >= m.ziel && <IconHaken size={14} />}
            </ProgressRing>
            <span>
              {Math.min(xpHeute, m.ziel)} / {m.ziel} XP heute
            </span>
          </span>
          <IconPfeil size={18} />
        </a>

        <div className="start__gruss">
          <h1>
            <Surayt>Šlomo!</Surayt>
          </h1>
          <AudioButton url={begruessung?.audio} label="Šlomo" />
        </div>
        <p className="start__text">Lerne Surayt – damit du am Familientisch mitreden kannst.</p>
        <a className="knopf knopf--sonne" href={href(los)} onClick={entsperren}>
          {!naechste && zuWiederholen > 0 ? 'Wiederholen' : stand.geuebt > 0 ? 'Weiter lernen' : 'Los geht’s'}
        </a>
        <p className="start__stand">
          {naechste
            ? `Lektion ${aktuelle.nr} · Einheit ${naechste.nr} von ${einheiten(aktuelle).length}`
            : `Lektion ${aktuelle.nr} ist geschafft`}
        </p>
      </header>

      <InstallHint />

      <div className="start__karten">
        <SatzDerWoche bisLektion={aktuelle.nr} />
        {zuWiederholen > 0 && naechste && (
          <a className="karteikasten" href={href({ name: 'wiederholen' })} onClick={entsperren}>
            <span className="karteikasten__icon">
              <IconWiederholen size={26} />
            </span>
            <span className="karteikasten__text">
              <strong>Wiederholen</strong>
              <span>
                {zuWiederholen === 1 ? '1 Wort oder Satz ist' : `${zuWiederholen} Wörter und Sätze sind`} heute im
                Karteikasten dran.
              </span>
            </span>
            <IconPfeil size={20} />
          </a>
        )}
      </div>

      <main className="start__pfad">
        <h2>Dein Lernpfad</h2>
        <p className="start__pfadtext">
          Die Lektionen bauen aufeinander auf – am besten der Reihe nach ab Lektion 3. In Lektion 1 und 2 kannst
          du nachschlagen, wie Buchstaben wie <Surayt>ḥ</Surayt> oder <Surayt>ë</Surayt> klingen.
        </p>
        <Pfad
          {...PFAD}
          anzahl={kurs.length}
          stufeFuer={(i, stil) => {
            const k = kurs[i];
            const lektion = verfuegbar.get(k.nr);
            const titel = (
              <span className="pfad__text">
                <Surayt className="pfad__titel">{k.latein}</Surayt>
                <span className="pfad__deutsch">{k.deutsch}</span>
              </span>
            );
            if (!lektion) {
              return (
                <li key={k.nr} className="pfad__stufe pfad__stufe--zu" style={stil}>
                  <span className="knoten" style={{ width: PFAD.knoten, height: PFAD.knoten }}>
                    <IconSchloss size={26} />
                    <span className="nur-vorlesen">Lektion {k.nr}, kommt bald:</span>
                  </span>
                  {titel}
                </li>
              );
            }
            const { anteil } = lektionsstand(lektion, f);
            const fertig = anteil === 1;
            return (
              <li key={k.nr} className="pfad__stufe" style={stil}>
                <a
                  className="pfad__link"
                  href={href({ name: 'lektion', nr: k.nr, tab: 'text' })}
                  aria-label={`Lektion ${k.nr}: ${k.latein} – ${k.deutsch}, ${fertig ? 'geschafft' : `${Math.round(anteil * 100)} Prozent geübt`}`}
                >
                  <span
                    className={`knoten knoten--offen${fertig ? ' knoten--fertig' : ''}${lektion === aktuelle ? ' knoten--aktuell' : ''}`}
                    style={{ width: PFAD.knoten, height: PFAD.knoten }}
                  >
                    <ProgressRing anteil={anteil} groesse={PFAD.knoten} dicke={7}>
                      {fertig ? <IconHaken size={34} /> : k.nr}
                    </ProgressRing>
                  </span>
                  {titel}
                </a>
              </li>
            );
          }}
        />
      </main>

      <footer className="start__fuss">
        Inhalte und Audio: <a href={QUELLE.url}>{QUELLE.name}</a>, {QUELLE.herausgeber}
      </footer>
    </div>
  );
}
