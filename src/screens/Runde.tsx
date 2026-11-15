import { useEffect, useReducer, useRef, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { Auswahl, Karte } from '../components/Aufgaben';
import { IconSchliessen } from '../components/Icons';
import { Surayt } from '../components/Surayt';
import { LOB, verfuegbar } from '../data';
import { aktuellerFortschritt, verbuche } from '../lib/progress';
import { href } from '../lib/router';
import { baueRunde, lernreihenfolge, nochmal, type Schritt, type Uebungsart } from '../lib/session';
import type { Eintrag, Lektion } from '../types';

interface Verlauf {
  schritte: Schritt[];
  index: number;
  /** Antwort auf die aktuelle Auswahl-Aufgabe, solange die Rückmeldung zu sehen ist. */
  antwort: { richtig: boolean; gewaehlt: string } | null;
  /** Einträge, bei denen in dieser Runde etwas falsch war. */
  fehler: string[];
  fertig: boolean;
}

type Aktion =
  | { typ: 'antwort'; richtig: boolean; gewaehlt: string; ersatz: Schritt }
  | { typ: 'karte'; gewusst: boolean | null }
  | { typ: 'weiter' };

function weiter(v: Verlauf): Verlauf {
  return v.index + 1 < v.schritte.length
    ? { ...v, index: v.index + 1, antwort: null }
    : { ...v, antwort: null, fertig: true };
}

/** Ein Fehler wird gemerkt; beim ersten Mal kommt die Aufgabe am Ende noch einmal. */
function mitFehler(v: Verlauf, nachholen: Schritt): Verlauf {
  const id = nachholen.eintrag.id;
  if (v.fehler.includes(id)) return v;
  return { ...v, fehler: [...v.fehler, id], schritte: [...v.schritte, nachholen] };
}

function schalte(v: Verlauf, a: Aktion): Verlauf {
  switch (a.typ) {
    case 'antwort': {
      if (v.antwort) return v;
      const antwort = { richtig: a.richtig, gewaehlt: a.gewaehlt };
      return { ...(a.richtig ? v : mitFehler(v, a.ersatz)), antwort };
    }
    case 'karte':
      return weiter(a.gewusst === false ? mitFehler(v, v.schritte[v.index]) : v);
    case 'weiter':
      return weiter(v);
  }
}

/** Eine Aufgabe zählt für den Lernstand – das bloße Kennenlernen einer neuen Karte nicht. */
const zaehlt = (s: Schritt) => s.typ !== 'karte' || !s.neu;

export function RundeScreen({ nr, art }: { nr: number; art: Uebungsart }) {
  const lektion = verfuegbar.get(nr);
  const [lauf, setLauf] = useState(0);
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
  return <Runde key={lauf} lektion={lektion} art={art} onNochmal={() => setLauf((n) => n + 1)} />;
}

function Runde({ lektion, art, onNochmal }: { lektion: Lektion; art: Uebungsart; onNochmal: () => void }) {
  const vorrat = lernreihenfolge(lektion);
  const [v, sende] = useReducer(schalte, null, (): Verlauf => ({
    schritte: baueRunde(art, vorrat, aktuellerFortschritt()),
    index: 0,
    antwort: null,
    fehler: [],
    fertig: false,
  }));

  const geprueft = [...new Set(v.schritte.filter(zaehlt).map((s) => s.eintrag.id))];

  // Lernstand genau einmal verbuchen, wenn die Runde zu Ende ist.
  const verbucht = useRef(false);
  useEffect(() => {
    if (!v.fertig || verbucht.current) return;
    verbucht.current = true;
    verbuche(geprueft.map((id) => ({ id, fehlerfrei: !v.fehler.includes(id) })));
  });

  const zurLektion = href({ name: 'lektion', nr: lektion.nr, tab: 'ueben' });

  if (v.fertig || v.schritte.length === 0) {
    const falsche = v.fehler
      .map((id) => vorrat.find((e) => e.id === id))
      .filter((e): e is Eintrag => e !== undefined);
    return (
      <Ergebnis
        gesamt={geprueft.length}
        falsche={falsche}
        zurLektion={zurLektion}
        onNochmal={onNochmal}
      />
    );
  }

  const schritt = v.schritte[v.index];
  return (
    <div className="seite runde">
      <header className="runde__kopf">
        <a className="runde__zu" href={zurLektion} aria-label="Übung beenden">
          <IconSchliessen />
        </a>
        <div
          className="balken"
          role="progressbar"
          aria-label="Fortschritt in dieser Runde"
          aria-valuemin={0}
          aria-valuemax={v.schritte.length}
          aria-valuenow={v.index}
        >
          <span style={{ width: `${(v.index / v.schritte.length) * 100}%` }} />
        </div>
      </header>

      {schritt.typ === 'karte' ? (
        <Karte key={v.index} schritt={schritt} onFertig={(gewusst) => sende({ typ: 'karte', gewusst })} />
      ) : (
        <Auswahl
          key={v.index}
          schritt={schritt}
          antwort={v.antwort}
          onAntwort={(gewaehlt) =>
            sende({
              typ: 'antwort',
              gewaehlt: gewaehlt.id,
              richtig: gewaehlt.id === schritt.eintrag.id,
              ersatz: nochmal(schritt, vorrat),
            })
          }
          onWeiter={() => sende({ typ: 'weiter' })}
        />
      )}
    </div>
  );
}

function Ergebnis(props: { gesamt: number; falsche: Eintrag[]; zurLektion: string; onNochmal: () => void }) {
  const { gesamt, falsche } = props;
  const richtig = gesamt - falsche.length;
  const lob = falsche.length === 0 ? LOB.sehrGut : richtig >= gesamt / 2 ? LOB.gut : undefined;

  return (
    <div className="seite ergebnis">
      <div className="ergebnis__lob">
        {lob ? (
          <>
            <div className="ergebnis__sur">
              <Surayt>{lob.latein.replace(/\.$/, '!')}</Surayt>
              <AudioButton url={lob.audio} label={lob.latein} />
            </div>
            <p>{lob.deutsch.replace(/\.$/, '!')}</p>
          </>
        ) : (
          <p className="ergebnis__mut">Aller Anfang ist schwer – gleich nochmal!</p>
        )}
      </div>

      <p className="ergebnis__zahl">
        <strong>
          {richtig} von {gesamt}
        </strong>{' '}
        auf Anhieb richtig
      </p>

      {falsche.length > 0 && (
        <section className="ergebnis__liste">
          <h2>Zum Nochmal-Anhören</h2>
          <ul className="woerter">
            {falsche.map((e) => (
              <li key={e.id} className="wort">
                <AudioButton url={e.audio} label={e.latein} />
                <div className="wort__text">
                  <Surayt className="wort__sur">{e.latein}</Surayt>
                  <span className="wort__de">{e.deutsch}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="ergebnis__knoepfe">
        <button type="button" className="knopf" onClick={props.onNochmal}>
          Weiter üben
        </button>
        <a className="knopf knopf--zweit" href={props.zurLektion}>
          Zur Lektion
        </a>
      </div>
    </div>
  );
}
