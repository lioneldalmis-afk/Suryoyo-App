import { describe, expect, it } from 'vitest';
import glossarJson from '../data/glossar-a.json';
import { alleLektionen, NUR_MIT_BILD } from '../data';
import type { Eintrag, Glossar } from '../types';
import { ANFRAGE_LAENGE, aufbereiten, sauber } from './nachschlagen';
import { href, parse, type Route } from './router';
import { fold, kern, woerter, zerlege } from './text';
import { abstand, baueWoerterbuch, beispielsatz, einzelneWoerter, stichwort, suche, woerterImSatz, type Fund } from './woerterbuch';

const glossar = glossarJson as Glossar;
const wb = baueWoerterbuch(alleLektionen, glossar);
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
    expect(wb.mitGlossar).toBe(true);
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
    for (const f of wb.funde) {
      if (f.herkunft === 'glossar') expect(ausGlossar.has(`${f.latein}|${f.deutsch}`), f.id).toBe(true);
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
    expect((performance.now() - start) / 6).toBeLessThan(60);
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
      expect(['text', 'einleitung']).toContain(b.herkunft);
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

  it('zeigt die Wörter eines Satzes in seiner Reihenfolge', () => {
    const satz = fundVon('L03-D-01');
    const liste = woerterImSatz(wb, satz);
    expect(liste.length).toBeGreaterThan(2);
    const worte = genau(satz.latein);
    const stellen = liste.map((f) => worte.indexOf(genau(stichwort(f.latein))[0]));
    expect(stellen.every((s) => s >= 0)).toBe(true);
    expect([...stellen].sort((a, b) => a - b)).toEqual(stellen);
    expect(liste.some((f) => f.id === 'L03-W-slomo')).toBe(true);
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
      { name: 'woerterbuch' },
      { name: 'woerterbuch', id: 'L03-W-slomo' },
      { name: 'woerterbuch', id: 'G-abro-pl-abne.2' },
    ];
    for (const r of routen) expect(parse(href(r))).toEqual(r);
    expect(fundVon('L03-W-slomo')).toBeDefined();
    expect(wb.nachId.get('G-abro-pl-abne.2')?.herkunft).toBe('glossar');
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
