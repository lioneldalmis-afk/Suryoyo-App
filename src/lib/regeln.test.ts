// Baukasten, Teil 2 (Fahrplan, Phase 4b, Schritt 5): Regeln aus der Grammatik.
// Geprüft wird an den echten Daten. Erwartete Surayt-Formen stehen hier nicht von
// Hand, sondern werden aus den Tabellen des Lehrbuchs gelesen.

import { describe, expect, it } from 'vitest';
import glossarJson from '../data/glossar-a.json';
import grammatikJson from '../data/grammatik.json';
import grossJson from '../data/glossar.json';
import { alleLektionen } from '../data';
import type { Glossar, Grammatik, GrammatikEintrag, GrossesGlossar } from '../types';
import { woerter, zerlege } from './text';
import { baueWoerterbuch } from './woerterbuch';
import { stehtSchonDa } from './baukasten';
import { aufbereiten } from './nachschlagen';
import { alleRegeln, datenWort, eingeschalteteRegeln, nachRegeln, regelGegenprobe, verbMusterProbe, type RegelId, type Regelsatz } from './regeln';

const grammatik = grammatikJson as unknown as Grammatik;
const wb = baueWoerterbuch(alleLektionen, glossarJson as Glossar, grammatik, grossJson as unknown as GrossesGlossar);
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
      // „Zwei Sätze mit „und““ trägt ein Wort aus dem Glossar („w (conj.) – und“), keine Grammatik-Seite
      if (/^(Glossar|Wortschatz Lektion \d+): /.test(r.kapitel)) {
        expect(r.kapitel, r.id).toMatch(/^(Glossar|Wortschatz Lektion \d+): \S/);
        expect(r.belege.length, r.id).toBeGreaterThan(0);
        continue;
      }
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
        // Eine Wendung oder ein Fragewort aus den Daten („bu bayto – im Haus“, „m ema – seit wann?“) steht als Ganzes da
        const wendung = !!s.fund && genau(s.fund.latein) === genau(s.text);
        expect(aK || imEintrag || wendung || datenWort(wb, klein(s.text)), `${r.latein}: ${s.text}`).toBe(true);
      }
    }
  });
});

describe('Regeln: Gegenprobe', () => {
  it('schaltet nur Regeln ein, die einen Beleg genau treffen und nie danebenliegen', () => {
    // Stand 23.11.2026 (Schritt 7c): 25 von 29 Regeln. „Das ist …“ (Demonstrativ), der Vorschlag
    // („Wollen wir …?“ mit Subjunktiv), ṭro und „weil“ haben keinen Beleg, den der Baukasten bauen kann.
    expect(an.size).toBeGreaterThanOrEqual(25);
    for (const id of an) {
      const s = probe.regeln.get(id)!;
      expect(s.belegeGetroffen, id).toBeGreaterThanOrEqual(1);
      expect(s.daneben, id).toBe(0);
    }
    expect(an.has('demonstrativ')).toBe(false);
    for (const id of ['modal', 'verneinung', 'frage', 'janein', 'adverb', 'verbalsatz', 'und', 'muster', 'possessiv2', 'praeposition2', 'praepsuffix', 'praeteritum', 'muster2', 'objektsuffix', 'subjunktiv'] as RegelId[]) expect(an.has(id), id).toBe(true);
  });

  it('liegt bei keinem vergleichbaren Lehrbuch-Satz daneben', () => {
    const mitRegeln = probe.proben.filter((p) => p.gebaut.some((r) => r.regeln.every((x) => an.has(x.regel))));
    // Stand 23.11.2026: gut 550 Sätze gebaut, davon über 420 genau getroffen, der Rest nicht vergleichbar.
    expect(mitRegeln.filter((p) => p.getroffen).length).toBeGreaterThanOrEqual(420);
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
    // Vor Vokal verschmilzt ko- zu k- (Grammatik 17a: „ko + oxal = koxal „er isst““)
    const koxal = form('2.1.3', 'er isst');
    const k = koxal.slice(0, koxal.length - form('4.5', 'essen', 'Präsensbasis, Sg., 3. m.').length);
    expect(lateins(saetze('er isst'))).toEqual([koxal]);
    expect(lateins(saetze('ich esse', { ich: 'm' }))).toEqual([`${k}${form('4.5', 'essen', 'Präsensbasis, Sg., 1. m.')}`]);
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

  it('Verwandtschaft und Körperteile: eingeschränkte Reihe ohne Artikel (Grammatik 5a.2); nicht bei weiblichen Wörtern auf -to', () => {
    // Die Endungen stehen im Lehrbuch an ëšmo „Name“: ëšmi „mein Name“, ëšma „ihr Name“
    const name = form('1.5.3', 'Name');
    const endung = (deutsch: string, merkmal: string) => form('Pronomina', deutsch, merkmal).slice(name.length - 1);
    const ohneEndung = (w: string) => w.slice(0, -1);
    expect(lateins(saetze('meine Mutter'))).toEqual([`${ohneEndung(wortschatz('Mutter'))}${endung('mein Name', '1. sg.')}`]);
    expect(lateins(saetze('ihr Herz'))).toContain(`${ohneEndung(wortschatz('Herz'))}${endung('ihr (sg.) Name', '3. sg., f.')}`); // wie „leba – ihr Herz“
    expect(saetze('meine Mutter')[0].regeln.map((r) => r.regel)).toEqual(['possessiv2']);
    expect(saetze('meine Schule')).toEqual([]); // i qrayayḏe, aber i aṯtayḏi
  });

  it('Zahl: Geschlecht wie das Gezählte, ab zwei die Mehrzahl (Grammatik 8b)', () => {
    expect(lateins(saetze('zwei Brüder'))).toEqual([`${zahl('2', 'Maskulin')} ${form('1.6.2', 'Bruder', 'Plural')}`]);
  });

  it('Präposition mit Artikel: „in der Schule“ = b + i (Grammatik 11b)', () => {
    const b = klein(wb.funde.find((f) => f.deutsch === 'in' && f.latein.length === 1)!.latein);
    expect(lateins(saetze('in der Schule'))).toEqual([`${b}${artikel('Sg., f.')} ${wortschatz('Schule')}`]);
    // „zum Schluss“ heißt im Lehrbuch „bi ḥarayto“ – eine Wendung der Daten geht der Regel vor.
    expect(saetze('zum Schluss')).toEqual([]);
  });

  it('„Das ist …“ bleibt aus, solange kein Beispiel des Lehrbuchs gebaut werden kann', () => {
    expect(saetze('das ist ein Haus')).toEqual([]);
    const mit = saetze('das ist ein Haus', { regeln: new Set<RegelId>([...an, 'demonstrativ']) });
    expect(genau(mit[0]?.latein ?? '').split(' ')[0]).toBe(form('1.5.3', 'dieser', 'Für die Nähe'));
  });

  it('lieber nichts als Unsinn', () => {
    // Zahl unklar, „es“, kein Satz, „wollen“ ohne Verb und ohne Ding, Stellung des Subjekts in der Frage unklar
    // („I hawa aydarbo yo?“, aber „Ayna yo aḥunax?“), abgetrennte Vorsilbe eines unbekannten Verbs, „sie“ als Objekt
    for (const a of ['die Lehrer', 'niederländische Schüler', 'es ist kalt', 'Ich bin', 'der', 'ich will nach Hause', 'Wie ist das Wetter?', 'Wann kommt der Lehrer?', 'sie singt uns die Lieder vor', 'ich sehe sie']) {
      expect(saetze(a).map((r) => r.latein), a).toEqual([]);
    }
  });

  it('Geprüftes geht vor: was im Lehrbuch steht, setzt der Übersetzer nicht zusammen', () => {
    for (const a of ['dein Lehrer', 'im Haus', 'er schläft', 'der Bruder ist groß']) expect(stehtSchonDa(wb, a), a).toBe(true);
  });
});

describe('Regeln: ganze Sätze (Grammatik 17–24)', () => {
  const gross = grossJson as unknown as GrossesGlossar;
  const g18 = (deutsch: string) => form('2.2.3', deutsch);
  const kommen = (merkmal: string) => form('4.5', 'kommen', `Präsensbasis, ${merkmal}`);
  const l = klein(wb.funde.find((f) => f.deutsch === 'für, zu' && f.latein.length === 1)!.latein);
  const b = klein(wb.funde.find((f) => f.deutsch === 'in' && f.latein.length === 1)!.latein);
  const k = (() => {
    const koxal = form('2.1.3', 'er isst');
    return koxal.slice(0, koxal.length - form('4.5', 'essen', 'Präsensbasis, Sg., 3. m.').length);
  })();
  const ohneFrage = (r: readonly Regelsatz[]) => lateins(r).map((x) => x.replace(/\?$/, ''));

  it('„Wollen wir Fußball spielen?“: wollen (mit k-) + Subjunktiv + Objekt, Fragezeichen (Grammatik 17a, 20c, 24a)', () => {
    const fussball = genau(wb.funde.find((f) => f.herkunft === 'wortschatz' && f.deutsch === 'Fußball')!.latein).split(' ');
    const r = saetze('Wollen wir Fußball spielen?');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].latein.endsWith('?')).toBe(true);
    const [wollen, spielen, ball] = genau(r[0].latein).split(' ');
    expect(wollen).toBe(`${k}${form('2.2.3', 'wollen', 'Präsensbasis, Pl., 1.')}`);
    expect(spielen).toBe(verb('spielen', 'Präsens, Pl., 1.'));
    expect(fussball).toContain(ball);
    expect(r[0].regeln.map((x) => x.regel)).toEqual(expect.arrayContaining(['janein', 'modal']));
  });

  it('„Kommst du morgen in die Kirche?“: Futur wegen „morgen“, Adverb, l + i, für Junge und Mädchen', () => {
    const r = saetze('Kommst du morgen in die Kirche?');
    const rest = `${g18('morgen')} ${l}${artikel('Sg., f.')} ${wortschatz('Kirche')}`;
    expect(ohneFrage(r).sort()).toEqual([`${kleinwort('Futurmarker')} ${kommen('Sg., 2. m.')} ${rest}`, `${kleinwort('Futurmarker')} ${kommen('Sg., 2. f.')} ${rest}`].sort());
    expect(r.map((x) => x.variante).sort()).toEqual(['zu einem Jungen', 'zu einem Mädchen']);
  });

  it('„Ich habe heute einen langen Tag in der Schule.“: haben + Zeitangabe + Objekt mit Adjektiv + Ort', () => {
    const lang = genau(gross.eintraege.find((e) => e.sinne[0]?.deutsch === 'lang')!.latein.split(',')[0]);
    expect(lateins(saetze('Ich habe heute einen langen Tag in der Schule.'))).toEqual([
      `${hilfs('haben', 'Gegenwart, Sg., 1.')} ${g18('heute')} ${wortschatz('Tag')} ${lang} ${b}${artikel('Sg., f.')} ${wortschatz('Schule')}`,
    ]);
  });

  it('„Ich bin krank und kann nicht kommen.“: zwei Sätze mit w, das Subjekt gilt für beide, layb- „nicht können“', () => {
    const r = saetze('Ich bin krank und kann nicht kommen.', { ich: 'm' });
    expect(lateins(r)).toEqual([
      `${wortschatz('krank (m.Sg.)')} ${hilfs('sein', 'Gegenwart, Sg., 1.')} ${wortschatz('und')} ${hilfs('nicht können', 'Gegenwart, Sg., 1.')} ${kommen('Sg., 1. m.')}`,
    ]);
    // Ohne Angabe: Junge und Mädchen, nie gemischt
    expect(saetze('Ich bin krank und kann nicht kommen.').map((x) => x.variante).sort()).toEqual(['als Junge', 'als Mädchen']);
  });

  it('„möchte“ wie „wollen“ – und sagt es dazu', () => {
    const moechte = saetze('Ich möchte essen.', { ich: 'f' });
    expect(lateins(moechte)).toEqual(lateins(saetze('Ich will essen.', { ich: 'f' })));
    expect(moechte[0].hinweise?.join(' ')).toMatch(/„möchte“ wie „wollen“/);
    // „Möchtest du Wasser?“: wollen als Vollverb mit Objekt
    expect(saetze('Möchtest du Wasser?').length).toBeGreaterThan(0);
  });

  it('Fragen: Fragewort vorn, Kopula direkt danach – wie im Lehrbuch (Grammatik 24a)', () => {
    for (const [de, sur] of [
      ['Was machst du?', 'Mën kosaymat?'],
      ['Wer bist du?', 'Man hat?'],
    ]) {
      const f = wb.funde.find((x) => x.latein === sur && x.deutsch === de)!;
      expect(lateins(saetze(de, { ohne: f })), de).toContain(genau(f.latein));
    }
  });

  it('Verneinung und zwei Subjekte: „Saro und Aday wollen kein Haus kaufen.“ wie in Grammatik 22c', () => {
    const f = wb.funde.find((x) => x.deutsch === 'Saro und Aday wollen kein Haus kaufen.')!;
    expect(lateins(saetze(f.deutsch, { ohne: f }))).toContain(genau(f.latein));
    // Verneintes Futur: lo + Präsens (Grammatik 22d)
    const lo = wortschatz('nein, nicht');
    expect(lateins(saetze('ich werde nicht schlafen', { ich: 'm' }))).toEqual([`${lo} ${kleinwort('Präsensmarker')}${verb('schlafen', 'Präsens, Sg., 1. m.')}`]);
  });

  it('Verben nach dem Muster der Verbtabellen: geprüft an jeder vollständigen Tabelle', () => {
    const probe = verbMusterProbe(wb);
    // Regelmäßige Verben im I. Stamm: jede Person bei jedem Verb getroffen
    const stammI = probe.filter((x) => x.art === 'konsonant' && x.stamm === 'I');
    expect(stammI.length).toBe(7);
    for (const x of stammI) expect(x.getroffen, x.person).toBe(x.verben);
    expect(stammI[0].verben).toBeGreaterThanOrEqual(10);
    // „ich lerne“: yolaf steht nur im Glossar (er/sie) – die Form für „ich“ nach dem Muster, mit Regel
    const r = saetze('ich lerne', { ich: 'm' });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].regeln.map((x) => x.regel)).toContain('muster');
    const teile = r[0].stuecke[0].aus!;
    expect(teile.some((t) => /Endung wie in/.test(t.rolle))).toBe(true);
  });

  it('sinngemäß: gleichbedeutende Wörter, „zu Hause“, Füllwörter – immer mit Hinweis', () => {
    const kumpel = saetze('Mein Kumpel kommt morgen.');
    expect(kumpel.length).toBeGreaterThan(0);
    expect(kumpel[0].hinweise?.join(' ')).toMatch(/„Kumpel“ wie „Freund“/);
    const haus = wortschatz('Haus');
    expect(lateins(saetze('Er ist nicht zu Hause.'))).toEqual([`${form('1.9.2', 'er ist nicht')} ${b}${artikel('Sg., m.')} ${haus}`]);
    const mal = saetze('Kommst du mal morgen?');
    expect(lateins(mal)).toEqual(lateins(saetze('Kommst du morgen?')));
    expect(mal[0].hinweise?.join(' ')).toMatch(/„mal“ weggelassen/);
  });
});

describe('Regeln: weniger Lücken (Phase 4b, Schritt 7c)', () => {
  const finde = (deutsch: string) => probe.proben.find((p) => p.fund.deutsch === deutsch);

  it('„Mir geht es gut“ wie „ich bin gut“ – so übersetzt das Lehrbuch „uns geht es gut“, „mir geht es nicht gut“', () => {
    const r = saetze('Mir geht es gut', { ich: 'm' });
    expect(r.length).toBeGreaterThan(0);
    expect(lateins(r)).toEqual(lateins(saetze('ich bin gut', { ich: 'm' })));
    expect(r[0].hinweise?.join(' ')).toMatch(/wie „ich bin gut“ – so übersetzt es das Lehrbuch/);
    expect(lateins(saetze('Es geht mir gut', { ich: 'm' }))).toEqual(lateins(r));
    expect(lateins(saetze('Mir geht’s gut', { ich: 'm' }))).toEqual(lateins(r));
    expect(lateins(saetze('Geht es dir gut?')).length).toBe(lateins(saetze('Bist du gut?')).length);
    // In der Gegenprobe genau getroffen (ohne den Eintrag selbst zu kennen)
    for (const d of ['mir geht es nicht gut', 'wie geht es dir?', 'wie geht es euch?']) expect(finde(d)?.getroffen, d).toBe(true);
  });

  it('„zur Schule“ wie „in die Schule“ (l + Artikel, wie „këzzën li madrašto – gehen zur Schule“)', () => {
    const zur = lateins(saetze('Ich gehe zur Schule'));
    expect(zur.length).toBeGreaterThan(0);
    expect(zur).toEqual(lateins(saetze('Ich gehe in die Schule')));
    expect(finde('Wie gehst du (m.) zur Schule?')?.getroffen).toBe(true);
  });

  it('Namen aus der Eingabe und „sich treffen mit“ = „treffen“ + b (wie „laqën b – sie trafen (jdn.)“)', () => {
    const b = genau(wb.funde.find((f) => f.deutsch === 'sie trafen (jdn.)')!.latein).split(' ')[1];
    const adam = saetze('Ich treffe mich mit Adam', { ich: 'm' });
    expect(adam.length).toBeGreaterThan(0);
    expect(lateins(adam).every((l) => l.endsWith(`${b} adam`))).toBe(true);
    expect(adam[0].hinweise?.join(' ')).toMatch(/„Adam“ als Name übernommen/);
    expect(adam[0].hinweise?.join(' ')).toMatch(/„sich treffen mit“ wie „treffen“/);
    expect(saetze('Ich treffe mich mit einem Freund', { ich: 'm' }).length).toBeGreaterThan(0);
    // „Koloqe bi Saro w u Aday.“ (Lektion 3) – Name mit Artikel, wenn das Lehrbuch das Geschlecht zeigt
    const einleitung = wb.funde.find((f) => f.id === 'L03-E-01')!.latein.split('. ')[1];
    expect(lateins(saetze('Er trifft Saro und Aday'))).toEqual([genau(einleitung)]);
    // Unbekanntes Geschlecht: beide Formen
    expect(saetze('Adam kommt').map((r) => r.variante).sort()).toEqual(['wenn Adam ein Junge ist', 'wenn Adam ein Mädchen ist']);
  });

  it('Präpositionen für sich und mit Suffix (Grammatik 11b)', () => {
    const hinter = wb.funde.find((f) => f.deutsch === 'hinter dem Haus')!;
    expect(lateins(saetze('hinter dem Haus', { ohne: hinter }))).toContain(genau(hinter.latein));
    // „mit dir“: die Formen aus der Tabelle „Präpositionen mit Pronominalsuffixen“
    const tabelle = JSON.stringify(grammatik.seiten.find((x) => x.id === '1.11.2')!.bloecke);
    const dir = saetze('mit dir');
    expect(dir.map((r) => r.variante).sort()).toEqual(['zu einem Jungen', 'zu einem Mädchen']);
    for (const l of lateins(dir)) expect(tabelle.includes(`"${l}"`), l).toBe(true);
    expect(an.has('praeposition2') && an.has('praepsuffix')).toBe(true);
  });

  it('Vergangenheit: Perfekt und Präteritum = Präteritum aus der Verbtabelle (Grammatik 8a), lo + Vokal = l- (22e)', () => {
    expect(lateins(saetze('ich habe gespielt'))).toContain(verb('spielen', 'Präteritum, Sg., 1. m.'));
    expect(lateins(saetze('ich spielte'))).toEqual(lateins(saetze('ich habe gespielt')));
    expect(lateins(saetze('er ist gekommen'))).toEqual([verb('kommen', 'Präteritum, Sg., 3. m.')]);
    const nicht = saetze('er kam nicht')[0];
    const lo = genau(nicht.stuecke[0].aus![0].fund.latein);
    expect(genau(nicht.latein)).toBe(`${lo.replace(/[aeiouëä]+$/, '')}${verb('kommen', 'Präteritum, Sg., 3. m.')}`);
    expect(finde('er kam nicht')?.getroffen).toBe(true);
    expect(finde('ich legte ein Buch auf den Tisch')?.getroffen).toBe(true);
    expect(an.has('praeteritum') && an.has('muster2')).toBe(true);
  });

  it('Pronomen als Objekt: L-Suffix an der Verbform (Formentabelle 4.9, Grammatik 22a)', () => {
    const ko = kleinwort('Präsensmarker');
    const tafel = (merkmal: string) => form('Verben mit Objektsuffixen', 'sehen', merkmal);
    expect(lateins(saetze('Ich sehe dich', { ich: 'm' })).sort()).toEqual(
      [`${ko}${tafel('Subjekt 1. m. sg., Objekt 2. m. sg.')}`, `${ko}${tafel('Subjekt 1. m. sg., Objekt 2. f. sg.')}`].sort(),
    );
    for (const d of ['er gibt mir das Buch', 'ich liebe ihn', 'Kannst du uns die Rechnung geben?']) expect(finde(d)?.getroffen, d).toBe(true);
    expect(an.has('objektsuffix')).toBe(true);
  });

  it('trennbare Verben: „Kommst du mit?“, „Ich stehe auf“, „Ich bin mitgekommen“', () => {
    const mit = saetze('Kommst du mit?');
    expect(lateins(mit)).toEqual(lateins(saetze('Kommst du?')));
    expect(mit[0].hinweise?.join(' ')).toMatch(/„mitkommen“ wie „kommen“/);
    const auf = saetze('Ich stehe auf', { ich: 'm' });
    expect(auf.length).toBeGreaterThan(0);
    expect(auf[0].stuecke[0].aus?.some((t) => /aufstehen/.test(t.fund.deutsch))).toBe(true);
    expect(saetze('Ich bin mitgekommen', { ich: 'f' }).length).toBeGreaterThan(0);
  });

  it('„meine Mutter“: eingeschränkte Reihe – auch als Subjekt und nach einer Präposition', () => {
    const emi = lateins(saetze('meine Mutter'))[0];
    expect(lateins(saetze('Meine Mutter ist müde'))[0]?.startsWith(`${emi} `)).toBe(true);
    expect(lateins(saetze('Ich spiele mit meiner Mutter', { ich: 'm' })).every((l) => l.endsWith(` ${emi}`))).toBe(true);
    expect(finde('sie ist meine Schwester')?.getroffen).toBe(true);
    expect(an.has('possessiv2')).toBe(true);
  });

  it('Nebensatz mit „dass“ nach „wollen“: d + Subjunktiv (Grammatik 23d); „weil“ bleibt aus, solange kein Beleg sich bauen lässt', () => {
    const kinder = wb.funde.find((f) => f.deutsch === 'Die Kinder wollen, dass wir ein neues Auto kaufen.')!;
    expect(lateins(saetze(kinder.deutsch))).toContain(genau(kinder.latein));
    expect(an.has('subjunktiv')).toBe(true);
    expect(an.has('nebensatz')).toBe(false);
    expect(saetze('Ich komme nicht, weil ich krank bin')).toEqual([]);
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
