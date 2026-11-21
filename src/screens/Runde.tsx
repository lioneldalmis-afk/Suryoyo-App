// Übungsrunden: eine Einheit des Lernpfads, freies Üben einer Übungsart oder
// eine Runde im Karteikasten. Alle teilen sich denselben Ablauf.

import { useEffect, useReducer, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Auswahl, Karte } from '../components/Aufgaben';
import { IconSchliessen } from '../components/Icons';
import { Nachsprechen } from '../components/Nachsprechen';
import { Rundenende } from '../components/Rundenende';
import { Bauen, Luecke } from '../components/Satzaufgaben';
import { alleLektionen, verfuegbar, vorratFuer } from '../data';
import { entsperren } from '../lib/audio';
import { baueEinheit, baueKartenrunde, einheiten, faellige, naechsteEinheit, type Einheit } from '../lib/einheiten';
import {
  gutschreiben,
  motivation,
  schliesseRundeAb,
  sprechenMoeglich,
  sprechenPausieren,
  type Bericht,
  type Rundenart,
} from '../lib/motivation';
import { aktuellerFortschritt, stufe, useFortschritt, verbucheAusRunde, type Bewertung } from '../lib/progress';
import { ersetze, href, type Route } from '../lib/router';
import { baueHoerrunde, baueRunde, lernreihenfolge, nochmal, type Schritt, type Uebungsart } from '../lib/session';
import { tagNummer } from '../lib/zeit';
import type { Eintrag, Lektion } from '../types';

// --- Ablauf einer Runde ------------------------------------------------------

interface Verlauf {
  schritte: Schritt[];
  index: number;
  /** Antwort auf die aktuelle Aufgabe, solange die Rückmeldung zu sehen ist. */
  antwort: { richtig: boolean; gewaehlt: string } | null;
  /** Einträge, bei denen in dieser Runde etwas falsch war. */
  fehler: string[];
  /** Einträge, zu denen schon eine Aufgabe beantwortet ist – ihr Lernstand wird gleich gespeichert. */
  geuebt: string[];
  /** Karteikarten, die nur „knapp“ gewusst waren: Sie bleiben in ihrem Fach. */
  knapp: string[];
  /** Richtige Antworten – je 1 XP. */
  richtige: number;
  nachgesprochen: number;
  fertig: boolean;
}

type Aktion =
  | { typ: 'antwort'; richtig: boolean; gewaehlt: string }
  /** Karteikarte: angesehen (neu) oder selbst bewertet. */
  | { typ: 'karte'; bewertung: Bewertung | null }
  | { typ: 'gesprochen'; gesprochen: boolean }
  /** „Kann gerade nicht sprechen“: alle Nachsprechen-Aufgaben der Runde fallen weg. */
  | { typ: 'sprechenAus' }
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

/** Der Eintrag ist in dieser Runde geübt worden. */
function mitGeuebt(v: Verlauf, id: string): Verlauf {
  return v.geuebt.includes(id) ? v : { ...v, geuebt: [...v.geuebt, id] };
}

function schalte(v: Verlauf, a: Aktion): Verlauf {
  const schritt = v.schritte[v.index];
  switch (a.typ) {
    case 'antwort': {
      if (v.antwort) return v;
      const antwort = { richtig: a.richtig, gewaehlt: a.gewaehlt };
      const geuebt = mitGeuebt(v, schritt.eintrag.id);
      if (a.richtig) return { ...geuebt, antwort, richtige: v.richtige + 1 };
      return { ...mitFehler(geuebt, nochmal(schritt)), antwort };
    }
    case 'karte': {
      const id = schritt.eintrag.id;
      if (a.bewertung === null) return weiter(v);
      if (a.bewertung === 'falsch') return weiter(mitFehler(mitGeuebt(v, id), schritt));
      const knapp = a.bewertung === 'knapp' && !v.knapp.includes(id) ? [...v.knapp, id] : v.knapp;
      return weiter({ ...mitGeuebt(v, id), knapp, richtige: v.richtige + 1 });
    }
    case 'gesprochen':
      return weiter(a.gesprochen ? { ...v, richtige: v.richtige + 1, nachgesprochen: v.nachgesprochen + 1 } : v);
    case 'sprechenAus': {
      const schritte = [...v.schritte.slice(0, v.index), ...v.schritte.slice(v.index).filter((s) => s.typ !== 'sprechen')];
      return schritte.length > v.index ? { ...v, schritte, antwort: null } : { ...v, schritte, antwort: null, fertig: true };
    }
    case 'weiter':
      return weiter(v);
  }
}

/** Eine Aufgabe zählt für den Lernstand – das Kennenlernen einer neuen Karte und das Nachsprechen nicht. */
const zaehlt = (s: Schritt) => s.typ !== 'sprechen' && (s.typ !== 'karte' || !s.neu);

interface RundeProps {
  baue: () => Schritt[];
  art: Rundenart;
  /** Wohin das Kreuz oben links führt. */
  schliessen: string;
  /** Überschrift auf der Abschlussseite. */
  titel?: (fehlerfrei: boolean) => ReactNode;
  /** Knöpfe auf der Abschlussseite. */
  knoepfe: ReactNode;
  /** Was zu sehen ist, wenn es gerade nichts zu üben gibt. */
  leer?: ReactNode;
}

function Runde({ baue, art, schliessen, titel, knoepfe, leer }: RundeProps) {
  const [v, sende] = useReducer(schalte, null, (): Verlauf => ({
    schritte: baue(),
    index: 0,
    antwort: null,
    fehler: [],
    geuebt: [],
    knapp: [],
    richtige: 0,
    nachgesprochen: 0,
    fertig: false,
  }));
  const [bericht, setBericht] = useState<Bericht | null>(null);

  const geprueft = [...new Set(v.schritte.filter(zaehlt).map((s) => s.eintrag.id))];

  // Stand vom Anfang der Runde: Davon aus wird gerechnet, auch wenn mittendrin gespeichert wird.
  const basis = useRef(aktuellerFortschritt());
  const start = useRef(motivation());

  // Lernstand nach jeder Antwort speichern – wer abbricht, verliert nichts.
  useEffect(() => {
    if (v.geuebt.length === 0) return;
    verbucheAusRunde(
      basis.current,
      v.geuebt.map((id) => ({ id, fehlerfrei: !v.fehler.includes(id), knapp: v.knapp.includes(id) })),
    );
  }, [v.geuebt, v.fehler, v.knapp]);

  // XP für richtige Antworten gleich gutschreiben.
  const gutgeschrieben = useRef(0);
  useEffect(() => {
    gutschreiben(v.richtige - gutgeschrieben.current);
    gutgeschrieben.current = v.richtige;
  }, [v.richtige]);

  // Am Ende: Bonus, Zähler und Abzeichen genau einmal.
  const verbucht = useRef(false);
  useEffect(() => {
    if (!v.fertig || verbucht.current) return;
    verbucht.current = true;
    setBericht(
      schliesseRundeAb(
        { art, richtige: v.richtige, aufgaben: geprueft.length, fehler: v.fehler.length, nachgesprochen: v.nachgesprochen },
        alleLektionen,
        start.current,
      ),
    );
  });

  if (v.schritte.length === 0) return <>{leer}</>;

  if (v.fertig) {
    const falsche = v.fehler
      .map((id) => v.schritte.find((s) => s.eintrag.id === id)?.eintrag)
      .filter((e): e is Eintrag => e !== undefined);
    return (
      <Rundenende bericht={bericht} gesamt={geprueft.length} falsche={falsche} titel={titel?.(falsche.length === 0)}>
        {knoepfe}
      </Rundenende>
    );
  }

  const schritt = v.schritte[v.index];
  const antworten = {
    antwort: v.antwort,
    onAntwort: (richtig: boolean, gewaehlt: string) => sende({ typ: 'antwort', richtig, gewaehlt }),
    onWeiter: () => sende({ typ: 'weiter' }),
  };

  return (
    <div className="seite runde">
      <header className="runde__kopf">
        <a className="runde__zu" href={schliessen} aria-label="Übung beenden">
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
        <Karte
          key={v.index}
          schritt={schritt}
          fach={stufe(basis.current, schritt.eintrag.id)}
          schonFalsch={v.fehler.includes(schritt.eintrag.id)}
          onFertig={(bewertung) => sende({ typ: 'karte', bewertung })}
        />
      ) : schritt.typ === 'bauen' ? (
        <Bauen key={v.index} schritt={schritt} {...antworten} />
      ) : schritt.typ === 'luecke' ? (
        <Luecke key={v.index} schritt={schritt} {...antworten} />
      ) : schritt.typ === 'sprechen' ? (
        <Nachsprechen
          key={v.index}
          schritt={schritt}
          onFertig={(gesprochen) => sende({ typ: 'gesprochen', gesprochen })}
          onAus={() => {
            sprechenPausieren();
            sende({ typ: 'sprechenAus' });
          }}
        />
      ) : (
        <Auswahl
          key={v.index}
          schritt={schritt}
          antwort={v.antwort}
          onAntwort={(gewaehlt) => antworten.onAntwort(gewaehlt.id === schritt.eintrag.id, gewaehlt.id)}
          onWeiter={antworten.onWeiter}
        />
      )}
    </div>
  );
}

// --- Hilfen ------------------------------------------------------------------

function KeineLektion() {
  return (
    <div className="seite leer">
      <p>Diese Lektion gibt es noch nicht.</p>
      <a className="knopf" href={href({ name: 'start' })}>
        Zum Lernpfad
      </a>
    </div>
  );
}

/** Link, der die Adresse ersetzt: Nach einer Runde führt „Zurück“ nicht wieder in dieselbe Runde. */
function Weiter({ ziel, zweit = false, children }: { ziel: Route; zweit?: boolean; children: ReactNode }) {
  return (
    <a
      className={`knopf${zweit ? ' knopf--zweit' : ''}`}
      href={href(ziel)}
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        entsperren();
        ersetze(ziel);
      }}
    >
      {children}
    </a>
  );
}

const sprechenAn = () => sprechenMoeglich(motivation());

// --- Einheit im Lernpfad -----------------------------------------------------

export function EinheitScreen({ nr, einheit: einheitNr }: { nr: number; einheit: number }) {
  const lektion = verfuegbar.get(nr);
  const [lauf, setLauf] = useState(0);
  const einheit = lektion && einheiten(lektion).find((e) => e.nr === einheitNr);
  if (!lektion || !einheit) return <KeineLektion />;
  return <EinheitRunde key={lauf} lektion={lektion} einheit={einheit} onNochmal={() => setLauf((n) => n + 1)} />;
}

function EinheitRunde({ lektion, einheit, onNochmal }: { lektion: Lektion; einheit: Einheit; onNochmal: () => void }) {
  const f = useFortschritt();
  const anzahl = einheiten(lektion).length;
  const naechste = naechsteEinheit(lektion, f);
  const folgeLektion = verfuegbar.get(lektion.nr + 1);
  const zurLektion = href({ name: 'lektion', nr: lektion.nr, tab: 'ueben' });

  const baue = () => {
    const fortschritt = aktuellerFortschritt();
    return baueEinheit(einheit, fortschritt, {
      vorratFuer,
      faellige: faellige(alleLektionen, fortschritt, tagNummer(Date.now())),
      sprechen: sprechenAn(),
    });
  };

  return (
    <Runde
      baue={baue}
      art="einheit"
      schliessen={zurLektion}
      titel={() =>
        naechste ? `Einheit ${einheit.nr} von ${anzahl} geschafft` : `Lektion ${lektion.nr} geschafft – alle ${anzahl} Einheiten!`
      }
      knoepfe={
        <>
          {naechste ? (
            <Weiter ziel={{ name: 'einheit', nr: lektion.nr, einheit: naechste.nr }}>Nächste Einheit</Weiter>
          ) : folgeLektion ? (
            <Weiter ziel={{ name: 'lektion', nr: folgeLektion.nr, tab: 'text' }}>Weiter zu Lektion {folgeLektion.nr}</Weiter>
          ) : (
            <Weiter ziel={{ name: 'start' }}>Zum Lernpfad</Weiter>
          )}
          <div className="zwei">
            <button type="button" className="knopf knopf--zweit" onClick={onNochmal}>
              Nochmal
            </button>
            <a className="knopf knopf--zweit" href={zurLektion}>
              Zur Lektion
            </a>
          </div>
        </>
      }
    />
  );
}

// --- Freies Üben -------------------------------------------------------------

export function RundeScreen({ nr, art }: { nr: number; art: Uebungsart }) {
  const lektion = verfuegbar.get(nr);
  const [lauf, setLauf] = useState(0);
  const f = useFortschritt();

  // „gemischt“ gab es vor dem Lernpfad – heute geht es in die nächste Einheit.
  const naechste = lektion && art === 'gemischt' ? naechsteEinheit(lektion, f) : undefined;
  useEffect(() => {
    if (!lektion || art !== 'gemischt') return;
    ersetze(naechste ? { name: 'einheit', nr, einheit: naechste.nr } : { name: 'lektion', nr, tab: 'ueben' });
  }, [lektion, art, naechste, nr]);

  if (!lektion) return <KeineLektion />;
  if (art === 'gemischt') return null;
  return <FreieRunde key={lauf} lektion={lektion} art={art} onNochmal={() => setLauf((n) => n + 1)} />;
}

function FreieRunde({ lektion, art, onNochmal }: { lektion: Lektion; art: Exclude<Uebungsart, 'gemischt'>; onNochmal: () => void }) {
  const zurLektion = href({ name: 'lektion', nr: lektion.nr, tab: 'ueben' });
  const baue = () =>
    art === 'paare'
      ? baueHoerrunde(lektion.aussprache?.hoerpaare ?? [], aktuellerFortschritt())
      : baueRunde(art, lernreihenfolge(lektion), aktuellerFortschritt());

  return (
    <Runde
      baue={baue}
      art="frei"
      schliessen={zurLektion}
      knoepfe={
        <>
          <button type="button" className="knopf" onClick={onNochmal}>
            Weiter üben
          </button>
          <a className="knopf knopf--zweit" href={zurLektion}>
            Zur Lektion
          </a>
        </>
      }
      leer={
        <div className="seite leer">
          <p>In dieser Lektion gibt es dafür nichts zu üben.</p>
          <a className="knopf" href={zurLektion}>
            Zur Lektion
          </a>
        </div>
      }
    />
  );
}

// --- Runde im Karteikasten --------------------------------------------------

export function KartenrundeScreen() {
  const [lauf, setLauf] = useState(0);
  const f = useFortschritt();
  const nochFaellig = faellige(alleLektionen, f, tagNummer(Date.now())).length;
  const kasten = href({ name: 'karteikasten' });

  return (
    <Runde
      key={lauf}
      baue={() => {
        const fortschritt = aktuellerFortschritt();
        return baueKartenrunde(faellige(alleLektionen, fortschritt, tagNummer(Date.now())), fortschritt);
      }}
      art="wiederholung"
      schliessen={kasten}
      titel={() => (nochFaellig > 0 ? `Noch ${nochFaellig} Karten für heute` : 'Alle Karten für heute gelernt')}
      knoepfe={
        <>
          {nochFaellig > 0 && (
            <button type="button" className="knopf" onClick={() => setLauf((n) => n + 1)}>
              Weitere Karten
            </button>
          )}
          <Weiter ziel={{ name: 'karteikasten' }} zweit={nochFaellig > 0}>
            Zum Karteikasten
          </Weiter>
        </>
      }
      leer={
        <div className="seite leer">
          <p className="leer__gross">Alles gelernt!</p>
          <p>Heute ist im Karteikasten nichts mehr dran. Lerne neue Wörter in den Einheiten oder schau morgen wieder vorbei.</p>
          <a className="knopf" href={kasten}>
            Zum Karteikasten
          </a>
        </div>
      }
    />
  );
}
