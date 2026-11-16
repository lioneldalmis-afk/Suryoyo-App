import { describe, expect, it } from 'vitest';
import { istDialog, verfuegbar } from '../data';
import { baueRollenspiel, gehoertZu, rollen } from './rollenspiel';
import { zufall } from './testhilfe';
import { fold, kern } from './text';

const dialoge = [...verfuegbar.values()].filter(istDialog);
const l3 = verfuegbar.get(3)!;

describe('Rollenspiel', () => {
  it('bietet in jedem Dialog Rollen mit mindestens zwei eigenen Zeilen an', () => {
    expect(rollen(l3.text).map((r) => [r.name, r.zeilen])).toEqual([
      ['Afrem', 10],
      ['Aday', 6],
      ['Saro', 5],
    ]);
    expect(rollen(l3.text)[0].gegenueber).toEqual(['Aday', 'Saro']);
    for (const l of dialoge) {
      const liste = rollen(l.text);
      expect(liste.length, `Lektion ${l.nr}`).toBeGreaterThanOrEqual(2);
      // Gemeinsame Zeilen („Saro w Aday“) sind keine eigene Rolle.
      for (const r of liste) expect(r.name, `Lektion ${l.nr}`).not.toMatch(/ w /);
    }
  });

  it('zählt gemeinsame Zeilen zu jeder der beiden Personen', () => {
    const gemeinsam = l3.text.find((z) => z.sprecher === 'Saro w Aday')!;
    expect(gehoertZu(gemeinsam, 'Saro')).toBe(true);
    expect(gehoertZu(gemeinsam, 'Aday')).toBe(true);
    expect(gehoertZu(gemeinsam, 'Afrem')).toBe(false);
  });

  it('lässt bei den eigenen Zeilen aus drei klar verschiedenen Sätzen wählen', () => {
    for (const l of dialoge) {
      for (const r of rollen(l.text)) {
        for (let i = 0; i < 10; i++) {
          const zuege = baueRollenspiel(l.text, r.name, zufall(i));
          expect(zuege.map((z) => z.zeile)).toEqual(l.text);
          for (const z of zuege) {
            expect(z.eigene).toBe(gehoertZu(z.zeile, r.name));
            if (!z.eigene) {
              expect(z.optionen).toEqual([]);
              continue;
            }
            expect(z.optionen, z.zeile.id).toHaveLength(3);
            expect(z.optionen).toContain(z.zeile);
            expect(new Set(z.optionen.map((o) => kern(o.deutsch))).size, z.zeile.id).toBe(3);
            expect(new Set(z.optionen.map((o) => fold(o.latein))).size, z.zeile.id).toBe(3);
          }
        }
      }
    }
  });
});
