import { describe, expect, it } from 'vitest';
import { verfuegbar } from '../data';
import type { Eintrag } from '../types';
import {
  baueEinheit,
  baueWiederholung,
  einheiten,
  einheitenZustand,
  faellige,
  naechsteEinheit,
} from './einheiten';
import {
  aktuellerFortschritt,
  faelligAm,
  INTERVALL_TAGE,
  istFaellig,
  lage,
  MAX_STUFE,
  nachRunde,
  verbucheAusRunde,
  zuruecksetzen,
  type Fortschritt,
} from './progress';
import {
  baueRunde,
  bauen,
  irgendeine,
  lektionsstand,
  lernreihenfolge,
  luecke,
  MAX_BAUSTEINE,
  nochmal,
  richtigGebaut,
  satzUebbar,
  SCHWER_AB,
  type Schritt,
} from './session';
import { geuebtAm, zufall } from './testhilfe';
import { bausteineAus, fold, zerlege } from './text';
import { tagNummer } from './zeit';

const alleLektionen = [...verfuegbar.values()];
const l3 = verfuegbar.get(3)!;
const vorrat3 = lernreihenfolge(l3);
const vorratFuer = (e: Eintrag) => lernreihenfolge(verfuegbar.get(e.lektion)!);
const TAG = 86_400_000;
/** Ein fester Zeitpunkt mittags, damit Tagesgrenzen keine Rolle spielen. */
const MITTAG = new Date(2026, 10, 16, 12).getTime();

describe('Einheiten', () => {
  it('teilen jede Lektion lückenlos und in Lernreihenfolge auf', () => {
    for (const l of alleLektionen) {
      const liste = einheiten(l);
      expect(liste.flatMap((e) => e.eintraege), `Lektion ${l.nr}`).toEqual(lernreihenfolge(l));
      liste.forEach((e, i) => {
        expect(e.nr).toBe(i + 1);
        expect(e.lektion).toBe(l.nr);
        expect(e.eintraege.length, `Lektion ${l.nr}, Einheit ${e.nr}`).toBeGreaterThanOrEqual(3);
        expect(e.eintraege.length, `Lektion ${l.nr}, Einheit ${e.nr}`).toBeLessThanOrEqual(9);
      });
    }
  });

  it('beginnen mit den Wörtern des ersten Satzes und dem Satz selbst', () => {
    expect(einheiten(l3)[0].eintraege.map((e) => e.latein)).toEqual([
      'šlomo',
      'ono',
      'ëšmi',
      'yo',
      'Šlomo, ono ëšmi Afrem yo.',
    ]);
  });

  it('werden der Reihe nach freigeschaltet', () => {
    const [erste, zweite] = einheiten(l3);
    expect(einheitenZustand(l3, {}).slice(0, 3)).toEqual(['aktuell', 'zu', 'zu']);
    expect(naechsteEinheit(l3, {})).toBe(erste);

    const nachErster = geuebtAm(
      erste.eintraege.map((e) => e.id),
      MITTAG,
    );
    expect(einheitenZustand(l3, nachErster).slice(0, 3)).toEqual(['fertig', 'aktuell', 'zu']);
    expect(naechsteEinheit(l3, nachErster)).toBe(zweite);

    // Auch ein falsch beantworteter Eintrag gilt als geübt – die Einheit ist geschafft.
    const mitFehler = nachRunde({}, erste.eintraege.map((e, i) => ({ id: e.id, fehlerfrei: i > 0 })), MITTAG);
    expect(einheitenZustand(l3, mitFehler)[0]).toBe('fertig');
  });

  it('sind alle geschafft, wenn die Lektion fertig ist', () => {
    const f = geuebtAm(
      vorrat3.map((e) => e.id),
      MITTAG,
    );
    expect(einheitenZustand(l3, f).every((z) => z === 'fertig')).toBe(true);
    expect(naechsteEinheit(l3, f)).toBeUndefined();
    expect(lektionsstand(l3, f).anteil).toBe(1);
  });
});

describe('Übungsrunde einer Einheit', () => {
  const erste = einheiten(l3)[0];
  const zaehlt = (s: Schritt) => s.typ !== 'sprechen' && (s.typ !== 'karte' || !s.neu);

  it('stellt jeden neuen Eintrag erst vor und fragt ihn dann zweimal ab', () => {
    for (let i = 0; i < 20; i++) {
      const runde = baueEinheit(erste, {}, { vorratFuer }, zufall(i));
      expect(runde.slice(0, 4).map((s) => s.typ)).toEqual(['karte', 'karte', 'karte', 'karte']);
      for (const e of erste.eintraege) {
        const schritte = runde.filter((s) => s.eintrag === e);
        expect(schritte[0], e.latein).toMatchObject({ typ: 'karte', neu: true });
        const [erste_, zweite] = schritte.filter(zaehlt);
        expect(schritte.filter(zaehlt), e.latein).toHaveLength(2);
        // Nicht gleich nach dem Kennenlernen: Dazwischen kommen mindestens zwei andere Aufgaben.
        expect(runde.indexOf(erste_) - runde.indexOf(schritte[0]), e.latein).toBeGreaterThan(2);
        // Zuerst nach Gehör, dann selbst auf Surayt (Wörter) bzw. bauen oder ergänzen (Sätze).
        expect(erste_.typ, e.latein).toBe('hoeren');
        if (e.art === 'wort') expect(zweite, e.latein).toMatchObject({ typ: 'wahl', richtung: 'de-sur' });
        else expect(['bauen', 'luecke'], e.latein).toContain(zweite.typ);
      }
    }
  });

  it('mischt fällige Wiederholungen unter und endet mit Nachsprechen', () => {
    const l4 = verfuegbar.get(4)!;
    const alt = lernreihenfolge(l4).slice(0, 5);
    const runde = baueEinheit(erste, {}, { vorratFuer, faellige: alt, sprechen: true }, zufall(2));
    const wiederholt = runde.filter((s) => s.eintrag.lektion === 4);
    expect(wiederholt.map((s) => s.eintrag)).toEqual(alt.slice(0, 2).filter((e) => wiederholt.some((s) => s.eintrag === e)));
    expect(wiederholt).toHaveLength(2);
    // Antwortmöglichkeiten für Wiederholungen kommen aus deren eigener Lektion.
    for (const s of wiederholt) if ('optionen' in s && s.typ !== 'luecke') for (const o of s.optionen) expect(o.lektion).toBe(4);
    expect(runde.at(-1)?.typ).toBe('sprechen');
    expect(erste.eintraege).toContain(runde.at(-1)!.eintrag);
    expect(baueEinheit(erste, {}, { vorratFuer, sprechen: false }, zufall(2)).some((s) => s.typ === 'sprechen')).toBe(false);
  });

  it('wiederholt eine geschaffte Einheit einmal ganz, ohne Karteikarten', () => {
    const f = geuebtAm(
      erste.eintraege.map((e) => e.id),
      MITTAG,
    );
    const runde = baueEinheit(erste, f, { vorratFuer }, zufall(3));
    expect(runde.some((s) => s.typ === 'karte')).toBe(false);
    expect(runde.map((s) => s.eintrag.id).sort()).toEqual(erste.eintraege.map((e) => e.id).sort());
  });

  it('lässt sich für jede Einheit jeder Lektion bauen', () => {
    for (const l of alleLektionen) {
      for (const einheit of einheiten(l)) {
        const runde = baueEinheit(einheit, {}, { vorratFuer, sprechen: true }, zufall(einheit.nr));
        expect(runde.length, `Lektion ${l.nr}, Einheit ${einheit.nr}`).toBeGreaterThan(einheit.eintraege.length);
        expect(runde.length, `Lektion ${l.nr}, Einheit ${einheit.nr}`).toBeLessThanOrEqual(30);
      }
    }
  });
});

describe('Satz bauen', () => {
  const satz = l3.text[0]; // „Šlomo, ono ëšmi Afrem yo.“

  it('hat die Wörter des Satzes und ein paar unpassende als Bausteine', () => {
    for (let i = 0; i < 50; i++) {
      const s = bauen(satz, vorrat3, zufall(i));
      if (s?.typ !== 'bauen') throw new Error('kein Satzbau');
      expect(s.loesung).toEqual(['Šlomo', 'ono', 'ëšmi', 'Afrem', 'yo']);
      expect(s.bausteine).toHaveLength(8);
      expect(new Set(s.bausteine.map((b) => b.id)).size).toBe(8);
      const extra = s.bausteine.map((b) => b.text).filter((t) => !s.loesung.includes(t));
      expect(extra).toHaveLength(3);
      // Kein Füllwort ist einem Wort aus dem Satz zum Verwechseln ähnlich.
      for (const t of extra) expect(s.loesung.map(fold)).not.toContain(fold(t));
    }
  });

  it('prüft die Reihenfolge, nicht die Großschreibung', () => {
    const loesung = ['Šlomo', 'ono', 'ëšmi', 'Afrem', 'yo'];
    expect(richtigGebaut(loesung, ['šlomo', 'ono', 'ëšmi', 'Afrem', 'yo'])).toBe(true);
    expect(richtigGebaut(loesung, ['ono', 'Šlomo', 'ëšmi', 'Afrem', 'yo'])).toBe(false);
    expect(richtigGebaut(loesung, ['Šlomo', 'ono', 'ëšmi', 'Afrem'])).toBe(false);
    // Sonderzeichen zählen: „ṭ“ ist nicht „t“.
    expect(richtigGebaut(['ṭawwo'], ['tawwo'])).toBe(false);
  });

  it('gibt es nur für Sätze, die auf den Bildschirm passen', () => {
    expect(bauen(l3.text.find((z) => z.latein === 'Ṭawwo.')!, vorrat3, zufall(1))).toBeNull();
    for (const l of alleLektionen) {
      for (const z of l.text) {
        const s = bauen(z, lernreihenfolge(l), zufall(2));
        const anzahl = bausteineAus(z.latein).length;
        expect(s !== null, z.id).toBe(anzahl >= 2 && anzahl <= MAX_BAUSTEINE);
      }
    }
  });

  it('zerlegt Sätze in Wörter ohne Satzzeichen', () => {
    expect(zerlege('„Šlomo,')).toEqual({ vor: '„', kern: 'Šlomo', nach: ',' });
    expect(bausteineAus('Kibi mšayalno lux mede, Aday?')).toEqual(['Kibi', 'mšayalno', 'lux', 'mede', 'Aday']);
    expect(bausteineAus('beṯ-ṣawbo 2,5 – yo.')).toEqual(['beṯ-ṣawbo', '2,5', 'yo']);
  });
});

describe('Lückentext', () => {
  it('lässt ein kleingeschriebenes Wort aus und bietet es mit drei anderen an', () => {
    for (const l of alleLektionen) {
      const reihe = lernreihenfolge(l);
      for (const z of l.text) {
        const s = luecke(z, reihe, zufall(3));
        if (s === null) continue;
        if (s.typ !== 'luecke') throw new Error('kein Lückentext');
        expect(zerlege(s.teile[s.luecke]).kern, z.id).toBe(s.loesung);
        expect(s.loesung, z.id).toMatch(/^\p{Ll}/u);
        expect(s.optionen, z.id).toContain(s.loesung);
        expect(s.optionen.length, z.id).toBeGreaterThanOrEqual(3);
        expect(new Set(s.optionen.map(fold)).size, z.id).toBe(s.optionen.length);
        // Die falschen Antworten kommen im Satz nicht vor.
        const imSatz = bausteineAus(z.latein).map(fold);
        for (const o of s.optionen.filter((o) => o !== s.loesung)) expect(imSatz, z.id).not.toContain(fold(o));
      }
    }
  });

  it('nimmt bevorzugt ein gerade gelerntes Wort', () => {
    const satz = l3.text.find((z) => z.latein === 'Mën kosaymitu harke?')!;
    const harke = l3.wortschatz.find((w) => w.latein === 'harke')!;
    for (let i = 0; i < 20; i++) {
      const s = luecke(satz, vorrat3, zufall(i), [harke]);
      expect(s).toMatchObject({ typ: 'luecke', loesung: 'harke' });
    }
  });

  it('gibt es in jeder Lektion mit Text für die meisten Sätze', () => {
    for (const l of alleLektionen.filter((x) => x.text.length > 0)) {
      const reihe = lernreihenfolge(l);
      const uebbar = l.text.filter((z) => satzUebbar(z, reihe));
      expect(uebbar.length / l.text.length, `Lektion ${l.nr}`).toBeGreaterThan(0.8);
    }
  });
});

describe('Nach einem Fehler', () => {
  it('kommt dieselbe Aufgabe mit neu gemischten Antworten wieder', () => {
    for (let i = 0; i < 30; i++) {
      const s = irgendeine(l3.text[0], vorrat3, zufall(i));
      const n = nochmal(s, zufall(i + 1));
      expect(n.typ).toBe(s.typ);
      expect(n.eintrag).toBe(s.eintrag);
      if (s.typ === 'bauen' && n.typ === 'bauen') expect([...n.bausteine].sort((a, b) => a.id - b.id)).toEqual([...s.bausteine].sort((a, b) => a.id - b.id));
      if ((s.typ === 'wahl' || s.typ === 'hoeren') && (n.typ === 'wahl' || n.typ === 'hoeren')) expect(new Set(n.optionen)).toEqual(new Set(s.optionen));
    }
  });
});

describe('Karteikasten', () => {
  it('holt Einträge je nach Fach nach 0, 1, 3, 7, 14 oder 30 Tagen wieder hervor', () => {
    expect(INTERVALL_TAGE).toEqual([0, 1, 3, 7, 14, 30]);
    const heute = tagNummer(MITTAG);
    for (let stufe = 0; stufe <= MAX_STUFE; stufe++) {
      const f: Fortschritt = { a: { stufe, richtig: 1, falsch: 0, zuletzt: MITTAG } };
      expect(faelligAm(f.a)).toBe(heute + INTERVALL_TAGE[stufe]);
      expect(istFaellig(f, 'a', heute + INTERVALL_TAGE[stufe])).toBe(true);
      if (stufe > 0) expect(istFaellig(f, 'a', heute + INTERVALL_TAGE[stufe] - 1)).toBe(false);
    }
    // Nie geübte Einträge sind neu, nicht fällig.
    expect(istFaellig({}, 'a', heute)).toBe(false);
  });

  it('rechnet in Kalendertagen: abends geübt ist am nächsten Morgen fällig', () => {
    const abends = new Date(2026, 10, 16, 23).getTime();
    const morgens = new Date(2026, 10, 17, 8).getTime();
    const f = nachRunde({}, [{ id: 'a', fehlerfrei: true }], abends);
    expect(istFaellig(f, 'a', tagNummer(abends))).toBe(false);
    expect(istFaellig(f, 'a', tagNummer(morgens))).toBe(true);
  });

  it('zeigt, wie gut ein Eintrag sitzt', () => {
    const f: Fortschritt = {
      falsch: { stufe: 0, richtig: 0, falsch: 1, zuletzt: MITTAG },
      einmal: { stufe: 1, richtig: 1, falsch: 0, zuletzt: MITTAG },
      fest: { stufe: 3, richtig: 3, falsch: 0, zuletzt: MITTAG },
    };
    expect(['neu', 'falsch', 'einmal', 'fest'].map((id) => lage(f, id))).toEqual(['neu', 'nochmal', 'geuebt', 'sitzt']);
  });

  it('bringt Falsches zuerst und das am längsten Fällige vor dem Rest', () => {
    const heute = tagNummer(MITTAG);
    const [a, b, c, d] = vorrat3;
    const f: Fortschritt = {
      [a.id]: { stufe: 2, richtig: 2, falsch: 0, zuletzt: MITTAG - 10 * TAG },
      [b.id]: { stufe: 0, richtig: 0, falsch: 1, zuletzt: MITTAG },
      [c.id]: { stufe: 1, richtig: 1, falsch: 0, zuletzt: MITTAG - 2 * TAG },
      [d.id]: { stufe: 3, richtig: 3, falsch: 0, zuletzt: MITTAG - 2 * TAG }, // erst in 5 Tagen dran
    };
    expect(faellige(alleLektionen, f, heute, zufall(1))).toEqual([b, c, a]);
    const runde = baueWiederholung([b, c, a], f, vorratFuer, zufall(2));
    expect(runde.map((s) => s.eintrag).sort((x, y) => x.id.localeCompare(y.id))).toEqual([a, b, c].sort((x, y) => x.id.localeCompare(y.id)));
  });
});

describe('Schwierigkeit', () => {
  const woerter = vorrat3.filter((e) => e.art === 'wort' && e.audio);

  it('steigt mit dem Fach im Karteikasten: Was sitzt, muss man selbst auf Surayt finden', () => {
    for (let i = 0; i < 200; i++) {
      const e = woerter[i % woerter.length];
      const leicht = irgendeine(e, vorrat3, zufall(i), [], 0);
      const schwer = irgendeine(e, vorrat3, zufall(i), [], SCHWER_AB);
      expect(['wahl', 'hoeren']).toContain(leicht.typ);
      // Schwer: nie mehr nur „Was bedeutet das?“ mit deutschen Antworten.
      if (schwer.typ === 'wahl') expect(schwer.richtung).toBe('de-sur');
      else expect(schwer).toMatchObject({ typ: 'hoeren', schreibweise: true });
    }
  });

  it('dreht Karteikarten um, sobald ein Wort sitzt', () => {
    const sitzt = { stufe: SCHWER_AB, richtig: 2, falsch: 0, zuletzt: MITTAG };
    const f: Fortschritt = Object.fromEntries(vorrat3.slice(0, 5).map((e) => [e.id, sitzt]));
    for (const s of baueRunde('karten', vorrat3, f, zufall(3))) {
      if (s.typ !== 'karte') throw new Error('keine Karte');
      expect(s.umgekehrt, s.eintrag.latein).toBe(f[s.eintrag.id] !== undefined);
    }
  });
});

describe('Speichern während der Runde', () => {
  it('rechnet vom Stand vor der Runde: höchstens ein Fach weiter, ein späterer Fehler zählt', () => {
    zuruecksetzen();
    const basis: Fortschritt = { a: { stufe: 2, richtig: 2, falsch: 0, zuletzt: MITTAG - 5 * TAG } };
    verbucheAusRunde(basis, [{ id: 'a', fehlerfrei: true }], MITTAG);
    verbucheAusRunde(basis, [{ id: 'a', fehlerfrei: true }], MITTAG);
    expect(aktuellerFortschritt().a).toEqual({ stufe: 3, richtig: 3, falsch: 0, zuletzt: MITTAG });
    verbucheAusRunde(basis, [{ id: 'a', fehlerfrei: false }], MITTAG);
    expect(aktuellerFortschritt().a).toEqual({ stufe: 0, richtig: 2, falsch: 1, zuletzt: MITTAG });
  });

  it('macht nach einer abgebrochenen Runde mit dem Rest der Einheit weiter', () => {
    const erste = einheiten(l3)[0];
    const geuebt = erste.eintraege.slice(0, 2);
    const f = geuebtAm(
      geuebt.map((e) => e.id),
      MITTAG,
    );
    const runde = baueEinheit(erste, f, { vorratFuer }, zufall(5));
    const karten = runde.filter((s) => s.typ === 'karte').map((s) => s.eintrag);
    expect(karten).toEqual(erste.eintraege.slice(2));
    // Die schon geübten kommen trotzdem noch einmal dran.
    for (const e of geuebt) expect(runde.some((s) => s.eintrag === e)).toBe(true);
  });
});
