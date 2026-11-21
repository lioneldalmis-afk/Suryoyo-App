import { describe, expect, it } from 'vitest';
import glossarJson from '../data/glossar-a.json';
import grammatikJson from '../data/grammatik.json';
import { alleLektionen, NUR_MIT_BILD } from '../data';
import type { Eintrag, Glossar, Grammatik } from '../types';
import { ANFRAGE_LAENGE, aufbereiten, sauber } from './nachschlagen';
import { href, parse, type Route } from './router';
import { fold, kern, woerter, zerlege } from './text';
import {
  abstand,
  baueWoerterbuch,
  beispielsatz,
  einzelneWoerter,
  istGrundform,
  merkmaleZusammen,
  person,
  stichwort,
  stufeVon,
  suche,
  type Fund,
} from './woerterbuch';

const glossar = glossarJson as Glossar;
const grammatik = grammatikJson as unknown as Grammatik;
const wb = baueWoerterbuch(alleLektionen, glossar, grammatik);
const ohneGlossar = baueWoerterbuch(alleLektionen);

const eintrag = (id: string): Eintrag => {
  for (const l of alleLektionen) {
    const e = [...l.wortschatz, ...l.text, ...l.einleitung].find((x) => x.id === id);
    if (e) return e;
  }
  throw new Error(`Kein Eintrag ${id}`);
};
/** Der Fund, unter dem ein Eintrag im Wörterbuch steht (Doppelgänger sind zusammengeführt). */
const fundVon = (id: string) => wb.nachId.get(id)!;
const ergebnis = (anfrage: string) => suche(wb, anfrage);
const ersterTreffer = (anfrage: string) => ergebnis(anfrage).funde[0];
const genau = (text: string) =>
  woerter(text)
    .map((w) => zerlege(w).kern.normalize('NFC').toLowerCase())
    .filter(Boolean);

describe('Wörterbuch: Inhalt', () => {
  it('enthält Wortschatz, Sätze und Glossar aller Lektionen', () => {
    const anzahl = (h: Fund['herkunft']) => wb.funde.filter((f) => f.herkunft === h).length;
    expect(anzahl('wortschatz')).toBeGreaterThan(1000);
    expect(anzahl('text') + anzahl('einleitung')).toBeGreaterThan(250);
    expect(anzahl('glossar')).toBeGreaterThan(300);
    expect(anzahl('grammatik')).toBeGreaterThan(400);
    expect(anzahl('formen')).toBeGreaterThan(1200);
    expect(wb.mitGlossar).toBe(true);
    expect(wb.mitGrammatik).toBe(true);
    expect(ohneGlossar.mitGrammatik).toBe(false);
    expect(ohneGlossar.mitGlossar).toBe(false);
    expect(ohneGlossar.funde.some((f) => f.herkunft === 'glossar')).toBe(false);
  });

  it('übernimmt Umschrift und Deutsch wörtlich aus den Quellen', () => {
    const quellen = new Set<string>();
    for (const l of alleLektionen) {
      const a = l.aussprache;
      const laute = [...(a?.schrift ?? []), ...(a?.neueBuchstaben ?? []), ...(a?.konsonanten ?? []), ...(a?.vokale ?? [])];
      const alle = [
        ...l.wortschatz,
        ...l.text,
        ...l.einleitung,
        ...laute.flatMap((x) => x.beispiele),
        ...(a?.hoerpaare ?? []).flatMap((p) => p.woerter),
      ];
      for (const e of alle) quellen.add(`${e.latein}|${e.hinweis ?? ''}|${e.deutsch}|${e.audio ?? ''}`);
    }
    const ausGlossar = new Set(glossar.eintraege.flatMap((z) => z.teile.map((t) => `${t.latein}|${t.deutsch}`)));
    const ausGrammatik = new Set(
      grammatik.seiten.flatMap((s) => s.eintraege.map((e) => `${e.latein}|${e.hinweis ?? ''}|${e.deutsch}|${e.audio ?? ''}`)),
    );
    for (const f of wb.funde) {
      if (f.herkunft === 'glossar') expect(ausGlossar.has(`${f.latein}|${f.deutsch}`), f.id).toBe(true);
      else if (f.herkunft === 'grammatik' || f.herkunft === 'formen') {
        // Formen ohne eigene Aufnahme bekommen die einer gleichen Form von einer anderen Seite.
        const ohneTon = `${f.latein}|${f.hinweis ?? ''}|${f.deutsch}|`;
        expect(ausGrammatik.has(`${ohneTon}${f.audio ?? ''}`) || ausGrammatik.has(ohneTon), f.id).toBe(true);
      }
      else expect(quellen.has(`${f.latein}|${f.hinweis ?? ''}|${f.deutsch}|${f.audio ?? ''}`), f.id).toBe(true);
      expect(f.quelle).toBe('lehrbuch');
    }
  });

  it('zeigt jeden Eintrag nur einmal', () => {
    const gesehen = new Set<string>();
    for (const f of wb.funde) {
      const k = `${genau(f.latein).join(' ')}|${kern(f.deutsch)}`;
      expect(gesehen.has(k), f.latein).toBe(false);
      gesehen.add(k);
    }
    // Ein Wort aus mehreren Lektionen steht einmal da, mit allen Lektionen.
    const bayto = fundVon('L03-W-bayto');
    expect(fundVon('L01-W-bayto')).toBe(bayto);
    expect(bayto.lektionen).toEqual(expect.arrayContaining([1, 3]));
  });

  it('blendet Sätze aus, die nur mit Bild Sinn ergeben', () => {
    const mitBild = alleLektionen.flatMap((l) => [...l.text, ...l.einleitung]).filter((e) => e.tags.includes(NUR_MIT_BILD));
    for (const e of mitBild) expect(wb.nachId.has(e.id)).toBe(false);
  });

  it('nimmt für Glossar-Einträge nur die Aufnahme desselben Wortes', () => {
    const tonVon = new Map<string, string[]>();
    for (const f of wb.funde) {
      if (f.herkunft === 'glossar' || !f.audio) continue;
      const k = genau(f.art === 'wort' ? stichwort(f.latein) : f.latein).join(' ');
      tonVon.set(f.audio, [...(tonVon.get(f.audio) ?? []), k]);
    }
    const mitTon = wb.funde.filter((f) => f.herkunft === 'glossar' && f.audio);
    expect(mitTon.length).toBeGreaterThan(50);
    for (const f of mitTon) {
      const woerter = tonVon.get(f.audio!) ?? [];
      expect(
        woerter.includes(genau(stichwort(f.latein)).join(' ')) || woerter.includes(genau(f.latein).join(' ')),
        f.latein,
      ).toBe(true);
    }
  });
});

describe('Wörterbuch: Suche', () => {
  const slomo = eintrag('L03-W-slomo');
  const tawdi = eintrag('L03-W-tawdi');

  it('findet Surayt ohne Sonderzeichen und mit sch/sh', () => {
    const ohne = fold(slomo.latein); // „šlomo“ → „slomo“
    expect(ersterTreffer(slomo.latein).id).toBe(slomo.id);
    expect(ersterTreffer(ohne).id).toBe(slomo.id);
    expect(ersterTreffer(ohne.replace('s', 'sch')).id).toBe(slomo.id);
    expect(ersterTreffer(ohne.replace('s', 'sh')).id).toBe(slomo.id);
    expect(ersterTreffer(ohne.toUpperCase()).id).toBe(slomo.id);
  });

  it('findet Deutsch', () => {
    expect(ersterTreffer(kern(tawdi.deutsch)).id).toBe(tawdi.id); // „Danke“
    // Artikel muss man nicht treffen
    const vater = eintrag('L04-W-babo');
    expect(ersterTreffer(`der ${vater.deutsch}`).id).toBe(vater.id);
    // Umlaute gehen auch als ae, oe, ue
    const kaelte = eintrag('L02-W-quro');
    expect(ersterTreffer(kaelte.deutsch.replace('ä', 'ae')).id).toBe(fundVon(kaelte.id).id);
  });

  it('findet ganze Sätze', () => {
    const satz = eintrag('L03-D-01');
    expect(ersterTreffer(satz.deutsch).id).toBe(satz.id);
    expect(ersterTreffer(satz.latein).id).toBe(satz.id);
    expect(ersterTreffer(fold(satz.latein)).id).toBe(satz.id);
  });

  it('erkennt Wortteile und Tippfehler', () => {
    expect(ersterTreffer(tawdi.latein.slice(0, 4)).id).toBe(tawdi.id);
    expect(ergebnis(tawdi.latein.slice(0, 4)).nurAehnlich).toBe(false);
    // Letzter Buchstabe falsch, zwei Buchstaben vertauscht
    const vertippt = [tawdi.latein.slice(0, -1) + 'y', tawdi.latein.slice(0, 2) + tawdi.latein[3] + tawdi.latein[2] + tawdi.latein.slice(4)];
    for (const v of vertippt) {
      expect(ersterTreffer(v).id, v).toBe(tawdi.id);
      expect(ergebnis(v).nurAehnlich, v).toBe(true);
    }
  });

  it('findet jedes Wort aus dem Wortschatz über seine Umschrift', () => {
    const woerter = alleLektionen.flatMap((l) => l.wortschatz).filter((_, i) => i % 6 === 0);
    for (const w of woerter) {
      const ids = ergebnis(w.latein).funde.slice(0, 10).map((f) => f.id);
      expect(ids, w.latein).toContain(fundVon(w.id).id);
    }
  });

  it('zeigt ausführlichere Glossar-Wendungen nur, wenn ihr Wort nicht schon dasteht', () => {
    expect(wb.zwilling.size).toBeGreaterThan(50);
    for (const [g, w] of wb.zwilling) {
      expect(genau(stichwort(g.latein))).toEqual(genau(stichwort(w.latein)));
      expect(wb.imGlossar.get(w)).toContain(g);
      const ids = ergebnis(w.latein).funde.map((f) => f.id);
      expect(ids).toContain(w.id);
      expect(ids).not.toContain(g.id);
    }
    // Wer nach einer Bedeutung sucht, die nur im Glossar steht, findet die Glossar-Wendung.
    const nurGlossar = [...wb.zwilling].find(([g, w]) => {
      const extra = kern(g.deutsch).split(/[ ,;]+/).filter((x) => x.length > 5 && !kern(w.deutsch).includes(x));
      return extra.length > 0;
    })!;
    const [g, w] = nurGlossar;
    const wort = kern(g.deutsch).split(/[ ,;]+/).find((x) => x.length > 5 && !kern(w.deutsch).includes(x))!;
    expect(ergebnis(wort).funde.map((f) => f.id), wort).toContain(g.id);
  });

  it('erfindet nichts, wenn nichts passt', () => {
    expect(ergebnis('qqqxxyzz').funde).toEqual([]);
    expect(ergebnis('   ').funde).toEqual([]);
    expect(ergebnis('?!').funde).toEqual([]);
  });

  it('schlägt bei längeren Suchen einzelne Wörter nach, ohne sie zusammenzusetzen', () => {
    const satz = `${kern(tawdi.deutsch)} qqqxxyzz`;
    expect(ergebnis(satz).funde).toEqual([]);
    const einzeln = einzelneWoerter(wb, satz);
    expect(einzeln).toHaveLength(1);
    expect(einzeln[0].funde[0].id).toBe(tawdi.id);
    expect(einzeln.flatMap((g) => g.funde).every((f) => f.art === 'wort')).toBe(true);
    expect(einzelneWoerter(wb, kern(tawdi.deutsch))).toEqual([]);
  });

  it('bleibt schnell genug fürs Handy', () => {
    const start = performance.now();
    for (const q of ['slomo', 'Danke', 'wie geht es', 'qqqxxyzz', 'tawdy', 'ha']) suche(wb, q);
    // Hier etwa 5 ms pro Suche; die Grenze lässt Luft für langsamere Rechner (GitHub, ältere Handys).
    expect((performance.now() - start) / 6).toBeLessThan(200);
  });
});

describe('Wörterbuch: rund um einen Eintrag', () => {
  it('findet Beispielsätze, in denen das Wort genau so vorkommt', () => {
    let mitBeispiel = 0;
    for (const f of wb.funde.filter((x) => x.art === 'wort').filter((_, i) => i % 5 === 0)) {
      const b = beispielsatz(wb, f);
      if (!b) continue;
      mitBeispiel++;
      expect(b.art).toBe('satz');
      expect(['text', 'einleitung', 'grammatik']).toContain(b.herkunft);
      const gesucht = genau(stichwort(f.latein));
      const satz = genau(b.latein);
      expect(
        satz.some((_, i) => gesucht.every((w, k) => satz[i + k] === w)),
        `${f.latein} in ${b.latein}`,
      ).toBe(true);
    }
    expect(mitBeispiel).toBeGreaterThan(100);
    // Am liebsten aus derselben Lektion
    const tawdi = fundVon('L03-W-tawdi');
    expect(beispielsatz(wb, tawdi)?.lektion).toBe(3);
    expect(beispielsatz(wb, fundVon('L03-D-01'))).toBeUndefined();
  });
});

describe('Übersetzer: Grammatik, Verb- und Formentabellen', () => {
  const nachLatein = (latein: string) => wb.funde.find((f) => f.latein === latein && f.stellen)!;

  it('findet gebeugte Formen über die Umschrift, mit Beschriftung der Tabelle', () => {
    const f = ersterTreffer('dëmxono');
    expect(f).toMatchObject({ latein: 'dëmxono', deutsch: 'schlafen', verb: 'domax – damëx', merkmal: 'Präsens, Sg., 1. f.' });
    expect(f.audio).toMatch(/\.mp3$/); // Aufnahme aus der Grammatik von Lektion 7
    expect(ersterTreffer('dembono')?.latein).toBe('dëmxono'); // ein Tippfehler
    expect(stufeVon(f)).toBe('lehrbuch');
  });

  it('fasst gleiche Formen derselben Tabelle zusammen', () => {
    // „guršat“ steht in der Tabelle für du (m.) und du (f.)
    expect(nachLatein('guršat').merkmal).toBe('Präsens, Sg., 2. m. / 2. f.');
    expect(merkmaleZusammen(['Präsens, Sg., 2. m.', 'Präsens, Sg., 2. f.'])).toBe('Präsens, Sg., 2. m. / 2. f.');
    expect(merkmaleZusammen(['Plural', 'Plural'])).toBe('Plural');
    expect(merkmaleZusammen([])).toBeUndefined();
  });

  it('liest die Person aus der Beschriftung', () => {
    expect(person('Präsens, Sg., 1. f.')).toEqual({ pronomen: 'ich', klar: 'ich, weiblich' });
    expect(person('Singular, 3. Person (m.)')?.pronomen).toBe('er');
    expect(person('Präteritum, Sg., 2. m. / 2. f.')).toEqual({ pronomen: 'du', klar: 'du' });
    expect(person('Plural, 3. Person (m.) / 3. Person (f.)')?.pronomen).toBe('sie');
    expect(person('Präsens, Pl., 1.')?.pronomen).toBe('wir');
    expect(person('Subjekt 3. m. sg., Objekt 2. f. sg.')).toBeUndefined();
    expect(person('Plural')).toBeUndefined();
    expect(person(undefined)).toBeUndefined();
  });

  it('findet Verbformen auf Deutsch mit Person: „ich schlafe“, „du schläfst“', () => {
    const ich = ergebnis('ich schlafe').funde;
    expect(ich.slice(0, 2).map((f) => f.latein)).toEqual(['domaxno', 'dëmxono']);
    for (const f of ich.filter((x) => x.verb)) expect(person(f.merkmal)?.pronomen, f.latein).toBe('ich');
    expect(ergebnis('ich schlafe').nurAehnlich).toBe(false);
    const du = ergebnis('du schläfst').funde.filter((f) => f.verb);
    expect(du[0]).toMatchObject({ latein: 'dëmxat', deutsch: 'schlafen' });
    expect(ergebnis('wir kommen').funde.some((f) => f.deutsch === 'kommen' && person(f.merkmal)?.pronomen === 'wir')).toBe(true);
  });

  it('zeigt bei der Suche nach einem Verb nur seine Grundform, nicht alle Formen', () => {
    const treffer = ergebnis('schlafen').funde.filter((f) => f.verb === 'domax – damëx');
    expect(treffer.map((f) => f.latein)).toEqual(['domax']);
    expect(istGrundform(treffer[0])).toBe(true);
    // Alle Formen stehen trotzdem bereit (für die Tabelle auf der Eintragsseite).
    expect(wb.gruppen.get('domax – damëx')!.length).toBeGreaterThan(18);
  });

  it('findet Beispiele der Grammatik mit Aufnahme', () => {
    const f = ersterTreffer('wir sind verheiratet');
    expect(f).toMatchObject({ latein: 'gawire na', herkunft: 'grammatik', tabelle: 'Grammatik 4', lektion: 4 });
    expect(f.audio).toMatch(/\.mp3$/);
    expect(ersterTreffer('Winter').deutsch).toBe('Winter');
  });

  it('kennt zu jeder Stelle Seite und Block', () => {
    for (const f of wb.funde) {
      for (const st of f.stellen ?? []) {
        const s = wb.seiten.get(st.seite);
        expect(s, f.id).toBeDefined();
        expect(s!.bloecke[st.block], f.id).toBeDefined();
      }
    }
  });
});

describe('Übersetzer: Schilder', () => {
  it('gibt jedem Eintrag aus den Daten ein geprüftes Schild', () => {
    // Zusammengesetztes steht nie in den Daten – das baut erst der Baukasten (Phase 4b).
    for (const f of wb.funde) expect(stufeVon(f)).not.toBe('zusammengesetzt');
    expect(stufeVon(fundVon('L03-W-slomo'))).toBe('lehrbuch');
    expect(stufeVon(wb.nachId.get('G-abro-pl-abne.2')!)).toBe('lehrbuch');
  });

  it('kennzeichnet Community-Einträge als Muttersprachler', () => {
    expect(stufeVon({ quelle: 'community' })).toBe('muttersprachler');
    expect(stufeVon({ quelle: 'lehrbuch' })).toBe('lehrbuch');
  });
});

describe('Wörterbuch: auf dem Gerät', () => {
  it('lädt alten oder kaputten Stand', () => {
    expect(aufbereiten(undefined)).toEqual({ verlauf: [], anfragen: [] });
    expect(aufbereiten({})).toEqual({ verlauf: [], anfragen: [] });
    expect(aufbereiten({ verlauf: ['L03-W-slomo', 3, null] }).verlauf).toEqual(['L03-W-slomo']);
    expect(aufbereiten({ anfragen: [{ text: 'Brot' }, { zeit: 5 }, 'quatsch'] }).anfragen).toEqual([
      { text: 'Brot', situation: '', zeit: 0, verschickt: false },
    ]);
  });

  it('räumt Anfragen auf', () => {
    expect(sauber('  Guten   Morgen \n')).toBe('Guten Morgen');
    expect(sauber('x'.repeat(500))).toHaveLength(ANFRAGE_LAENGE);
  });

  it('hat eigene Adressen', () => {
    const routen: Route[] = [
      { name: 'uebersetzer' },
      { name: 'uebersetzer', id: 'L03-W-slomo' },
      { name: 'uebersetzer', id: 'G-abro-pl-abne.2' },
    ];
    for (const r of routen) expect(parse(href(r))).toEqual(r);
    expect(href({ name: 'uebersetzer' })).toBe('#/uebersetzer');
    expect(fundVon('L03-W-slomo')).toBeDefined();
    expect(wb.nachId.get('G-abro-pl-abne.2')?.herkunft).toBe('glossar');
  });

  it('führt alte Wörterbuch-Adressen in den Übersetzer', () => {
    expect(parse('#/woerterbuch')).toEqual({ name: 'uebersetzer' });
    expect(parse('#/woerterbuch/L03-W-slomo')).toEqual({ name: 'uebersetzer', id: 'L03-W-slomo' });
    expect(parse('#/woerterbuch/G-abro-pl-abne.2')).toEqual({ name: 'uebersetzer', id: 'G-abro-pl-abne.2' });
  });
});

describe('Abstand', () => {
  it('zählt Tippfehler', () => {
    expect(abstand('tawdi', 'tawdi', 2)).toBe(0);
    expect(abstand('tawdi', 'tawdy', 2)).toBe(1);
    expect(abstand('tawdi', 'twadi', 2)).toBe(1); // vertauscht
    expect(abstand('tawdi', 'tadi', 2)).toBe(1);
    expect(abstand('tawdi', 'xyz', 1)).toBe(2); // bricht früh ab
  });
});
