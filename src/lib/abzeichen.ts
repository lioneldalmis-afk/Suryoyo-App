// Abzeichen: kleine Erfolge, die man beim Lernen sammelt. Die Namen und Texte
// gehören zur Oberfläche und sind deutsch; Surayt steht nur dort, wo es aus
// den Lektionen kommt (die Lektionstitel).

import type { Lektion } from '../types';
import type { Motivation } from './motivation';
import { geuebt, type Fortschritt } from './progress';
import { lektionsstand } from './session';
import { laengsteSerie } from './zeit';

export type AbzeichenArt =
  | 'start'
  | 'fehlerfrei'
  | 'serie'
  | 'xp'
  | 'woerter'
  | 'wiederholen'
  | 'hoeren'
  | 'sprechen'
  | 'rolle'
  | 'familie'
  | 'lektion';

export interface Abzeichen {
  id: string;
  art: AbzeichenArt;
  name: string;
  /** Wofür es das Abzeichen gibt. */
  text: string;
  /** Kurzer Aufdruck auf der Medaille, z. B. „7“ für sieben Tage. */
  marke?: string;
  /** Bei Lektions-Abzeichen: die Lektion (für den Titel auf Surayt). */
  lektion?: number;
}

export interface Kontext {
  m: Motivation;
  f: Fortschritt;
  lektionen: readonly Lektion[];
}

interface Regel extends Abzeichen {
  erreicht: (k: Kontext) => boolean;
}

const geuebteWoerter = ({ f, lektionen }: Kontext) =>
  new Set(lektionen.flatMap((l) => l.wortschatz).filter((w) => geuebt(f, w.id)).map((w) => w.id)).size;

const stufen = <T,>(werte: readonly T[], regel: (wert: T) => Regel) => werte.map(regel);

/** Alle Abzeichen in der Reihenfolge, in der sie auf der Erfolge-Seite stehen. */
export function alleAbzeichen(lektionen: readonly Lektion[]): Regel[] {
  return [
    {
      id: 'erste-runde',
      art: 'start',
      name: 'Erste Runde',
      text: 'Deine erste Übungsrunde geschafft.',
      erreicht: ({ m }) => m.zaehler.runden >= 1,
    },
    {
      id: 'fehlerfrei',
      art: 'fehlerfrei',
      name: 'Fehlerfrei',
      text: 'Eine ganze Runde ohne einen Fehler.',
      erreicht: ({ m }) => m.zaehler.fehlerfrei >= 1,
    },
    ...stufen([3, 7, 30, 100] as const, (tage) => ({
      id: `serie-${tage}`,
      art: 'serie' as const,
      name: `${tage} Tage in Folge`,
      text: `An ${tage} Tagen hintereinander geübt.`,
      marke: String(tage),
      erreicht: ({ m }: Kontext) => laengsteSerie(m.tage) >= tage,
    })),
    ...stufen([100, 500, 1000, 2500] as const, (xp) => ({
      id: `xp-${xp}`,
      art: 'xp' as const,
      name: `${xp.toLocaleString('de-DE')} XP`,
      text: `Insgesamt ${xp.toLocaleString('de-DE')} Erfahrungspunkte gesammelt.`,
      marke: xp >= 1000 ? `${xp / 1000}k` : String(xp),
      erreicht: ({ m }: Kontext) => m.xp >= xp,
    })),
    ...stufen([25, 100, 250, 500, 1000] as const, (anzahl) => ({
      id: `woerter-${anzahl}`,
      art: 'woerter' as const,
      name: `${anzahl.toLocaleString('de-DE')} Wörter`,
      text: `${anzahl.toLocaleString('de-DE')} verschiedene Wörter geübt.`,
      marke: String(anzahl),
      erreicht: (k: Kontext) => geuebteWoerter(k) >= anzahl,
    })),
    {
      id: 'wiederholt',
      art: 'wiederholen',
      name: 'Drangeblieben',
      text: 'Eine Wiederholungsrunde mit Karteikasten-Wörtern geschafft.',
      erreicht: ({ m }) => m.zaehler.wiederholungen >= 1,
    },
    {
      id: 'nachgesprochen',
      art: 'sprechen',
      name: 'Selbst gesprochen',
      text: 'Zum ersten Mal etwas nachgesprochen und mit dem Original verglichen.',
      erreicht: ({ m }) => m.zaehler.nachgesprochen >= 1,
    },
    {
      id: 'nachgesprochen-50',
      art: 'sprechen',
      name: 'Gut zu hören',
      text: '50 Mal nachgesprochen.',
      marke: '50',
      erreicht: ({ m }) => m.zaehler.nachgesprochen >= 50,
    },
    {
      id: 'rollenspiel',
      art: 'rolle',
      name: 'Mitgespielt',
      text: 'Einen Dialog als eine der Personen durchgespielt.',
      erreicht: ({ m }) => m.zaehler.rollenspiele >= 1,
    },
    {
      id: 'hoerpaare',
      art: 'hoeren',
      name: 'Feines Gehör',
      text: 'Bei jedem Hörpaar aus Lektion 2 einmal das richtige Wort erkannt.',
      erreicht: ({ f, lektionen }) => {
        const paare = lektionen.flatMap((l) => l.aussprache?.hoerpaare ?? []);
        return paare.length > 0 && paare.every((p) => p.woerter.some((w) => (f[w.id]?.richtig ?? 0) > 0));
      },
    },
    {
      id: 'familientisch',
      art: 'familie',
      name: 'Am Familientisch',
      text: 'Einen Satz der Woche zu Hause ausprobiert.',
      erreicht: ({ m }) => Object.keys(m.familientisch).length >= 1,
    },
    ...lektionen.map(
      (l): Regel => ({
        id: `lektion-${l.nr}`,
        art: 'lektion',
        name: `Lektion ${l.nr}`,
        text: `Alle Einheiten von „${l.titel.deutsch}“ geschafft.`,
        marke: String(l.nr),
        lektion: l.nr,
        erreicht: ({ f }) => lektionsstand(l, f).anteil === 1,
      }),
    ),
  ];
}

/** Kennungen aller Abzeichen, die mit diesem Stand erreicht sind. */
export function erreichteAbzeichen(k: Kontext): string[] {
  return alleAbzeichen(k.lektionen)
    .filter((a) => a.erreicht(k))
    .map((a) => a.id);
}
