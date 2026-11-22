// Das große Glossar (Teil 5 des Lehrbuchs, Fahrplan Phase 4b, Schritt 7): wörtlich eingelesen,
// im Übersetzer findbar, und was es über ein Wort sagt (Geschlecht, Mehrzahl, weibliche Form),
// nimmt der Baukasten als Merkmal.

import { describe, expect, it } from 'vitest';
import glossarJson from '../data/glossar-a.json';
import grammatikJson from '../data/grammatik.json';
import grossJson from '../data/glossar.json';
import { alleLektionen } from '../data';
import type { Glossar, Grammatik, GrossesGlossar } from '../types';
import { kandidaten, merkmale } from './baukasten';
import { baueWoerterbuch, suche } from './woerterbuch';

const gross = grossJson as unknown as GrossesGlossar;
const wb = baueWoerterbuch(alleLektionen, glossarJson as Glossar, grammatikJson as unknown as Grammatik, gross);
const SYR = /[\u{700}-\u{74F}]/u;

describe('Großes Glossar: Daten', () => {
  it('ist vollständig: Einträge, Untereinträge, Beispiele, Wortliste Deutsch > Surayt', () => {
    expect(gross.eintraege.filter((e) => !e.unter).length).toBeGreaterThan(1500);
    expect(gross.eintraege.filter((e) => e.unter).length).toBeGreaterThan(300);
    expect(gross.eintraege.flatMap((e) => e.sinne.flatMap((s) => s.beispiele)).length).toBeGreaterThan(800);
    expect(gross.wortliste.length).toBeGreaterThan(2500);
    expect(new Set(gross.eintraege.map((e) => e.id)).size).toBe(gross.eintraege.length);
  });

  it('trennt Umschrift, Schrift und Deutsch', () => {
    for (const e of gross.eintraege) {
      expect(e.latein, e.id).not.toMatch(SYR);
      expect(e.latein, e.id).not.toMatch(/[|⑴⑵⑶]|\p{L}\d/u);
      if (e.syrisch) expect(e.syrisch, e.id).toMatch(SYR);
      expect(e.syrisch, e.id).not.toMatch(/[A-Za-z\]]/);
      for (const s of e.sinne) {
        expect(s.deutsch, e.id).not.toMatch(SYR);
        for (const b of s.beispiele) {
          expect(b.latein, e.id).not.toMatch(SYR);
          expect(b.deutsch.trim(), e.id).not.toBe('');
          if (b.verweis) expect(b.verweis, e.id).toMatch(/^(L|Q|G)\.?\d/);
        }
      }
    }
    // Untereinträge verweisen auf ihren Haupteintrag
    const ids = new Set(gross.eintraege.map((e) => e.id));
    for (const e of gross.eintraege) if (e.unter) expect(ids.has(e.unter), e.id).toBe(true);
  });

  it('liest Geschlecht, weibliche Form und Mehrzahl, wie das Vorwort sie beschreibt („rabo (m.), f. rabṯo, pl. rabe“)', () => {
    const lang = gross.eintraege.find((e) => e.sinne[0]?.deutsch === 'lang')!;
    const [m, f, pl] = lang.latein.split(/,\s*(?:f\.|pl\.)\s*/);
    const wort = (form: string) => kandidaten(wb, 'lang').find((s) => s.genau === form)!;
    expect(merkmale(wb, wort(m))).toMatchObject({ wortart: 'anderes', geschlecht: 'm', zahl: 'sg' });
    expect(merkmale(wb, wort(f))).toMatchObject({ geschlecht: 'f', zahl: 'sg' });
    // Adjektive: „eine gemeinsame Pluralform“ (Grammatik 11a)
    expect(merkmale(wb, wort(pl))).toMatchObject({ geschlecht: 'mf', zahl: 'pl' });
  });
});

describe('Großes Glossar: im Übersetzer', () => {
  it('findet Wörter, die in Level A fehlen, und die Beispielsätze', () => {
    const lang = gross.eintraege.find((e) => e.sinne[0]?.deutsch === 'lang')!;
    expect(suche(wb, 'lang').funde.map((f) => f.id)).toContain(lang.id);
    const bsp = gross.eintraege.flatMap((e) => e.sinne.flatMap((s) => s.beispiele)).find((b) => b.verweis === 'L.19')!;
    expect(suche(wb, bsp.deutsch).funde.some((f) => f.latein === bsp.latein)).toBe(true);
    expect(wb.wortliste.get('lang')).toContain(lang.latein.split(',')[0]);
  });

  it('nimmt nichts doppelt auf, was Wortschatz oder Glossar A schon genauso sagen', () => {
    const gesehen = new Set<string>();
    for (const f of wb.funde) {
      const k = `${f.latein.normalize('NFC').toLowerCase()}|${f.deutsch}`;
      expect(gesehen.has(k), k).toBe(false);
      gesehen.add(k);
    }
  });
});
