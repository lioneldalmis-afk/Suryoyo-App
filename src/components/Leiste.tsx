import type { ReactNode } from 'react';
import { alleLektionen } from '../data';
import { karteikasten } from '../lib/einheiten';
import { useFortschritt } from '../lib/progress';
import { href } from '../lib/router';
import { tagNummer } from '../lib/zeit';
import { IconHaus, IconKarten, IconLupe } from './Icons';

export type Bereich = 'lernen' | 'woerterbuch' | 'karteikasten';

/** Leiste am unteren Rand mit den drei Hauptbereichen der App. */
export function Leiste({ aktiv }: { aktiv: Bereich }) {
  const f = useFortschritt();
  const dran = karteikasten(alleLektionen, f, tagNummer(Date.now())).heuteDran;
  const punkte: { bereich: Bereich; ziel: string; name: string; icon: ReactNode }[] = [
    { bereich: 'lernen', ziel: href({ name: 'start' }), name: 'Lernen', icon: <IconHaus size={26} /> },
    { bereich: 'woerterbuch', ziel: href({ name: 'woerterbuch' }), name: 'Wörterbuch', icon: <IconLupe size={26} /> },
    { bereich: 'karteikasten', ziel: href({ name: 'karteikasten' }), name: 'Karteikasten', icon: <IconKarten size={26} /> },
  ];
  return (
    <nav className="leiste" aria-label="Bereiche der App">
      {punkte.map((p) => (
        <a
          key={p.bereich}
          href={p.ziel}
          className={p.bereich === aktiv ? 'leiste__aktiv' : undefined}
          aria-current={p.bereich === aktiv ? 'page' : undefined}
        >
          <span className="leiste__icon">
            {p.icon}
            {p.bereich === 'karteikasten' && dran > 0 && (
              <span className="leiste__zahl">
                {dran > 99 ? '99+' : dran}
                <span className="nur-vorlesen"> Karten dran</span>
              </span>
            )}
          </span>
          {p.name}
        </a>
      ))}
    </nav>
  );
}
