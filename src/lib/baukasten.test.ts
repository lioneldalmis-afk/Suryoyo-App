// Baukasten, Teil 1 (Fahrplan, Phase 4b, Schritt 4): „Ein Wort tauschen“.
// Geprüft wird an den echten Daten. Erwartete Surayt-Formen stehen hier nicht von
// Hand, sondern werden aus den Tabellen des Lehrbuchs gelesen.

import { describe, expect, it } from 'vitest';
import glossarJson from '../data/glossar-a.json';
import grammatikJson from '../data/grammatik.json';
import { alleLektionen } from '../data';
import type { Glossar, Grammatik } from '../types';
import { woerter, zerlege } from './text';
import { baueWoerterbuch, type Fund } from './woerterbuch';
import { alleSchreibweisen } from './wortfuerwort';
import {
  eingeschaltet,
  gegenprobe,
  merkmale,
  MINDESTENS_BELEGE,
  satzbauplaene,
  setzeZusammen,
  stehtSchonDa,
  tausche,
  type Zusammengesetzt,
} from './baukasten';

const grammatik = grammatikJson as unknown as Grammatik;
const wb = baueWoerterbuch(alleLektionen, glossarJson as Glossar, grammatik);
const probe = gegenprobe(wb);
const an = eingeschaltet(wb);

/** Die Wörter eines Surayt-Textes, genau (klein, ohne Satzzeichen). */
const genau = (text: string) => woerter(text).map((w) => zerlege(w).kern.normalize('NFC').toLowerCase()).filter(Boolean);
const gleich = (a: string, b: string) => genau(a).join(' ') === genau(b).join(' ');

/** Eine Form aus der Verbkonjugation (Surcofo, Kapitel 1.17), nach Bedeutung und Beschriftung. */
function verbform(deutsch: string, merkmal: string): string {
  const e = grammatik.seiten.find((s) => s.id === '1.17')!.eintraege.find((x) => x.deutsch === deutsch && x.merkmal === merkmal);
  expect(e, `${deutsch} · ${merkmal}`).toBeDefined();
  return e!.latein.normalize('NFC').toLowerCase();
}

/** Eine Zahl aus der Zahlentabelle (Kapitel 4.11). */
function zahl(ziffer: string, merkmal: 'Maskulin' | 'Feminin'): string {
  const e = grammatik.seiten.find((s) => s.titel === 'Die Zahlen')!.eintraege.find((x) => x.deutsch === ziffer && x.merkmal === merkmal);
  expect(e, `${ziffer} · ${merkmal}`).toBeDefined();
  return e!.latein.normalize('NFC').toLowerCase();
}

/** Was herauskommen muss: der Lehrbuch-Satz der Vorlage, an der Lücke das neue Wort. */
const erwartet = (z: Zusammengesetzt, neu: string) => genau(z.vorlage.fund.latein).map((w, i) => (i === z.vorlage.stelle ? neu : w)).join(' ');

/** Genau ein zusammengesetzter Satz. */
function einer(anfrage: string): Zusammengesetzt {
  const z = setzeZusammen(wb, anfrage);
  expect(z.map((x) => x.latein), anfrage).toHaveLength(1);
  return z[0];
}

describe('Baukasten: Satzbaupläne aus dem Lehrbuch', () => {
  const plaene = satzbauplaene(wb);

  it('nimmt nur Sätze, die das Lehrbuch mindestens zweimal mit verschiedenen Wörtern zeigt', () => {
    expect(plaene.length).toBeGreaterThan(0);
    const imWoerterbuch = new Set(wb.funde);
    for (const p of plaene) {
      expect(new Set(p.belege.map((b) => b.wort.genau)).size, p.sur).toBeGreaterThanOrEqual(MINDESTENS_BELEGE);
      for (const b of p.belege) {
        expect(imWoerterbuch.has(b.fund), p.sur).toBe(true);
        // Alle übrigen Wörter sind gleich – nur das an der Lücke ist anders.
        const w = genau(b.fund.latein);
        expect(w.map((x, i) => (i === b.stelle ? '_' : x)).join(' '), b.fund.id).toBe(p.sur);
        expect(w[b.stelle], b.fund.id).toBe(b.wort.genau);
        // Die Bedeutung des Wortes kommt aus einem eigenen Eintrag.
        expect(b.wort.fund, b.fund.id).not.toBe(b.fund);
        expect(b.wort.fund.art, b.fund.id).toBe('wort');
      }
    }
  });

  it('braucht im Deutschen außer dem Wort noch mindestens ein weiteres', () => {
    for (const p of plaene) expect(p.vor.length + p.nach.length, p.de).toBeGreaterThan(0);
  });
});

describe('Baukasten: Gegenprobe', () => {
  it('schaltet nur Satzbaupläne ein, die einen Beleg genau treffen und nie danebenliegen', () => {
    expect(an.length).toBeGreaterThanOrEqual(4);
    for (const p of an) {
      const s = probe.plaene.get(p)!;
      expect(s.belegeGetroffen, p.sur).toBeGreaterThanOrEqual(1);
      expect(s.daneben, p.sur).toBe(0);
    }
    for (const [p, s] of probe.plaene) if (s.daneben > 0 || s.belegeGetroffen === 0) expect(an).not.toContain(p);
  });

  it('liegt mit den eingeschalteten Satzbauplänen bei keinem deutschen Satz des Lehrbuchs daneben', () => {
    const geprueft = probe.proben.filter((pr) => pr.gebaut.some((z) => an.includes(z.satzbau)));
    // Stand 22.11.2026: 8 Belege, alle genau getroffen.
    expect(geprueft.length).toBeGreaterThanOrEqual(8);
    for (const pr of geprueft) {
      const eigene = pr.gebaut.filter((z) => an.includes(z.satzbau));
      const echt = [pr.fund.latein, ...pr.fund.latein.split(/\s*[,;/~]\s*/)];
      expect(eigene.some((z) => echt.some((e) => gleich(e, z.latein))), `${pr.fund.latein} – ${pr.fund.deutsch}`).toBe(true);
    }
  });

  it('kennt den Satz selbst nicht: nicht als Vorlage, nicht als Beleg für ein Merkmal, nicht als Wort', () => {
    for (const pr of probe.proben) {
      for (const z of pr.gebaut) {
        expect(z.vorlage.fund, pr.fund.id).not.toBe(pr.fund);
        expect(z.neu.wort.fund, pr.fund.id).not.toBe(pr.fund);
        for (const b of [...z.alt.merkmale.belege, ...z.neu.merkmale.belege]) expect(b.fund, pr.fund.id).not.toBe(pr.fund);
      }
    }
  });
});

describe('Baukasten: ein Wort tauschen', () => {
  it('„er wird essen“: die Form von „essen“ für „er“ aus der Verbtabelle statt „ziehen“ oder „schlafen“', () => {
    const z = einer('er wird essen');
    expect(['er wird ziehen', 'er wird schlafen']).toContain(z.vorlage.fund.deutsch);
    expect(genau(z.latein).join(' ')).toBe(erwartet(z, verbform('essen', 'Präsens, Sg., 3. m.')));
    expect(z.deutsch).toBe('er wird essen');
    expect(z.neu.merkmale.formen).toEqual(['Präsens|er']);
    expect(z.alt.merkmale.formen).toEqual(z.neu.merkmale.formen);
  });

  it('„wir werden schlafen“: die Form für „wir“', () => {
    const z = einer('Wir werden schlafen.');
    expect(['wir werden sehen', 'wir werden essen']).toContain(z.vorlage.fund.deutsch);
    expect(genau(z.latein).join(' ')).toBe(erwartet(z, verbform('schlafen', 'Präsens, Pl., 1.')));
  });

  it('nimmt die Grundform des Präsens, nicht die Form mit ko- aus den Zeitformen', () => {
    // „er wird ziehen“ ohne den Lehrbuch-Satz selbst gebaut: nur eine Fassung.
    const satz = wb.funde.find((f) => f.deutsch === 'er wird ziehen')!;
    const z = tausche(wb, 'er wird ziehen', { ohne: satz });
    expect(z.map((x) => x.latein)).toHaveLength(1);
    expect(gleich(z[0].latein, satz.latein)).toBe(true);
  });

  it('Zahlen: männliche Form vor „Männer“, weibliche vor „Frauen“, als Wort oder Ziffer', () => {
    for (const [anfrage, neu] of [
      ['vier Männer', zahl('4', 'Maskulin')],
      ['4 Männer', zahl('4', 'Maskulin')],
      ['vier Frauen', zahl('4', 'Feminin')],
      ['sieben Frauen', zahl('7', 'Feminin')],
      ['7 Männer', zahl('7', 'Maskulin')],
    ]) {
      const z = einer(anfrage);
      expect(genau(z.latein).join(' '), anfrage).toBe(erwartet(z, neu));
      expect(z.deutsch, anfrage).toBe(anfrage);
    }
    // 2 und 3 stehen im Lehrbuch (tre gawre, tlëṯ niše …), da kommt nichts Neues heraus.
    for (let i = 4; i <= 10; i++) {
      const m = einer(`${i} Männer`);
      const f = einer(`${i} Frauen`);
      expect(m.neu.merkmale.geschlecht, `${i}`).toBe('m');
      expect(f.neu.merkmale.geschlecht, `${i}`).toBe('f');
    }
  });

  it('lieber nichts als Unsinn: ohne genau passenden Satzbau oder ohne Merkmal wird nichts gebaut', () => {
    for (const anfrage of [
      '1 Frauen', // die Eins steht mit der Einzahl
      'elf Männer', // ab 11 nennt die Zahlentabelle kein Geschlecht
      'ein Glas Wasser', // das Lehrbuch zeigt nicht, ob „ḥamro“ männlich oder weiblich ist
      'die vier Männer', // anderer Artikel vor der Lücke
      'sie wird schlafen', // kein Satzbau mit „sie wird“
      'er wird nach Hause gehen',
      'er wird Haus',
    ]) {
      expect(setzeZusammen(wb, anfrage).map((z) => z.latein), anfrage).toEqual([]);
    }
  });

  it('Geprüftes geht vor: Steht der Satz im Lehrbuch, wird nichts zusammengesetzt', () => {
    for (const anfrage of ['zwei Männer', 'er wird schlafen', 'Wir werden essen!', 'drei Frauen']) {
      expect(stehtSchonDa(wb, anfrage), anfrage).toBe(true);
      expect(setzeZusammen(wb, anfrage), anfrage).toEqual([]);
    }
    // Käme ein Lehrbuch-Satz heraus, ist nichts zusammengesetzt.
    expect(setzeZusammen(wb, '2 Männer')).toEqual([]);
  });

  it('nimmt nur Wörter aus den Daten; Zusammengesetztes steht nie in den Daten und hat keine Aufnahme', () => {
    const schreibweisen = new Set(alleSchreibweisen(wb).map((s) => s.genau));
    const alle = ['er wird essen', 'er wird kommen', 'wir werden gehen', 'fünf Männer', 'acht Frauen'].flatMap((a) => setzeZusammen(wb, a));
    expect(alle.length).toBeGreaterThanOrEqual(5);
    for (const z of alle) {
      expect(z.stufe).toBe('zusammengesetzt');
      expect('audio' in z).toBe(false);
      expect(wb.funde.some((f: Fund) => gleich(f.latein, z.latein)), z.latein).toBe(false);
      const vorlage = genau(z.vorlage.fund.latein);
      genau(z.latein).forEach((w, i) => expect(i === z.vorlage.stelle ? w : vorlage[i], z.latein).toBe(i === z.vorlage.stelle ? z.neu.wort.genau : w));
      expect(schreibweisen.has(z.neu.wort.genau), z.latein).toBe(true);
    }
  });

  it('zeigt als Vorlage am liebsten einen Lehrbuch-Satz mit Aufnahme', () => {
    for (const a of ['er wird essen', 'wir werden gehen', 'fünf Männer', 'acht Frauen']) expect(einer(a).vorlage.fund.audio, a).toBeTruthy();
  });
});

describe('Baukasten: Merkmale nur aus dem Lehrbuch', () => {
  const nomen = alleSchreibweisen(wb).filter((s) => s.fund.herkunft === 'wortschatz' && s.fund.art === 'wort');

  it('„bayto“ ist männlich – am Artikel in „u bayto“ (Grammatik 4), obwohl es auf -to endet', () => {
    const s = nomen.find((x) => x.genau === 'bayto')!;
    const m = merkmale(wb, s);
    expect(m.geschlecht).toBe('m');
    expect(m.zahl).toBe('sg');
    expect(m.belege.some((b) => b.art === 'artikel')).toBe(true);
  });

  it('jedes Geschlecht hat einen Beleg in den Daten, und ein Wort ohne Beleg bleibt offen', () => {
    let ohne = 0;
    for (const s of nomen) {
      const m = merkmale(wb, s);
      if (m.geschlecht) expect(m.belege.some((b) => b.geschlecht === m.geschlecht), s.genau).toBe(true);
      else ohne++;
    }
    // Die meisten Wörter zeigt das Lehrbuch ohne Artikel oder Zusatz.
    expect(ohne).toBeGreaterThan(nomen.length / 2);
  });

  it('Verbformen: Zeit und Person aus der Beschriftung der Tabelle; „Präsens (G.7b)“ (mit ko-) bleibt getrennt', () => {
    const domax = alleSchreibweisen(wb).find((s) => s.genau === verbform('schlafen', 'Präsens, Sg., 3. m.') && s.fund.verb)!;
    expect(merkmale(wb, domax).formen).toEqual(['Präsens|er']);
    const mitKo = alleSchreibweisen(wb).find((s) => s.fund.verb && s.fund.stellen?.some((st) => /^Präsens \(G\.7b\), Sg\., 3\. m\.$/.test(st.merkmal ?? '')));
    expect(mitKo).toBeDefined();
    expect(merkmale(wb, mitKo!).formen).toContain('Präsens (G.7b)|er');
    expect(merkmale(wb, mitKo!).formen).not.toContain('Präsens|er');
  });
});

describe('Baukasten: nur im Übersetzer', () => {
  it('wird nur vom Übersetzer benutzt – nie von Übungen, Karteikasten oder Satz der Woche', () => {
    const quellen = import.meta.glob(['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const nutzer = Object.entries(quellen)
      .filter(([, code]) => /from '\.\.?\/(?:lib\/)?baukasten'/.test(code))
      .map(([datei]) => datei)
      .sort();
    // Die Regeln (Schritt 5) bauen auf dem Baukasten auf und sind ihrerseits nur im Übersetzer (regeln.test.ts).
    expect(nutzer).toEqual(['../components/Zusammengesetzt.tsx', '../screens/Woerterbuch.tsx', './regeln.ts']);
  });
});
