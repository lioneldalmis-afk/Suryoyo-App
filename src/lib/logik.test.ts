import { describe, expect, it } from 'vitest';
import { kurs, verfuegbar } from '../data';
import { nachRunde, MAX_STUFE, type Fortschritt } from './progress';
import { href, parse, type Route } from './router';
import { baueRunde, lektionsstand, lernreihenfolge, optionenFuer, type Schritt } from './session';
import { fold, kern, tokens } from './text';

const lektion = verfuegbar.get(3)!;
const vorrat = lernreihenfolge(lektion);
const wort = (latein: string) => lektion.wortschatz.find((w) => w.latein === latein)!;

/** Zufall mit festem Startwert, damit die Tests immer gleich laufen. */
function zufall(start: number) {
  let a = start;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Text', () => {
  it('faltet die Umschrift auf einfache Buchstaben', () => {
    expect(fold('Šlomo')).toBe('slomo');
    expect(fold('aḏëcno')).toBe('adecno');
    expect(fold('Ġalabe ṭawwo')).toBe('galabe tawwo');
    expect(tokens('B šayno, ono ëšmi Aday yo.')).toEqual(['b', 'sayno', 'ono', 'esmi', 'aday', 'yo']);
  });

  it('erkennt gleiche Bedeutungen trotz Klammerzusatz', () => {
    expect(kern('gut (m.Sg.)')).toBe(kern('gut (pl.)'));
    expect(kern('Hallo (Begrüßungsformel)')).toBe('hallo');
    expect(kern('(dass) ich (m.) frage')).toBe('ich frage');
  });
});

describe('Inhalte', () => {
  it('sind vollständig und stammen aus dem Lehrbuch', () => {
    for (const l of verfuegbar.values()) {
      const alle = [...l.einleitung, ...l.dialog, ...l.wortschatz];
      expect(new Set(alle.map((e) => e.id)).size).toBe(alle.length);
      for (const e of alle) {
        expect(e.latein, e.id).not.toBe('');
        expect(e.deutsch, e.id).not.toBe('');
        expect(e.syrisch, e.id).toMatch(/[܀-ݏ]/);
        expect(e.audio, e.id).toMatch(/^https:\/\/textbook\.surayt\.com\/.+\.mp3$/);
        expect(e.lektion).toBe(l.nr);
        expect(e.quelle).toBe('lehrbuch');
        expect(e.latein + e.deutsch, e.id).not.toMatch(/[­ ]/);
      }
      for (const z of l.dialog) expect(z.sprecher, z.id).toBeTruthy();
    }
  });

  it('haben für jede verfügbare Lektion einen Platz im Lernpfad', () => {
    expect(kurs.map((k) => k.nr)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    for (const nr of verfuegbar.keys()) expect(kurs.some((k) => k.nr === nr)).toBe(true);
  });
});

describe('Lernreihenfolge', () => {
  it('folgt dem Dialog: erst die Wörter einer Zeile, dann die Zeile selbst', () => {
    expect(vorrat.slice(0, 5).map((e) => e.latein)).toEqual([
      'šlomo',
      'ono',
      'ëšmi',
      'yo',
      'Šlomo, ono ëšmi Afrem yo.',
    ]);
  });

  it('enthält jedes Wort und jede Dialogzeile genau einmal, die Einleitung nicht', () => {
    const erwartet = [...lektion.wortschatz, ...lektion.dialog].map((e) => e.id).sort();
    expect(vorrat.map((e) => e.id).sort()).toEqual(erwartet);
  });
});

describe('Antwortmöglichkeiten', () => {
  it('enthalten die richtige Antwort und keine Verwechslungsfallen', () => {
    for (let i = 0; i < 200; i++) {
      const z = zufall(i);
      for (const ziel of [wort('ṭawwo'), wort('šlomo'), wort('b šayno'), lektion.dialog[0]]) {
        const optionen = optionenFuer(ziel, vorrat, z);
        expect(optionen).toHaveLength(ziel.art === 'satz' ? 3 : 4);
        expect(optionen).toContain(ziel);
        expect(optionen.every((o) => o.art === ziel.art)).toBe(true);
        expect(new Set(optionen.map((o) => kern(o.deutsch))).size).toBe(optionen.length);
        expect(new Set(optionen.map((o) => fold(o.latein))).size).toBe(optionen.length);
      }
    }
  });
});

describe('Übungsrunde', () => {
  const eintraege = (schritte: Schritt[]) => [...new Set(schritte.map((s) => s.eintrag.latein))];

  it('stellt am Anfang vier neue Wörter vor und fragt sie zweimal ab', () => {
    const runde = baueRunde('gemischt', vorrat, {}, zufall(1));
    expect(eintraege(runde)).toEqual(['šlomo', 'ono', 'ëšmi', 'yo']);
    expect(runde.map((s) => s.typ).slice(0, 4)).toEqual(['karte', 'karte', 'wahl', 'wahl']);
    expect(runde.filter((s) => s.typ === 'karte')).toHaveLength(4);
    expect(runde.filter((s) => s.typ === 'wahl')).toHaveLength(4);
    expect(runde.filter((s) => s.typ === 'hoeren')).toHaveLength(4);
    // Jedes Wort wird erst gezeigt, bevor danach gefragt wird.
    for (const name of eintraege(runde)) {
      const erster = runde.find((s) => s.eintrag.latein === name)!;
      expect(erster).toMatchObject({ typ: 'karte', neu: true });
    }
  });

  it('mischt später Wiederholungen unter die neuen Wörter', () => {
    const stand = { stufe: 1, richtig: 1, falsch: 0, zuletzt: 1 };
    const f: Fortschritt = Object.fromEntries(vorrat.slice(0, 4).map((e) => [e.id, stand]));
    const runde = baueRunde('gemischt', vorrat, f, zufall(2));
    const neue = runde.filter((s) => s.typ === 'karte').map((s) => s.eintrag.id);
    expect(neue).toEqual(vorrat.slice(4, 8).map((e) => e.id));
    const wiederholt = eintraege(runde.filter((s) => vorrat.slice(0, 4).includes(s.eintrag)));
    expect(wiederholt).toHaveLength(2);
  });

  it('wiederholt nur noch, wenn alles einmal geübt ist', () => {
    const stand = { stufe: 1, richtig: 1, falsch: 0, zuletzt: 1 };
    const f: Fortschritt = Object.fromEntries(vorrat.map((e) => [e.id, stand]));
    const runde = baueRunde('gemischt', vorrat, f, zufall(3));
    expect(runde).toHaveLength(8);
    expect(runde.some((s) => s.typ === 'karte')).toBe(false);
    expect(lektionsstand(lektion, f)).toMatchObject({ geuebt: vorrat.length, anteil: 1 });
  });

  it('bietet jede Übungsart auch einzeln an', () => {
    expect(baueRunde('karten', vorrat, {}, zufall(4)).every((s) => s.typ === 'karte' && !s.neu)).toBe(true);
    expect(baueRunde('wahl', vorrat, {}, zufall(5)).every((s) => s.typ === 'wahl')).toBe(true);
    expect(baueRunde('hoeren', vorrat, {}, zufall(6)).every((s) => s.typ === 'hoeren')).toBe(true);
    expect(baueRunde('hoeren', vorrat, {}, zufall(6))).toHaveLength(10);
  });
});

describe('Lernstand', () => {
  it('steigt bei fehlerfreien Runden und sinkt bei Fehlern, in festen Grenzen', () => {
    let f: Fortschritt = {};
    f = nachRunde(f, [{ id: 'a', fehlerfrei: false }], 1);
    expect(f.a).toEqual({ stufe: 0, richtig: 0, falsch: 1, zuletzt: 1 });
    for (let i = 0; i < 5; i++) f = nachRunde(f, [{ id: 'a', fehlerfrei: true }], 2);
    expect(f.a.stufe).toBe(MAX_STUFE);
    f = nachRunde(f, [{ id: 'a', fehlerfrei: false }], 3);
    expect(f.a).toEqual({ stufe: MAX_STUFE - 1, richtig: 5, falsch: 2, zuletzt: 3 });
  });
});

describe('Adressen', () => {
  it('lassen sich hin und zurück übersetzen', () => {
    const routen: Route[] = [
      { name: 'start' },
      { name: 'info' },
      { name: 'lektion', nr: 3, tab: 'woerter' },
      { name: 'runde', nr: 3, art: 'hoeren' },
    ];
    for (const r of routen) expect(parse(href(r))).toEqual(r);
    expect(parse('')).toEqual({ name: 'start' });
    expect(parse('#/lektion/3')).toEqual({ name: 'lektion', nr: 3, tab: 'dialog' });
    expect(parse('#/lektion/3/ueben')).toEqual({ name: 'lektion', nr: 3, tab: 'ueben' });
    expect(parse('#/quatsch')).toEqual({ name: 'start' });
  });
});
