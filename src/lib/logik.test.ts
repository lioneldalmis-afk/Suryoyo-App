import { describe, expect, it } from 'vitest';
import pruefliste from '../../inhalte/familientisch-vorschlag.md?raw';
import glossar from '../data/glossar-a.json';
import { istDialog, kurs, LAUTE, LOB, NUR_MIT_BILD, verfuegbar } from '../data';
import type { Eintrag, Lektion } from '../types';
import { nachRunde, MAX_STUFE, type Fortschritt } from './progress';
import { href, parse, type Route } from './router';
import {
  aktuelleLektion,
  baueHoerrunde,
  baueRunde,
  lernreihenfolge,
  optionenFuer,
} from './session';
import { fold, kern, lautSchluessel, tokens, vorHinweis } from './text';

const lektion = verfuegbar.get(3)!;
const vorrat = lernreihenfolge(lektion);
const wort = (latein: string) => lektion.wortschatz.find((w) => w.latein === latein)!;
const alleLektionen = [...verfuegbar.values()];

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

const SYRISCH = /[\u{700}-\u{74F}]/u;
const KYRILLISCH = /[\u{400}-\u{4FF}]/u;
const UNSICHTBAR = /[\u{AD}\u{A0}\u{200B}-\u{200D}\u{FEFF}]/u;
const AUDIO = /^https:\/\/textbook\.surayt\.com\/.+\.mp3$/;

const aussprache = (nr: number) => verfuegbar.get(nr)!.aussprache!;

/** Alle Einträge einer Lektion, auch die Beispiele und Hörpaare aus Lektion 1 und 2. */
function alleEintraege(l: Lektion): Eintrag[] {
  const a = l.aussprache;
  const laute = [...(a?.schrift ?? []), ...(a?.neueBuchstaben ?? []), ...(a?.konsonanten ?? []), ...(a?.vokale ?? [])];
  return [
    ...l.einleitung,
    ...l.text,
    ...l.wortschatz,
    ...laute.flatMap((laut) => laut.beispiele),
    ...(a?.hoerpaare ?? []).flatMap((p) => p.woerter),
  ];
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

  it('setzt Stichwort und Zusatz wie im Lehrbuch zusammen', () => {
    expect('bayto' + vorHinweis('(m.)') + '(m.)').toBe('bayto (m.)');
    expect('cammo' + vorHinweis(', pl. cammone') + ', pl. cammone').toBe('cammo, pl. cammone');
  });
});

describe('Inhalte', () => {
  it('umfassen alle 16 Lektionen von Level A', () => {
    expect([...verfuegbar.keys()]).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });

  it('sind vollständig und stammen aus dem Lehrbuch', () => {
    const ids = alleLektionen.flatMap((l) => alleEintraege(l).map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of alleLektionen) {
      if (l.aussprache) {
        expect(l.text, `Lektion ${l.nr}`).toHaveLength(0);
        expect(l.wortschatz.length, `Lektion ${l.nr}`).toBeGreaterThan(10);
      } else {
        expect(l.text.length, `Lektion ${l.nr}`).toBeGreaterThan(5);
        expect(l.wortschatz.length, `Lektion ${l.nr}`).toBeGreaterThan(40);
      }
      expect(l.titel.syrisch, `Lektion ${l.nr}`).toMatch(SYRISCH);
      for (const e of alleEintraege(l)) {
        expect(e.latein, e.id).not.toBe('');
        expect(e.deutsch, e.id).not.toBe('');
        expect(e.syrisch, e.id).toMatch(SYRISCH);
        expect(e.audio, e.id).toMatch(AUDIO);
        expect(e.lektion).toBe(l.nr);
        expect(e.quelle).toBe('lehrbuch');
        expect(e.latein + e.deutsch, e.id).not.toMatch(UNSICHTBAR);
        // Kyrillische Doppelgänger wie „ё“ statt „ë“ würden Suche und Zuordnung stören.
        expect(e.latein + e.deutsch + (e.hinweis ?? ''), e.id).not.toMatch(KYRILLISCH);
        expect(e.latein + e.deutsch, e.id).not.toMatch(SYRISCH);
      }
      for (const w of l.wortschatz) {
        // Zusätze wie „(f.)“ oder „, pl. cammone“ stehen im Hinweis, nicht im Stichwort.
        expect(w.latein, w.id).not.toMatch(/[()]|, pl\./i);
        expect(w.audio2, w.id).toMatch(AUDIO);
      }
    }
  });

  it('unterscheiden Dialoge (jede Zeile mit Sprecher) von Lesetexten', () => {
    expect(alleLektionen.filter(istDialog).map((l) => l.nr)).toEqual([3, 8, 10, 12]);
    for (const l of alleLektionen) {
      for (const z of l.text) {
        if (istDialog(l)) expect(z.sprecher, z.id).toBeTruthy();
        else expect(z.sprecher, z.id).toBeUndefined();
        // Der Sprechername steht nicht noch einmal vor dem Satz.
        if (z.sprecher) expect(z.deutsch, z.id).not.toMatch(/^[^ ]+:/);
      }
    }
  });

  it('blenden Sätze aus, die nur mit einem Bild der Website Sinn ergeben', () => {
    for (const l of alleLektionen) {
      expect(l.einleitung.some((e) => e.tags.includes(NUR_MIT_BILD)), `Lektion ${l.nr}`).toBe(false);
    }
    expect(verfuegbar.get(10)!.einleitung).toHaveLength(0);
    // Die Gerichte aus der Bildtafel von Lektion 10 stehen im Wortschatz.
    expect(verfuegbar.get(10)!.wortschatz.find((w) => w.latein === 'Dawqe')?.deutsch).toBe('Pfannkuchen');
  });

  it('erklären in Lektion 1 und 2 Buchstaben und Laute', () => {
    const a1 = aussprache(1);
    const a2 = aussprache(2);
    expect(a1.alphabet).toHaveLength(37);
    expect(a1.schrift).toHaveLength(22);
    for (const b of a1.schrift!) expect(b.audio, b.id).toMatch(AUDIO);
    expect(a1.neueBuchstaben!.map((b) => b.zeichen)).toEqual(['Čč', 'Jj', 'Žž']);
    expect(a2.konsonanten).toHaveLength(18);
    expect(a2.vokale).toHaveLength(7);
    expect(a2.hoerpaare).toHaveLength(16);
    for (const laut of [...a2.konsonanten!, ...a2.vokale!]) {
      expect(laut.syrisch, laut.id).toMatch(SYRISCH);
      expect(laut.beispiele.length, laut.id).toBeGreaterThan(0);
    }
    for (const laut of a2.konsonanten!) {
      expect(laut.beschreibung, laut.id).toBeTruthy();
      expect(laut.beispiele, laut.id).toHaveLength(3);
      // Die Hervorhebung trifft genau den Laut, um den es geht.
      for (const b of laut.beispiele) {
        if (b.hervor) expect(b.latein.slice(...b.hervor).toLowerCase(), b.id).toBe(laut.zeichen);
      }
    }
    expect(a2.vokale!.find((v) => v.zeichen === 'Ë ë')?.beschreibung).toMatch(/^Der Kurzvokal/);
    for (const p of a2.hoerpaare!) {
      const [x, y] = p.woerter;
      expect(x.latein, p.id).not.toBe(y.latein);
      expect(x.deutsch, p.id).not.toBe(y.deutsch);
    }
  });

  it('verlinken jeden erklärten Buchstaben des Alphabets auf seine Erklärung', () => {
    const erklaert = aussprache(1).alphabet!.filter((b) => LAUTE.has(lautSchluessel(b)));
    expect(erklaert).toHaveLength(25);
    expect(LAUTE.get(lautSchluessel('Ḥḥ'))?.laut.zeichen).toBe('ḥ');
    expect(LAUTE.get(lautSchluessel('Ëë'))?.laut.zeichen).toBe('Ë ë');
    expect(LAUTE.has(lautSchluessel('Bb'))).toBe(false);
  });

  it('übernehmen keine Volksgruppen-Bezeichnungen in die Erklärtexte', () => {
    // Die Entscheidung dazu ist noch offen (Fahrplan, Abschnitt 7).
    for (const l of alleLektionen) {
      for (const t of Object.values(l.aussprache?.texte ?? {}).flat()) expect(t).not.toMatch(/aramä|assyr/i);
    }
  });

  it('passen zur Prüfliste der Familientisch-Sätze', () => {
    const ids = [...pruefliste.matchAll(/^- \[[ xX]\] `([^`]+)`/gm)].map((m) => m[1]);
    const vorhanden = new Set(alleLektionen.flatMap((l) => alleEintraege(l).map((e) => e.id)));
    expect(ids.length).toBeGreaterThan(40);
    expect(ids.filter((id) => !vorhanden.has(id))).toEqual([]);
  });

  it('enthalten das Lob für das Rundenende', () => {
    expect(LOB.sehrGut?.latein).toBe('Ġalabe ṭawwo.');
    expect(LOB.gut?.latein).toBe('Ṭawwo.');
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

  it('enthält in jeder Lektion jedes Wort und jede Textzeile genau einmal, die Einleitung nicht', () => {
    for (const l of alleLektionen) {
      const erwartet = [...l.wortschatz, ...l.text].map((e) => e.id).sort();
      expect(lernreihenfolge(l).map((e) => e.id).sort(), `Lektion ${l.nr}`).toEqual(erwartet);
    }
  });

  it('beginnt auch in Lesetexten mit den Wörtern der ersten Zeile', () => {
    const l4 = verfuegbar.get(4)!;
    const reihe = lernreihenfolge(l4);
    const ersteZeile = reihe.findIndex((e) => e.id === l4.text[0].id);
    expect(ersteZeile).toBeGreaterThan(0);
    for (const e of reihe.slice(0, ersteZeile)) expect(e.art).toBe('wort');
  });
});

describe('Antwortmöglichkeiten', () => {
  it('enthalten die richtige Antwort und keine Verwechslungsfallen', () => {
    for (let i = 0; i < 200; i++) {
      const z = zufall(i);
      for (const ziel of [wort('ṭawwo'), wort('šlomo'), wort('b šayno'), lektion.text[0]]) {
        const optionen = optionenFuer(ziel, vorrat, z);
        expect(optionen).toHaveLength(ziel.art === 'satz' ? 3 : 4);
        expect(optionen).toContain(ziel);
        expect(optionen.every((o) => o.art === ziel.art)).toBe(true);
        expect(new Set(optionen.map((o) => kern(o.deutsch))).size).toBe(optionen.length);
        expect(new Set(optionen.map((o) => fold(o.latein))).size).toBe(optionen.length);
      }
    }
  });

  it('reichen in jeder Lektion für jeden Eintrag', () => {
    for (const l of alleLektionen) {
      const reihe = lernreihenfolge(l);
      for (const ziel of reihe) {
        expect(optionenFuer(ziel, reihe, zufall(7)), ziel.id).toHaveLength(ziel.art === 'satz' ? 3 : 4);
      }
    }
  });
});

describe('Freies Üben', () => {
  it('bietet jede Übungsart auch einzeln an', () => {
    expect(baueRunde('karten', vorrat, {}, zufall(4)).every((s) => s.typ === 'karte' && !s.neu)).toBe(true);
    expect(baueRunde('wahl', vorrat, {}, zufall(5)).every((s) => s.typ === 'wahl')).toBe(true);
    expect(baueRunde('hoeren', vorrat, {}, zufall(6)).every((s) => s.typ === 'hoeren')).toBe(true);
    expect(baueRunde('hoeren', vorrat, {}, zufall(6))).toHaveLength(10);
    const saetze = baueRunde('saetze', vorrat, {}, zufall(7));
    expect(saetze).toHaveLength(10);
    expect(saetze.every((s) => (s.typ === 'bauen' || s.typ === 'luecke') && s.eintrag.art === 'satz')).toBe(true);
    const sprechen = baueRunde('sprechen', vorrat, {}, zufall(8));
    expect(sprechen.every((s) => s.typ === 'sprechen')).toBe(true);
    expect(sprechen[0].eintrag.art).toBe('satz');
  });

  it('nimmt die schwächsten Einträge zuerst', () => {
    const sitzt = { stufe: 3, richtig: 3, falsch: 0, zuletzt: 1 };
    const f: Fortschritt = Object.fromEntries(vorrat.map((e) => [e.id, sitzt]));
    const schwach = vorrat[7];
    const runde = baueRunde('wahl', vorrat, { ...f, [schwach.id]: { ...sitzt, stufe: 0 } }, zufall(9));
    expect(runde[0].eintrag).toBe(schwach);
  });
});

describe('Hörpaare', () => {
  const paare = aussprache(2).hoerpaare!;

  it('spielen eins von zwei Wörtern und bieten genau das Paar zur Wahl', () => {
    const runde = baueHoerrunde(paare, {}, zufall(8));
    expect(runde).toHaveLength(10);
    for (const s of runde) {
      if (s.typ !== 'paar') throw new Error(`falscher Aufgabentyp: ${s.typ}`);
      const paar = paare.find((p) => p.woerter.includes(s.eintrag))!;
      expect(s.optionen).toEqual(paar.woerter);
    }
  });

  it('nehmen zuerst die Paare, bei denen etwas falsch war, und spielen das schwächere Wort', () => {
    const sitzt = { stufe: 3, richtig: 3, falsch: 0, zuletzt: 1 };
    const f: Fortschritt = Object.fromEntries(paare.flatMap((p) => p.woerter).map((w) => [w.id, sitzt]));
    const schwach = paare[9].woerter[1];
    const runde = baueHoerrunde(paare, { ...f, [schwach.id]: { ...sitzt, stufe: 0 } }, zufall(9));
    expect(runde[0].eintrag).toBe(schwach);
  });
});

describe('Glossar A', () => {
  const { eintraege } = glossar;

  it('ist vollständig eingelesen', () => {
    expect(eintraege.length).toBeGreaterThan(800);
    expect(new Set(eintraege.map((e) => e.id)).size).toBe(eintraege.length);
    for (const e of eintraege) {
      expect(e.voll.latein, e.id).not.toBe('');
      expect(e.voll.syrisch, e.id).toMatch(SYRISCH);
      expect(JSON.stringify(e), e.id).not.toMatch(KYRILLISCH);
      expect(e.teile.length, e.id).toBeGreaterThan(0);
      for (const t of e.teile) {
        // Verweise wie „(L.4)“ stehen in `lektionen`, nicht im Text.
        expect(t.latein, e.id).not.toMatch(/\((L|G)\.?\s*\d/);
        for (const nr of t.lektionen) expect(nr).toBeGreaterThanOrEqual(1);
        for (const nr of t.lektionen) expect(nr).toBeLessThanOrEqual(16);
      }
    }
  });

  it('zerlegt Sammeleinträge in einzelne Wendungen', () => {
    const abro = eintraege.find((e) => e.voll.latein.startsWith('abro, Pl. abne'))!;
    expect(abro.teile.map((t) => [t.latein, t.deutsch])).toEqual([
      ['abro, Pl. abne', 'Sohn'],
      ['abne d cammo', 'Cousins, Söhne des Onkels (väterlicherseits)'],
      ['abne d ḥolo', 'Cousins, Söhne des Onkels (mütterlicherseits)'],
    ]);
    expect(abro.lektionen).toEqual([4]);
  });
});

describe('Lernstand', () => {
  it('schiebt richtige Einträge ein Fach weiter und falsche zurück ins erste', () => {
    let f: Fortschritt = {};
    f = nachRunde(f, [{ id: 'a', fehlerfrei: false }], 1);
    expect(f.a).toEqual({ stufe: 0, richtig: 0, falsch: 1, zuletzt: 1 });
    for (let i = 0; i < 7; i++) f = nachRunde(f, [{ id: 'a', fehlerfrei: true }], 2);
    expect(f.a.stufe).toBe(MAX_STUFE);
    f = nachRunde(f, [{ id: 'a', fehlerfrei: false }], 3);
    expect(f.a).toEqual({ stufe: 0, richtig: 7, falsch: 2, zuletzt: 3 });
  });
});

describe('Startseite', () => {
  const geuebt = (ids: string[], zuletzt: number): Fortschritt =>
    Object.fromEntries(ids.map((id) => [id, { stufe: 1, richtig: 1, falsch: 0, zuletzt }]));

  it('beginnt mit der ersten Lektion, die einen Text hat', () => {
    expect(aktuelleLektion(alleLektionen, {}).nr).toBe(3);
  });

  it('macht auch in Lektion 1 oder 2 weiter, wenn dort zuletzt geübt wurde', () => {
    const l2 = lernreihenfolge(verfuegbar.get(2)!);
    const f = { ...geuebt([vorrat[0].id], 1), ...geuebt([l2[0].id], 2) };
    expect(aktuelleLektion(alleLektionen, f).nr).toBe(2);
  });

  it('macht in der zuletzt geübten Lektion weiter', () => {
    const l7 = lernreihenfolge(verfuegbar.get(7)!);
    const f = { ...geuebt([vorrat[0].id], 1), ...geuebt([l7[0].id], 2) };
    expect(aktuelleLektion(alleLektionen, f).nr).toBe(7);
  });

  it('springt nach einer fertigen Lektion zur ersten unfertigen', () => {
    const f = geuebt(
      vorrat.map((e) => e.id),
      5,
    );
    expect(aktuelleLektion(alleLektionen, f).nr).toBe(4);
  });
});

describe('Adressen', () => {
  it('lassen sich hin und zurück übersetzen', () => {
    const routen: Route[] = [
      { name: 'start' },
      { name: 'info' },
      { name: 'lektion', nr: 3, tab: 'woerter' },
      { name: 'lektion', nr: 9, tab: 'text' },
      { name: 'lektion', nr: 2, tab: 'text', anker: 'ḥ' },
      { name: 'runde', nr: 2, art: 'paare' },
      { name: 'runde', nr: 3, art: 'hoeren' },
      { name: 'runde', nr: 4, art: 'saetze' },
      { name: 'einheit', nr: 3, einheit: 2 },
      { name: 'rollenspiel', nr: 8 },
      { name: 'wiederholen' },
      { name: 'erfolge' },
    ];
    for (const r of routen) expect(parse(href(r))).toEqual(r);
    expect(parse('')).toEqual({ name: 'start' });
    expect(parse('#/lektion/3')).toEqual({ name: 'lektion', nr: 3, tab: 'text' });
    // Frühere Adresse aus dem ersten Prototyp
    expect(parse('#/lektion/3/dialog')).toEqual({ name: 'lektion', nr: 3, tab: 'text' });
    expect(parse('#/lektion/3/ueben')).toEqual({ name: 'lektion', nr: 3, tab: 'ueben' });
    expect(parse('#/quatsch')).toEqual({ name: 'start' });
    expect(parse('#/lektion/3/einheit/x')).toEqual({ name: 'lektion', nr: 3, tab: 'ueben' });
    // So liefern manche Browser Sonderzeichen in der Adresse.
    expect(parse('#/lektion/2/text/%E1%B8%A5')).toEqual({ name: 'lektion', nr: 2, tab: 'text', anker: 'ḥ' });
  });
});
