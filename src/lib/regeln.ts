// Baukasten, Teil 2 (Fahrplan, Phase 4b, Schritt 5): Regeln aus der Grammatik.
//
// Jede Regel steht so im Lehrbuch, mit Kapitel, Erklärsatz und Beispielen:
//
//   Wortgruppen   Artikel (G3a), Possessivsuffix (G5a), Zahl und Gezähltes (G8b),
//                 Adjektiv (G11a), Präposition mit Artikel (G11b)
//   Sätze         Kopula „sein“ (G4b, G9c, G12a), „Das ist …“ (G5b),
//                 „haben“ (G9b), „es gibt“ (G9a), Präsens und Futur (G7b)
//
// Die Regeln setzen nur Wörter und Formen aus den Daten zusammen: Formentafeln
// (Kopula, „haben“, Artikel, Suffixe …) kommen aus den Tabellen des Lehrbuchs,
// Wörter aus Wortschatz, Glossar und Tabellen, ihr Geschlecht und ihre Zahl nur
// aus Belegen (siehe baukasten.ts). Wo das Lehrbuch etwas nicht zeigt, wird nichts
// gebaut – lieber nichts als Unsinn. Was hier im Code steht, ist Deutsch: wie man
// „ich bin“, „meine“, „im“ oder „isst“ auf Deutsch erkennt (deutsch.ts).
//
// Gegenprobe wie in Schritt 4: Jeder deutsche Satz des Lehrbuchs wird gebaut,
// ohne dass der Baukasten ihn kennt, und mit dem echten Surayt verglichen. Liegt
// ein Satz daneben, bekommt die Regel die Schuld, deren Stück nicht im echten Satz
// vorkommt (sonst die äußere). Eine Regel wird nur benutzt, wenn sie mindestens
// einen ihrer Belege genau trifft und nie danebenliegt.

import type { GrammatikSeite } from '../types';
import { woerter, zerlege } from './text';
import type { Fund, Woerterbuch } from './woerterbuch';
import { alleSchreibweisen, erklaere, type Schreibweise } from './wortfuerwort';
import { bedeutungen, genau, gleicherText, kandidaten, merkmaleMitCache, surWoerter, zeitVon, type Merkmale, type Zahl } from './baukasten';
import { stichwort } from './woerterbuch';
import {
  BESTIMMT,
  begleiterAuchMehrzahl,
  einzahlKandidaten,
  HABEN,
  istPronomen,
  KEIN,
  ORTSWORT,
  personText,
  possessiv,
  praeposition,
  praesens,
  SEIN,
  subjekt,
  UNBESTIMMT,
  WAR,
  WERDEN,
  zahlOffen,
  adjektivKandidaten,
  istBegleiter,
  FAMILIE_KOERPER,
  zerlegeDeutsch,
  type DeToken,
  type Person,
} from './deutsch';

// --- Die Regeln -------------------------------------------------------------------------------

export type RegelId =
  | 'artikel'
  | 'possessiv'
  | 'zahl'
  | 'adjektiv'
  | 'praeposition'
  | 'kopula'
  | 'demonstrativ'
  | 'haben'
  | 'esgibt'
  | 'futur'
  | 'praesens';

/** Wo eine Regel im Lehrbuch steht: Seite und Überschrift des Abschnitts; der Erklärsatz enthält `zitat`. */
interface Fundstelle {
  seite: string;
  abschnitt: string;
}

interface RegelDef {
  id: RegelId;
  name: string;
  stellen: Fundstelle[];
  /** Sätze aus dem Erklärtext, die diese Wörter enthalten, werden wörtlich gezeigt. */
  zitat: { seite: string; enthaelt: string[] };
  /** Nur Beispiele des Abschnitts, die das erfüllen (Präsens und Futur stehen im selben Abschnitt). */
  beleg?: (f: Fund, ix: Tafeln) => boolean;
}

const DEFS: RegelDef[] = [
  {
    id: 'artikel',
    name: 'Bestimmter Artikel',
    stellen: [{ seite: '1.3.3', abschnitt: 'a)' }],
    zitat: { seite: '1.3.3', enthaelt: ['Surayt hat einen bestimmten Artikel', 'Bei Wörtern im Plural, die mit einem Vokal beginnen'] },
  },
  {
    id: 'possessiv',
    name: 'Possessivsuffix (allgemeine Reihe)',
    stellen: [{ seite: '1.5.3', abschnitt: '1. Die allgemeine Reihe' }],
    zitat: { seite: '1.5.3', enthaelt: ['Diese Suffixe werden an das endungslose Substantiv angehängt'] },
  },
  {
    id: 'zahl',
    name: 'Zahl und Gezähltes',
    stellen: [{ seite: '1.8.2', abschnitt: 'b)' }],
    zitat: { seite: '1.8.2', enthaelt: ['Die feminine Form steht vor femininen', 'Ab zwei steht das Gezählte'] },
  },
  {
    id: 'adjektiv',
    name: 'Adjektiv',
    stellen: [{ seite: '1.11.2', abschnitt: 'a)' }],
    zitat: { seite: '1.11.2', enthaelt: ['Substantiv und Adjektiv sind in Zahl und Geschlecht gleich', 'ist damit auch das Adjektiv determiniert'] },
  },
  {
    id: 'praeposition',
    name: 'Präposition mit Artikel',
    stellen: [{ seite: '1.11.2', abschnitt: '1. Präpositionen allgemein' }],
    zitat: { seite: '1.11.2', enthaelt: ['Die kurzen Präpositionen werden mit dem Artikel zusammengeschrieben'] },
  },
  {
    id: 'kopula',
    name: 'Kopula „sein“',
    stellen: [
      { seite: '1.4.3', abschnitt: 'b)' },
      { seite: '1.9.2', abschnitt: 'c)' },
      { seite: '1.12.3', abschnitt: 'a)' },
    ],
    zitat: { seite: '1.4.3', enthaelt: ['Kurzform des Personalpronomens'] },
  },
  {
    id: 'demonstrativ',
    name: 'Demonstrativpronomen „dieser, diese“',
    stellen: [{ seite: '1.5.3', abschnitt: '1. Das selbständige Demonstrativpronomen' }],
    zitat: { seite: '1.5.3', enthaelt: ['Das Demonstrativpronomen, das heißt das hinweisende Pronomen'] },
  },
  {
    id: 'haben',
    name: '„haben“ und „nicht haben“',
    stellen: [{ seite: '1.9.2', abschnitt: 'b)' }],
    zitat: { seite: '1.9.2', enthaelt: ['wird aus der Basis', 'Genauso wird auch „nicht haben“'] },
  },
  {
    id: 'esgibt',
    name: '„es gibt“ und „es gibt nicht“',
    stellen: [{ seite: '1.9.2', abschnitt: 'a)' }],
    zitat: { seite: '1.9.2', enthaelt: ['„es gibt“ lautet im Surayt', '„es gibt nicht“ mit'] },
  },
  {
    id: 'futur',
    name: 'Futur',
    stellen: [{ seite: '1.7.2', abschnitt: 'b)' }],
    zitat: { seite: '1.7.2', enthaelt: ['Für die Kennzeichnung des Präsens'] },
    beleg: (f, ix) => !!ix.futur && surWoerter(f.latein).includes(ix.futur.form),
  },
  {
    id: 'praesens',
    name: 'Präsens',
    stellen: [{ seite: '1.7.2', abschnitt: 'b)' }],
    zitat: { seite: '1.7.2', enthaelt: ['Für die Kennzeichnung des Präsens'] },
    beleg: (f, ix) => !!ix.praesens && surWoerter(f.latein).some((w) => w.startsWith(ix.praesens!.form) && w.length > ix.praesens!.form.length + 2),
  },
];

/** Eine Regel, wie sie der Bauplan zeigt. */
export interface Regel {
  id: RegelId;
  name: string;
  /** „Grammatik 4b, 9c, 12a“ */
  kapitel: string;
  /** Erklärsätze, wörtlich aus dem Lehrbuch */
  zitat: string[];
  /** Beispiele aus den Abschnitten der Regel */
  belege: Fund[];
}

// --- Bausteine aus den Daten -------------------------------------------------------------------

/** Ein Wort aus den Daten: wie es im Satz steht (`form`, klein) und der Eintrag, aus dem es stammt. */
interface Form {
  form: string;
  fund: Fund;
}

/** Eine Form mit den Personen, für die sie steht (aus der Beschriftung der Tabelle). */
interface PForm extends Form {
  personen: Person[];
}

interface Tafeln {
  regeln: Map<RegelId, Regel>;
  kopula: PForm[];
  kopulaVergangen: PForm[];
  kopulaNegiert: PForm[];
  haben: PForm[];
  nichtHaben: PForm[];
  /** u (Sg. m.), i (Sg. f.), aK (Pl. vor Konsonant), an (Pl. vor Vokal) */
  artikel: { m?: Form; f?: Form; plK?: Form; plV?: Form };
  /** Allgemeine Reihe: „-ayḏi“ … */
  possessiv: PForm[];
  /** Selbständiges Demonstrativpronomen für die Nähe: hano, haṯe, hani */
  demonstrativ: { m?: Form; f?: Form; pl?: Form };
  /** Die kurzen Präpositionen nach ihrer Bedeutung: „in“ → b, „zu“ → l, „aus“ → m, „bei“ → s */
  praepositionen: Map<string, Form>;
  /** kit / kito, layt / layto */
  esGibt?: { kurz: Form; lang: Form };
  esGibtNicht?: { kurz: Form; lang: Form };
  praesens?: Form;
  futur?: Form;
  /** Deutsches Verb (Infinitiv) → Verben (Zitierform) */
  verben: Map<string, string[]>;
  /** Zitierform → Grundformen des Präsens mit Person */
  grundformen: Map<string, PForm[]>;
  /** Deutsche Präsensform → Infinitive („isst“ → essen) */
  finit: Map<string, string[]>;
  /** Zahlen ab 11 aus der Zahlentabelle (dort ohne männlich/weiblich) */
  zahlenAb11: Set<string>;
  /** Substantive mit eingeschränkter Reihe (Grammatik 5a.2): die genannten Ausnahmen */
  ausnahmen: Set<string>;
  /** Deutsches Substantiv → Einträge, die es mit eingeschränkter Reihe zeigen („leba – ihr Herz“) */
  eingeschraenkt: Map<string, Fund[]>;
  /** Wörter aus dem Wortschatz der Lektionen 4 (Familie) und 7 (Körper), in jeder Schreibweise */
  familieKoerper: Set<string>;
}

/**
 * Personen aus der Beschriftung einer Tabelle: „Präsens, Sg., 3. m.“, „Gegenwart, Pl., 2.“,
 * „Singular, 3. Person (m.)“, „Plural, 3. Person (m.) / 3. Person (f.)“.
 */
function personenAus(merkmal: string | undefined): Person[] {
  if (!merkmal || /Subjekt|Objekt/.test(merkmal)) return [];
  const sg = /\b(?:Sg|sg)\.|Singular/.test(merkmal);
  const pl = /\b(?:Pl|pl)\.|Plural/.test(merkmal);
  if (sg === pl) return [];
  const aus: Person[] = [];
  for (const m of merkmal.matchAll(/([123])\.\s*(?:Person\s*)?(?:\(?([mf])\.\)?)?/g)) {
    const p = Number(m[1]) as 1 | 2 | 3;
    const x: Person = { p, zahl: sg ? 'sg' : 'pl', ...(sg && m[2] ? { g: m[2] as 'm' | 'f' } : {}) };
    if (!aus.some((y) => y.p === x.p && y.zahl === x.zahl && y.g === x.g)) aus.push(x);
  }
  return aus;
}

/** Person aus einer deutschen Bedeutung wie „(ich) bin“, „du (m.) hast“, „sie haben“, „ihr seid nicht“. */
function personenAusDeutsch(deutsch: string): Person[] {
  const t = zerlegeDeutsch(deutsch);
  const i = t.findIndex((x) => istPronomen(x.w));
  if (i < 0) return [];
  const w = t[i].w;
  const g = t[i].hinweis === 'm' || t[i].hinweis === 'f' ? t[i].hinweis : undefined;
  const verb = t[i + 1]?.w ?? '';
  for (const formen of [SEIN, WAR, HABEN]) {
    const x = subjekt(w, verb, formen);
    if (x.length) return x.map((y) => (g && y.zahl === 'sg' ? { ...y, g } : y));
  }
  return [];
}

const passt = (form: PForm, x: Person) => form.personen.some((y) => y.p === x.p && y.zahl === x.zahl && (!y.g || !x.g || y.g === x.g));

/**
 * Die Formen für eine Person (bei manchen Verben zwei, z. B. mašëfco und mašafco);
 * gibt es männlich und weiblich getrennt, muss die Person ein Geschlecht haben.
 */
function formenFuerPerson(formen: readonly PForm[], x: Person): PForm[] {
  const da = formen.filter((f) => passt(f, x));
  if (da.some((f) => f.personen.some((y) => y.g)) && !x.g) return [];
  const genau = da.filter((f) => f.personen.some((y) => y.p === x.p && y.zahl === x.zahl && y.g === x.g));
  return genau.length ? genau : da;
}

const formFuerPerson = (formen: readonly PForm[], x: Person): PForm | undefined => formenFuerPerson(formen, x)[0];

/** Die Abschnitte einer Seite: Blöcke von der Überschrift bis zur nächsten gleich hohen. */
function abschnitt(seite: GrammatikSeite, anfang: string): [number, number] | undefined {
  const i = seite.bloecke.findIndex((b) => b.art === 'titel' && b.text.startsWith(anfang));
  if (i < 0) return undefined;
  const ebene = (seite.bloecke[i] as { ebene: number }).ebene;
  let j = i + 1;
  while (j < seite.bloecke.length) {
    const b = seite.bloecke[j];
    if (b.art === 'titel' && b.ebene <= ebene) break;
    j++;
  }
  return [i, j];
}

/** „Grammatik 4“ + „b) Die Kopula“ → „Grammatik 4b“; Unterabschnitte („1. Die allgemeine Reihe“) gehören zum Buchstaben davor. */
function kapitelVon(seite: GrammatikSeite, anfang: string): string {
  const i = seite.bloecke.findIndex((b) => b.art === 'titel' && b.text.startsWith(anfang));
  for (let k = i; k >= 0; k--) {
    const b = seite.bloecke[k];
    const m = b.art === 'titel' ? /^([a-z])\)/.exec(b.text) : null;
    if (m) return `${seite.titel}${m[1]}`;
  }
  return seite.titel;
}

const absatz = (seite: GrammatikSeite, i: number) => {
  const b = seite.bloecke[i];
  return b?.art === 'absatz' ? b.teile.map((t) => t.text).join('') : '';
};

const tafelnCache = new WeakMap<Woerterbuch, Tafeln>();

function tafeln(wb: Woerterbuch): Tafeln {
  const da = tafelnCache.get(wb);
  if (da) return da;
  const seiten = [...wb.seiten.values()];
  const seiteMit = (titel: string) => seiten.find((s) => s.titel === titel);
  const fundVon = (id: string) => wb.nachId.get(id);
  const form = (f: Fund, text = f.latein): Form => ({ form: genau(text), fund: f });

  // Hilfsverben: Formentabelle „Pseudo- und Hilfsverben“ (Personen aus der Beschriftung, sonst aus der Bedeutung in Grammatik 9)
  const hilfs = seiteMit('Pseudo- und Hilfsverben');
  const nachForm = new Map<string, Fund[]>();
  for (const x of wb.funde) {
    const k = genau(x.latein);
    nachForm.set(k, [...(nachForm.get(k) ?? []), x]);
  }
  const ausHilfs = (deutsch: string, zeit: string): PForm[] =>
    (hilfs?.eintraege ?? [])
      .filter((e) => e.deutsch === deutsch && (e.merkmal ?? '').startsWith(zeit))
      .flatMap((e) => {
        const f = fundVon(e.id);
        if (!f) return [];
        let personen = personenAus(e.merkmal);
        if (!personen.length) {
          const andere = (nachForm.get(genau(e.latein)) ?? []).filter((x) => x !== f);
          personen = andere.map((x) => personenAusDeutsch(x.deutsch)).find((p) => p.length) ?? [];
        }
        return personen.length ? [{ ...form(f, e.latein), personen }] : [];
      });

  // Artikel: Formentabelle „Der bestimmte Artikel“
  const artTafel = seiteMit('Der bestimmte Artikel');
  const artikel: Tafeln['artikel'] = {};
  for (const e of artTafel?.eintraege ?? []) {
    const f = fundVon(e.id);
    if (!f || e.deutsch !== artTafel!.titel) continue;
    const m = e.merkmal ?? '';
    if (/^Sg\., m\./.test(m)) artikel.m = form(f);
    else if (/^Sg\., f\./.test(m)) artikel.f = form(f);
    else if (/Konsonant/.test(m)) artikel.plK = { form: e.latein, fund: f };
    else if (/Vokal/.test(m)) artikel.plV = form(f);
  }

  // Possessivsuffixe, allgemeine Reihe (Grammatik 5a.1)
  const g5 = wb.seiten.get('1.5.3');
  const allgemein = g5 && abschnitt(g5, '1. Die allgemeine Reihe');
  const suffixe: PForm[] = [];
  if (g5 && allgemein) {
    for (const e of g5.eintraege) {
      const f = fundVon(e.id);
      if (!f || e.block < allgemein[0] || e.block >= allgemein[1] || !/^-/.test(e.latein)) continue;
      const personen = personenAus(e.merkmal);
      if (personen.length) suffixe.push({ form: genau(e.latein).replace(/^-/, ''), fund: f, personen });
    }
  }

  // Demonstrativpronomen für die Nähe (Grammatik 5b.1): „dieser“, „diese (Sg.)“, „diese (Pl.)“
  const demonstrativ: Tafeln['demonstrativ'] = {};
  const selbst = g5 && abschnitt(g5, '1. Das selbständige Demonstrativpronomen');
  for (const e of g5?.eintraege ?? []) {
    const f = fundVon(e.id);
    if (!f || !selbst || e.block < selbst[0] || e.block >= selbst[1] || e.merkmal !== 'Für die Nähe') continue;
    if (e.deutsch === 'dieser') demonstrativ.m = form(f);
    else if (/^diese \(Sg\.\)$/.test(e.deutsch)) demonstrativ.f = form(f);
    else if (/^diese \(Pl\.\)$/.test(e.deutsch)) demonstrativ.pl = form(f);
  }

  // Präpositionen: „Die häufigsten Präpositionen sind b „in“, …“ (Grammatik 11b) – die kurzen (ein Buchstabe)
  const praepositionen = new Map<string, Form>();
  const listeDerPraepositionen = new Set<string>();
  for (const s of seiten) s.bloecke.forEach((_, i) => absatz(s, i).startsWith('Die häufigsten Präpositionen') && listeDerPraepositionen.add(`${s.id}|${i}`));
  for (const f of wb.funde) {
    const st = (f.stellen ?? []).find((x) => listeDerPraepositionen.has(`${x.seite}|${x.block}`));
    const erstes = woerter(f.latein).map((w) => zerlege(w).kern)[0] ?? '';
    if (!st || erstes.length !== 1) continue;
    for (const b of bedeutungen(f.deutsch)) if (!praepositionen.has(b)) praepositionen.set(b, form(f, erstes));
  }

  // „es gibt“ – kit ~ kito, „es gibt nicht“ – layt ~ layto (Glossar)
  const paar = (bedeutung: string) => {
    const f = wb.funde.find((x) => /~/.test(x.latein) && bedeutungen(x.deutsch).includes(bedeutung));
    const teile = f ? f.latein.split(/\s*~\s*/).map(genau) : [];
    return f && teile.length === 2 ? { kurz: { form: teile[0], fund: f }, lang: { form: teile[1], fund: f } } : undefined;
  };

  // Präsens- und Futurmarker (Kleinwörter aus Grammatik 13)
  const marker = (deutsch: string) => {
    const f = wb.funde.find((x) => x.deutsch === deutsch);
    return f ? { form: genau(f.latein).replace(/-$/, ''), fund: f } : undefined;
  };

  // Verben: Grundformen des Präsens aus den Verbtabellen
  const verben = new Map<string, string[]>();
  const grundformen = new Map<string, PForm[]>();
  for (const [verb, formen] of wb.gruppen) {
    const liste: PForm[] = [];
    for (const f of formen) {
      if (surWoerter(f.latein).length !== 1) continue;
      for (const st of f.stellen ?? []) {
        if (st.verb !== verb || zeitVon(st.merkmal ?? '') !== 'Präsens') continue;
        const personen = personenAus(st.merkmal);
        if (!personen.length) continue;
        const da = liste.find((x) => x.form === genau(f.latein));
        if (da) da.personen.push(...personen.filter((p) => !da.personen.some((y) => y.p === p.p && y.zahl === p.zahl && y.g === p.g)));
        else liste.push({ ...form(f), personen: [...personen] });
      }
    }
    if (!liste.length) continue;
    grundformen.set(verb, liste);
    for (const b of new Set(formen.flatMap((f) => bedeutungen(f.deutsch)))) {
      if (!/^[a-zäöüß]+$/.test(b)) continue; // nur einfache Verben („essen“), nicht „satt werden“
      verben.set(b, [...new Set([...(verben.get(b) ?? []), verb])]);
    }
  }

  // Deutsche Präsensformen der Verben, damit „er isst“ schnell zu „essen“ findet
  // „sein“, „haben“, „werden“ haben eigene Regeln (Kopula, „haben“, Futur) – nicht als gewöhnliches Verb.
  const finit = new Map<string, string[]>();
  for (const inf of verben.keys()) {
    if (inf === 'sein' || inf === 'haben' || inf === 'werden') continue;
    for (const f of new Set(praesens(inf) ?? [])) finit.set(f, [...(finit.get(f) ?? []), inf]);
  }

  // Zahlen ab 11: in der Zahlentabelle ohne „Maskulin“/„Feminin“
  const zahlenAb11 = new Set<string>();
  for (const e of seiteMit('Die Zahlen')?.eintraege ?? []) {
    if (!e.merkmal && /^\d+$/.test(e.deutsch.trim()) && Number(e.deutsch) > 10 && surWoerter(e.latein).length === 1) zahlenAb11.add(genau(e.latein));
  }

  // „Diese Reihe ist auf Verwandtschaftsbezeichnungen und Körperteile beschränkt. Dazu kommen einige Ausnahmen wie xabro …“
  const ausnahmen = new Set<string>();
  for (const b of g5?.bloecke ?? []) {
    if (b.art === 'absatz' && /Verwandtschaftsbezeichnungen und Körperteile/.test(b.teile.map((x) => x.text).join(''))) {
      for (const x of b.teile) if (x.sur) ausnahmen.add(genau(x.text));
    }
  }

  // Einträge wie „ëšmi – mein Name“, „leba – ihr Herz“: ein Wort ohne Artikel und ohne Suffix der allgemeinen Reihe
  const eingeschraenkt = new Map<string, Fund[]>();
  for (const f of wb.funde) {
    if (!/^(mein|dein|sein|ihr|unser|euer|eure)/i.test(f.deutsch)) continue;
    const de = zerlegeDeutsch(f.deutsch);
    const sur = surWoerter(f.latein);
    if (de.length < 2 || !possessiv(de[0].w) || sur.length !== 1) continue;
    if (suffixe.some((x) => sur[0].endsWith(x.form))) continue;
    const name = de.slice(1).map((x) => x.w).join(' ');
    eingeschraenkt.set(name, [...(eingeschraenkt.get(name) ?? []), f]);
  }

  // Verwandtschaft und Körperteile, auch wenn ein Wort im Glossar ohne Lektion steht („qarco“)
  const familieKoerper = new Set(
    alleSchreibweisen(wb)
      .filter((x) => x.fund.herkunft === 'wortschatz' && (x.fund.lektion === 4 || x.fund.lektion === 7))
      .map((x) => x.genau),
  );

  const ix: Tafeln = {
    eingeschraenkt,
    familieKoerper,
    finit,
    zahlenAb11,
    ausnahmen,
    regeln: new Map(),
    kopula: ausHilfs('sein', 'Gegenwart'),
    kopulaVergangen: ausHilfs('sein', 'Vergangenheit'),
    kopulaNegiert: ausHilfs('nicht sein', 'Gegenwart'),
    haben: ausHilfs('haben', 'Gegenwart'),
    nichtHaben: ausHilfs('nicht haben', 'Gegenwart'),
    artikel,
    possessiv: suffixe,
    demonstrativ,
    praepositionen,
    esGibt: paar('es gibt'),
    esGibtNicht: paar('es gibt nicht'),
    praesens: marker('Präsensmarker'),
    futur: marker('Futurmarker'),
    verben,
    grundformen,
  };

  // Die Regeln mit Kapitel, Erklärsatz und Belegen
  for (const d of DEFS) {
    const kapitel: string[] = [];
    const belege: Fund[] = [];
    for (const st of d.stellen) {
      const s = wb.seiten.get(st.seite);
      const ab = s && abschnitt(s, st.abschnitt);
      if (!s || !ab) continue;
      kapitel.push(kapitelVon(s, st.abschnitt));
      for (const e of s.eintraege) {
        const f = fundVon(e.id);
        if (!f || e.block < ab[0] || e.block >= ab[1] || /^-|-$/.test(e.latein) || !e.deutsch.trim()) continue;
        if (!d.beleg || d.beleg(f, ix)) if (!belege.includes(f)) belege.push(f);
      }
    }
    // Der Erklärsatz ohne syrische Schrift (die zeigt die App noch nicht)
    const s = wb.seiten.get(d.zitat.seite);
    const ohneSchrift = (b: GrammatikSeite['bloecke'][number]) =>
      b.art === 'absatz'
        ? b.teile
            .filter((x) => !x.syr)
            .map((x) => x.text)
            .join('')
            // „|u ܐܘ|“ – ohne die syrische Schrift bleiben nur die Striche
            .replace(/\|\s*([^|]*?)\s*\|/g, '$1')
            .replace(/\s+/g, ' ')
            .replace(/\s+([,.:])/g, '$1')
        : '';
    const saetze = s
      ? s.bloecke.flatMap((b) => ohneSchrift(b).split(/(?<=[.:])\s+(?=\p{Lu}|„)/u)).filter((t) => d.zitat.enthaelt.some((z) => t.includes(z)))
      : [];
    // „Grammatik 4b, Grammatik 9c“ → „Grammatik 4b, 9c“
    const k = kapitel.map((x, i) => (i ? x.replace(/^Grammatik /, '') : x)).join(', ');
    ix.regeln.set(d.id, { id: d.id, name: d.name, kapitel: k, zitat: [...new Set(saetze.map((t) => t.trim()))], belege });
  }
  tafelnCache.set(wb, ix);
  return ix;
}

/** Die Regeln mit Kapitel, Erklärsatz und Belegen (für Bauplan und Tests). */
export const regelVon = (wb: Woerterbuch, id: RegelId) => tafeln(wb).regeln.get(id)!;
export const alleRegeln = (wb: Woerterbuch) => [...tafeln(wb).regeln.values()];

// --- Ergebnis --------------------------------------------------------------------------------------

/** Ein Teil eines zusammengesetzten Wortes: „malfon-“ (aus malfono) + „-ayḏi“. */
export interface Teilstueck {
  text: string;
  fund: Fund;
  rolle: string;
}

/** Ein Wort im gebauten Satz mit seiner Herkunft. */
export interface Stueck {
  text: string;
  /** „Kopula“, „Substantiv“, „Artikel“, „Adjektiv“ … */
  rolle: string;
  fund?: Fund;
  /** „männlich, Einzahl“, „Gegenwart · ich“ */
  merkmal?: string;
  /** Bei zusammengesetzten Wörtern die Teile */
  aus?: Teilstueck[];
}

/** Eine Regel und das Stück Surayt, das sie gebaut hat. */
export interface Anwendung {
  regel: RegelId;
  text: string;
}

/** Ein Satz, den die Regeln gebaut haben – nie in den Daten, immer „Zusammengesetzt – nicht geprüft“. */
export interface Regelsatz {
  stufe: 'zusammengesetzt';
  latein: string;
  deutsch: string;
  stuecke: Stueck[];
  /** Die angewandten Regeln, die äußere zuerst */
  regeln: Anwendung[];
  /** „als Junge“, „zu einem Mädchen“ … wenn die Form davon abhängt */
  variante?: string;
  /** Hängt die Form davon ab, ob ein Junge oder ein Mädchen spricht? */
  ich?: 'm' | 'f';
}

export interface RegelOptionen {
  /** Wer spricht? Ohne Angabe gibt es bei „ich“ beide Formen. */
  ich?: 'm' | 'f';
  /** Diesen Eintrag nicht kennen (Gegenprobe) */
  ohne?: Fund;
  /** Nur diese Regeln (sonst die, die die Gegenprobe bestanden haben) */
  regeln?: ReadonlySet<RegelId>;
}

/** Ein Zwischenergebnis: Stücke, Regeln, Merkmale (für die Übereinstimmung) und Variante. */
interface Bau {
  stuecke: Stueck[];
  regeln: Anwendung[];
  zahl?: Zahl;
  g?: 'm' | 'f';
  variante?: string;
  ich?: 'm' | 'f';
}

const text = (stuecke: readonly Stueck[]) => stuecke.map((s) => s.text).join(' ');
const mitRegel = (b: Bau, regel: RegelId): Bau => ({ ...b, regeln: [{ regel, text: text(b.stuecke) }, ...b.regeln] });
const varianteZusammen = (...v: (string | undefined)[]) => v.filter(Boolean).join(', ') || undefined;

/** Ein Wort mit Rolle als Stück. */
const stueck = (f: Form, rolle: string, merkmal?: string): Stueck => ({ text: f.form, rolle, fund: f.fund, ...(merkmal ? { merkmal } : {}) });

const geschlechtText = (g?: 'm' | 'f' | 'mf', zahl?: Zahl) =>
  [g === 'm' ? 'männlich' : g === 'f' ? 'weiblich' : '', zahl === 'sg' ? 'Einzahl' : zahl === 'pl' ? 'Mehrzahl' : ''].filter(Boolean).join(', ');

// --- Wörter suchen -------------------------------------------------------------------------------------

interface Ctx {
  wb: Woerterbuch;
  ix: Tafeln;
  ohne?: Fund;
  ich?: 'm' | 'f';
}

interface Wahl {
  s: Schreibweise;
  m: Merkmale;
}

/** Wörter mit dieser deutschen Bedeutung, ohne den ausgeblendeten Eintrag. */
function woerterFuer(ctx: Ctx, deutsch: string): Wahl[] {
  return kandidaten(ctx.wb, deutsch)
    .filter((s) => s.fund !== ctx.ohne)
    .map((s) => ({ s, m: merkmaleMitCache(ctx.wb, s, ctx.ohne, deutsch) }));
}

/** Ein Wort so geschrieben wie im Eintrag („Surayt“ groß, sonst klein). */
function wie(s: Schreibweise): string {
  const original = woerter(s.fund.latein)
    .map((w) => zerlege(w).kern.normalize('NFC'))
    .find((w) => w.toLowerCase() === s.genau);
  return original && /^\p{Lu}/u.test(original) ? original : s.genau;
}

/** Stichwörter zuerst, dann solche mit Aufnahme; gleiche Schreibweisen nur einmal. */
function auswahl(liste: Wahl[]): Wahl[] {
  const gesehen = new Set<string>();
  return [...liste]
    .sort((a, b) => Number(b.s.ganz) - Number(a.s.ganz) || Number(!!b.s.fund.audio) - Number(!!a.s.fund.audio))
    .filter((w) => !gesehen.has(w.s.genau) && gesehen.add(w.s.genau));
}

/** Höchstens so viele gleichbedeutende Wörter (z. B. zwei für „unterrichten“). */
const SYNONYME = 2;

/**
 * Substantive zu einem deutschen Wort. `zahl` (aus dem Satz) erzwingt Einzahl
 * oder Mehrzahl; sonst entscheidet das deutsche Wort: „Häuser“ ist Mehrzahl (zu
 * „Haus“), „Haus“ Einzahl. `sicher`: Geschlecht und Zahl müssen belegt sein.
 */
function nomen(ctx: Ctx, wort: string, opt: { zahl?: Zahl; sicher?: boolean; offen?: boolean }): Wahl[] {
  const direkt = woerterFuer(ctx, wort).filter((w) => w.m.wortart === 'nomen');
  const einzahl = direkt.filter((w) => w.m.zahl === 'sg' || (!opt.sicher && w.m.zahl === undefined && w.s.ganz));
  // Mehrzahl mit derselben Bedeutung: „malfone“ zu „Lehrer“, „nacime“ für „Kinder“
  const mehrzahl = direkt.filter((w) => w.m.zahl === 'pl');
  // Ein deutsches Mehrzahlwort zu einem anderen Substantiv („Häuser“ → „Haus“) – nur, wenn das Wort selbst nicht im Übersetzer steht
  const abgeleitet = direkt.length
    ? []
    : einzahlKandidaten(wort).flatMap((sg) => woerterFuer(ctx, sg).filter((w) => w.m.wortart === 'nomen' && w.m.zahl === 'pl'));
  let liste: Wahl[];
  if (opt.zahl === 'sg') liste = einzahl;
  else if (opt.zahl === 'pl') liste = [...mehrzahl, ...abgeleitet];
  else if (einzahl.length) liste = opt.offen && zahlOffen(wort) ? [] : einzahl;
  // „Kinder“: nur eine Mehrzahl hat diese Bedeutung
  else liste = [...mehrzahl.filter((w) => w.s.ganz), ...abgeleitet];
  if (opt.sicher) liste = liste.filter((w) => (w.m.geschlecht === 'm' || w.m.geschlecht === 'f' || w.m.zahl === 'pl') && !!w.m.zahl);
  return auswahl(liste).slice(0, SYNONYME);
}

/** Adjektive zu einem deutschen Wort in der gewünschten Form (Geschlecht und Zahl). */
function adjektiv(ctx: Ctx, wort: string, g: 'm' | 'f' | undefined, zahl: Zahl): Wahl[] {
  if (istBegleiter(wort)) return [];
  const liste = adjektivKandidaten(wort).flatMap((a) =>
    woerterFuer(ctx, a).filter(
      (w) => w.m.wortart === 'anderes' && w.m.zahl === zahl && (zahl === 'pl' ? !!w.m.geschlecht : w.m.geschlecht === g),
    ),
  );
  return auswahl(liste).slice(0, SYNONYME);
}

/** Zahlwörter zu einem deutschen Wort („vier“, „4“): 1–10 nach Geschlecht, ab 11 eine Form für beide (Grammatik 8b). */
function zahlwort(ctx: Ctx, wort: string, g: 'm' | 'f' | undefined): Wahl[] {
  const liste = woerterFuer(ctx, wort);
  const mitGeschlecht = liste.filter((w) => w.m.wortart === 'zahl' && w.m.geschlecht === g && w.m.zahl === 'pl');
  if (mitGeschlecht.length) return auswahl(mitGeschlecht).slice(0, 1);
  return auswahl(liste.filter((w) => ctx.ix.zahlenAb11.has(w.s.genau))).slice(0, 1);
}

const nomenStueck = (w: Wahl): Stueck => ({
  text: wie(w.s),
  rolle: 'Substantiv',
  fund: w.s.fund,
  merkmal: geschlechtText(w.m.geschlecht === 'mf' ? undefined : w.m.geschlecht, w.m.zahl),
});

// --- Wortgruppen --------------------------------------------------------------------------------------

/** Der Artikel vor einem Substantiv (Grammatik 3a): u, i, a + Anfangsbuchstabe, an vor Vokal. */
function artikelFuer(ctx: Ctx, nomenForm: string, g: 'm' | 'f' | undefined, zahl: Zahl | undefined): Stueck | undefined {
  const a = ctx.ix.artikel;
  if (zahl === 'sg' && g === 'm' && a.m) return stueck(a.m, 'Artikel', 'männlich, Einzahl');
  if (zahl === 'sg' && g === 'f' && a.f) return stueck(a.f, 'Artikel', 'weiblich, Einzahl');
  if (zahl !== 'pl') return undefined;
  const erster = [...nomenForm][0] ?? '';
  if (/[aeiouëä]/.test(erster)) return a.plV && stueck(a.plV, 'Artikel', 'Mehrzahl, vor Vokal');
  return a.plK && { text: `a${erster}`, rolle: 'Artikel', fund: a.plK.fund, merkmal: 'Mehrzahl, a + Anfangsbuchstabe' };
}

type Rolle = 'allein' | 'subjekt' | 'praedikat' | 'objekt' | 'nach-praeposition';

/**
 * Eine deutsche Wortgruppe (Substantiv mit Begleiter und Adjektiv) auf Surayt.
 * `zahl`: vom Satz verlangt (z. B. „wir sind …“); `negiert`: „kein“ ist erlaubt.
 */
function gruppe(ctx: Ctx, t: readonly DeToken[], rolle: Rolle, opt: { zahl?: Zahl; negiert?: boolean } = {}): Bau[] {
  if (!t.length || t.length > 3) return [];
  const [erstes, ...rest] = t;
  const aus: Bau[] = [];
  const kopf = t[t.length - 1].w;

  // Possessiv: „mein Lehrer“, „ihre (Pl.) Bücher“ (Grammatik 5a, allgemeine Reihe)
  const besitzer = possessiv(erstes.w);
  if (besitzer && t.length === 2 && rolle !== 'objekt') {
    const hinweis = erstes.hinweis;
    const offen = begleiterAuchMehrzahl(erstes.w);
    for (const w of nomen(ctx, kopf, { zahl: opt.zahl, sicher: true, offen })) {
      const stamm = endungslos(w);
      const art = stamm && artikelFuer(ctx, w.s.genau, w.m.geschlecht === 'mf' ? undefined : (w.m.geschlecht as 'm' | 'f'), w.m.zahl);
      if (!stamm || !art || eingeschraenkt(ctx, w) || tUnklar(w)) continue;
      for (const p of besitzer) {
        if (hinweis === 'pl' && p.zahl !== 'pl') continue;
        if (hinweis === 'sg' && p.zahl !== 'sg') continue;
        for (const g of p.zahl === 'sg' && p.p === 2 ? (['m', 'f'] as const) : [p.g]) {
          if ((hinweis === 'm' || hinweis === 'f') && g !== hinweis) continue;
          const suffix = formFuerPerson(ctx.ix.possessiv, { ...p, g });
          if (!suffix) continue;
          const wort: Stueck = {
            text: stamm + suffix.form,
            rolle: 'Substantiv mit Possessivsuffix',
            aus: [
              { text: `${stamm}-`, fund: w.s.fund, rolle: `${w.s.genau} ohne Endung` },
              { text: `-${suffix.form}`, fund: suffix.fund, rolle: `Possessivsuffix · ${suffix.fund.deutsch}` },
            ],
          };
          const variante =
            besitzer.length > 1 ? `„${erstes.w}“ = ${p.zahl === 'pl' ? 'von ihnen' : 'von ihr'}` : p.p === 2 && p.zahl === 'sg' ? (g === 'm' ? 'zu einem Jungen' : 'zu einem Mädchen') : undefined;
          aus.push({
            stuecke: [art, wort],
            regeln: [
              { regel: 'artikel', text: `${art.text} ${wort.text}` },
              { regel: 'possessiv', text: wort.text },
            ],
            zahl: w.m.zahl,
            g: w.m.geschlecht === 'mf' ? undefined : (w.m.geschlecht as 'm' | 'f'),
            variante,
          });
        }
      }
    }
    return aus;
  }

  // Zahl: „drei Häuser“ (Grammatik 8b) – ab zwei steht das Gezählte in der Mehrzahl
  if (t.length === 2 && !UNBESTIMMT.has(erstes.w) && !BESTIMMT.has(erstes.w) && !KEIN.has(erstes.w) && rolle !== 'praedikat') {
    for (const w of nomen(ctx, kopf, { zahl: 'pl', sicher: true })) {
      const g = w.m.geschlecht === 'mf' ? undefined : (w.m.geschlecht as 'm' | 'f');
      for (const z of zahlwort(ctx, erstes.w, g)) {
        const zs: Stueck = { text: z.s.genau, rolle: 'Zahl', fund: z.s.fund, merkmal: z.m.geschlecht ? `vor ${z.m.geschlecht === 'm' ? 'männlichem' : 'weiblichem'} Substantiv` : 'eine Form für beide Geschlechter' };
        aus.push(mitRegel({ stuecke: [zs, nomenStueck(w)], regeln: [], zahl: 'pl', g }, 'zahl'));
      }
    }
    if (aus.length) return aus;
  }

  // Mit bestimmtem Artikel, ohne oder mit unbestimmtem Artikel, mit „kein“; vielleicht mit Adjektiv davor
  const bestimmt = BESTIMMT.has(erstes.w);
  const kein = KEIN.has(erstes.w);
  if (kein && !opt.negiert) return [];
  const begleiter = bestimmt || kein || UNBESTIMMT.has(erstes.w);
  const kern = begleiter ? rest : t;
  if (!kern.length || kern.length > 2) return [];
  // Ein bestimmtes Substantiv als Objekt bräuchte im Präsens die Objektmarkierung (Grammatik 16e) – nicht bauen.
  if (bestimmt && rolle === 'objekt') return [];
  const adj = kern.length === 2 ? kern[0].w : undefined;
  // „die Lehrer“, „niederländische Schüler“: Einzahl oder Mehrzahl? Dann offen lassen.
  const offen = begleiter ? begleiterAuchMehrzahl(erstes.w) : true;
  const sicher = bestimmt || !!adj;
  for (const w of nomen(ctx, kopf, { zahl: opt.zahl, sicher, offen })) {
    const g = w.m.geschlecht === 'mf' ? undefined : (w.m.geschlecht as 'm' | 'f');
    // Mit Adjektiv: Substantiv und Adjektiv in Zahl und Geschlecht gleich (Grammatik 11a)
    const adjektive = adj ? (w.m.zahl ? adjektiv(ctx, adj, g, w.m.zahl) : []) : [undefined];
    for (const a of adjektive) {
      let stuecke: Stueck[] = [nomenStueck(w)];
      let regeln: Anwendung[] = [];
      if (a) {
        const as: Stueck = { text: a.s.genau, rolle: 'Adjektiv', fund: a.s.fund, merkmal: geschlechtText(a.m.geschlecht, a.m.zahl) };
        stuecke = [...stuecke, as];
        regeln = [{ regel: 'adjektiv', text: text(stuecke) }];
      }
      if (bestimmt) {
        const art = artikelFuer(ctx, w.s.genau, g, w.m.zahl);
        if (!art) continue;
        stuecke = [art, ...stuecke];
        regeln = [{ regel: 'artikel', text: text(stuecke) }, ...regeln];
      }
      aus.push({ stuecke, regeln, zahl: w.m.zahl, g });
    }
  }
  return aus;
}

/** „Das endungslose Substantiv“ (Grammatik 5a): ohne -o in der Einzahl, ohne -e in der Mehrzahl. */
function endungslos(w: Wahl): string | undefined {
  const endung = w.m.zahl === 'pl' ? 'e' : 'o';
  return w.s.genau.length > 2 && w.s.genau.endsWith(endung) ? w.s.genau.slice(0, -1) : undefined;
}

/**
 * Verwandtschaftsbezeichnungen und Körperteile haben eine eigene, eingeschränkte
 * Reihe (Grammatik 5a.2). Die Tafeln dazu widersprechen sich im Lehrbuch (Grammatik
 * 5a.2 und Formentabelle B4), deshalb baut der Baukasten diese Wörter nicht – auch
 * wenn die allgemeine Reihe erlaubt wäre. Erkannt werden sie an den genannten
 * Ausnahmen, an Einträgen wie „ëšmi – mein Name“ oder „leba – ihr Herz“ und am
 * Wortschatz der Lektionen 4 (Familie) und 7 (Körper).
 */
function eingeschraenkt(ctx: Ctx, w: Wahl): boolean {
  if (w.s.fund.lektion === 4 || w.s.fund.lektion === 7 || ctx.ix.familieKoerper.has(w.s.genau)) return true;
  const namen = bedeutungen(w.s.fund.deutsch);
  if (namen.some((n) => FAMILIE_KOERPER.has(n))) return true;
  if (namen.some((n) => (ctx.ix.eingeschraenkt.get(n) ?? []).some((f) => f !== ctx.ohne))) return true;
  // Auch die Mehrzahl („ëšmone“) eines solchen Wortes
  return namen.some((n) => kandidaten(ctx.wb, n).some((s) => ctx.ix.ausnahmen.has(s.genau)));
}

/** Weibliche Wörter auf -to behalten das t vor dem Suffix mal (i aṯtayḏi), mal nicht (i qrayayḏe) – das Lehrbuch erklärt es nicht. */
const tUnklar = (w: Wahl) => w.m.geschlecht === 'f' && w.m.zahl === 'sg' && /to$/.test(w.s.genau);

/** Präposition mit Artikel: „im Haus“ = bu bayto (Grammatik 11b). */
function mitPraeposition(ctx: Ctx, t: readonly DeToken[]): Bau[] {
  if (t.length < 2) return [];
  const [p, ...rest] = t;
  const versch = praeposition(p.w, undefined, false);
  const artikel = versch ? versch.artikel : rest[0]?.w;
  const nach = versch ? rest : rest.slice(1);
  if (!artikel || !nach.length || nach.length > 2) return [];
  const aus: Bau[] = [];
  // Die deutsche Gruppe mit Artikel bauen, dann die Präposition davor schreiben („b“ + „u“ = „bu“).
  for (const g of gruppe(ctx, [{ w: artikel }, ...nach], 'nach-praeposition')) {
    const prae = praeposition(p.w, versch ? undefined : artikel, g.zahl === 'pl');
    const form = prae && ctx.ix.praepositionen.get(prae.bedeutung);
    const [art, ...uebrig] = g.stuecke;
    if (!form || art?.rolle !== 'Artikel') continue;
    const zusammen: Stueck = {
      text: form.form + art.text,
      rolle: 'Präposition mit Artikel',
      aus: [
        { text: `${form.form}-`, fund: form.fund, rolle: `Präposition „${prae.bedeutung}“` },
        { text: art.text, fund: art.fund!, rolle: `Artikel · ${art.merkmal ?? ''}` },
      ],
    };
    aus.push(mitRegel({ ...g, stuecke: [zusammen, ...uebrig] }, 'praeposition'));
  }
  return aus;
}

/** Ortswörter („hier“, „dort“) aus den Daten. */
function ortswort(ctx: Ctx, w: string): Stueck[] {
  if (!ORTSWORT.has(w)) return [];
  return auswahl(woerterFuer(ctx, w).filter((x) => x.m.wortart === 'anderes'))
    .slice(0, 1)
    .map((x) => ({ text: x.s.genau, rolle: 'Ortsangabe', fund: x.s.fund }));
}

// --- Sätze ----------------------------------------------------------------------------------------------

/** Die Personen eines Subjekts mit Geschlecht, wo die Form davon abhängt (ich: wer spricht; du: zu wem). */
function mitGeschlecht(ctx: Ctx, x: Person): { x: Person; variante?: string; ich?: 'm' | 'f' }[] {
  if (x.zahl !== 'sg' || x.p === 3) return [{ x }];
  if (x.p === 1) return (ctx.ich ? [ctx.ich] : (['m', 'f'] as const)).map((g) => ({ x: { ...x, g }, variante: g === 'm' ? 'als Junge' : 'als Mädchen', ich: g }));
  return (['m', 'f'] as const).map((g) => ({ x: { ...x, g }, variante: g === 'm' ? 'zu einem Jungen' : 'zu einem Mädchen' }));
}

const formStueck = (f: PForm, rolle: string, x: Person, zeit?: string): Stueck => ({
  text: f.form,
  rolle,
  fund: f.fund,
  merkmal: [zeit, personText(x)].filter(Boolean).join(' · '),
});

/** Das Prädikat nach „sein“: Adjektiv (angeglichen), Substantiv, Präposition oder Ortswort. */
function praedikat(ctx: Ctx, t: readonly DeToken[], x: Person, negiert: boolean): Bau[] {
  const aus: Bau[] = [];
  if (t.length === 1) {
    const w = t[0].w;
    const orte = ortswort(ctx, w);
    if (orte.length) return [{ stuecke: orte, regeln: [] }];
    // Adjektiv: in Geschlecht und Zahl wie das Subjekt (Grammatik 11a)
    for (const a of adjektiv(ctx, w, x.g, x.zahl)) {
      aus.push({ stuecke: [{ text: a.s.genau, rolle: 'Adjektiv', fund: a.s.fund, merkmal: geschlechtText(a.m.geschlecht, a.m.zahl) }], regeln: [{ regel: 'adjektiv', text: a.s.genau }] });
    }
  }
  // „im Haus“
  aus.push(...mitPraeposition(ctx, t));
  // Substantiv, auch mit „ein“ oder „kein“ – in der Zahl des Subjekts
  // Mit bestimmtem Artikel („er ist der Lehrer“) zeigt das Lehrbuch keine Beispiele; mit Possessiv steht er immer.
  for (const g of gruppe(ctx, t, 'praedikat', { zahl: x.zahl, negiert })) {
    if (g.regeln.some((r) => r.regel === 'artikel') && !g.regeln.some((r) => r.regel === 'possessiv')) continue;
    aus.push(g);
  }
  return aus;
}

/** Alle Sätze, die die Regeln aus einer deutschen Eingabe bauen können (ohne Gegenprobe). */
function baue(ctx: Ctx, t: readonly DeToken[]): Bau[] {
  const aus: Bau[] = [];
  const [a, b, ...rest] = t;
  if (!a || !b) return aus;
  const ix = ctx.ix;

  // Kopula: „ich bin müde“, „wir waren verheiratet“, „ihr seid nicht bereit“ (Grammatik 4b, 9c, 12a)
  for (const [formen, tafel, zeit] of [
    [SEIN, ix.kopula, 'Gegenwart'],
    [WAR, ix.kopulaVergangen, 'Vergangenheit'],
  ] as const) {
    for (const x0 of subjekt(a.w, b.w, formen)) {
      const negiert = rest[0]?.w === 'nicht' || KEIN.has(rest[0]?.w ?? '');
      // Verneint nur im Präsens: dafür stehen die Beispiele in Grammatik 9c.
      if (negiert && zeit !== 'Gegenwart') continue;
      const pt = rest[0]?.w === 'nicht' ? rest.slice(1) : rest;
      for (const { x, variante, ich } of mitGeschlecht(ctx, x0)) {
        const kop = formFuerPerson(negiert ? ix.kopulaNegiert : tafel, x);
        if (!kop) continue;
        for (const p of praedikat(ctx, pt, x, negiert)) {
          const k = formStueck(kop, negiert ? 'Kopula, verneint' : 'Kopula', x, zeit);
          // „die dem betreffenden Wort oder Satzteil folgt“; verneint steht latyo davor (Beispiele in 9c)
          const stuecke = negiert ? [k, ...p.stuecke] : [...p.stuecke, k];
          aus.push(mitRegel({ stuecke, regeln: p.regeln, variante: varianteZusammen(variante, p.variante), ich }, 'kopula'));
        }
      }
    }
  }

  // Kopula mit Substantiv als Subjekt: „der Bruder ist groß“ = u aḥuno rabo yo (Grammatik 11a)
  const i = t.findIndex((x, k) => k >= 2 && (x.w === 'ist' || x.w === 'sind'));
  if (i >= 2 && !istPronomen(a.w)) {
    const zahl: Zahl = t[i].w === 'ist' ? 'sg' : 'pl';
    for (const s of gruppe(ctx, t.slice(0, i), 'subjekt', { zahl })) {
      if (!s.regeln.some((r) => r.regel === 'artikel' || r.regel === 'possessiv')) continue;
      const x: Person = { p: 3, zahl, ...(s.g && zahl === 'sg' ? { g: s.g } : {}) };
      const pt = t.slice(i + 1);
      if (pt.length !== 1) continue;
      const kop = formFuerPerson(ix.kopula, x);
      for (const a2 of adjektiv(ctx, pt[0].w, x.g, zahl)) {
        if (!kop) continue;
        const adj: Stueck = { text: a2.s.genau, rolle: 'Adjektiv', fund: a2.s.fund, merkmal: geschlechtText(a2.m.geschlecht, a2.m.zahl) };
        aus.push(
          mitRegel(
            { stuecke: [...s.stuecke, adj, formStueck(kop, 'Kopula', x, 'Gegenwart')], regeln: [...s.regeln, { regel: 'adjektiv', text: adj.text }], variante: s.variante },
            'kopula',
          ),
        );
      }
    }
  }

  // „Das ist ein Haus“ = Demonstrativ + Substantiv + Kopula (Grammatik 5b, Beispiele „haṯe i aṯtayḏi yo“, „hani … ne“)
  if (/^(das|dies|diese|dieser|dieses)$/.test(a.w) && (b.w === 'ist' || b.w === 'sind') && rest.length) {
    const zahl: Zahl = b.w === 'ist' ? 'sg' : 'pl';
    for (const g of gruppe(ctx, rest, 'praedikat', { zahl })) {
      if (g.regeln.some((r) => r.regel === 'artikel' && !g.regeln.some((q) => q.regel === 'possessiv'))) continue;
      const dem = zahl === 'pl' ? ix.demonstrativ.pl : g.g === 'm' ? ix.demonstrativ.m : g.g === 'f' ? ix.demonstrativ.f : undefined;
      const x: Person = { p: 3, zahl, ...(g.g && zahl === 'sg' ? { g: g.g } : {}) };
      const kop = formFuerPerson(ix.kopula, x);
      if (!dem || !kop || !g.zahl) continue;
      const d: Stueck = { text: dem.form, rolle: 'Demonstrativpronomen', fund: dem.fund, merkmal: zahl === 'pl' ? 'Mehrzahl' : geschlechtText(g.g, 'sg') };
      aus.push(mitRegel(mitRegel({ stuecke: [d, ...g.stuecke, formStueck(kop, 'Kopula', x, 'Gegenwart')], regeln: g.regeln, variante: g.variante }, 'demonstrativ'), 'kopula'));
    }
  }

  // „haben“: „ich habe ein Auto“ = këtli … , „ich habe kein Auto“ = latli … (Grammatik 9b)
  for (const x0 of subjekt(a.w, b.w, HABEN)) {
    const negiert = KEIN.has(rest[0]?.w ?? '');
    for (const { x, variante, ich } of mitGeschlecht(ctx, x0)) {
      const h = formFuerPerson(negiert ? ix.nichtHaben : ix.haben, x);
      if (!h) continue;
      for (const o of gruppe(ctx, rest, 'objekt', { negiert })) {
        const hs = formStueck(h, negiert ? '„nicht haben“' : '„haben“', x);
        aus.push(mitRegel({ stuecke: [hs, ...o.stuecke], regeln: o.regeln, variante: varianteZusammen(variante, o.variante), ich }, 'haben'));
      }
    }
  }

  // „haben“ mit Substantiv als Subjekt: „die Wände haben Ohren“ = aš šurone këtte aḏne (Grammatik 9b)
  const hat = t.findIndex((x, k) => k >= 2 && (x.w === 'hat' || x.w === 'haben'));
  if (hat >= 2 && !istPronomen(a.w)) {
    const zahl: Zahl = t[hat].w === 'hat' ? 'sg' : 'pl';
    const negiert = KEIN.has(t[hat + 1]?.w ?? '');
    for (const s of gruppe(ctx, t.slice(0, hat), 'subjekt', { zahl })) {
      if (!s.regeln.some((r) => r.regel === 'artikel' || r.regel === 'possessiv')) continue;
      const x: Person = { p: 3, zahl, ...(s.g && zahl === 'sg' ? { g: s.g } : {}) };
      const h = formFuerPerson(negiert ? ix.nichtHaben : ix.haben, x);
      if (!h) continue;
      for (const o of gruppe(ctx, t.slice(hat + 1), 'objekt', { negiert })) {
        const hs = formStueck(h, negiert ? '„nicht haben“' : '„haben“', x);
        aus.push(mitRegel({ stuecke: [...s.stuecke, hs, ...o.stuecke], regeln: [...s.regeln, ...o.regeln], variante: varianteZusammen(s.variante, o.variante) }, 'haben'));
      }
    }
  }

  // „es gibt“: „es gibt Brot“ = kit …, „dort gibt es Bücher“ = kito kṯowe tamo, „im Bad gibt es …“ (Grammatik 9a)
  // „es gibt …“ oder „dort / im Bad gibt es …“
  const esVorn = a.w === 'es' && b.w === 'gibt';
  const gibt = esVorn ? 1 : t.findIndex((x, k) => k >= 1 && x.w === 'gibt' && t[k + 1]?.w === 'es');
  if (gibt >= 0) {
    const vorne = esVorn ? [] : t.slice(0, gibt);
    const hinten = t.slice(esVorn ? 2 : gibt + 2);
    const negiert = KEIN.has(hinten[0]?.w ?? '');
    const paar = negiert ? ix.esGibtNicht : ix.esGibt;
    const ort = vorne.length === 1 ? ortswort(ctx, vorne[0].w) : [];
    const pp = vorne.length >= 2 ? mitPraeposition(ctx, vorne) : [];
    if (paar && (vorne.length === 0 || ort.length || pp.length)) {
      for (const o of gruppe(ctx, hinten, 'objekt', { negiert })) {
        const anfang = pp.length ? pp : [{ stuecke: [], regeln: [] } as Bau];
        for (const p of anfang) {
          // Mit Ortswort am Ende stehen im Lehrbuch die langen Formen (kito kṯowe tamo, layto mede harke).
          const f = ort.length ? paar.lang : paar.kurz;
          const k: Stueck = { text: f.form, rolle: negiert ? '„es gibt nicht“' : '„es gibt“', fund: f.fund };
          const stuecke = ort.length ? [k, ...o.stuecke, ...ort] : [...p.stuecke, k, ...o.stuecke];
          aus.push(mitRegel({ stuecke, regeln: [...p.regeln, ...o.regeln], variante: o.variante }, 'esgibt'));
        }
      }
    }
  }

  // Futur: „ich werde schlafen“ = gëd + Grundform (Grammatik 7b), auch mit Objekt ohne Artikel
  if (ix.futur && t.length >= 3) {
    for (const x0 of subjekt(a.w, b.w, WERDEN)) {
      const inf = t[t.length - 1].w;
      const objekt = t.slice(2, -1);
      for (const verb of ix.verben.get(inf) ?? []) {
        for (const { x, variante, ich } of mitGeschlecht(ctx, x0)) {
          for (const f of formenFuerPerson(ix.grundformen.get(verb) ?? [], x)) {
          if (f.fund === ctx.ohne) continue;
          // Objekt ohne Artikel („Surayt lernen“) oder Ort mit Präposition („im Zimmer schlafen“)
          const objekte = objekt.length ? [...gruppe(ctx, objekt, 'objekt'), ...mitPraeposition(ctx, objekt)] : [{ stuecke: [], regeln: [] } as Bau];
          for (const o of objekte) {
            const stuecke = [stueck(ix.futur, 'Futurmarker'), formStueck(f, 'Verb, Grundform des Präsens', x), ...o.stuecke];
            aus.push(mitRegel({ stuecke, regeln: o.regeln, variante: varianteZusammen(variante, o.variante), ich }, 'futur'));
          }
          }
        }
      }
    }
  }

  // Präsens: „er schläft“ = ko- + Grundform (Grammatik 7b), auch mit Objekt ohne Artikel
  if (ix.praesens && istPronomen(a.w)) {
    for (const inf of ix.finit.get(b.w) ?? []) {
      const formen = praesens(inf);
      const verben = ix.verben.get(inf) ?? [];
      if (!formen) continue;
      for (const x0 of subjekt(a.w, b.w, formen)) {
        for (const verb of verben) {
          for (const { x, variante, ich } of mitGeschlecht(ctx, x0)) {
            for (const f of formenFuerPerson(ix.grundformen.get(verb) ?? [], x)) {
            // Vor Vokal nennt das Lehrbuch keine eigene Form des Präsensmarkers – dann nichts bauen.
            if (f.fund === ctx.ohne || /^[aeiouëä]/.test(f.form)) continue;
            const objekte = rest.length ? [...gruppe(ctx, rest, 'objekt'), ...mitPraeposition(ctx, rest)] : [{ stuecke: [], regeln: [] } as Bau];
            for (const o of objekte) {
              const verbStueck: Stueck = {
                text: ix.praesens.form + f.form,
                rolle: 'Verb im Präsens',
                merkmal: personText(x),
                aus: [
                  { text: `${ix.praesens.form}-`, fund: ix.praesens.fund, rolle: 'Präsensmarker' },
                  { text: f.form, fund: f.fund, rolle: `Grundform des Präsens · ${personText(x)}` },
                ],
              };
              aus.push(mitRegel({ stuecke: [verbStueck, ...o.stuecke], regeln: o.regeln, variante: varianteZusammen(variante, o.variante), ich }, 'praesens'));
            }
            }
          }
        }
      }
    }
  }

  // Wortgruppen allein: „mein Lehrer“, „drei Häuser“, „ein großes Haus“, „im Haus“ – aber nur, wenn eine Regel mitspielt
  if (!aus.length) {
    for (const g of [...gruppe(ctx, t, 'allein'), ...mitPraeposition(ctx, t)]) if (g.regeln.length) aus.push(g);
  }
  return aus;
}

// --- Gegenprobe ---------------------------------------------------------------------------------------------

/** Ein Satz der Daten, für den die Regeln (ohne ihn zu kennen) etwas gebaut haben. */
export interface Regelprobe {
  fund: Fund;
  gebaut: Regelsatz[];
  /** Welche Regeln an einem Fehlgriff schuld sind */
  schuld: RegelId[];
  getroffen: boolean;
  /**
   * Nimmt das Lehrbuch andere Wörter als der Baukasten („kosoyam talafon“ statt
   * einer Form von mtalfan), prüft der Satz die Regel nicht – er zählt dann weder
   * als Treffer noch als Fehlgriff.
   */
  vergleichbar: boolean;
}

export interface Regelgegenprobe {
  proben: Regelprobe[];
  /** Welche Regel abgeschaltet wurde und warum – in der Reihenfolge der Gegenprobe */
  abgeschaltet: { regel: RegelId; grund: 'daneben' | 'kein Beleg'; saetze: Fund[] }[];
  regeln: Map<RegelId, { getroffen: number; belegeGetroffen: number; daneben: number; an: boolean }>;
}

function regelsaetze(ctx: Ctx, anfrage: string, erlaubt?: ReadonlySet<RegelId>): Regelsatz[] {
  const t = zerlegeDeutsch(anfrage);
  if (t.length < 2 || t.length > 8) return [];
  const gesehen = new Map<string, Regelsatz>();
  for (const b of baue(ctx, t)) {
    if (erlaubt && b.regeln.some((r) => !erlaubt.has(r.regel))) continue;
    const latein = text(b.stuecke);
    const da = gesehen.get(latein);
    // Gleiche Sätze für Junge und Mädchen nur einmal
    if (da) {
      if (da.variante !== b.variante) {
        delete da.variante;
        delete da.ich;
      }
      continue;
    }
    gesehen.set(latein, {
      stufe: 'zusammengesetzt',
      latein,
      deutsch: anfrage.trim(),
      stuecke: b.stuecke,
      regeln: b.regeln,
      ...(b.variante ? { variante: b.variante } : {}),
      ...(b.ich ? { ich: b.ich } : {}),
    });
  }
  return [...gesehen.values()];
}

const regelGegenproben = new WeakMap<Woerterbuch, Regelgegenprobe>();

/** Kommt das Stück genau so (Wort für Wort, hintereinander) im echten Satz vor? */
function kommtVor(stueck: string, echt: readonly string[]): boolean {
  const s = surWoerter(stueck);
  return echt.some((e) => {
    const w = surWoerter(e);
    for (let i = 0; i + s.length <= w.length; i++) if (s.every((x, k) => w[i + k] === x)) return true;
    return false;
  });
}

/** Die Surayt-Fassungen eines Eintrags („gëd goraš / goraš“ sind zwei). */
const fassungen = (latein: string) => {
  const ohne = latein.replace(/\([^)]*\)/g, ' ');
  return [ohne, ...ohne.split(/\s*[,;/~]\s*/)].filter((x) => surWoerter(x).length);
};

export function regelGegenprobe(wb: Woerterbuch): Regelgegenprobe {
  const da = regelGegenproben.get(wb);
  if (da) return da;
  const ix = tafeln(wb);
  const proben: Regelprobe[] = [];
  // Übersetzt das Lehrbuch denselben deutschen Text an mehreren Stellen verschieden
  // („kogoraš – er zieht“ in Grammatik 7, „goraš – er zieht“ im Bedingungssatz von
  // Grammatik 22), zählt jede dieser Fassungen als getroffen.
  const gleichesDeutsch = new Map<string, string[]>();
  const deKey = (d: string) => d.normalize('NFC').trim().toLowerCase().replace(/[.!?]+$/, '');
  for (const f of wb.funde) {
    const k = deKey(f.deutsch);
    gleichesDeutsch.set(k, [...(gleichesDeutsch.get(k) ?? []), ...fassungen(f.latein)]);
  }
  const echtVon = (f: Fund) => gleichesDeutsch.get(deKey(f.deutsch)) ?? fassungen(f.latein);
  // Längere Sätze nur, wenn ein Wort darin auf eine Regel hinweist (spart auf dem Handy Zeit)
  const hinweis = (t: DeToken[]) =>
    t.length <= 3 ||
    t.some((x) => SEIN.includes(x.w) || WAR.includes(x.w) || HABEN.includes(x.w) || WERDEN.includes(x.w) || x.w === 'gibt' || BESTIMMT.has(x.w) || !!possessiv(x.w) || ix.finit.has(x.w) || /^(im|ins|vom|beim|in|aus|bei)$/.test(x.w));
  for (const f of wb.funde) {
    const dt = zerlegeDeutsch(f.deutsch);
    if (dt.length < 2 || dt.length > 12 || !hinweis(dt)) continue;
    // „der Laden, das Geschäft“: bei kurzen Wörterbuch-Einträgen jede Bedeutung einzeln (nicht bei Sätzen)
    // („kurz“: höchstens drei Wörter, ohne Zusätze wie „f.“, „pl.“ und Klammern gezählt)
    const kurz =
      f.art === 'wort' &&
      surWoerter(f.latein.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/(?:^|\s)(?:f|m|pl|Pl|Sg|sg)\.(?=\s)/g, ' ')).length <= 3;
    // („falsch, fehlerhaft“ ist kein Adjektiv mit Substantiv – die ganze Zeile nur ohne Komma)
    const deutsche = kurz ? [...(/[,;]/.test(f.deutsch) ? [] : [f.deutsch]), ...f.deutsch.split(/[,;]/)] : [f.deutsch];
    const gebaut: Regelsatz[] = [];
    for (const d of new Set(deutsche.map((x) => x.trim()).filter(Boolean))) {
      for (const r of regelsaetze({ wb, ix, ohne: f }, d)) if (!gebaut.some((g) => gleicherText(g.latein, r.latein))) gebaut.push(r);
    }
    if (!gebaut.length) continue;
    const echt = echtVon(f);
    const richtig = (r: Regelsatz) => echt.some((e) => gleicherText(e, r.latein));
    proben.push({ fund: f, gebaut, schuld: [], getroffen: gebaut.some(richtig), vergleichbar: true });
  }

  // Welche Wörter (Stichwort bzw. Verb) im echten Satz stehen – Wort für Wort erklärt, ohne den Satz selbst
  const wortVon = (f: Fund) => f.verb ?? genau(stichwort(f.latein));
  const woerterImSatz = new Map<Fund, Set<string>>();
  const woerterIn = (f: Fund) => {
    let set = woerterImSatz.get(f);
    if (!set) {
      set = new Set<string>(surWoerter(f.latein));
      for (const t of erklaere(wb, f.latein, { ohne: f }).teile) {
        const funde = t.art === 'eintrag' ? t.funde : t.art === 'zerlegt' ? t.stuecke.flatMap((x) => x.funde) : [];
        for (const x of funde) set.add(wortVon(x));
      }
      woerterImSatz.set(f, set);
    }
    return set;
  };
  /** Die Wörter mit eigener Bedeutung (nicht Kopula, Artikel, Marker …) */
  const inhaltswoerter = (r: Regelsatz) =>
    r.stuecke.flatMap((x) => (x.aus ? x.aus.slice(x.rolle === 'Verb im Präsens' ? 1 : 0, x.rolle === 'Verb im Präsens' ? 2 : 1) : [x])).filter(
      (x) => !!x.fund && /Substantiv|Adjektiv|Zahl|Verb|Grundform|ohne Endung/.test(x.rolle),
    );
  const praesentativ = new Set(
    [...wb.seiten.values()].filter((x) => x.titel === 'Pseudo- und Hilfsverben').flatMap((x) => x.eintraege.filter((e) => e.deutsch === 'da ist').map((e) => genau(e.latein))),
  );
  /** Benutzt der Satz dieselben Wörter wie das Lehrbuch? Nur dann prüft er die Regeln. */
  const vergleichbar = (p: Regelprobe, r: Regelsatz) => {
    const da = woerterIn(p.fund);
    if (!inhaltswoerter(r).every((x) => da.has(wortVon(x.fund!)) || da.has(genau(x.text.replace(/-$/, ''))))) return false;
    // Nimmt das Lehrbuch dasselbe Wort in der anderen Zahl („ab buḥonayḏe – seine Forschung“, Mehrzahl
    // für eine deutsche Einzahl), prüft der Satz die Wortwahl, nicht die Regel.
    const artikel = new Set([ix.artikel.m?.form, ix.artikel.f?.form].filter(Boolean));
    const plural = (w: string) => w === ix.artikel.plV?.form || (/^a[^aeiouëä]$/.test(w) && !artikel.has(w));
    const gebaut = surWoerter(r.latein);
    // „kalën“ statt der Kopula: Präsentativpartikel und Kopula sagen im Nominalsatz dasselbe
    // („Kale bu bayto. = Bu bayto yo.“, Grammatik 24c) – das Lehrbuch hat hier die andere Wahl getroffen.
    if (r.regeln.some((x) => x.regel === 'kopula') && echtVon(p.fund).some((e) => surWoerter(e).some((w) => praesentativ.has(w)))) return false;
    for (const e of echtVon(p.fund).map(surWoerter)) {
      if (e.length !== gebaut.length) continue;
      const anders = e.map((w, i) => [w, gebaut[i]]).filter(([a, b]) => a !== b);
      if (anders.length && anders.every(([a, b]) => plural(a) !== plural(b) && (artikel.has(a) || artikel.has(b)))) return false;
    }
    return true;
  };
  /**
   * Untereinträge des großen Glossars sind feste Wendungen („b ḥänäke – im Scherz“, „obe xabro –
   * Bescheid geben“): Wo sie anders gebaut sind als die Regel, ist das die Wendung, kein Fehler der Regel.
   */
  const wendung = (f: Fund) => /^GL-[^.]+\.(?!\d+\.\d+$)[^.]*[a-z]/.test(f.id) && !/\.\d+\.\d+$/.test(f.id);
  /**
   * Getroffen – auch wenn Wortschatz oder Glossar das Wort ohne Artikel nennen
   * („mawlodayḏax – dein (f.) Geburtstag“, „lwošo – das Kleiden“).
   */
  const trifft = (p: Regelprobe, r: Regelsatz) => {
    const echt = echtVon(p.fund);
    if (echt.some((e) => gleicherText(e, r.latein))) return true;
    const ohneArtikel = r.stuecke[0]?.rolle === 'Artikel' ? text(r.stuecke.slice(1)) : undefined;
    return !!ohneArtikel && surWoerter(ohneArtikel).length === 1 && echt.some((e) => gleicherText(e, ohneArtikel));
  };

  // Regeln nacheinander abschalten, bis keine mehr danebenliegt: Schuld hat eine Regel, deren Stück
  // nicht im echten Satz vorkommt; kommen alle vor (falsche Reihenfolge), die äußere.
  const an = new Set(DEFS.map((d) => d.id));
  const zaehle = () => {
    const regeln = new Map(DEFS.map((d) => [d.id, { getroffen: 0, belegeGetroffen: 0, daneben: 0, an: an.has(d.id) }]));
    for (const p of proben) {
      const gueltig = p.gebaut.filter((r) => r.regeln.every((x) => an.has(x.regel)));
      p.schuld = [];
      p.getroffen = false;
      p.vergleichbar = true;
      if (!gueltig.length) continue;
      const echt = echtVon(p.fund);
      const treffer = gueltig.find((r) => trifft(p, r));
      p.getroffen = !!treffer;
      if (treffer) {
        for (const id of new Set(treffer.regeln.map((x) => x.regel))) {
          const s = regeln.get(id)!;
          s.getroffen++;
          if (ix.regeln.get(id)?.belege.includes(p.fund)) s.belegeGetroffen++;
        }
        continue;
      }
      const pruefbar = wendung(p.fund) ? [] : gueltig.filter((r) => vergleichbar(p, r));
      p.vergleichbar = pruefbar.length > 0;
      const schuld = new Set<RegelId>();
      for (const r of pruefbar) {
        const falsch = r.regeln.filter((x) => !kommtVor(x.text, echt));
        for (const x of falsch.length ? falsch : r.regeln.slice(0, 1)) schuld.add(x.regel);
      }
      p.schuld = [...schuld];
      for (const id of schuld) regeln.get(id)!.daneben++;
    }
    return regeln;
  };
  const abgeschaltet: Regelgegenprobe['abgeschaltet'] = [];
  let stand = zaehle();
  for (;;) {
    const schlimmste = [...stand.entries()].filter(([id, s]) => an.has(id) && s.daneben > 0).sort((x, y) => y[1].daneben - x[1].daneben)[0];
    if (schlimmste) {
      const id = schlimmste[0];
      abgeschaltet.push({ regel: id, grund: 'daneben', saetze: proben.filter((p) => p.schuld.includes(id)).map((p) => p.fund) });
      an.delete(id);
      stand = zaehle();
      continue;
    }
    // Ohne einen genau getroffenen Beleg bleibt eine Regel aus.
    const ohneBeleg = [...stand.entries()].filter(([id, s]) => an.has(id) && s.belegeGetroffen === 0);
    if (!ohneBeleg.length) break;
    for (const [id] of ohneBeleg) {
      abgeschaltet.push({ regel: id, grund: 'kein Beleg', saetze: [] });
      an.delete(id);
    }
    stand = zaehle();
  }
  const ergebnis = { proben, regeln: stand, abgeschaltet };
  regelGegenproben.set(wb, ergebnis);
  return ergebnis;
}

/** Die Regeln, die die Gegenprobe bestanden haben. */
export function eingeschalteteRegeln(wb: Woerterbuch): Set<RegelId> {
  return new Set([...regelGegenprobe(wb).regeln].filter(([, s]) => s.an).map(([id]) => id));
}

/**
 * Baut einen deutschen Satz nach den Regeln der Grammatik zusammen – nur mit
 * Regeln, die die Gegenprobe bestanden haben (oder `opt.regeln`).
 */
export function nachRegeln(wb: Woerterbuch, anfrage: string, opt: RegelOptionen = {}): Regelsatz[] {
  const ix = tafeln(wb);
  const erlaubt = opt.regeln ?? eingeschalteteRegeln(wb);
  if (!erlaubt.size) return [];
  return regelsaetze({ wb, ix, ohne: opt.ohne, ich: opt.ich }, anfrage, erlaubt);
}

/** Für Tests: alle Wörter, aus denen ein gebauter Satz besteht, müssen aus den Daten stammen. */
export function datenWort(wb: Woerterbuch, form: string): boolean {
  return alleSchreibweisen(wb).some((s) => s.genau === form);
}

/**
 * Ein Beispiel aus dem Lehrbuch für den Bauplan: am liebsten ein Beleg, den die
 * Gegenprobe mit dieser Regel genau getroffen hat, mit Aufnahme.
 */
export function beispielFuer(wb: Woerterbuch, id: RegelId): Fund | undefined {
  const regel = tafeln(wb).regeln.get(id);
  if (!regel) return undefined;
  const getroffen = new Set(
    regelGegenprobe(wb)
      .proben.filter((p) => p.getroffen && p.gebaut.some((r) => r.regeln.some((x) => x.regel === id)))
      .map((p) => p.fund),
  );
  return [...regel.belege].sort(
    (a, b) => Number(getroffen.has(b)) - Number(getroffen.has(a)) || Number(!!b.audio) - Number(!!a.audio) || Number(b.latein.includes(' ')) - Number(a.latein.includes(' ')),
  )[0];
}

