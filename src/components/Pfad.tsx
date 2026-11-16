// Geschwungener Lernpfad: Knoten, die abwechselnd nach links und rechts
// versetzt sind, verbunden durch eine gepunktete Linie. Die Linie wird aus den
// Maßen berechnet, deshalb stehen diese hier und nicht nur im CSS.

import type { CSSProperties, ReactNode } from 'react';

interface Masse {
  breite: number;
  /** Abstand von Knoten zu Knoten. */
  stufe: number;
  knoten: number;
  /** Wie weit die Knoten zur Seite schwingen. */
  ausschlag: number;
}

const versatz = (i: number, m: Masse) => Math.round(Math.sin(i * 1.05) * m.ausschlag);

function linie(anzahl: number, m: Masse): string {
  const punkt = (i: number) => ({ x: m.breite / 2 + versatz(i, m), y: i * m.stufe + m.knoten / 2 });
  let d = `M ${punkt(0).x} ${punkt(0).y}`;
  for (let i = 1; i < anzahl; i++) {
    const a = punkt(i - 1);
    const b = punkt(i);
    d += ` C ${a.x} ${a.y + m.stufe / 2}, ${b.x} ${b.y - m.stufe / 2}, ${b.x} ${b.y}`;
  }
  return d;
}

interface Props extends Masse {
  anzahl: number;
  /** Eine Stufe des Pfads; `stil` setzt Höhe und Versatz und gehört an das `<li>`. */
  stufeFuer: (i: number, stil: CSSProperties) => ReactNode;
  className?: string;
}

export function Pfad({ anzahl, stufeFuer, className, ...m }: Props) {
  return (
    <ol className={`pfad${className ? ' ' + className : ''}`} style={{ width: m.breite }}>
      <svg className="pfad__linie" width={m.breite} height={Math.max(0, anzahl - 1) * m.stufe + m.knoten} aria-hidden="true">
        <path d={linie(anzahl, m)} />
      </svg>
      {Array.from({ length: anzahl }, (_, i) =>
        stufeFuer(i, { height: m.stufe, '--versatz': `${versatz(i, m)}px` } as CSSProperties),
      )}
    </ol>
  );
}
