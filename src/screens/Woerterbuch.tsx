// Übersetzer (bis November 2026 „Wörterbuch“): Wörter und Sätze nachschlagen,
// Deutsch ↔ Surayt. Gedacht für den Moment am Familientisch: schnell finden,
// laut vorspielen. Jeder Treffer trägt ein Schild, das sagt, woher er stammt
// und ob ihn jemand geprüft hat. Nichts wird von einer KI übersetzt. Steht ein
// einfacher deutscher Satz nicht in den Daten, setzt ihn der Baukasten nach einem
// Lehrbuch-Satz zusammen – mit orangem Schild und Bauplan (Phase 4b, Schritt 4).

import { useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type MouseEvent } from 'react';
import { AudioButton } from '../components/AudioButton';
import { abschnittUm, GrammatikAbsatz, GrammatikBloecke, GrammatikTabelle } from '../components/Grammatik';
import { IconFrage, IconHaken, IconLupe, IconPfeil, IconSchliessen, IconZurueck } from '../components/Icons';
import { Leiste } from '../components/Leiste';
import { SCHILDER, Schild } from '../components/Schild';
import { Surayt } from '../components/Surayt';
import { WortFuerWort } from '../components/WortFuerWort';
import { ZusammengesetztKarte } from '../components/Zusammengesetzt';
import { QUELLE } from '../config';
import { istDialog, kurs, verfuegbar } from '../data';
import {
  ANFRAGE_LAENGE,
  frageAn,
  merke,
  useNachschlagen,
  vergiss,
  zuruecknehmen,
  type Anfrage,
} from '../lib/nachschlagen';
import { href, type LektionTab } from '../lib/router';
import { fold, vorHinweis } from '../lib/text';
import {
  ausTabelle,
  beispielsatz,
  einzelneWoerter,
  hauptStelle,
  herkunftKurz,
  istGrundform,
  merkmalText,
  stufeVon,
  suche,
  useWoerterbuch,
  type Fund,
  type Stufe,
  type Woerterbuch,
} from '../lib/woerterbuch';
import { eingeschaltet, setzeZusammen } from '../lib/baukasten';
import { anzahlWoerter, erklaere, ganzGleich, siehtNachSuraytAus } from '../lib/wortfuerwort';
import type { GrammatikTeil } from '../types';

/** Höchstens so viele Treffer stehen in der Liste. */
const TREFFER = 40;

// Bleibt erhalten, solange die App offen ist: Wer aus einem Eintrag
// zurückkommt, findet seine Suche an derselben Stelle wieder.
const merk = { suche: '', scroll: 0, ausDerSuche: false };

/** Ein Eintrag wird aus der Suche heraus geöffnet – „Zurück“ führt dann einen Schritt zurück. */
const oeffnet = () => {
  merk.ausDerSuche = true;
};

/** Aus der Trefferliste heraus: Die Suche merkt sich auch, wie weit man gescrollt hat. */
const oeffnetAusSuche = () => {
  merk.scroll = window.scrollY;
  oeffnet();
};

// --- Suche ---------------------------------------------------------------------

export function WoerterbuchScreen() {
  const wb = useWoerterbuch();
  const [anfrage, setAnfrage] = useState(merk.suche);
  const gesucht = useDeferredValue(anfrage.trim());
  const { funde, nurAehnlich } = useMemo(
    () => (gesucht ? suche(wb, gesucht, TREFFER) : { funde: [], nurAehnlich: false }),
    [wb, gesucht],
  );
  // Ein Satz auf Surayt, der so nicht in den Daten steht: Wort für Wort erklären (Phase 4b, Schritt 3).
  const wortFuerWort = useMemo(() => {
    if (!gesucht || anzahlWoerter(gesucht) < 2 || !siehtNachSuraytAus(wb, gesucht)) return null;
    if (funde[0] && ganzGleich(funde[0].latein, gesucht)) return null;
    return erklaere(wb, gesucht, { mitSaetzen: true, mitAehnlichen: true });
  }, [wb, gesucht, funde]);
  // Ein deutscher Satz, der so nicht in den Daten steht: nach einem Lehrbuch-Satz zusammensetzen (Phase 4b, Schritt 4).
  // Erst mit den Verbtabellen – ohne sie wären es andere Satzbaupläne.
  const bau = useMemo(
    () => (gesucht && !wortFuerWort && wb.mitGrammatik ? setzeZusammen(wb, gesucht) : []),
    [wb, gesucht, wortFuerWort],
  );
  const einzeln = useMemo(
    () => (gesucht && !funde.length && !wortFuerWort && !bau.length ? einzelneWoerter(wb, gesucht) : []),
    [wb, gesucht, funde, wortFuerWort, bau],
  );
  const feld = useRef<HTMLInputElement>(null);
  const online = useOnline();

  // Den Baukasten vorbereiten, solange man noch tippt (einmal, auf dem Handy ein paar Zehntelsekunden).
  useEffect(() => {
    if (!wb.mitGrammatik) return;
    const t = window.setTimeout(() => void eingeschaltet(wb), 400);
    return () => window.clearTimeout(t);
  }, [wb]);

  useEffect(() => {
    merk.ausDerSuche = false;
    // Nach dem Zurückkommen dort weiterlesen, wo man war (nach dem Nach-oben-Scrollen der App).
    const y = merk.scroll;
    if (y > 0) requestAnimationFrame(() => void window.scrollTo(0, y));
  }, []);

  function tippe(text: string) {
    setAnfrage(text);
    merk.suche = text;
    merk.scroll = 0;
  }

  function fertig(ereignis: FormEvent) {
    ereignis.preventDefault();
    feld.current?.blur(); // Tastatur zu, damit man die Treffer sieht
  }

  return (
    <div className="seite seite--leiste woerterbuch">
      <header className="kopf kopf--bereich">
        <div className="kopf__titel">
          <h1>Übersetzer</h1>
          <span>Deutsch ↔ Surayt</span>
        </div>
      </header>

      <form className="suche" role="search" onSubmit={fertig}>
        <IconLupe size={22} />
        <input
          ref={feld}
          type="search"
          value={anfrage}
          onChange={(e) => tippe(e.target.value)}
          placeholder="Wort oder Satz suchen"
          aria-label="Wort oder Satz suchen, auf Deutsch oder Surayt"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
        />
        {anfrage && (
          <button
            type="button"
            className="suche__weg"
            aria-label="Suche löschen"
            onClick={() => {
              tippe('');
              feld.current?.focus();
            }}
          >
            <IconSchliessen size={20} />
          </button>
        )}
      </form>

      <main className="woerterbuch__inhalt">
        {!online && (
          <p className="offline" role="status">
            Du bist offline. Suchen klappt trotzdem – nur die Aufnahmen brauchen Internet.
          </p>
        )}

        {!gesucht ? (
          <Ohne wb={wb} />
        ) : wortFuerWort ? (
          <>
            <div className="nichts">
              <p className="nichts__titel">Nicht als Ganzes gefunden</p>
              <p>
                „{gesucht}“ steht so nicht im Übersetzer. Hier ist jedes Wort einzeln erklärt – einen deutschen Satz baut die
                App daraus nicht.
              </p>
            </div>
            <section>
              <h2 className="zwischentitel">Wort für Wort</h2>
              <WortFuerWort erklaerung={wortFuerWort} oeffnen={oeffnetAusSuche} />
            </section>
            {funde.length > 0 && (
              <section>
                <h2 className="zwischentitel">{nurAehnlich ? 'Ähnlich geschriebene Einträge' : 'Einträge mit diesen Wörtern'}</h2>
                <Fundliste funde={funde} />
              </section>
            )}
            <AnfrageKasten key={gesucht} text={gesucht} satz />
          </>
        ) : bau.length > 0 ? (
          <>
            <section>
              <h2 className="zwischentitel">Zusammengesetzt</h2>
              <p className="bau__vorweg">
                „{gesucht}“ steht so nicht im Lehrbuch. Der Übersetzer hat {bau.length === 1 ? 'den Satz' : 'diese Fassungen'} nach
                einem Lehrbuch-Satz zusammengesetzt, der genauso gebaut ist.
              </p>
              {bau.map((z) => (
                <ZusammengesetztKarte key={z.latein} z={z} wb={wb} oeffnen={oeffnetAusSuche} />
              ))}
            </section>
            {/* Nur ähnlich geschriebene Einträge („gegessen werden“ zu „er wird essen“) lenken hier bloß ab. */}
            {funde.length > 0 && !nurAehnlich && (
              <section>
                <h2 className="zwischentitel">Einträge mit diesen Wörtern</h2>
                <Fundliste funde={funde} />
              </section>
            )}
            <AnfrageKasten key={gesucht} text={gesucht} zusammengesetzt />
          </>
        ) : funde.length > 0 && nurAehnlich ? (
          <>
            <div className="nichts">
              <p className="nichts__titel">Nicht genau so gefunden</p>
              <p>„{gesucht}“ gibt es nicht genau so. Diese Einträge sind nur ähnlich geschrieben – meintest du einen davon?</p>
            </div>
            <Fundliste funde={funde} />
            <AnfrageKasten key={gesucht} text={gesucht} />
          </>
        ) : funde.length > 0 ? (
          <>
            <p className="legende">
              {funde.length === TREFFER ? `Die ${TREFFER} besten Treffer` : funde.length === 1 ? '1 Treffer' : `${funde.length} Treffer`}
            </p>
            <Fundliste funde={funde} />
            <AnfrageKasten key={gesucht} text={gesucht} knapp />
          </>
        ) : (
          <>
            <div className="nichts">
              <p className="nichts__titel">Nichts gefunden</p>
              <p>
                „{gesucht}“ ist nicht unter den Wörtern und Sätzen des Übersetzers. Er zeigt nur, was im Lehrbuch
                steht oder von Muttersprachlern geprüft ist.
              </p>
            </div>
            {einzeln.length > 0 && (
              <section>
                <h2 className="zwischentitel">Einzelne Wörter aus deiner Suche</h2>
                {einzeln.map((g) => (
                  <div key={g.wort} className="einzeln">
                    <p className="einzeln__wort">„{g.wort}“</p>
                    <Fundliste funde={g.funde} />
                  </div>
                ))}
              </section>
            )}
            <AnfrageKasten key={gesucht} text={gesucht} />
          </>
        )}
      </main>

      <Leiste aktiv="uebersetzer" />
    </div>
  );
}

/** Ohne Suchbegriff: zuletzt Nachgeschlagenes, Tipps und eigene Anfragen. */
function Ohne({ wb }: { wb: Woerterbuch }) {
  const n = useNachschlagen();
  const zuletzt = [...new Set(n.verlauf.map((id) => wb.nachId.get(id)).filter((f): f is Fund => !!f))];
  // Das Beispiel kommt aus den Daten: der Titel von Lektion 3, einmal ohne Sonderzeichen.
  const beispiel = verfuegbar.get(3)?.titel.latein;

  return (
    <>
      {zuletzt.length > 0 && (
        <section>
          <div className="zwischenzeile">
            <h2 className="zwischentitel">Zuletzt nachgeschlagen</h2>
            <button type="button" className="leise" onClick={vergiss}>
              Leeren
            </button>
          </div>
          <Fundliste funde={zuletzt} />
        </section>
      )}

      <section className="tipps">
        <h2 className="zwischentitel">So findest du alles</h2>
        <ul>
          <li>Tippe ein Wort oder einen Satz – auf Deutsch oder auf Surayt.</li>
          <li>
            Sonderzeichen brauchst du nicht
            {beispiel && (
              <>
                : „<Surayt>{fold(beispiel)}</Surayt>“ findet „<Surayt>{beispiel}</Surayt>“
              </>
            )}
            . Statt <Surayt>š</Surayt> geht auch <em>sch</em> oder <em>sh</em>.
          </li>
          <li>Wortteile und kleine Tippfehler klappen auch.</li>
          <li>
            Steht ein einfacher Satz nicht im Lehrbuch, setzt der Übersetzer ihn manchmal nach einem Lehrbuch-Satz zusammen –
            dann mit orangem Schild und ohne Aufnahme.
          </li>
          <li>Tippe auf den Lautsprecher, um ein Wort zu hören – oder es am Tisch vorzuspielen.</li>
          <li>Nichts wird von einer KI übersetzt. Der Übersetzer geht auch ohne Internet.</li>
        </ul>
        <p className="tipps__zahl">
          {wb.funde.length.toLocaleString('de-DE')} Wörter, Formen und Sätze aus den Lektionen
          {wb.mitGlossar && wb.mitGrammatik ? ', dem Glossar und der Grammatik' : wb.mitGlossar ? ' und dem Glossar' : ''} von{' '}
          <a href={QUELLE.url}>{QUELLE.name}</a>
        </p>
      </section>

      <section className="schilder">
        <h2 className="zwischentitel">Was die Schilder bedeuten</h2>
        <ul>
          {(Object.keys(SCHILDER) as Stufe[]).map((stufe) => (
            <li key={stufe}>
              <Schild stufe={stufe} />
              <p>{SCHILDER[stufe].erklaerung}</p>
            </li>
          ))}
        </ul>
      </section>

      {n.anfragen.length > 0 && <MeineAnfragen anfragen={n.anfragen} />}
    </>
  );
}

/** `inDerSuche`: die Liste gehört zu den Suchergebnissen – dann merkt sich der Übersetzer, wie weit man gescrollt hat. */
function Fundliste({ funde, inDerSuche = true }: { funde: readonly Fund[]; inDerSuche?: boolean }) {
  return (
    <ul className="woerter funde">
      {funde.map((f) => (
        <li key={f.id} className="wort fund">
          {f.audio ? <AudioButton url={f.audio} label={f.latein} /> : <span className="fund__still" aria-hidden="true" />}
          <a
            className="fund__link"
            href={href({ name: 'uebersetzer', id: f.id })}
            onClick={inDerSuche ? oeffnetAusSuche : oeffnet}
          >
            <span className="wort__text">
              <span>
                <Surayt className="wort__sur">{f.latein}</Surayt>
                {f.hinweis && (
                  <span className="wort__hinweis">
                    {vorHinweis(f.hinweis)}
                    {f.hinweis}
                  </span>
                )}
              </span>
              <span className="wort__de">{f.deutsch}</span>
              {ausTabelle(f) && f.merkmal && <span className="fund__merkmal">{merkmalText(f)}</span>}
              <span className="fund__wo">
                <Schild stufe={stufeVon(f)} klein />
                {herkunftKurz(f)}
              </span>
            </span>
            <IconPfeil size={18} />
          </a>
        </li>
      ))}
    </ul>
  );
}


// --- Wort anfragen -----------------------------------------------------------

/**
 * `satz`: Es geht um einen ganzen Satz (Wort für Wort erklärt), nicht um ein Wort.
 * `zusammengesetzt`: Der Baukasten hat den Satz zusammengesetzt – niemand hat ihn geprüft.
 */
function AnfrageKasten({
  text,
  knapp = false,
  satz = false,
  zusammengesetzt = false,
}: {
  text: string;
  knapp?: boolean;
  satz?: boolean;
  zusammengesetzt?: boolean;
}) {
  const [offen, setOffen] = useState(false);
  const [wort, setWort] = useState(text.slice(0, ANFRAGE_LAENGE));
  const [situation, setSituation] = useState('');
  const [gespeichert, setGespeichert] = useState(false);

  if (gespeichert) {
    return (
      <div className="anfrage anfrage--fertig" role="status">
        <span className="anfrage__icon">
          <IconHaken size={24} />
        </span>
        <p>
          <strong>Deine Anfrage ist gespeichert.</strong> Sie bleibt vorerst auf deinem Handy und wird verschickt, sobald
          die App Anfragen annehmen kann. Dann schauen Menschen nach, die Surayt sprechen.
        </p>
      </div>
    );
  }

  if (!offen) {
    return knapp ? (
      <button type="button" className="anfrage__link" onClick={() => setOffen(true)}>
        Nicht das Richtige dabei? <strong>Wort anfragen</strong>
      </button>
    ) : (
      <div className="anfrage">
        <p>
          {zusammengesetzt
            ? 'Willst du sicher sein, dass man es so sagt? Frag nach – Menschen, die Surayt sprechen, schauen sich die Anfragen an.'
            : satz
              ? 'Verstehst du den Satz nicht ganz? Frag nach – Menschen, die Surayt sprechen, schauen sich die Anfragen an.'
              : 'Fehlt ein Wort, das du brauchst? Frag danach – Menschen, die Surayt sprechen, schauen sich die Anfragen an.'}
        </p>
        <button type="button" className="knopf" onClick={() => setOffen(true)}>
          <IconFrage size={22} /> {satz || zusammengesetzt ? 'Satz anfragen' : 'Wort anfragen'}
        </button>
      </div>
    );
  }

  function speichern(ereignis: FormEvent) {
    ereignis.preventDefault();
    if (frageAn(wort, situation)) setGespeichert(true);
  }

  return (
    <form className="anfrage anfrage--form" onSubmit={speichern}>
      <label className="feld">
        <span>Was möchtest du auf Surayt sagen oder verstehen?</span>
        <input value={wort} maxLength={ANFRAGE_LAENGE} onChange={(e) => setWort(e.target.value)} autoComplete="off" />
      </label>
      <label className="feld">
        <span>
          Wann brauchst du es? <em>(freiwillig)</em>
        </span>
        <input
          value={situation}
          maxLength={ANFRAGE_LAENGE}
          onChange={(e) => setSituation(e.target.value)}
          placeholder="z. B. beim Essen mit Oma"
          autoComplete="off"
        />
      </label>
      <p className="anfrage__klein">Bitte keine Namen, Adressen oder anderen persönlichen Angaben eintragen.</p>
      <div className="zwei">
        <button type="button" className="knopf knopf--zweit" onClick={() => setOffen(false)}>
          Abbrechen
        </button>
        <button type="submit" className="knopf" disabled={!wort.trim()}>
          Speichern
        </button>
      </div>
    </form>
  );
}

function MeineAnfragen({ anfragen }: { anfragen: Anfrage[] }) {
  return (
    <section>
      <h2 className="zwischentitel">Deine Anfragen</h2>
      <ul className="woerter anfragen">
        {anfragen.map((a) => (
          <li key={a.zeit} className="wort">
            <span className="wort__text">
              <span className="wort__sur">{a.text}</span>
              {a.situation && <span className="wort__de">{a.situation}</span>}
              <span className="fund__wo">
                {datum(a.zeit)} · {a.verschickt ? 'verschickt' : 'noch auf dem Handy, wird später verschickt'}
              </span>
            </span>
            <button type="button" className="anfragen__weg" aria-label={`Anfrage „${a.text}“ löschen`} onClick={() => zuruecknehmen(a.zeit)}>
              <IconSchliessen size={18} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const datum = (zeit: number) => new Date(zeit).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' });

// --- Ein Eintrag ---------------------------------------------------------------

export function EintragScreen({ id }: { id: string }) {
  const wb = useWoerterbuch();
  const fund = wb.nachId.get(id);

  useEffect(() => {
    if (fund) merke(fund.id);
  }, [fund]);

  // „Zurück“ geht einen Schritt zurück, wenn man aus der Suche kam (dann
  // bleibt die Suche stehen); sonst direkt zur Suche.
  const zurueck = (ereignis: MouseEvent) => {
    if (merk.ausDerSuche && window.history.length > 1) {
      ereignis.preventDefault();
      window.history.back();
    }
  };

  const kopf = (
    <header className="kopf">
      <a className="kopf__zurueck" href={href({ name: 'uebersetzer' })} onClick={zurueck} aria-label="Zurück zum Übersetzer">
        <IconZurueck />
      </a>
      <div className="kopf__titel">
        <h1>Übersetzer</h1>
        {fund && <span>{fund.art === 'satz' ? 'Satz' : fund.verb && ausTabelle(fund) ? 'Verbform' : 'Wort'}</span>}
      </div>
    </header>
  );

  if (!fund) {
    return (
      <div className="seite eintrag">
        {kopf}
        <main className="leer">
          {wb.mitGlossar ? <p>Diesen Eintrag gibt es nicht (mehr).</p> : <p>Einen Moment …</p>}
          <a className="knopf" href={href({ name: 'uebersetzer' })}>
            Zum Übersetzer
          </a>
        </main>
      </div>
    );
  }

  const beispiel = beispielsatz(wb, fund);
  // Sätze und mehrteilige Beispiele der Grammatik: jedes Wort einzeln (Phase 4b, Schritt 3).
  const wortFuerWort =
    fund.art === 'satz' || (ausTabelle(fund) && anzahlWoerter(fund.latein) >= 2) ? erklaere(wb, fund.latein, { ohne: fund }) : null;
  const glossar = wb.imGlossar.get(fund) ?? [];
  const wortschatz = wb.zwilling.get(fund);

  return (
    <div className={`seite eintrag${fund.art === 'satz' ? ' eintrag--satz' : ''}`}>
      {kopf}
      <main className="eintrag__inhalt">
        <section className="eintrag__karte">
          <Schild stufe={stufeVon(fund)} />
          {fund.sprecher && <p className="eintrag__wer">{fund.sprecher}:</p>}
          <p className="eintrag__sur">
            <Surayt>{fund.latein}</Surayt>
          </p>
          {fund.hinweis && (
            <p className="eintrag__hinweis">
              <Surayt>{fund.hinweis}</Surayt>
            </p>
          )}
          <p className="eintrag__de">{fund.deutsch}</p>
          {ausTabelle(fund) && fund.merkmal && <p className="eintrag__merkmal">{merkmalText(fund)}</p>}
          {fund.audio ? (
            <>
              <AudioButton url={fund.audio} label={fund.latein} gross />
              <p className="eintrag__tipp">Antippen zum Anhören – oder zum Vorspielen</p>
            </>
          ) : (
            <p className="eintrag__tipp">Zu diesem Eintrag gibt es keine Aufnahme.</p>
          )}
        </section>

        <Herkunft fund={fund} wb={wb} />

        {fund.stellen && <ImLehrbuch fund={fund} wb={wb} />}

        {beispiel && (
          <section>
            <h2 className="zwischentitel">Beispielsatz</h2>
            <Fundliste funde={[beispiel]} inDerSuche={false} />
          </section>
        )}

        {wortFuerWort && (
          <section>
            <h2 className="zwischentitel">Wort für Wort</h2>
            <WortFuerWort erklaerung={wortFuerWort} oeffnen={oeffnet} />
          </section>
        )}

        {glossar.length > 0 && (
          <section>
            <h2 className="zwischentitel">Mehr dazu im Glossar</h2>
            <Fundliste funde={glossar} inDerSuche={false} />
          </section>
        )}

        {wortschatz && (
          <section>
            <h2 className="zwischentitel">Im Wortschatz der Lektion</h2>
            <Fundliste funde={[wortschatz]} inDerSuche={false} />
          </section>
        )}
      </main>
    </div>
  );
}

const WO: Record<Fund['herkunft'], string> = {
  wortschatz: 'Wortschatz',
  aussprache: 'Aussprache',
  text: 'Text',
  einleitung: 'Einleitung',
  glossar: 'Glossar',
  grammatik: 'Grammatik',
  formen: 'Formentabellen',
};

function Herkunft({ fund, wb }: { fund: Fund; wb: Woerterbuch }) {
  if (stufeVon(fund) === 'muttersprachler') {
    return (
      <section className="herkunft">
        <p>{SCHILDER.muttersprachler.erklaerung}</p>
      </section>
    );
  }
  const nr = fund.lektion;
  const lektion = nr !== undefined ? verfuegbar.get(nr) : undefined;
  const titel = kurs.find((k) => k.nr === nr);
  const stelle = ausTabelle(fund) ? hauptStelle(fund, wb.seiten) : undefined;
  const seite = stelle && wb.seiten.get(stelle.seite);
  const wo =
    fund.herkunft === 'text' && lektion && istDialog(lektion)
      ? 'Dialog'
      : seite?.art === 'verben'
        ? 'Verbkonjugation'
        : seite?.art === 'formen'
          ? `Formentabellen: ${seite.titel}`
          : WO[fund.herkunft];
  const weitere = fund.lektionen.filter((x) => x !== nr);
  // Weitere Seiten der Grammatik, auf denen dieselbe Form steht („Auch in: Grammatik 7, Regelmäßige Verben“).
  const auchIn = stelle
    ? [...new Set((fund.stellen ?? []).filter((st) => st.seite !== stelle.seite).map((st) => wb.seiten.get(st.seite)))]
        .filter((x) => !!x)
        .map((x) => (x.art === 'verben' ? 'Verbkonjugation' : x.titel))
    : [];
  const mitLektion = !seite || seite.art === 'grammatik';
  // Sätze stehen im Text der Lektion, Wörter im Wortschatz; die Beispiele aus Lektion 1–2 bei den Lauten.
  const tab: LektionTab =
    fund.herkunft === 'text' || fund.herkunft === 'einleitung' || fund.herkunft === 'aussprache' || fund.herkunft === 'grammatik' ? 'text' : 'woerter';

  return (
    <section className="herkunft">
      <p>
        Aus <em>{QUELLE.name}</em> · {wo}
        {titel && mitLektion && (
          <>
            , Lektion {titel.nr} <Surayt>{titel.latein}</Surayt> ({titel.deutsch})
          </>
        )}
      </p>
      {auchIn.length > 0 && <p className="herkunft__klein">Auch in: {[...new Set(auchIn)].join(', ')}</p>}
      {!stelle && weitere.length > 0 && <p className="herkunft__klein">Auch in Lektion {weitere.join(', ')}</p>}
      {lektion && (
        <a className="knopf knopf--zweit knopf--klein" href={href({ name: 'lektion', nr: lektion.nr, tab })}>
          {mitLektion ? 'Zur Lektion' : `Zur Lektion ${lektion.nr}`} <IconPfeil size={16} />
        </a>
      )}
    </section>
  );
}

/**
 * Wo der Eintrag in Grammatik, Verb- oder Formentabellen steht: die Tabelle
 * (der Eintrag hervorgehoben), bei Grammatik-Seiten die Erklärung dazu und bei
 * Verben Imperativ und Infinitiv.
 */
function ImLehrbuch({ fund, wb }: { fund: Fund; wb: Woerterbuch }) {
  const stelle = hauptStelle(fund, wb.seiten);
  const seite = stelle && wb.seiten.get(stelle.seite);
  if (!stelle || !seite) return null;
  const block = seite.bloecke[stelle.block];
  const markiert = (t: GrammatikTeil) => t.text === fund.latein || (!!fund.audio && t.audio === fund.audio);

  // Steht die Form nur im Text unter der Tabelle (Imperativ, Infinitiv), zeigt die Tabelle des Verbs alle übrigen Formen.
  const formen = fund.verb ? (wb.gruppen.get(fund.verb) ?? []) : [];
  let tabelle = block?.art === 'tabelle' ? { seite, block: stelle.block } : undefined;
  if (!tabelle && formen.length) {
    for (const f of formen) {
      const st = hauptStelle(f, wb.seiten);
      const s = st && wb.seiten.get(st.seite);
      if (s && st && s.bloecke[st.block]?.art === 'tabelle') {
        tabelle = { seite: s, block: st.block };
        break;
      }
    }
  }
  const imText = block?.art === 'absatz' ? block : undefined;
  const { titel, von, bis } = abschnittUm(seite, stelle.block);
  const nebenformen = formen.filter((f) => f !== fund && /^(Imperativ|Infinitiv)/.test(f.merkmal ?? ''));
  const grundform = formen.find(istGrundform);
  const ueberschrift = ausTabelle(fund) ? 'So steht es im Lehrbuch' : 'Auch in der Grammatik';
  const tab = tabelle && tabelle.seite.bloecke[tabelle.block];

  return (
    <section className="im-lehrbuch">
      <h2 className="zwischentitel">
        {fund.verb ? (
          <>
            Alle Formen von <Surayt>{fund.verb}</Surayt>
          </>
        ) : (
          ueberschrift
        )}
      </h2>
      <p className="im-lehrbuch__wo">{[seite.titel, ...titel.filter((t) => !/^[A-L]\s*[:–-]\s/.test(t))].join(' · ')}</p>
      {imText && <GrammatikAbsatz teile={imText.teile} markiert />}
      {tab?.art === 'tabelle' && <GrammatikTabelle zeilen={tab.zeilen} markiert={markiert} />}
      {grundform && grundform !== fund && (
        <p className="im-lehrbuch__klein">
          Grundform: <a href={href({ name: 'uebersetzer', id: grundform.id })} onClick={oeffnet}><Surayt>{grundform.latein}</Surayt></a> – {grundform.deutsch}
        </p>
      )}
      {nebenformen.length > 0 && (
        <>
          <h3 className="zwischentitel zwischentitel--klein">Imperativ und Infinitiv</h3>
          <Fundliste funde={nebenformen} inDerSuche={false} />
        </>
      )}
      {seite.art === 'grammatik' && bis - von > 1 && (
        <details className="erklaerung">
          <summary>Erklärung aus dem Lehrbuch lesen</summary>
          <GrammatikBloecke bloecke={seite.bloecke.slice(von, bis)} markiert={markiert} ohneErsteUeberschrift />
        </details>
      )}
      <a className="im-lehrbuch__link" href={seite.url} target="_blank" rel="noopener noreferrer">
        Diese Seite im Lehrbuch öffnen
      </a>
    </section>
  );
}

// --- Online oder nicht ---------------------------------------------------------

function abonniereNetz(f: () => void) {
  window.addEventListener('online', f);
  window.addEventListener('offline', f);
  return () => {
    window.removeEventListener('online', f);
    window.removeEventListener('offline', f);
  };
}

const useOnline = () => useSyncExternalStore(abonniereNetz, () => navigator.onLine);
