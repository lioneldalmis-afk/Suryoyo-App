// „Satz der Woche für den Familientisch“: ein geprüfter Satz zum Ausprobieren
// zu Hause. Wer ihn gesagt hat, hakt ihn ab und bekommt XP.

import { useEffect, useMemo, useState } from 'react';
import { alleLektionen } from '../data';
import {
  familientischSaetze,
  hakeFamilientischAb,
  merkeSatzDerWoche,
  useMotivation,
  waehleSatzDerWoche,
  XP,
} from '../lib/motivation';
import { tagNummer, wochenSchluessel } from '../lib/zeit';
import { AudioButton } from './AudioButton';
import { IconHaken, IconHaus } from './Icons';
import { Surayt } from './Surayt';

const kandidaten = familientischSaetze(alleLektionen);

/** Erscheint erst, wenn jemand Familientisch-Sätze geprüft und abgehakt hat. */
export function SatzDerWoche({ bisLektion }: { bisLektion: number }) {
  const m = useMotivation();
  const woche = wochenSchluessel(tagNummer(Date.now()));
  const id = useMemo(
    () => waehleSatzDerWoche(m, kandidaten, woche, bisLektion),
    // Neu gewählt wird nur, wenn sich die Woche oder der gemerkte Satz ändert.
    [woche, m.satzDerWoche?.woche, m.satzDerWoche?.id],
  );
  useEffect(() => {
    if (id) merkeSatzDerWoche(woche, id);
  }, [id, woche]);
  const [geradeGesagt, setGeradeGesagt] = useState(false);

  const satz = kandidaten.find((e) => e.id === id);
  if (!satz) return null;
  const gesagt = satz.id in m.familientisch;

  return (
    <section className="familientisch" aria-label="Satz der Woche für den Familientisch">
      <p className="familientisch__titel">
        <IconHaus size={20} /> Satz der Woche für den Familientisch
      </p>
      <div className="familientisch__satz">
        <AudioButton url={satz.audio} label={satz.latein} />
        <p>
          <Surayt className="familientisch__sur">{satz.latein}</Surayt>
          <span>{satz.deutsch}</span>
        </p>
      </div>
      {gesagt ? (
        <p className="familientisch__erledigt">
          <IconHaken size={20} />
          {geradeGesagt ? `Super, +${XP.familientisch} XP! ` : 'Gesagt! '}
          Nächste Woche gibt’s einen neuen Satz.
        </p>
      ) : (
        <>
          <p className="familientisch__text">Probier ihn diese Woche bei Oma, Opa oder deinen Eltern aus.</p>
          <button
            type="button"
            className="knopf knopf--klein knopf--familie"
            onClick={() => {
              hakeFamilientischAb(satz.id, alleLektionen);
              setGeradeGesagt(true);
            }}
          >
            Hab ich gesagt!
          </button>
        </>
      )}
    </section>
  );
}
