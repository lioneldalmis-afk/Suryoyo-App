// Wörterbuch: Wörter und Sätze aus dem Lehrbuch nachschlagen, Deutsch ↔ Surayt.
// Gedacht für den Moment am Familientisch: schnell finden, laut vorspielen.
// Es gibt nur geprüfte Einträge – nichts wird von einer KI übersetzt.

import { useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type MouseEvent } from 'react';
import { AudioButton } from '../components/AudioButton';
import { IconFrage, IconHaken, IconLupe, IconPfeil, IconSchliessen, IconZurueck } from '../components/Icons';
import { Leiste } from '../components/Leiste';
import { Surayt } from '../components/Surayt';
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
  beispielsatz,
  einzelneWoerter,
  suche,
  useWoerterbuch,
  woerterImSatz,
  type Fund,
  type Woerterbuch,
} from '../lib/woerterbuch';

/** Höchstens so viele Treffer stehen in der Liste. */
const TREFFER = 40;

// Bleibt erhalten, solange die App offen ist: Wer aus einem Eintrag
// zurückkommt, findet seine Suche an derselben Stelle wieder.
const merk = { suche: '', scroll: 0, ausDemWoerterbuch: false };

/** Ein Eintrag wird aus dem Wörterbuch heraus geöffnet – „Zurück“ führt dann einen Schritt zurück. */
const oeffnet = () => {
  merk.ausDemWoerterbuch = true;
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
  const einzeln = useMemo(() => (gesucht && !funde.length ? einzelneWoerter(wb, gesucht) : []), [wb, gesucht, funde]);
  const feld = useRef<HTMLInputElement>(null);
  const online = useOnline();

  useEffect(() => {
    merk.ausDemWoerterbuch = false;
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
          <h1>Wörterbuch</h1>
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
        ) : funde.length > 0 && nurAehnlich ? (
          <>
            <div className="nichts">
              <p className="nichts__titel">So nicht im Wörterbuch</p>
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
                „{gesucht}“ steht nicht im Wörterbuch. Es enthält nur Wörter und Sätze aus dem Lehrbuch – nichts wird
                automatisch übersetzt.
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

      <Leiste aktiv="woerterbuch" />
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
          <li>Tippe auf den Lautsprecher, um ein Wort zu hören – oder es am Tisch vorzuspielen.</li>
          <li>Alles stammt aus dem Lehrbuch, nichts wird von einer KI übersetzt. Das Wörterbuch geht auch ohne Internet.</li>
        </ul>
        <p className="tipps__zahl">
          {wb.funde.length.toLocaleString('de-DE')} Wörter und Sätze aus den Lektionen
          {wb.mitGlossar ? ' und dem Glossar' : ''} von <a href={QUELLE.url}>{QUELLE.name}</a>
        </p>
      </section>

      {n.anfragen.length > 0 && <MeineAnfragen anfragen={n.anfragen} />}
    </>
  );
}

/** `inDerSuche`: die Liste gehört zu den Suchergebnissen – dann merkt sich das Wörterbuch, wie weit man gescrollt hat. */
function Fundliste({ funde, inDerSuche = true }: { funde: readonly Fund[]; inDerSuche?: boolean }) {
  return (
    <ul className="woerter funde">
      {funde.map((f) => (
        <li key={f.id} className="wort fund">
          {f.audio ? <AudioButton url={f.audio} label={f.latein} /> : <span className="fund__still" aria-hidden="true" />}
          <a
            className="fund__link"
            href={href({ name: 'woerterbuch', id: f.id })}
            onClick={() => {
              if (inDerSuche) merk.scroll = window.scrollY;
              oeffnet();
            }}
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
              <span className="fund__wo">{herkunftKurz(f)}</span>
            </span>
            <IconPfeil size={18} />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** „Lektion 3“, „Satz · Lektion 4“, „Glossar“ … */
function herkunftKurz(f: Fund): string {
  const teile: string[] = [];
  if (f.quelle === 'community') teile.push('Community');
  if (f.art === 'satz') teile.push('Satz');
  if (f.herkunft === 'glossar') teile.push('Glossar');
  if (f.lektionen.length) {
    const nr = f.lektionen.slice(0, 3);
    teile.push(`Lektion ${nr.join(', ')}${f.lektionen.length > 3 ? ' …' : ''}`);
  }
  return teile.join(' · ');
}

// --- Wort anfragen -----------------------------------------------------------

function AnfrageKasten({ text, knapp = false }: { text: string; knapp?: boolean }) {
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
        <p>Fehlt ein Wort, das du brauchst? Frag danach – Menschen, die Surayt sprechen, schauen sich die Anfragen an.</p>
        <button type="button" className="knopf" onClick={() => setOffen(true)}>
          <IconFrage size={22} /> Wort anfragen
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

  // „Zurück“ geht einen Schritt zurück, wenn man aus dem Wörterbuch kam (dann
  // bleibt die Suche stehen); sonst direkt zur Suche.
  const zurueck = (ereignis: MouseEvent) => {
    if (merk.ausDemWoerterbuch && window.history.length > 1) {
      ereignis.preventDefault();
      window.history.back();
    }
  };

  const kopf = (
    <header className="kopf">
      <a className="kopf__zurueck" href={href({ name: 'woerterbuch' })} onClick={zurueck} aria-label="Zurück zum Wörterbuch">
        <IconZurueck />
      </a>
      <div className="kopf__titel">
        <h1>Wörterbuch</h1>
        {fund && <span>{fund.art === 'satz' ? 'Satz' : 'Wort'}</span>}
      </div>
    </header>
  );

  if (!fund) {
    return (
      <div className="seite eintrag">
        {kopf}
        <main className="leer">
          {wb.mitGlossar ? <p>Diesen Eintrag gibt es nicht (mehr).</p> : <p>Einen Moment …</p>}
          <a className="knopf" href={href({ name: 'woerterbuch' })}>
            Zum Wörterbuch
          </a>
        </main>
      </div>
    );
  }

  const beispiel = beispielsatz(wb, fund);
  const imSatz = fund.art === 'satz' ? woerterImSatz(wb, fund) : [];
  const glossar = wb.imGlossar.get(fund) ?? [];
  const wortschatz = wb.zwilling.get(fund);

  return (
    <div className={`seite eintrag${fund.art === 'satz' ? ' eintrag--satz' : ''}`}>
      {kopf}
      <main className="eintrag__inhalt">
        <section className="eintrag__karte">
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
          {fund.audio ? (
            <>
              <AudioButton url={fund.audio} label={fund.latein} gross />
              <p className="eintrag__tipp">Antippen zum Anhören – oder zum Vorspielen</p>
            </>
          ) : (
            <p className="eintrag__tipp">Zu diesem Eintrag gibt es keine Aufnahme.</p>
          )}
        </section>

        <Herkunft fund={fund} />

        {beispiel && (
          <section>
            <h2 className="zwischentitel">Beispielsatz</h2>
            <Fundliste funde={[beispiel]} inDerSuche={false} />
          </section>
        )}

        {imSatz.length > 0 && (
          <section>
            <h2 className="zwischentitel">Wörter aus diesem Satz</h2>
            <Fundliste funde={imSatz} inDerSuche={false} />
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
};

function Herkunft({ fund }: { fund: Fund }) {
  if (fund.quelle === 'community') {
    return (
      <section className="herkunft herkunft--community">
        <span className="herkunft__marke">Community</span>
        <p>Eingereicht aus der Community und von einem Menschen geprüft, der Surayt spricht.</p>
      </section>
    );
  }
  const nr = fund.lektion;
  const lektion = nr !== undefined ? verfuegbar.get(nr) : undefined;
  const titel = kurs.find((k) => k.nr === nr);
  const wo = fund.herkunft === 'text' && lektion && istDialog(lektion) ? 'Dialog' : WO[fund.herkunft];
  const weitere = fund.lektionen.filter((x) => x !== nr);
  // Sätze stehen im Text der Lektion, Wörter im Wortschatz; die Beispiele aus Lektion 1–2 bei den Lauten.
  const tab: LektionTab = fund.herkunft === 'text' || fund.herkunft === 'einleitung' || fund.herkunft === 'aussprache' ? 'text' : 'woerter';

  return (
    <section className="herkunft">
      <span className="herkunft__marke">Lehrbuch</span>
      <p>
        Aus <em>{QUELLE.name}</em> · {wo}
        {titel && (
          <>
            , Lektion {titel.nr} <Surayt>{titel.latein}</Surayt> ({titel.deutsch})
          </>
        )}
      </p>
      {weitere.length > 0 && <p className="herkunft__klein">Auch in Lektion {weitere.join(', ')}</p>}
      {lektion && (
        <a className="knopf knopf--zweit knopf--klein" href={href({ name: 'lektion', nr: lektion.nr, tab })}>
          Zur Lektion <IconPfeil size={16} />
        </a>
      )}
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
