// Seiten der Grammatik, Verb- und Formentabellen so zeigen, wie sie im Lehrbuch
// stehen (Fahrplan, Phase 4b, Schritt 2): Überschriften, Erklärungen und Tabellen,
// wörtlich. Die syrische Schrift bleibt wie überall bis Phase 6 ausgeblendet –
// Spalten, in denen nur sie steht, fallen weg.

import { Fragment, type ReactNode } from 'react';
import type { GrammatikBlock, GrammatikSeite, GrammatikStueck, GrammatikTeil, GrammatikZelle } from '../types';
import { AudioButton } from './AudioButton';
import { Surayt } from './Surayt';

const SYRISCH = /[\u{700}-\u{74F}]/u;
const LATEIN = /[A-Za-z\u{C0}-\u{24F}\u{1E00}-\u{1EFF}]/u;
/** Syrische Schrift aus einem Text entfernen (in Zellen, in denen beides steht). */
const ohneSchrift = (text: string) =>
  text
    .replace(/[\u{700}-\u{74F}\u{640}][\u{700}-\u{74F}\u{640}\u{300}-\u{36F}]*/gu, '')
    .replace(/\s*[،؟܆]\s*/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const nurSchrift = (text: string) => SYRISCH.test(text) && !LATEIN.test(text);
const zellText = (z: GrammatikZelle) => z.teile.map((t) => t.text).join(' ');

// --- Abschnitte ---------------------------------------------------------------------

/**
 * Der Abschnitt um einen Block: von der letzten Überschrift der Ebene „a)“ oder
 * höher bis vor die nächste gleich hohe. `titel` sind die Überschriften darüber.
 */
export function abschnittUm(seite: GrammatikSeite, block: number): { titel: string[]; von: number; bis: number } {
  const kette: { text: string; ebene: number }[] = [];
  let von = 0;
  let ebene = 99;
  seite.bloecke.forEach((b, i) => {
    if (i > block || b.art !== 'titel') return;
    while (kette.length && kette[kette.length - 1].ebene >= b.ebene) kette.pop();
    kette.push(b);
    if (b.ebene <= 2) {
      von = i;
      ebene = b.ebene;
    }
  });
  let bis = seite.bloecke.length;
  for (let i = block + 1; i < seite.bloecke.length; i++) {
    const b = seite.bloecke[i];
    if (b.art === 'titel' && b.ebene <= Math.min(ebene, 2)) {
      bis = i;
      break;
    }
  }
  return { titel: kette.map((t) => t.text), von, bis };
}

// --- Text ---------------------------------------------------------------------------

/** Text mit fett hervorgehobenen Stellen. */
function mitFett(text: string, fett?: [number, number][]): ReactNode {
  if (!fett?.length) return text;
  const aus: ReactNode[] = [];
  let pos = 0;
  fett.forEach(([a, b], i) => {
    if (a > pos) aus.push(text.slice(pos, a));
    aus.push(<strong key={i}>{text.slice(a, b)}</strong>);
    pos = b;
  });
  if (pos < text.length) aus.push(text.slice(pos));
  return aus;
}

export function GrammatikAbsatz({ teile, markiert = false }: { teile: GrammatikStueck[]; markiert?: boolean }) {
  return (
    <p className={`gr-absatz${markiert ? ' gr-absatz--markiert' : ''}`}>
      {teile
        .filter((s) => !s.syr)
        .map((s, i) => {
          const inhalt = s.fett ? <strong>{s.text}</strong> : s.text;
          return s.sur ? (
            <Surayt key={i} className="gr-sur">
              {inhalt}
            </Surayt>
          ) : (
            <Fragment key={i}>{inhalt}</Fragment>
          );
        })}
    </p>
  );
}

// --- Tabellen -------------------------------------------------------------------------

interface Ref {
  z: GrammatikZelle;
  r: number;
  c: number;
}

function raster(zeilen: GrammatikZelle[][]): (Ref | undefined)[][] {
  const g: (Ref | undefined)[][] = [];
  zeilen.forEach((zeile, i) => {
    g[i] ??= [];
    let c = 0;
    for (const z of zeile) {
      while (g[i][c]) c++;
      const ref = { z, r: i, c };
      for (let di = 0; di < (z.hoch ?? 1); di++) {
        g[i + di] ??= [];
        for (let dc = 0; dc < (z.breit ?? 1); dc++) g[i + di][c + dc] = ref;
      }
      c += z.breit ?? 1;
    }
  });
  return g;
}

/** Spalten, in denen nur syrische Schrift steht (oder nichts), werden nicht gezeigt. */
function schriftSpalten(g: (Ref | undefined)[][]): boolean[] {
  const breite = Math.max(0, ...g.map((z) => z.length));
  return Array.from({ length: breite }, (_, c) => {
    const zellen = g.map((z) => z[c]).filter((x): x is Ref => !!x && (x.z.breit ?? 1) === 1);
    const voll = zellen.filter((x) => zellText(x.z).trim());
    return voll.length > 0 && voll.every((x) => nurSchrift(zellText(x.z)));
  });
}

function Teil({ teil, sur, markiert }: { teil: GrammatikTeil; sur: boolean; markiert: boolean }) {
  const text = SYRISCH.test(teil.text) ? ohneSchrift(teil.text) : teil.text;
  if (!text) return null;
  const inhalt = mitFett(text, SYRISCH.test(teil.text) ? undefined : teil.fett);
  return (
    <span className={`gr-teil${markiert ? ' gr-teil--markiert' : ''}`}>
      {teil.audio && <AudioButton url={teil.audio} label={text} klein />}
      {sur ? <Surayt>{inhalt}</Surayt> : <span>{inhalt}</span>}
    </span>
  );
}

/**
 * Eine Tabelle aus dem Lehrbuch. `markiert` sagt für jeden Zellenteil, ob er
 * hervorgehoben wird (die Form, die man gerade nachschlägt).
 */
export function GrammatikTabelle({
  zeilen,
  markiert = () => false,
}: {
  zeilen: GrammatikZelle[][];
  markiert?: (teil: GrammatikTeil) => boolean;
}) {
  const g = raster(zeilen);
  const weg = schriftSpalten(g);
  return (
    <div className="gr-tabelle">
      <table>
        <tbody>
          {g.map((zeile, i) => {
            const zellen: ReactNode[] = [];
            const gesehen = new Set<Ref>();
            zeile.forEach((x, c) => {
              if (!x || gesehen.has(x)) return;
              gesehen.add(x);
              if (x.r !== i) return; // gehört zu einer Zelle aus einer Zeile darüber (rowspan)
              const breite = Array.from({ length: x.z.breit ?? 1 }, (_, k) => c + k).filter((k) => !weg[k]).length;
              if (!breite) return;
              const sur = x.z.teile.some((t) => t.sur || t.audio) && !x.z.kopf;
              const hell = x.z.teile.some(markiert);
              const Tag = x.z.kopf ? 'th' : 'td';
              zellen.push(
                <Tag
                  key={c}
                  colSpan={breite > 1 ? breite : undefined}
                  rowSpan={(x.z.hoch ?? 1) > 1 ? x.z.hoch : undefined}
                  className={hell ? 'gr-markiert' : undefined}
                >
                  {x.z.teile.map((t, k) => (
                    <Fragment key={k}>
                      {t.neueZeile && <br />}
                      {k > 0 && !t.neueZeile && ' '}
                      <Teil teil={t} sur={sur} markiert={hell && markiert(t)} />
                    </Fragment>
                  ))}
                </Tag>,
              );
            });
            return zellen.length ? <tr key={i}>{zellen}</tr> : null;
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- Blöcke ------------------------------------------------------------------------------

export function GrammatikBloecke({
  bloecke,
  markiert,
  ohneErsteUeberschrift = false,
}: {
  bloecke: readonly GrammatikBlock[];
  markiert?: (teil: GrammatikTeil) => boolean;
  ohneErsteUeberschrift?: boolean;
}) {
  return (
    <div className="gr-bloecke">
      {bloecke.map((b, i) => {
        if (b.art === 'titel') {
          if (i === 0 && ohneErsteUeberschrift) return null;
          const text = ohneSchrift(b.text) || b.text;
          return b.ebene <= 2 ? (
            <h3 key={i} className="gr-titel">
              {text}
            </h3>
          ) : (
            <h4 key={i} className="gr-titel gr-titel--klein">
              {text}
            </h4>
          );
        }
        if (b.art === 'absatz') return <GrammatikAbsatz key={i} teile={b.teile} />;
        return <GrammatikTabelle key={i} zeilen={b.zeilen} markiert={markiert} />;
      })}
    </div>
  );
}
