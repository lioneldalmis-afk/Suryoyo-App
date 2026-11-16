// Lektion 1 und 2: Alphabet, syrische Schrift, Laute und Hörpaare.
// Die Erklärungen und Beispiele stehen wörtlich im Lehrbuch; nur Überschriften
// und Bedienhinweise gehören zur Oberfläche.

import { useEffect, type MouseEvent } from 'react';
import { AudioButton } from '../components/AudioButton';
import { Surayt } from '../components/Surayt';
import { LAUTE } from '../data';
import { entsperren, spiele, useAudioStatus } from '../lib/audio';
import { ersetze, href } from '../lib/router';
import { lautSchluessel } from '../lib/text';
import type { Aussprache, Eintrag, Laut, Lektion } from '../types';

export function AusspracheAnsicht({ lektion, anker }: { lektion: Lektion; anker?: string }) {
  const a = lektion.aussprache as Aussprache;

  // Zum gewählten Laut springen. Erst im nächsten Bild, weil die App beim
  // Seitenwechsel zuvor nach oben scrollt.
  useEffect(() => {
    if (!anker) return;
    const bild = requestAnimationFrame(() => {
      document.getElementById(`laut-${anker}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(bild);
  }, [anker]);

  const laute = [...(a.konsonanten ?? []), ...(a.vokale ?? [])];

  return (
    <div className="aussprache">
      {a.alphabet && (
        <section className="abschnitt">
          <h2 className="zwischentitel">Das Alphabet</h2>
          {a.texte.alphabet?.map((t) => <p key={t} className="lehrtext">{t}</p>)}
          <p className="bedienhinweis">Tippe auf einen farbigen Buchstaben, um zu hören, wie er klingt.</p>
          <ul className="buchstaben">
            {a.alphabet.map((b) => {
              const ziel = LAUTE.get(lautSchluessel(b));
              return (
                <li key={b}>
                  {ziel ? (
                    <a
                      className="buchstabe buchstabe--erklaert"
                      href={href({ name: 'lektion', nr: ziel.nr, tab: 'text', anker: lautSchluessel(b) })}
                    >
                      <Surayt>{b}</Surayt>
                    </a>
                  ) : (
                    <span className="buchstabe">
                      <Surayt>{b}</Surayt>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {a.schrift && (
        <section className="abschnitt">
          <h2 className="zwischentitel">Die syrische Schrift</h2>
          <p className="bedienhinweis">
            Surayt wird auch in syrischer Schrift geschrieben, von rechts nach links. Tippe auf einen Buchstaben, um
            seinen Namen zu hören.
          </p>
          <ul className="schrift">
            {a.schrift.map((b) => (
              <li key={b.id}>
                <SchriftZeichen laut={b} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.neueBuchstaben && (
        <section className="abschnitt">
          <h2 className="zwischentitel">Neue Buchstaben für Surayt</h2>
          <div className="laute">
            {a.neueBuchstaben.map((b) => (
              <LautKarte key={b.id} laut={b} />
            ))}
          </div>
        </section>
      )}

      {laute.length > 0 && (
        <nav className="lautindex" aria-label="Laute">
          {laute.map((l) => (
            <a
              key={l.id}
              href={href({ name: 'lektion', nr: lektion.nr, tab: 'text', anker: lautSchluessel(l.zeichen) })}
              onClick={(ereignis: MouseEvent) => {
                ereignis.preventDefault();
                ersetze({ name: 'lektion', nr: lektion.nr, tab: 'text', anker: lautSchluessel(l.zeichen) });
              }}
            >
              <Surayt>{lautSchluessel(l.zeichen)}</Surayt>
            </a>
          ))}
        </nav>
      )}

      {a.konsonanten && (
        <section className="abschnitt">
          <h2 className="zwischentitel">Besondere Konsonanten</h2>
          {a.texte.konsonanten?.map((t) => <p key={t} className="lehrtext">{t}</p>)}
          <div className="laute">
            {a.konsonanten.map((l) => (
              <LautKarte key={l.id} laut={l} ziel={anker === lautSchluessel(l.zeichen)} />
            ))}
          </div>
        </section>
      )}

      {a.vokale && (
        <section className="abschnitt">
          <h2 className="zwischentitel">Vokale</h2>
          {a.texte.vokale?.map((t) => <p key={t} className="lehrtext">{t}</p>)}
          <div className="laute">
            {a.vokale.map((l) => (
              <LautKarte key={l.id} laut={l} ziel={anker === lautSchluessel(l.zeichen)} />
            ))}
          </div>
        </section>
      )}

      {a.texte.betonung && (
        <section className="abschnitt">
          <h2 className="zwischentitel">Betonung</h2>
          {a.texte.betonung.map((t) => <p key={t} className="lehrtext lehrtext--kasten">{t}</p>)}
        </section>
      )}

      {a.hoerpaare && (
        <section className="abschnitt">
          <h2 className="zwischentitel">Hörst du den Unterschied?</h2>
          <p className="bedienhinweis">Diese Wörter unterscheiden sich nur in einem Laut. Hör dir beide an.</p>
          <ul className="paare">
            {a.hoerpaare.map((p) => (
              <li key={p.id} className="paar">
                <Surayt className="paar__laute">{p.laute}</Surayt>
                <div className="paar__woerter">
                  {p.woerter.map((w) => (
                    <PaarWort key={w.id} wort={w} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="weiter-zu">
            <a className="knopf" href={href({ name: 'runde', nr: lektion.nr, art: 'paare' })} onClick={entsperren}>
              Hörpaare üben
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

/** Ein Buchstabe mit Erklärung und Beispielwörtern. */
function LautKarte({ laut, ziel = false }: { laut: Laut; ziel?: boolean }) {
  return (
    <article id={`laut-${lautSchluessel(laut.zeichen)}`} className={`laut${ziel ? ' laut--ziel' : ''}`}>
      <header className="laut__kopf">
        <Surayt className="laut__zeichen">{laut.zeichen}</Surayt>
        <span className="laut__syr" lang="syr" dir="rtl">
          {laut.syrisch}
        </span>
      </header>
      {laut.beschreibung && <p className="laut__text">{laut.beschreibung}</p>}
      <ul className="beispiele">
        {laut.beispiele.map((b) => (
          <li key={b.id} className="beispiel">
            <AudioButton url={b.audio} label={b.latein} />
            <span className="beispiel__text">
              <Markiert eintrag={b} />
              <span className="beispiel__de">{b.deutsch}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** Umschrift mit hervorgehobenem Laut: „kä[č]al“. */
function Markiert({ eintrag }: { eintrag: Eintrag }) {
  const { latein, hervor } = eintrag;
  if (!hervor) return <Surayt className="beispiel__sur">{latein}</Surayt>;
  return (
    <Surayt className="beispiel__sur">
      {latein.slice(0, hervor[0])}
      <mark>{latein.slice(...hervor)}</mark>
      {latein.slice(hervor[1])}
    </Surayt>
  );
}

/** Syrischer Buchstabe: antippen spielt seinen Namen. */
function SchriftZeichen({ laut }: { laut: Laut }) {
  const status = useAudioStatus();
  const aktiv = status.url === laut.audio && (status.zustand === 'spielt' || status.zustand === 'laedt');
  return (
    <button
      type="button"
      className={`zeichen${aktiv ? ' zeichen--aktiv' : ''}`}
      aria-label={`${laut.name} anhören`}
      onClick={() => laut.audio && void spiele(laut.audio)}
    >
      <span className="zeichen__syr" lang="syr" dir="rtl">
        {laut.syrisch}
      </span>
      <Surayt className="zeichen__name">{laut.name}</Surayt>
      <Surayt className="zeichen__wert">{laut.zeichen}</Surayt>
    </button>
  );
}

/** Ein Wort eines Hörpaars: antippen spielt es. */
function PaarWort({ wort }: { wort: Eintrag }) {
  const status = useAudioStatus();
  const aktiv = status.url === wort.audio && (status.zustand === 'spielt' || status.zustand === 'laedt');
  return (
    <button
      type="button"
      className={`paar__wort${aktiv ? ' paar__wort--aktiv' : ''}`}
      aria-label={`${wort.latein} – ${wort.deutsch} – anhören`}
      onClick={() => wort.audio && void spiele(wort.audio)}
    >
      <Surayt className="paar__sur">{wort.latein}</Surayt>
      <span className="paar__de">{wort.deutsch}</span>
    </button>
  );
}
