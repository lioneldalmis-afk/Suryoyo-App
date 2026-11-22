// Baukasten, Teil 2 (Fahrplan, Phase 4b, Schritt 5): Regeln aus der Grammatik.
// Geprüft wird an den echten Daten. Erwartete Surayt-Formen stehen hier nicht von
// Hand, sondern werden aus den Tabellen des Lehrbuchs gelesen.

import { describe, expect, it } from 'vitest';
import glossarJson from '../data/glossar-a.json';
import grammatikJson from '../data/grammatik.json';
import { alleLektionen } from '../data';
import type { Glossar, Grammatik, GrammatikEintrag } from '../types';
import { woerter, zerlege } from './text';
import { baueWoerterbuch } from './woerterbuch';
import { stehtSchonDa } from './baukasten';
import { aufbereiten } from './nachschlagen';
import { alleRegeln, datenWort, eingeschalteteRegeln, nachRegeln, regelGegenprobe, type RegelId, type Regelsatz } from './regeln';

const grammatik = grammatikJson as unknown as Grammatik;
const wb = baueWoerterbuch(alleLektionen, glossarJson as Glossar, grammatik);
const probe = regelGegenprobe(wb);
const an = eingeschalteteRegeln(wb);

const klein = (t: string) => t.normalize('NFC').toLowerCase();
const genau = (t: string) => woerter(t).map((w) => klein(zerlege(w).kern)).filter(Boolean).join(' ');

/** Ein Eintrag einer Grammatik-Seite (nach Kapitel oder Titel), nach Bedeutung und Beschriftung. */
function eintrag(seite: string, deutsch: string, merkmal?: string | null): GrammatikEintrag {
  const s = grammatik.seiten.find((x) => x.id === seite || x.titel === seite)!;
  const e = s.eintraege.find((x) => x.deutsch === deutsch && (merkmal === undefined || (x.merkmal ?? null) === merkmal));
  expect(e, `${seite}: ${deutsch} · ${merkmal}`).toBeDefined();
  return e!;
}
const form = (seite: string, deutsch: string, merkmal?: string | null) => klein(eintrag(seite, deutsch, merkmal).latein);
const hilfs = (deutsch: string, merkmal: string) => form('Pseudo- und Hilfsverben', deutsch, merkmal);
const adjektiv = (merkmal: string) => form('1.11.2', 'erschöpft, müde', merkmal);
const verb = (deutsch: string, merkmal: string) => form('1.17', deutsch, merkmal);
const zahl = (ziffer: string, merkmal: 'Maskulin' | 'Feminin') => form('Die Zahlen', ziffer, merkmal);
const artikel = (merkmal: string) => form('Der bestimmte Artikel', 'Der bestimmte Artikel', merkmal);
const suffix = (merkmal: string) => form('1.5.3', merkmal.startsWith('Plural') ? 'unser' : 'mein', merkmal).replace(/^-/, '');
const kleinwort = (deutsch: string) => klein(wb.funde.find((f) => f.deutsch === deutsch)!.latein).replace(/-$/, '');
const wortschatz = (deutsch: string) => klein(wb.funde.find((f) => f.herkunft === 'wortschatz' && f.deutsch === deutsch)!.latein);

const saetze = (anfrage: string, opt: Parameters<typeof nachRegeln>[2] = {}) => nachRegeln(wb, anfrage, opt);
const lateins = (r: readonly Regelsatz[]) => r.map((x) => genau(x.latein));

describe('Regeln: aus dem Lehrbuch', () => {
  it('jede Regel hat Kapitel, einen wörtlichen Erklärsatz und Beispiele aus ihrem Abschnitt', () => {
    const absaetze = grammatik.seiten.flatMap((s) =>
      s.bloecke.flatMap((b) => (b.art === 'absatz' ? [b.teile.filter((t) => !t.syr).map((t) => t.text).join('').replace(/\s+/g, ' ')] : [])),
    );
    const imWoerterbuch = new Set(wb.funde);
    for (const r of alleRegeln(wb)) {
      expect(r.kapitel, r.id).toMatch(/^Grammatik \d+[a-z]/);
      expect(r.zitat.length, r.id).toBeGreaterThan(0);
      // Wörtlich – nur ohne syrische Schrift und die Striche, die sie im Lehrbuch einrahmen („|u ܐܘ|“)
      const ohneStriche = (a: string) => a.replace(/\|\s*([^|]*?)\s*\|/g, '$1').replace(/\s+/g, ' ').replace(/\s+([,.:])/g, '$1');
      for (const z of r.zitat) expect(absaetze.some((a) => ohneStriche(a).includes(z)), `${r.id}: ${z}`).toBe(true);
      expect(r.belege.length, r.id).toBeGreaterThan(0);
      for (const b of r.belege) expect(imWoerterbuch.has(b), r.id).toBe(true);
    }
  });

  it('nimmt nur Wörter aus den Daten (Artikel „a + Anfangsbuchstabe“ und Stämme ohne Endung wie im Lehrbuch)', () => {
    const alle = [...probe.proben.flatMap((p) => p.gebaut), ...['ich bin müde', 'unser Haus', 'in der Schule', 'du hast einen Hund', 'ich schlafe'].flatMap((a) => saetze(a))];
    expect(alle.length).toBeGreaterThan(50);
    for (const r of alle) {
      for (const s of r.stuecke) {
        if (s.aus) {
          for (const t of s.aus) expect(t.fund, r.latein).toBeDefined();
          continue;
        }
        const aK = s.rolle === 'Artikel' && s.fund?.latein === 'aK';
        // Ein Wort aus den Daten – oder eine der Formen, die sein Eintrag nennt („kit ~ kito“)
        const imEintrag = !!s.fund && genau(s.fund.latein.replace(/~/g, ' ')).split(' ').includes(klein(s.text));
        expect(aK || imEintrag || datenWort(wb, klein(s.text)), `${r.latein}: ${s.text}`).toBe(true);
      }
    }
  });
});

describe('Regeln: Gegenprobe', () => {
  it('schaltet nur Regeln ein, die einen Beleg genau treffen und nie danebenliegen', () => {
    // Stand 22.11.2026: 10 von 11 Regeln; „Das ist …“ (Demonstrativ) hat keinen baubaren Beleg.
    expect(an.size).toBeGreaterThanOrEqual(10);
    for (const id of an) {
      const s = probe.regeln.get(id)!;
      expect(s.belegeGetroffen, id).toBeGreaterThanOrEqual(1);
      expect(s.daneben, id).toBe(0);
    }
    expect(an.has('demonstrativ')).toBe(false);
  });

  it('liegt bei keinem vergleichbaren Lehrbuch-Satz daneben', () => {
    const mitRegeln = probe.proben.filter((p) => p.gebaut.some((r) => r.regeln.every((x) => an.has(x.regel))));
    // Stand 22.11.2026: gut 100 Sätze gebaut, davon über 90 genau getroffen, der Rest nicht vergleichbar.
    expect(mitRegeln.filter((p) => p.getroffen).length).toBeGreaterThanOrEqual(90);
    for (const p of mitRegeln) if (p.vergleichbar) expect(p.getroffen, `${p.fund.latein} – ${p.fund.deutsch}`).toBe(true);
  });

  it('kennt den Satz selbst nicht – auch nicht als Wort', () => {
    for (const p of probe.proben) {
      for (const r of p.gebaut) {
        for (const s of r.stuecke) {
          expect(s.fund, p.fund.id).not.toBe(p.fund);
          for (const t of s.aus ?? []) expect(t.fund, p.fund.id).not.toBe(p.fund);
        }
      }
    }
  });
});

describe('Regeln: Sätze', () => {
  it('Kopula: „ich bin müde“ – Adjektiv wie der Sprecher, dahinter die Kopula; ohne Angabe für Junge und Mädchen', () => {
    const r = saetze('ich bin müde');
    const kopula = hilfs('sein', 'Gegenwart, Sg., 1.');
    expect(lateins(r).sort()).toEqual([`${adjektiv('m.Sg.')} ${kopula}`, `${adjektiv('f.Sg.')} ${kopula}`].sort());
    expect(r.map((x) => x.variante).sort()).toEqual(['als Junge', 'als Mädchen']);
    expect(lateins(saetze('Ich bin müde.', { ich: 'f' }))).toEqual([`${adjektiv('f.Sg.')} ${kopula}`]);
    expect(lateins(saetze('wir sind müde'))).toEqual([`${adjektiv('Pl.')} ${hilfs('sein', 'Gegenwart, Pl., 1.')}`]);
    expect(lateins(saetze('er war müde'))).toEqual([`${adjektiv('m.Sg.')} ${hilfs('sein', 'Vergangenheit, Sg., 3.')}`]);
  });

  it('Kopula verneint: latno vorn (Grammatik 9c)', () => {
    const latno = form('1.9.2', 'ich bin nicht');
    expect(lateins(saetze('ich bin nicht müde', { ich: 'm' }))).toEqual([`${latno} ${adjektiv('m.Sg.')}`]);
    // Verneint in der Vergangenheit zeigt das Lehrbuch nicht.
    expect(saetze('er war nicht müde')).toEqual([]);
  });

  it('„du“: beide Formen, wenn sie sich unterscheiden – sonst eine', () => {
    const r = saetze('du bist müde');
    expect(r.map((x) => x.variante).sort()).toEqual(['zu einem Jungen', 'zu einem Mädchen']);
    expect(r.every((x) => !x.ich)).toBe(true);
    const lehrer = saetze('du bist Lehrer');
    expect(lehrer).toHaveLength(1);
    expect(lehrer[0].variante).toBeUndefined();
  });

  it('Substantiv als Subjekt: „die Schule ist groß“ = Artikel + Substantiv + Adjektiv + Kopula (Grammatik 11a)', () => {
    const gross = form('1.11.2', 'groß', 'f.Sg.');
    expect(lateins(saetze('die Schule ist groß'))).toEqual([`${artikel('Sg., f.')} ${wortschatz('Schule')} ${gross} ${hilfs('sein', 'Gegenwart, Sg., 3.')}`]);
  });

  it('Futur und Präsens: gëd bzw. ko- + Grundform aus der Verbtabelle', () => {
    expect(lateins(saetze('ich werde schlafen', { ich: 'f' }))).toEqual([`${kleinwort('Futurmarker')} ${verb('schlafen', 'Präsens, Sg., 1. f.')}`]);
    expect(lateins(saetze('ich schlafe', { ich: 'm' }))).toEqual([`${kleinwort('Präsensmarker')}${verb('schlafen', 'Präsens, Sg., 1. m.')}`]);
    // Vor Vokal nennt das Lehrbuch keine Form des Präsensmarkers.
    expect(saetze('ich esse')).toEqual([]);
  });

  it('„haben“: Form nach Person, bei „du“ für Junge und Mädchen (Grammatik 9b)', () => {
    const hund = wortschatz('Hund');
    expect(lateins(saetze('du hast einen Hund')).sort()).toEqual(
      [`${hilfs('haben', 'Gegenwart, Sg., 2. m.')} ${hund}`, `${hilfs('haben', 'Gegenwart, Sg., 2. f.')} ${hund}`].sort(),
    );
    expect(lateins(saetze('ich habe keinen Hund'))).toEqual([`${hilfs('nicht haben', 'Gegenwart, Sg., 1.')} ${hund}`]);
  });

  it('„es gibt nicht“: die kurze Form, wie im Beispiel „layt qëṭro“ (Grammatik 9a)', () => {
    const paar = wb.funde.find((f) => /~/.test(f.latein) && f.deutsch === 'es gibt nicht')!;
    const buecher = form('1.6.2', 'Buch', 'Plural');
    expect(lateins(saetze('es gibt keine Bücher'))).toEqual([`${klein(paar.latein.split(/\s*~\s*/)[0])} ${buecher}`]);
  });
});

describe('Regeln: Wortgruppen', () => {
  it('Possessiv: Artikel + Substantiv ohne Endung + Suffix der allgemeinen Reihe (Grammatik 5a)', () => {
    const haus = wortschatz('Haus');
    expect(lateins(saetze('unser Haus'))).toEqual([`${artikel('Sg., m.')} ${haus.slice(0, -1)}${suffix('Plural, 1. Person')}`]);
    // „ihr“ ist „von ihr“ oder „von ihnen“
    expect(saetze('ihr Haus').map((r) => r.variante).sort()).toEqual(['„ihr“ = von ihnen', '„ihr“ = von ihr']);
  });

  it('Possessiv nicht bei Verwandtschaft und Körperteilen (eingeschränkte Reihe) und nicht bei weiblichen Wörtern auf -to', () => {
    expect(saetze('ihr Herz')).toEqual([]); // „leba – ihr Herz“
    expect(saetze('mein Name', { ohne: wb.funde.find((f) => f.deutsch === 'mein Name') })).toEqual([]); // Ausnahme „ëšmo“
    expect(saetze('meine Schule')).toEqual([]); // i qrayayḏe, aber i aṯtayḏi
  });

  it('Zahl: Geschlecht wie das Gezählte, ab zwei die Mehrzahl (Grammatik 8b)', () => {
    expect(lateins(saetze('zwei Brüder'))).toEqual([`${zahl('2', 'Maskulin')} ${form('1.6.2', 'Bruder', 'Plural')}`]);
  });

  it('Präposition mit Artikel: „in der Schule“ = b + i (Grammatik 11b)', () => {
    const b = klein(wb.funde.find((f) => f.deutsch === 'in' && f.latein.length === 1)!.latein);
    expect(lateins(saetze('in der Schule'))).toEqual([`${b}${artikel('Sg., f.')} ${wortschatz('Schule')}`]);
    // „zum Schluss“ heißt im Lehrbuch „bi ḥarayto“ – „zu“ zeigt Grammatik 11b nicht.
    expect(saetze('zum Schluss')).toEqual([]);
  });

  it('„Das ist …“ bleibt aus, solange kein Beispiel des Lehrbuchs gebaut werden kann', () => {
    expect(saetze('das ist ein Haus')).toEqual([]);
    const mit = saetze('das ist ein Haus', { regeln: new Set<RegelId>([...an, 'demonstrativ']) });
    expect(genau(mit[0]?.latein ?? '').split(' ')[0]).toBe(form('1.5.3', 'dieser', 'Für die Nähe'));
  });

  it('lieber nichts als Unsinn', () => {
    for (const a of ['die Lehrer', 'niederländische Schüler', 'es ist kalt', 'ich esse Brot', 'sie wird nach Hause gehen', 'Ich bin', 'der']) {
      expect(saetze(a).map((r) => r.latein), a).toEqual([]);
    }
  });

  it('Geprüftes geht vor: was im Lehrbuch steht, setzt der Übersetzer nicht zusammen', () => {
    for (const a of ['dein Lehrer', 'im Haus', 'er schläft', 'der Bruder ist groß']) expect(stehtSchonDa(wb, a), a).toBe(true);
  });
});

describe('Regeln: nur im Übersetzer', () => {
  it('„Ich bin: Junge / Mädchen“ bleibt beim Laden erhalten, Unsinn fällt weg', () => {
    expect(aufbereiten({ verlauf: [], anfragen: [], ich: 'f' }).ich).toBe('f');
    expect(aufbereiten({ verlauf: [], anfragen: [], ich: 'x' }).ich).toBeUndefined();
    expect(aufbereiten({ verlauf: ['a'], anfragen: [] }).ich).toBeUndefined();
  });

  it('wird nur vom Übersetzer benutzt', () => {
    const quellen = import.meta.glob(['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const nutzer = Object.entries(quellen)
      .filter(([, code]) => /from '\.\.?\/(?:lib\/)?regeln'/.test(code))
      .map(([datei]) => datei)
      .sort();
    expect(nutzer).toEqual(['../components/Zusammengesetzt.tsx', '../screens/Woerterbuch.tsx']);
  });
});
