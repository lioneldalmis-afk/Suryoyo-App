// Abschluss einer Übungsrunde: Lob, XP, Tagesziel, Serie und neue Abzeichen.

import type { ReactNode } from 'react';
import { LOB } from '../data';
import type { Bericht } from '../lib/motivation';
import type { Eintrag } from '../types';
import { AudioButton } from './AudioButton';
import { IconFlamme, IconStern } from './Icons';
import { Medaille } from './Medaille';
import { Surayt } from './Surayt';

interface Props {
  bericht: Bericht | null;
  /** Einträge, die abgefragt wurden, und die mit Fehler. */
  gesamt: number;
  falsche: Eintrag[];
  /** Zeile über dem Lob, z. B. „Einheit 3 geschafft“. */
  titel?: ReactNode;
  /** Die Knöpfe am Ende. */
  children: ReactNode;
}

export function Rundenende({ bericht, gesamt, falsche, titel, children }: Props) {
  const richtig = gesamt - falsche.length;
  const lob = falsche.length === 0 ? LOB.sehrGut : richtig >= gesamt / 2 ? LOB.gut : undefined;

  return (
    <div className="seite ergebnis">
      {titel && <p className="ergebnis__titel">{titel}</p>}
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

      {bericht && (
        <div className="ergebnis__belohnung">
          <p className="xp-plus">
            <IconStern size={26} /> +{bericht.xp} XP
          </p>
          <Tagesziel xp={bericht.xpHeute} ziel={bericht.ziel} geradeErreicht={bericht.zielGeradeErreicht} />
          {bericht.serieGewachsen && bericht.serie > 0 && (
            <p className="ergebnis__serie">
              <IconFlamme size={22} />
              {bericht.serie === 1 ? 'Erster Tag deiner Serie!' : `${bericht.serie} Tage in Folge – weiter so!`}
            </p>
          )}
        </div>
      )}

      {bericht && bericht.neueAbzeichen.length > 0 && (
        <section className="ergebnis__abzeichen" aria-label="Neue Abzeichen">
          {bericht.neueAbzeichen.map((a) => (
            <div key={a.id} className="neues-abzeichen">
              <Medaille abzeichen={a} groesse={56} />
              <div>
                <strong>Neues Abzeichen: {a.name}</strong>
                <span>{a.text}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {gesamt > 0 && (
        <p className="ergebnis__zahl">
          <strong>
            {richtig} von {gesamt}
          </strong>{' '}
          auf Anhieb richtig
        </p>
      )}

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
          <p className="ergebnis__hinweis">Diese kommen in den Karteikasten und bald wieder dran.</p>
        </section>
      )}

      <div className="ergebnis__knoepfe">{children}</div>
    </div>
  );
}

/** Fortschrittsbalken zum Tagesziel. */
export function Tagesziel(props: { xp: number; ziel: number; geradeErreicht?: boolean; titel?: string }) {
  const { xp, ziel, geradeErreicht = false, titel = 'Tagesziel' } = props;
  const erreicht = xp >= ziel;
  return (
    <div className={`tagesziel${erreicht ? ' tagesziel--erreicht' : ''}`}>
      <div className="tagesziel__zeile">
        <span>{geradeErreicht ? 'Tagesziel geschafft!' : xp >= ziel ? `${titel}: geschafft!` : titel}</span>
        <span>
          {Math.min(xp, ziel)} / {ziel} XP
        </span>
      </div>
      <div
        className="balken balken--ziel"
        role="progressbar"
        aria-label="Tagesziel"
        aria-valuemin={0}
        aria-valuemax={ziel}
        aria-valuenow={Math.min(xp, ziel)}
      >
        <span style={{ width: `${Math.min(1, xp / ziel) * 100}%` }} />
      </div>
    </div>
  );
}
