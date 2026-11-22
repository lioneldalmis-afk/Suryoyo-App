// Wort für Wort (Fahrplan, Phase 4b, Schritt 3): Surayt-Sätze werden Wort für
// Wort erklärt – nur mit Einträgen aus den Daten und Regeln aus dem Lehrbuch.
// Geprüft wird an den echten Sätzen der Lektionen.

import { describe, expect, it } from 'vitest';
import glossarJson from '../data/glossar-a.json';
import grammatikJson from '../data/grammatik.json';
import grossJson from '../data/glossar.json';
import { alleLektionen } from '../data';
import type { Glossar, Grammatik, GrossesGlossar } from '../types';
import { fold, woerter, zerlege } from './text';
import { baueWoerterbuch, suche, type Fund } from './woerterbuch';
import { anzahlWoerter, erklaere, ganzGleich, siehtNachSuraytAus, type Wortteil } from './wortfuerwort';

const wb = baueWoerterbuch(alleLektionen, glossarJson as Glossar, grammatikJson as unknown as Grammatik, grossJson as unknown as GrossesGlossar);
const saetze = alleLektionen.flatMap((l) => [...l.text, ...l.einleitung]);
const fundVon = (id: string) => wb.nachId.get(id)!;
/** Jeder Satz der Lektionen, so erklärt wie auf seiner Eintragsseite. */
const erklaert = saetze.map((s) => ({ satz: s, e: erklaere(wb, s.latein, { ohne: wb.nachId.get(s.id) }) }));
const alleTeile = erklaert.flatMap(({ satz, e }) => e.teile.map((t) => ({ satz, t })));
const zerlegt = alleTeile.flatMap(({ t }) => (t.art === 'zerlegt' ? [t] : []));
const funde = (t: Wortteil): Fund[] =>
  t.art === 'eintrag' || t.art === 'aehnlich' ? t.funde : t.art === 'zerlegt' ? t.stuecke.flatMap((s) => s.funde) : t.art === 'im-satz' ? t.saetze : [];
/** Die Wörter eines Satzes ohne Satzzeichen und Zahlen. */
const woerterVon = (text: string) => woerter(text).map((w) => zerlege(w).kern).filter((w) => w && !/^[\d.,]+$/.test(w));

describe('Wort für Wort: Lehrbuch-Sätze', () => {
  it('erklärt jedes Wort in der Reihenfolge des Satzes, ohne etwas auszulassen', () => {
    for (const { satz, e } of erklaert) {
      const texte = e.teile.flatMap((t) => t.text.split(' '));
      expect(texte, satz.id).toEqual(woerterVon(satz.latein));
      expect(e.gekuerzt, satz.id).toBe(false);
    }
  });

  it('erklärt die allermeisten Wörter der Lektionen', () => {
    const woerter = erklaert.reduce((n, { e }) => n + e.woerter, 0);
    const ok = erklaert.reduce((n, { e }) => n + e.erklaert, 0);
    // Stand 21.11.2026: etwa 90 % (eingetragen oder zerlegt); der Rest kommt in anderen Sätzen vor oder ist unbekannt.
    expect(ok / woerter).toBeGreaterThan(0.85);
  });

  it('nimmt nur Einträge aus den Daten, nie den Satz selbst', () => {
    const imWoerterbuch = new Set(wb.funde);
    for (const { satz, t } of alleTeile) {
      for (const f of funde(t)) {
        expect(imWoerterbuch.has(f), `${satz.id}: ${t.text}`).toBe(true);
        expect(f.id, satz.id).not.toBe(wb.nachId.get(satz.id)?.id);
      }
    }
  });

  it('beginnt „Šlomo, ono ëšmi …“ mit den Einträgen aus Lektion 3 und den Formentabellen', () => {
    const { e } = erklaert.find(({ satz }) => satz.id === 'L03-D-01')!;
    expect(e.erklaert).toBeGreaterThanOrEqual(e.woerter - 1); // der Name steht nicht als Wort im Übersetzer
    const [slomo, ono, esmi] = e.teile;
    expect(funde(slomo)[0].id).toBe(fundVon('L03-W-slomo').id);
    expect(funde(ono)[0].deutsch).toBe('ich');
    expect(funde(esmi).some((f) => f.deutsch === 'mein Name')).toBe(true);
  });

  it('zeigt gebeugte Formen mit der Beschriftung der Tabelle', () => {
    const formen = alleTeile.flatMap(({ t }) => (t.art === 'eintrag' ? t.funde : [])).filter((f) => f.verb && f.merkmal);
    expect(formen.length).toBeGreaterThan(100);
  });

  it('nimmt Wendungen aus mehreren Wörtern als Ganzes', () => {
    const wendungen = alleTeile.filter(({ t }) => t.art === 'eintrag' && t.woerter > 1);
    expect(wendungen.length).toBeGreaterThan(50);
    // Die Wörter stehen genau so (ohne Sonderzeichen) im Eintrag.
    for (const { t } of wendungen) {
      const eintrag = fold(funde(t)[0].latein.replace(/\([^)]*\)/g, ' ')).replace(/[^a-z0-9]+/g, ' ');
      expect(` ${eintrag} `.replace(/\s+/g, ' '), t.text).toContain(` ${fold(t.text)} `);
    }
    // Auf der Seite eines Satzes keine anderen ganzen Sätze als „Wendung“
    for (const { t } of wendungen) expect(funde(t)[0].art).toBe('wort');
  });
});

describe('Wort für Wort: Kleinwörter und Regeln', () => {
  it('erklärt Artikel, Präpositionen, Präsens- und Futurmarker aus den Erklärtexten', () => {
    const bedeutungen = new Set(alleTeile.flatMap(({ t }) => (t.art === 'eintrag' ? t.funde.map((f) => f.deutsch) : [])));
    for (const d of ['Der bestimmte Artikel', 'Futurmarker', 'Genitivpartikel', 'in']) expect(bedeutungen, d).toContain(d);
  });

  it('erkennt den Artikel der Mehrzahl am ersten Konsonanten des folgenden Wortes („aK“)', () => {
    const treffer = erklaert.flatMap(({ e }) =>
      e.teile.flatMap((t, i) => (t.art === 'eintrag' && t.funde.some((f) => f.latein === 'aK') ? [{ t, weiter: e.teile[i + 1] }] : [])),
    );
    expect(treffer.length).toBeGreaterThan(20);
    for (const { t, weiter } of treffer) {
      expect(fold(t.text)).toMatch(/^a[^aeiou]$/);
      expect(fold(weiter.text)[0]).toBe(fold(t.text)[1]);
    }
  });

  it('zerlegt nur in Teile, die genau in den Daten stehen, und nennt die Regel', () => {
    expect(zerlegt.length).toBeGreaterThan(150);
    for (const t of zerlegt) {
      expect(t.stuecke).toHaveLength(2);
      for (const s of t.stuecke) expect(s.funde.length, t.text).toBeGreaterThan(0);
      expect(t.regel.kapitel, t.text).toMatch(/^Grammatik \d+$/);
      // Die Teile ergeben zusammen das Wort (ohne Sonderzeichen; Substantive ohne ihre Endung -o/-e/-a).
      // Auch Formen aus dem Zusatz zählen („kuliṯo“ mit „Pl. kulyoṯe“).
      const [vorne, hinten] = t.stuecke.map((s) => fold(`${s.funde[0].latein} ${s.funde[0].hinweis ?? ''}`).replace(/^-|-\s*$/g, '').trim());
      const formen = (x: string) => x.replace(/\([^)]*\)/g, ' ').split(/[^a-z]+/).filter(Boolean);
      const wort = fold(t.text);
      if (t.regel.art === 'possessiv' || t.regel.art === 'demonstrativ')
        expect(formen(vorne).map((x) => x.replace(/[oea]$/, '') + hinten), t.text).toContain(wort);
      else if (/^a[A-Z]$/.test(t.stuecke[1].funde[0].latein)) expect(wort.slice(0, -1), t.text).toBe(vorne + 'a');
      else expect(formen(hinten).map((x) => vorne + x), t.text).toContain(wort);
    }
    const arten = new Set(zerlegt.map((t) => t.regel.art));
    expect([...arten].sort()).toEqual(['demonstrativ', 'possessiv', 'praeposition', 'praesens']);
  });

  it('setzt den Präsensmarker nur vor eine Grundform des Präsens', () => {
    const praesens = zerlegt.filter((t) => t.regel.art === 'praesens');
    expect(praesens.length).toBeGreaterThan(10);
    for (const t of praesens) {
      expect(t.stuecke[0].funde[0].deutsch).toBe('Präsensmarker');
      for (const f of t.stuecke[1].funde) expect(f.verb || / – /.test(f.latein), t.text).toBeTruthy();
      for (const f of t.stuecke[1].funde) expect(f.merkmal ?? '', t.text).not.toMatch(/Prät|Imperativ|Infinitiv/);
    }
  });

  it('hält sich an die Regeln der Possessivsuffixe: allgemeine Reihe nur mit Artikel (Grammatik 5)', () => {
    const allgemein = zerlegt.filter((t) => t.regel.art === 'possessiv' && /^-(ayḏ|aṯ)/.test(t.stuecke[1].funde[0].latein));
    expect(allgemein.length).toBeGreaterThan(10);
    for (const t of allgemein) {
      // Im Satz steht der Artikel davor; allein wird das Wort nicht so zerlegt.
      const allein = erklaere(wb, t.text).teile[0];
      expect(allein.art === 'zerlegt' && allein.regel.art === 'possessiv', t.text).toBe(false);
    }
    // Die eingeschränkte Reihe nur für Verwandtschaft, Körperteile und die genannten Ausnahmen.
    const eingeschraenkt = zerlegt.filter((t) => t.regel.art === 'possessiv' && !/^-(ayḏ|aṯ)/.test(t.stuecke[1].funde[0].latein));
    expect(eingeschraenkt.length).toBeGreaterThan(3);
  });

  it('erfindet nichts für Wörter, die es nicht gibt', () => {
    const e = erklaere(wb, `${fundVon('L03-W-slomo').latein} qqqxxyzz`, { mitAehnlichen: true });
    expect(e.teile.map((t) => t.art)).toEqual(['eintrag', 'unbekannt']);
    expect(e.erklaert).toBe(1);
  });

  it('schlägt ähnlich Geschriebenes nur vor, wenn man es möchte (in der Suche)', () => {
    // „dembono“: ein Tippfehler für eine Form aus der Verbtabelle
    const e = erklaere(wb, `${fundVon('L03-W-slomo').latein} dembono`, { mitAehnlichen: true });
    expect(e.teile[1].art).toBe('aehnlich');
    expect(funde(e.teile[1]).some((f) => f.latein === 'dëmxono')).toBe(true);
    expect(erklaere(wb, `${fundVon('L03-W-slomo').latein} dembono`).teile[1].art).toBe('unbekannt');
  });
});

describe('Wort für Wort: getippt am Handy', () => {
  it('klappt auch ohne Sonderzeichen', () => {
    let woerter = 0;
    let ok = 0;
    for (const s of saetze) {
      const e = erklaere(wb, fold(s.latein), { ohne: wb.nachId.get(s.id) });
      woerter += e.woerter;
      ok += e.erklaert;
    }
    expect(ok / woerter).toBeGreaterThan(0.85);
  });

  it('erkennt, ob jemand Surayt oder Deutsch tippt', () => {
    const surayt = saetze.filter((s) => anzahlWoerter(s.latein) >= 2);
    expect(surayt.filter((s) => siehtNachSuraytAus(wb, fold(s.latein))).length / surayt.length).toBeGreaterThan(0.97);
    expect(surayt.filter((s) => siehtNachSuraytAus(wb, s.latein)).length / surayt.length).toBeGreaterThan(0.97);
    // Deutsche Sätze, auch mit Namen wie „Abrohëm“, gelten nicht als Surayt.
    expect(saetze.filter((s) => siehtNachSuraytAus(wb, s.deutsch)).length).toBeLessThanOrEqual(3);
  });

  it('bleibt schnell genug fürs Handy', () => {
    const start = performance.now();
    for (const s of saetze.slice(0, 100)) erklaere(wb, fold(s.latein), { mitAehnlichen: true, mitSaetzen: true });
    // Hier etwa 1 ms pro Satz; die Grenze lässt Luft für ältere Handys.
    expect((performance.now() - start) / 100).toBeLessThan(50);
  });

  it('vergleicht ganze Sätze ohne Satzzeichen und Sonderzeichen', () => {
    const s = fundVon('L03-D-01');
    expect(ganzGleich(s.latein, fold(s.latein).toUpperCase())).toBe(true);
    expect(ganzGleich(s.latein, woerterVon(s.latein).slice(1).join(' '))).toBe(false);
  });
});

describe('Übersetzer: Kleinwörter in der Suche', () => {
  it('findet Artikel und Marker auch über ihre deutsche Bezeichnung', () => {
    expect(suche(wb, 'Futurmarker').funde[0]?.deutsch).toBe('Futurmarker');
    expect(suche(wb, 'bestimmte Artikel').funde.filter((f) => f.deutsch === 'Der bestimmte Artikel')).toHaveLength(4);
  });
});
