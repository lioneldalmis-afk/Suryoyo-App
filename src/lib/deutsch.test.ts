// Deutsche Grammatik für den Baukasten: Wer spricht, welche Verbform, welche Mehrzahl.

import { describe, expect, it } from 'vitest';
import {
  befinden,
  dassArt,
  hauptsatzStellung,
  objektPronomen,
  partizipVon,
  praeteritumVon,
  trennbar,
  vergangenheit,
  einzahlKandidaten,
  istBegleiter,
  modalFuerDritte,
  modalVon,
  possessiv,
  praeposition,
  praesens,
  subjekt,
  SEIN,
  SYNONYME,
  synonymeVon,
  zerlegeDeutsch,
  zerlegeSatz,
} from './deutsch';

describe('Deutsch: Präsens', () => {
  it('regelmäßig, stark und mit Vorsilbe', () => {
    expect(praesens('schlafen')).toEqual(['schlafe', 'schläfst', 'schläft', 'schlafen', 'schlaft', 'schlafen']);
    expect(praesens('essen')?.slice(1, 3)).toEqual(['isst', 'isst']);
    expect(praesens('arbeiten')?.slice(1, 3)).toEqual(['arbeitest', 'arbeitet']);
    expect(praesens('sammeln')?.slice(0, 3)).toEqual(['sammle', 'sammelst', 'sammelt']);
    expect(praesens('kommen')?.[1]).toBe('kommst');
    expect(praesens('zerbrechen')?.slice(1, 3)).toEqual(['zerbrichst', 'zerbricht']);
    expect(praesens('wissen')?.[0]).toBe('weiß');
    expect(praesens('vorbeiziehen lassen')).toBeUndefined();
  });

  it('„sie“ ist erst mit dem Verb eindeutig', () => {
    expect(subjekt('sie', 'ist', SEIN)).toEqual([{ p: 3, zahl: 'sg', g: 'f' }]);
    expect(subjekt('sie', 'sind', SEIN)).toEqual([{ p: 3, zahl: 'pl' }]);
    expect(subjekt('ich', 'ist', SEIN)).toEqual([]);
    expect(subjekt('es', 'ist', SEIN)).toEqual([]);
  });
});

describe('Deutsch: Wörter', () => {
  it('Einzahl zu einer möglichen Mehrzahl', () => {
    expect(einzahlKandidaten('häuser')).toContain('haus');
    expect(einzahlKandidaten('frauen')).toContain('frau');
    expect(einzahlKandidaten('brüder')).toContain('bruder');
    expect(einzahlKandidaten('mütter')).toContain('mutter');
    expect(einzahlKandidaten('autos')).toContain('auto');
  });

  it('Possessiv: „ihr“ ist „von ihr“ oder „von ihnen“', () => {
    expect(possessiv('meine')).toEqual([{ p: 1, zahl: 'sg' }]);
    expect(possessiv('ihre')).toHaveLength(2);
    expect(possessiv('eure')).toEqual([{ p: 2, zahl: 'pl' }]);
    expect(possessiv('meinung')).toBeUndefined();
  });

  it('Präpositionen wie in Grammatik 11b: „im“/„in der“ = b, „ins“/„in die“/„zur“ = l', () => {
    expect(praeposition('im', undefined, false)?.bedeutung).toBe('in');
    expect(praeposition('in', 'der', false)?.bedeutung).toBe('in');
    expect(praeposition('in', 'den', true)?.bedeutung).toBe('in');
    expect(praeposition('in', 'den', false)?.bedeutung).toBe('zu');
    expect(praeposition('ins', undefined, false)?.bedeutung).toBe('zu');
    expect(praeposition('aus', 'dem', false)?.bedeutung).toBe('aus');
    // „zum“, „zur“ wie im Lehrbuch: „an nacime këzzën li madrašto – die Kinder gehen zur Schule“ (Lektion 4)
    expect(praeposition('zum', undefined, false)?.bedeutung).toBe('zu');
    expect(praeposition('zur', undefined, false)?.bedeutung).toBe('zu');
    expect(praeposition('zu', 'dem', false)?.bedeutung).toBe('zu');
    // Vor einem Possessiv wie vor dem Artikel („in meinem Haus“ wie „in dem Haus“)
    expect(praeposition('in', 'meinem', false)?.bedeutung).toBe('in');
    expect(praeposition('mit', 'dem', false)).toBeUndefined();
  });

  it('Eingabe zerlegen: Hinweise in Klammern, „(dass)“ bleibt', () => {
    expect(zerlegeDeutsch('dein (f.) Lehrer')).toMatchObject([{ w: 'dein', hinweis: 'f' }, { w: 'lehrer' }]);
    expect(zerlegeDeutsch('ihre (Pl.) Bücher')).toMatchObject([{ w: 'ihre', hinweis: 'pl' }, { w: 'bücher' }]);
    // So wie getippt (für Namen), „geht's“ als „geht es“
    expect(zerlegeDeutsch('mit Adam')[1].roh).toBe('Adam');
    expect(zerlegeDeutsch('Mir geht’s gut').map((t) => t.w)).toEqual(['mir', 'geht', 'es', 'gut']);
    expect(zerlegeDeutsch('wie gehts').map((t) => t.w)).toEqual(['wie', 'geht', 'es']);
    expect(zerlegeDeutsch('(dass) wir machen').map((t) => t.w)).toEqual(['dass', 'wir', 'machen']);
    expect(zerlegeDeutsch('Ich bin müde!').map((t) => t.w)).toEqual(['ich', 'bin', 'müde']);
  });
});

describe('Deutsch: ganze Sätze (Phase 4b, Schritt 7b)', () => {
  it('Modalverben: „möchten“ und „mögen“ wie „wollen“, „dürfen“ wie „können“', () => {
    expect(modalVon('wir', 'wollen')).toEqual([{ modal: 'wollen', deutsch: 'wollen', personen: [{ p: 1, zahl: 'pl' }] }]);
    expect(modalVon('ich', 'möchte').map((m) => m.modal)).toEqual(['wollen']);
    expect(modalVon('du', 'darfst').map((m) => m.modal)).toEqual(['können']);
    expect(modalVon('sie', 'kann')[0].personen).toEqual([{ p: 3, zahl: 'sg', g: 'f' }]);
    expect(modalFuerDritte('müssen')).toEqual([{ modal: 'müssen', deutsch: 'müssen', zahl: 'pl' }]);
    expect(modalVon('ich', 'gehe')).toEqual([]);
  });

  it('Satz zerlegen: Fragezeichen, Teilsätze an „und“, „oder“, Kommas, Füllwörter weg, Wendungen', () => {
    const s = zerlegeSatz('Ich bin krank und kann nicht kommen.');
    expect(s.frage).toBe(false);
    expect(s.teile.map((t) => [t.verbindung, t.tokens.map((x) => x.w).join(' ')])).toEqual([
      [undefined, 'ich bin krank'],
      ['und', 'kann nicht kommen'],
    ]);
    expect(s.alle.map((x) => x.w)).toContain('und');
    const f = zerlegeSatz('Kommst du mal morgen?');
    expect(f.frage).toBe(true);
    expect(f.ausgelassen).toEqual(['mal']);
    expect(f.teile[0].tokens.map((x) => x.w)).toEqual(['kommst', 'du', 'morgen']);
    const h = zerlegeSatz('Er ist zu Hause');
    expect(h.teile[0].tokens.map((x) => x.w)).toEqual(['er', 'ist', 'im', 'haus']);
    expect(h.ersetzt).toEqual(['„zu Hause“ wie „im Haus“']);
    expect(zerlegeSatz('Was sagst du, sollen wir essen?').teile).toHaveLength(2);
  });

  it('gleichbedeutende Wörter und Begleiter, die keine Adjektive sind', () => {
    expect(synonymeVon('Kumpel')).toEqual(['freund']);
    expect(synonymeVon('schlafen')).toEqual([]);
    // Keine Liste verweist nur auf sich selbst
    for (const [w, liste] of Object.entries(SYNONYME)) expect(liste.filter((x) => x !== w).length, w).toBeGreaterThan(0);
    for (const w of ['diese', 'jeder', 'alle', 'vielen']) expect(istBegleiter(w), w).toBe(true);
    for (const w of ['großen', 'lange', 'müde']) expect(istBegleiter(w), w).toBe(false);
  });
});

describe('Deutsch: weniger Lücken (Phase 4b, Schritt 7c)', () => {
  const w = (t: { w: string }[]) => t.map((x) => x.w).join(' ');

  it('Präsens: „spielen“ → ich spiele (nicht wie „sammeln“ → ich sammle)', () => {
    expect(praesens('spielen')?.[0]).toBe('spiele');
    expect(praesens('sammeln')?.[0]).toBe('sammle');
  });

  it('„mir geht es gut“ → „ich bin gut“, auch umgestellt, als Frage und mit Wortgruppe', () => {
    expect(befinden(zerlegeDeutsch('mir geht es gut')).map((u) => w(u.tokens))).toEqual(['ich bin gut']);
    expect(befinden(zerlegeDeutsch('es geht uns nicht gut')).map((u) => w(u.tokens))).toEqual(['wir sind nicht gut']);
    expect(befinden(zerlegeDeutsch('geht es dir gut')).map((u) => w(u.tokens))).toEqual(['bist du gut']);
    expect(befinden(zerlegeDeutsch('wie geht es dir')).map((u) => w(u.tokens))).toEqual(['wie bist du']);
    expect(befinden(zerlegeDeutsch('meiner Mutter geht es gut')).map((u) => w(u.tokens))).toEqual(['meine mutter ist gut']);
    expect(befinden(zerlegeDeutsch('mir ging es gut')).map((u) => w(u.tokens))).toEqual(['ich war gut']);
    expect(befinden(zerlegeDeutsch('ich gehe nach Hause'))).toEqual([]);
  });

  it('„zum“, „zur“ und Präpositionen für sich', () => {
    expect(praeposition('zur', undefined, false)).toEqual({ bedeutung: 'zu', artikel: 'der' });
    expect(objektPronomen(zerlegeDeutsch('dich morgen'))?.person).toEqual({ p: 2, zahl: 'sg' });
    expect(objektPronomen(zerlegeDeutsch('ihr Buch'))).toBeUndefined();
    expect(objektPronomen(zerlegeDeutsch('ihr das Buch'))?.person).toEqual({ p: 3, zahl: 'sg', g: 'f' });
    expect(objektPronomen(zerlegeDeutsch('sie'))).toBeUndefined();
  });

  it('Vergangenheit: Präteritum und Partizip, auch stark, untrennbar und trennbar', () => {
    expect(praeteritumVon('spielen')).toEqual(['spielte', 'spieltest', 'spielte', 'spielten', 'spieltet', 'spielten']);
    expect(praeteritumVon('gehen')).toEqual(['ging', 'gingst', 'ging', 'gingen', 'gingt', 'gingen']);
    expect(praeteritumVon('verstehen')?.[0]).toBe('verstand');
    expect(partizipVon('spielen')).toEqual(['gespielt']);
    expect(partizipVon('arbeiten')).toEqual(['gearbeitet']);
    expect(partizipVon('gehen')).toEqual(['gegangen']);
    expect(partizipVon('besuchen')).toEqual(['besucht']);
    expect(partizipVon('verstehen')).toEqual(['verstanden']);
    expect(partizipVon('telefonieren')).toEqual(['telefoniert']);
    expect(partizipVon('anrufen')).toEqual(['angerufen']);
    expect(partizipVon('mitkommen')).toEqual(['mitgekommen']);
    // Perfekt und Präteritum werden zum Präsens umgestellt (gebaut wird dann das Präteritum)
    const partizip = (x: string) => (x === 'gespielt' ? ['spielen'] : []);
    const praet = (x: string) => (praeteritumVon('spielen') ?? []).flatMap((f, stelle) => (f === x ? [{ inf: 'spielen', stelle }] : []));
    expect(vergangenheit(zerlegeDeutsch('ich habe heute Fußball gespielt'), partizip, praet).map((v) => w(v.tokens))).toEqual(['ich spiele heute fußball']);
    expect(vergangenheit(zerlegeDeutsch('hast du gespielt'), partizip, praet).map((v) => w(v.tokens))).toEqual(['spielst du']);
    expect(vergangenheit(zerlegeDeutsch('wir spielten'), partizip, praet).map((v) => w(v.tokens))).toEqual(['wir spielen']);
    expect(vergangenheit(zerlegeDeutsch('ich bin müde gewesen'), partizip, praet)).toEqual([{ tokens: [{ w: 'ich', roh: 'ich' }, { w: 'war' }, { w: 'müde', roh: 'müde' }], kopula: true }]);
  });

  it('trennbare Verben: die Vorsilbe am Ende kommt ans Verb, wenn es das Verb gibt', () => {
    const kennt = (f: string) => ['mitkommst', 'aufstehe'].includes(f);
    expect(w(trennbar(zerlegeDeutsch('kommst du morgen mit'), kennt) ?? [])).toBe('mitkommst du morgen');
    expect(w(trennbar(zerlegeDeutsch('ich stehe auf'), kennt) ?? [])).toBe('ich aufstehe');
    expect(trennbar(zerlegeDeutsch('ich singe vor'), kennt)).toBeUndefined();
  });

  it('Nebensätze: Verb vom Ende hinter das Subjekt; „dass“ nach „wollen“ mit Subjunktiv, nach „wissen“ ohne', () => {
    expect(hauptsatzStellung(zerlegeDeutsch('du müde bist')).map(w)).toEqual(['du bist müde']);
    expect(hauptsatzStellung(zerlegeDeutsch('der Lehrer krank ist')).map(w)).toContain('der lehrer ist krank');
    expect(dassArt(zerlegeDeutsch('die Kinder wollen'))).toBe('subjunktiv');
    expect(dassArt(zerlegeDeutsch('ich möchte'))).toBe('subjunktiv');
    expect(dassArt(zerlegeDeutsch('ich weiß'))).toBe('indikativ');
    expect(dassArt(zerlegeDeutsch('ich hoffe'))).toBeUndefined();
    expect(zerlegeSatz('Ich will, dass du kommst').teile.map((t) => t.verbindung)).toEqual([undefined, 'dass']);
    expect(zerlegeSatz('(dass) wir machen').teile[0]).toMatchObject({ verbindung: 'dass', ohneD: true });
  });
});
