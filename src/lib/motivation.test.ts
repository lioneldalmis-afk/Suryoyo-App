import { describe, expect, it } from 'vitest';
import { verfuegbar } from '../data';
import { alleAbzeichen, erreichteAbzeichen } from './abzeichen';
import {
  familientischSaetze,
  gutschreiben,
  hakeFamilientischAb,
  motivation,
  nachRunde,
  schliesseRundeAb,
  waehleSatzDerWoche,
  XP,
  xpFuer,
  type Motivation,
  type Rundenergebnis,
} from './motivation';
import { verbuche } from './progress';
import { lernreihenfolge } from './session';
import { geuebtAm, zufall } from './testhilfe';
import { laengsteSerie, serie, tagNummer, tagSchluessel, wochenSchluessel } from './zeit';

const alleLektionen = [...verfuegbar.values()];
const MITTAG = new Date(2026, 10, 16, 12).getTime(); // Montag, 16.11.2026
const TAG = 86_400_000;
const heute = tagNummer(MITTAG);

const leer: Motivation = {
  xp: 0,
  tage: {},
  ziel: 20,
  abzeichen: {},
  zaehler: { runden: 0, fehlerfrei: 0, wiederholungen: 0, rollenspiele: 0, nachgesprochen: 0 },
  familientisch: {},
  satzDerWoche: null,
  sprechen: true,
  sprechenPauseBis: 0,
};
const runde = (r: Partial<Rundenergebnis>): Rundenergebnis => ({
  art: 'einheit',
  richtige: 10,
  aufgaben: 8,
  fehler: 0,
  nachgesprochen: 0,
  ...r,
});
const tage = (...vorHeute: number[]) => Object.fromEntries(vorHeute.map((n) => [tagSchluessel(heute - n), 12]));

describe('Kalender', () => {
  it('rechnet Tage und Kalenderwochen in Ortszeit', () => {
    expect(tagSchluessel(heute)).toBe('2026-11-16');
    expect(tagNummer(new Date(2026, 10, 16, 0, 5).getTime())).toBe(heute);
    expect(tagNummer(new Date(2026, 10, 16, 23, 55).getTime())).toBe(heute);
    expect(wochenSchluessel(heute)).toBe('2026-W47');
    expect(wochenSchluessel(heute - 1)).toBe('2026-W46'); // Sonntag
    expect(wochenSchluessel(heute + 6)).toBe('2026-W47');
    expect(wochenSchluessel(tagNummer(new Date(2026, 0, 1, 12).getTime()))).toBe('2026-W01');
    expect(wochenSchluessel(tagNummer(new Date(2027, 0, 1, 12).getTime()))).toBe('2026-W53');
    expect(wochenSchluessel(tagNummer(new Date(2024, 11, 30, 12).getTime()))).toBe('2025-W01');
  });
});

describe('Tagesserie', () => {
  it('zählt die Tage hintereinander bis heute', () => {
    expect(serie(tage(0, 1, 2), heute)).toEqual({ laenge: 3, heuteDabei: true });
    expect(serie(tage(0, 1, 3), heute)).toEqual({ laenge: 2, heuteDabei: true });
  });

  it('hält bis heute Abend, auch wenn heute noch nicht geübt wurde', () => {
    expect(serie(tage(1, 2), heute)).toEqual({ laenge: 2, heuteDabei: false });
    expect(serie(tage(2, 3), heute)).toEqual({ laenge: 0, heuteDabei: false });
    expect(serie({}, heute)).toEqual({ laenge: 0, heuteDabei: false });
  });

  it('merkt sich die längste Serie', () => {
    expect(laengsteSerie(tage(0, 1, 5, 6, 7, 8, 20))).toBe(4);
    expect(laengsteSerie({})).toBe(0);
  });
});

describe('XP', () => {
  it('gibt 1 XP pro richtiger Antwort, dazu einen Bonus fürs Durchhalten und für fehlerfreie Runden', () => {
    expect(xpFuer(runde({}))).toMatchObject({ antworten: 10, abschluss: XP.abschluss, bonus: XP.fehlerfrei, fehlerfrei: true, gesamt: 20 });
    expect(xpFuer(runde({ fehler: 2, richtige: 8 })).gesamt).toBe(8 + XP.abschluss);
    // Auch eine Runde mit vielen Fehlern bringt etwas – ohne Frust.
    expect(xpFuer(runde({ fehler: 8, richtige: 0 })).gesamt).toBe(XP.abschluss);
    // Zwei Aufgaben sind noch keine fehlerfreie Runde.
    expect(xpFuer(runde({ aufgaben: 2, richtige: 2 })).fehlerfrei).toBe(false);
  });

  it('bucht am Rundenende die Boni auf den Tag und zählt Runden', () => {
    // Die XP für die Antworten sind da schon gutgeschrieben (siehe `gutschreiben`).
    const m = nachRunde(leer, runde({ art: 'wiederholung', nachgesprochen: 1 }), MITTAG);
    expect(m.xp).toBe(XP.abschluss + XP.fehlerfrei);
    expect(m.tage).toEqual({ '2026-11-16': 10 });
    expect(m.zaehler).toEqual({ runden: 1, fehlerfrei: 1, wiederholungen: 1, rollenspiele: 0, nachgesprochen: 1 });
    const m2 = nachRunde(m, runde({ art: 'rollenspiel', fehler: 1, richtige: 4 }), MITTAG + TAG);
    expect(m2.tage).toEqual({ '2026-11-16': 10, '2026-11-17': XP.abschluss });
    expect(m2.zaehler.rollenspiele).toBe(1);
  });
});

describe('Rundenende', () => {
  it('meldet XP der ganzen Runde, Tagesziel, Serie und neue Abzeichen genau einmal', () => {
    // Während der Runde: 6 richtige Antworten, je gleich gutgeschrieben.
    const start1 = motivation();
    for (let i = 0; i < 6; i++) gutschreiben(1, MITTAG);
    expect(motivation().xp).toBe(6);
    const b1 = schliesseRundeAb(runde({ richtige: 6 }), alleLektionen, start1, MITTAG);
    expect(b1).toMatchObject({ xp: 16, xpHeute: 16, ziel: 20, zielGeradeErreicht: false, serie: 1, serieGewachsen: true });
    expect(b1.neueAbzeichen.map((a) => a.id)).toEqual(['erste-runde', 'fehlerfrei']);

    const start2 = motivation();
    gutschreiben(3, MITTAG + 500);
    const b2 = schliesseRundeAb(runde({ richtige: 3, fehler: 1 }), alleLektionen, start2, MITTAG + 1000);
    expect(b2).toMatchObject({ xp: 8, xpHeute: 24, zielGeradeErreicht: true, serie: 1, serieGewachsen: false });
    expect(b2.neueAbzeichen).toEqual([]);
    expect(Object.keys(motivation().abzeichen)).toEqual(['erste-runde', 'fehlerfrei']);
  });

  it('belohnt „Hab ich gesagt!“ einmal pro Satz', () => {
    const vorher = motivation().xp;
    const b = hakeFamilientischAb('L03-W-tawdi', alleLektionen, MITTAG);
    expect(b.xp).toBe(XP.familientisch);
    expect(b.neueAbzeichen.map((a) => a.id)).toContain('familientisch');
    expect(hakeFamilientischAb('L03-W-tawdi', alleLektionen, MITTAG).xp).toBe(0);
    expect(motivation().xp).toBe(vorher + XP.familientisch);
  });

  it('sieht den gerade verbuchten Lernstand (Lektion geschafft)', () => {
    const l1 = verfuegbar.get(1)!;
    verbuche(
      lernreihenfolge(l1).map((e) => ({ id: e.id, fehlerfrei: true })),
      MITTAG,
    );
    const b = schliesseRundeAb(runde({}), alleLektionen, motivation(), MITTAG);
    expect(b.neueAbzeichen.map((a) => a.id)).toContain('lektion-1');
  });
});

describe('Abzeichen', () => {
  const kontext = (m: Partial<Motivation>, f = {}) => ({ m: { ...leer, ...m }, f, lektionen: alleLektionen });

  it('haben eindeutige Kennungen und deutsche Texte', () => {
    const alle = alleAbzeichen(alleLektionen);
    expect(new Set(alle.map((a) => a.id)).size).toBe(alle.length);
    expect(alle.filter((a) => a.art === 'lektion')).toHaveLength(16);
    for (const a of alle) expect(a.text).toMatch(/\.$/);
  });

  it('gibt es für Serien, XP und geübte Wörter', () => {
    expect(erreichteAbzeichen(kontext({}))).toEqual([]);
    expect(erreichteAbzeichen(kontext({ tage: tage(0, 1, 2, 3, 4, 5, 6) }))).toEqual(['serie-3', 'serie-7']);
    expect(erreichteAbzeichen(kontext({ xp: 600 }))).toEqual(['xp-100', 'xp-500']);
    const woerter = verfuegbar.get(3)!.wortschatz.map((w) => w.id);
    expect(erreichteAbzeichen(kontext({}, geuebtAm(woerter, MITTAG)))).toEqual(['woerter-25']);
  });

  it('gibt es für die Hörpaare erst, wenn jedes Paar einmal richtig war', () => {
    const paare = verfuegbar.get(2)!.aussprache!.hoerpaare!;
    const fast = geuebtAm(
      paare.slice(1).map((p) => p.woerter[0].id),
      MITTAG,
    );
    expect(erreichteAbzeichen(kontext({}, fast))).not.toContain('hoerpaare');
    const alle = { ...fast, ...geuebtAm([paare[0].woerter[1].id], MITTAG) };
    expect(erreichteAbzeichen(kontext({}, alle))).toContain('hoerpaare');
  });
});

describe('Satz der Woche', () => {
  const l3 = verfuegbar.get(3)!;
  const l10 = verfuegbar.get(10)!;
  const kandidaten = [l3.wortschatz[0], l3.text[3], l10.wortschatz[0]];

  it('kommt nur aus geprüften Familientisch-Sätzen', () => {
    for (const e of familientischSaetze(alleLektionen)) expect(e.tags).toContain('familientisch');
    expect(waehleSatzDerWoche(leer, [], '2026-W47', 3)).toBeNull();
  });

  it('bleibt die ganze Woche gleich und bevorzugt Bekanntes, noch nicht Ausprobiertes', () => {
    for (let i = 0; i < 20; i++) {
      const id = waehleSatzDerWoche(leer, kandidaten, '2026-W47', 3, zufall(i));
      expect([kandidaten[0].id, kandidaten[1].id]).toContain(id);
    }
    const gemerkt = { ...leer, satzDerWoche: { woche: '2026-W47', id: kandidaten[2].id } };
    expect(waehleSatzDerWoche(gemerkt, kandidaten, '2026-W47', 3)).toBe(kandidaten[2].id);
    const ausprobiert = { ...leer, familientisch: { [kandidaten[0].id]: 1, [kandidaten[1].id]: 1 } };
    expect(waehleSatzDerWoche(ausprobiert, kandidaten, '2026-W48', 3)).toBe(kandidaten[2].id);
  });
});
