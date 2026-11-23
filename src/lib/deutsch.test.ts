// Deutsche Grammatik für den Baukasten: Wer spricht, welche Verbform, welche Mehrzahl.

import { describe, expect, it } from 'vitest';
import {
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

  it('Präpositionen wie in Grammatik 11b: „im“/„in der“ = b, „ins“/„in die“ = l, „zu“ nicht', () => {
    expect(praeposition('im', undefined, false)?.bedeutung).toBe('in');
    expect(praeposition('in', 'der', false)?.bedeutung).toBe('in');
    expect(praeposition('in', 'den', true)?.bedeutung).toBe('in');
    expect(praeposition('in', 'den', false)?.bedeutung).toBe('zu');
    expect(praeposition('ins', undefined, false)?.bedeutung).toBe('zu');
    expect(praeposition('aus', 'dem', false)?.bedeutung).toBe('aus');
    expect(praeposition('zum', undefined, false)).toBeUndefined();
    expect(praeposition('zu', 'dem', false)).toBeUndefined();
  });

  it('Eingabe zerlegen: Hinweise in Klammern, „(dass)“ bleibt', () => {
    expect(zerlegeDeutsch('dein (f.) Lehrer')).toEqual([{ w: 'dein', hinweis: 'f' }, { w: 'lehrer' }]);
    expect(zerlegeDeutsch('ihre (Pl.) Bücher')).toEqual([{ w: 'ihre', hinweis: 'pl' }, { w: 'bücher' }]);
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
