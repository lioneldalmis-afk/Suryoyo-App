// Grammatik, Verb- und Formentabellen (Fahrplan, Phase 4b, Schritt 2):
// Ist alles da, und steht jeder Eintrag wörtlich so auf der Seite, aus der er stammt?

import { describe, expect, it } from 'vitest';
import grammatikJson from '../data/grammatik.json';
import type { Grammatik, GrammatikBlock, GrammatikEintrag, GrammatikSeite } from '../types';

const grammatik = grammatikJson as unknown as Grammatik;
const alle = grammatik.seiten.flatMap((s) => s.eintraege.map((e) => ({ seite: s, e })));
const seite = (id: string) => grammatik.seiten.find((s) => s.id === id)!;
const finde = (id: string, latein: string) => seite(id).eintraege.find((e) => e.latein === latein);

/** Alle Texte eines Blocks: jeder Zellenteil bzw. der ganze Absatz. */
function texte(b: GrammatikBlock): string[] {
  if (b.art === 'titel') return [b.text];
  if (b.art === 'absatz') return [b.teile.map((t) => t.text).join('')];
  // „Haw/law kocawdo adyawma.“ steht in einer Zelle als „Haw“, „/“, „law kocawdo adyawma.“ (zwei Aufnahmen).
  return b.zeilen.flat().flatMap((z) => [...z.teile.map((t) => t.text), z.teile.map((t) => t.text).join(' '), z.teile.map((t) => t.text).join('')]);
}
const aufnahmen = (b: GrammatikBlock) => (b.art === 'tabelle' ? b.zeilen.flat().flatMap((z) => z.teile.map((t) => t.audio)) : []);
const seitenText = (s: GrammatikSeite) => s.bloecke.flatMap(texte).join('\n');
const ganzerText = grammatik.seiten.map(seitenText).join('\n');

describe('Grammatik: Seiten', () => {
  it('enthält die Grammatik der Lektionen 3–24 (Level A und B), die Verbkonjugation und alle Formentabellen', () => {
    const lektionen = grammatik.seiten.filter((s) => s.art === 'grammatik').map((s) => s.lektion);
    expect(lektionen).toEqual(Array.from({ length: 22 }, (_, i) => i + 3));
    // Level B steht unter Kapitel 2.1–2.8 („Grammatik 17“ … „Grammatik 24“)
    for (const s of grammatik.seiten.filter((x) => (x.lektion ?? 0) > 16)) expect(s.id).toBe(`2.${s.lektion! - 16}.3`);
    expect(grammatik.seiten.filter((s) => s.art === 'verben').map((s) => s.id)).toEqual(['1.17']);
    expect(grammatik.seiten.filter((s) => s.art === 'formen').map((s) => s.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `4.${i + 1}`),
    );
    for (const s of grammatik.seiten) {
      expect(s.url, s.id).toBe(`${grammatik.quelle.url}${s.id}`);
      expect(s.bloecke.some((b) => b.art === 'tabelle'), s.id).toBe(true);
    }
    expect(grammatik.seiten.reduce((n, s) => n + s.bloecke.filter((b) => b.art === 'tabelle').length, 0)).toBeGreaterThan(250);
  });

  it('übernimmt keine Volksgruppen-Bezeichnungen in die Erklärtexte', () => {
    // Die Entscheidung dazu ist noch offen (Fahrplan, Abschnitt 7). Beispielsätze in
    // den Tabellen bleiben wörtlich, wie die Sätze der Lektionen.
    for (const s of grammatik.seiten) {
      for (const b of s.bloecke) if (b.art !== 'tabelle') expect(texte(b).join(' '), s.id).not.toMatch(/aramä|assyr/i);
    }
  });

  it('trennt Umschrift und syrische Schrift', () => {
    for (const s of grammatik.seiten) {
      for (const b of s.bloecke) {
        if (b.art !== 'absatz') continue;
        for (const t of b.teile) {
          if (t.syr) expect(t.text, s.id).not.toMatch(/[A-Za-z]/);
          else expect(t.text, s.id).not.toMatch(/[\u{700}-\u{74F}]/u);
        }
      }
    }
  });
});

describe('Grammatik: Einträge', () => {
  it('sind zahlreich, viele mit Aufnahme', () => {
    expect(alle.length).toBeGreaterThan(3000);
    expect(alle.filter(({ e }) => e.audio).length).toBeGreaterThan(500);
    expect(new Set(alle.map(({ e }) => e.id)).size).toBe(alle.length);
  });

  it('stehen wörtlich in ihrem Block: Umschrift, Schrift, Aufnahme und Beschriftung', () => {
    for (const { seite: s, e } of alle) {
      const b = s.bloecke[e.block];
      expect(b, e.id).toBeDefined();
      const t = texte(b);
      const im = (x: string) => t.some((y) => y.includes(x));
      for (const teil of e.latein.split(' / ')) expect(im(teil), `${e.id}: ${teil}`).toBe(true);
      for (const teil of e.syrisch.split(' / ')) expect(im(teil), `${e.id}: ${e.syrisch}`).toBe(true);
      if (e.audio) expect(aufnahmen(b), e.id).toContain(e.audio);
      if (e.audio2) expect(aufnahmen(b), e.id).toContain(e.audio2);
      // Jede Beschriftung steht so in der Tabelle („Präsens, Sg., 1. f.“).
      for (const m of (e.merkmal ?? '').split(/, | \/ /)) {
        if (!m || /^(Imperativ|Infinitiv)$/.test(m) || /^(m|f|pl|Sg|Pl)\.$/.test(m)) continue;
        expect(im(m.replace(/^(Subjekt|Objekt) /, '')), `${e.id}: ${m}`).toBe(true);
      }
    }
  });

  it('haben eine deutsche Bedeutung aus dem Lehrbuch', () => {
    for (const { seite: s, e } of alle) {
      expect(e.deutsch.trim(), e.id).not.toBe('');
      // Entweder in der Tabelle selbst, in der Zeile, die das Verb vorstellt, oder eine Zahl der Zahlentabelle.
      expect(ganzerText.includes(e.deutsch) || /^\d+$/.test(e.deutsch), `${e.id}: ${e.deutsch}`).toBe(true);
      expect(`${e.latein}${e.deutsch}`, e.id).not.toMatch(/[\u{700}-\u{74F}]/u);
      // Die Schrift fehlt nur, wo sie auch im Lehrbuch fehlt: bei „die Genitivpartikel /d/“ im Erklärtext.
      if (e.syrisch || s.bloecke[e.block].art !== 'absatz') expect(e.syrisch, e.id).toMatch(/[\u{700}-\u{74F}]/u);
      expect(e.quelle).toBe('lehrbuch');
    }
  });

  it('übertragen nie die Übersetzung einer einzelnen Form auf ein ganzes Verb', () => {
    // „šqile „er kaufte““ beschreibt nur eine Form – die Tabelle darunter bekommt die Bedeutung des Verbs.
    for (const { e } of alle) if (e.verb) expect(e.deutsch, e.id).not.toMatch(/^(ich|du|er|sie|es|wir|ihr)\b/);
    expect(finde('1.17', 'šqëlle')?.deutsch).toBe('nehmen, kaufen');
  });

  it('erkennen Beispiele, Kopula und Fürwörter', () => {
    const l04 = (latein: string) => seite('1.4.3').eintraege.find((e) => e.latein === latein);
    expect(l04('gawire na')).toMatchObject({ deutsch: 'wir sind verheiratet', lektion: 4, id: 'L04-G-gawire-na' });
    expect(l04('gawire na')?.audio).toMatch(/\.mp3$/);
    expect(l04('gawire na')?.fett?.map(([a, b]) => 'gawire na'.slice(a, b))).toEqual(['na']);
    expect(l04('no')).toMatchObject({ deutsch: '(ich) bin', merkmal: 'Singular, 1. Person' });
    expect(finde('1.3.3', 'hiya')).toMatchObject({ deutsch: 'sie', merkmal: 'Singular' });
    expect(finde('1.5.3', '-ayḏax')).toMatchObject({ deutsch: 'dein (f.)', merkmal: 'Singular, 2. Person (f.)' });
    expect(finde('1.6.2', 'bote')).toMatchObject({ deutsch: 'Haus', merkmal: 'Plural' });
    expect(finde('4.12', 'saṯwo')).toMatchObject({ deutsch: 'Winter' });
  });

  it('lesen Verbtabellen mit Bedeutung, Person, Imperativ und Infinitiv', () => {
    const verb = (s: string, latein: string) => seite(s).eintraege.filter((e) => e.latein === latein);
    expect(verb('1.17', 'dëmxono')[0]).toMatchObject({ deutsch: 'schlafen', merkmal: 'Präsens, Sg., 1. f.', verb: 'domax – damëx' });
    expect(verb('4.4', 'guršono')[0]).toMatchObject({ deutsch: 'ziehen', merkmal: 'Präsensbasis, Sg., 1. f.' });
    expect(verb('4.5', 'tax!')[0]).toMatchObject({ deutsch: 'kommen', merkmal: 'Imperativ, f.' });
    expect(verb('4.5', 'maṯyo')[0]).toMatchObject({ deutsch: 'kommen', merkmal: 'Infinitiv' });
    expect(verb('1.17', 'grašu')[0]).toMatchObject({ deutsch: 'ziehen', merkmal: 'Imperativ, Pl.' });
    // Jede Verbtabelle hat alle Personen: 9 Zeilen × 2 Zeitformen (Passiv ohne 2. f.: 16).
    const tabellen = new Map<string, GrammatikEintrag[]>();
    for (const e of seite('1.17').eintraege) if (/^Präs|^Prät/.test(e.merkmal ?? '')) tabellen.set(`${e.block}`, [...(tabellen.get(`${e.block}`) ?? []), e]);
    expect(tabellen.size).toBeGreaterThan(30);
    for (const [, formen] of tabellen) expect([8, 16, 18]).toContain(formen.length);
    // Zeitformen ohne eigene Bedeutung erben sie, wenn genug Formen mit einem bekannten Verb übereinstimmen.
    expect(verb('4.10', 'kogoraš')[0]).toMatchObject({ deutsch: 'ziehen', verb: 'goraš – grëšle' });
    expect(verb('1.7.2', 'dëmxo')[0]).toMatchObject({ deutsch: 'schlafen', merkmal: 'Singular, 3. Person (f.)' });
  });
});

describe('Grammatik: Kleinwörter aus Erklärtexten', () => {
  // Fahrplan, Phase 4b, Schritt 3: Wörter, die das Lehrbuch nur im Text erklärt.
  const klein = (id: string, latein: string) => seite(id).eintraege.filter((e) => e.latein === latein);

  it('liest die Präpositionen aus „Die häufigsten Präpositionen sind …“', () => {
    const g11 = seite('1.11.2');
    const absatz = g11.eintraege.find((e) => e.latein === 'b')!;
    expect(absatz).toMatchObject({ deutsch: 'in', art: 'wort', lektion: 11 });
    expect(texte(g11.bloecke[absatz.block])[0]).toMatch(/^Die häufigsten Präpositionen sind b /);
    const ausAbsatz = g11.eintraege.filter((e) => e.block === absatz.block);
    expect(ausAbsatz.map((e) => e.latein)).toHaveLength(13);
    // „m ܡـ, me ܡܶܐ „von, aus““: beide Formen mit der Bedeutung dahinter
    expect(klein('1.11.2', 'm')[0].deutsch).toBe(klein('1.11.2', 'me')[0].deutsch);
    expect(klein('1.11.2', 's')[0].deutsch).toBe(klein('1.11.2', 'se')[0].deutsch);
  });

  it('nimmt Wörter hinter einer Bezeichnung: Präsensmarker, Futurmarker, Genitivpartikel, Konjunktion', () => {
    const marker = alle.filter(({ e }) => /^(Präsensmarker|Futurmarker|Genitivpartikel|Konjunktion)$/.test(e.deutsch));
    expect(marker.map(({ e }) => e.deutsch).sort()).toEqual(['Futurmarker', 'Genitivpartikel', 'Konjunktion', 'Präsensmarker']);
    for (const { seite: s, e } of marker) {
      const text = texte(s.bloecke[e.block])[0];
      expect(text, e.id).toContain(`${e.deutsch}`);
      expect(text, e.id).toContain(e.latein.replace(/-$/, ''));
    }
    expect(marker.find(({ e }) => e.deutsch === 'Präsensmarker')?.e.latein).toMatch(/-$/);
  });

  it('gibt den Formen des Artikels die Überschrift der Tabelle als Bedeutung', () => {
    const artikel = seite('4.1').eintraege.filter((e) => e.deutsch === seite('4.1').titel);
    expect(artikel.map((e) => e.merkmal)).toEqual(['Sg., m.', 'Sg., f.', 'Pl., vor Konsonant', 'Pl., vor Vokal']);
    expect(artikel.every((e) => e.latein.split(' ').length === 1)).toBe(true);
  });

  it('liest Beispiele mit der Bedeutung in derselben Zelle („bu bayto „im Haus““)', () => {
    const beispiele = seite('1.11.2').eintraege.filter((e) => /^[blms][uia][k]? \S+$/.test(e.latein) && e.audio);
    expect(beispiele.length).toBe(12);
    for (const e of beispiele) expect(e.deutsch, e.id).not.toMatch(/[„“]/);
  });
});
