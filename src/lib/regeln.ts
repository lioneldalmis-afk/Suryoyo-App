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
import { alleSchreibweisen, artikelVor, erklaere, type Schreibweise } from './wortfuerwort';
import { bedeutungen, genau, gleicherText, kandidaten, merkmaleMitCache, surWoerter, zeitVon, type Merkmale, type Zahl } from './baukasten';
import { RANG, stichwort } from './woerterbuch';
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
  FRAGEWOERTER,
  HILFSFORMEN,
  modalFuerDritte,
  modalVon,
  synonymeVon,
  SYNONYME as DEUTSCHE_SYNONYME,
  ZUKUNFT,
  zerlegeSatz,
  zerlegeDeutsch,
  gleichePerson,
  befinden,
  grundformen,
  istFunktionswort,
  praepositionFrei,
  pronomenNachPraeposition,
  partizipVon,
  praeteritumVon,
  vergangenheit,
  trennbar,
  TRENNBAR,
  objektPronomen,
  hauptsatzStellung,
  dassArt,
  type DeToken,
  type Person,
} from './deutsch';

// --- Die Regeln -------------------------------------------------------------------------------

export type RegelId =
  | 'artikel'
  | 'possessiv'
  | 'possessiv2'
  | 'zahl'
  | 'adjektiv'
  | 'praeposition'
  | 'praeposition2'
  | 'praepsuffix'
  | 'kopula'
  | 'demonstrativ'
  | 'haben'
  | 'esgibt'
  | 'futur'
  | 'praesens'
  | 'muster'
  | 'praeteritum'
  | 'muster2'
  | 'objektsuffix'
  | 'subjunktiv'
  | 'nebensatz'
  | 'verbalsatz'
  | 'modal'
  | 'vorschlag'
  | 'jussiv'
  | 'verneinung'
  | 'adverb'
  | 'frage'
  | 'janein'
  | 'und';

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
  zitat: { seite: string; enthaelt: string[] } | { seite: string; enthaelt: string[] }[];
  /** Nur Beispiele des Abschnitts, die das erfüllen (Präsens und Futur stehen im selben Abschnitt). */
  beleg?: (f: Fund, ix: Tafeln) => boolean;
  /**
   * Statt eines Grammatik-Abschnitts ein Wort aus dem Glossar, das die Regel trägt („w (conj.) –
   * und“); Belege sind dann die Sätze der Daten, auf die `beleg` passt.
   */
  glossar?: (ix: Tafeln) => Fund | undefined;
  /** Weitere Belege aus allen Einträgen der Daten (zusätzlich zu den Beispielen des Abschnitts) */
  ausDaten?: (f: Fund, ix: Tafeln) => boolean;
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
    // „ëšmi – mein Name“, „barṯi – meine Tochter“, „qarce – sein Kopf“
    id: 'possessiv2',
    name: 'Possessivsuffix (eingeschränkte Reihe)',
    stellen: [{ seite: '1.5.3', abschnitt: '2. Die eingeschränkte Reihe' }],
    zitat: { seite: '1.5.3', enthaelt: ['Diese Reihe ist auf Verwandtschaftsbezeichnungen und Körperteile beschränkt', 'welches jedoch keinen Artikel tragen darf'] },
    beleg: (f) => /^(mein|dein|sein|ihr|unser|euer)/.test(f.deutsch),
    // Dazu Einträge wie „barṯi – meine Tochter“, „leba – ihr Herz“ (ein Wort ohne Artikel und ohne Suffix der allgemeinen Reihe)
    ausDaten: (f, ix) => [...ix.eingeschraenkt.values()].some((l) => l.includes(f)),
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
    // „bëṯr u bayto – hinter dem Haus“, „taḥt i ṭëbliṯo – unter dem Tisch“; ohne Artikel „b dukano – in einem Geschäft“
    id: 'praeposition2',
    name: 'Präposition vor dem Substantiv',
    stellen: [
      { seite: '1.11.2', abschnitt: '1. Präpositionen allgemein' },
      { seite: '1.11.2', abschnitt: '2. Präpositionen mit Suffixen' },
    ],
    zitat: { seite: '1.11.2', enthaelt: ['Die häufigsten Präpositionen sind', 'stehen vor einem mit Artikel versehenen Substantiv'] },
    beleg: (f, ix) => {
      const w = surWoerter(f.latein);
      return w.length >= 2 && [...ix.praepositionenFrei.values()].some((p) => p.form.length > 1 && p.form === w[0]);
    },
  },
  {
    // „acmi – mit mir“: die Tabelle „Präpositionen mit Pronominalsuffixen“ (Grammatik 11b)
    id: 'praepsuffix',
    name: 'Präposition mit Suffix',
    stellen: [{ seite: '1.11.2', abschnitt: '2. Präpositionen mit Suffixen' }],
    zitat: { seite: '1.11.2', enthaelt: ['Die Präpositionen können mit den Pronominalsuffixen versehen werden'] },
    beleg: (f) => surWoerter(f.latein).length === 1,
    // Dazu die Einträge der Daten wie „acmi – mit mir (Präposition cam + Objektsuffix 1.Sg.)“, „mene – von ihm“
    ausDaten: (f, ix) => ix.praepSuffixe.size > 0 && f.art === 'wort' && surWoerter(f.latein).length === 1 && /^(mit|auf|in|von|aus|bei) (mir|dir|ihm|ihr|uns|euch|ihnen)\b/.test(f.deutsch),
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
    stellen: [
      { seite: '1.7.2', abschnitt: 'b)' },
      { seite: '2.1.3', abschnitt: 'a) Häufige Verben' },
    ],
    zitat: [
      { seite: '1.7.2', enthaelt: ['Für die Kennzeichnung des Präsens'] },
      { seite: '2.1.3', enthaelt: ['verschmilzt der Vokal des Präsensmarkers'] },
    ],
    beleg: (f, ix) => !!ix.praesens && surWoerter(f.latein).some((w) => /^k/.test(w) && w.length > 3) && !f.verb,
  },
  {
    // Verben, von denen das Glossar nur die Formen für „er“ und „sie“ nennt (siehe `verbMuster`)
    id: 'muster',
    name: 'Grundform des Präsens nach dem Muster der Verbtabellen',
    stellen: [{ seite: '1.7.2', abschnitt: 'a)' }],
    zitat: { seite: '1.7.2', enthaelt: ['An diese Formen werden', 'Alle regelmäßigen Verben bilden die Grundform des Präsens auf diese Weise', 'als erste Zitierform für Verben'] },
  },
  {
    // „Saro zwënla čanṭa – Saro kaufte eine Tasche“, „u Aday ftëḥle rastorant – Aday hat ein Restaurant eröffnet“
    id: 'praeteritum',
    name: 'Präteritum',
    stellen: [{ seite: '1.8.2', abschnitt: 'a) Das Verb: Präteritum' }],
    zitat: { seite: '1.8.2', enthaelt: ['Bei der Vergangenheit ist es wichtig zwischen transitiven und intransitiven Verben zu unterscheiden'] },
    beleg: (f) => surWoerter(f.latein).length > 1,
  },
  {
    // Verben, von denen das Glossar nur „grëšle, grëšla“ (er, sie) nennt
    id: 'muster2',
    name: 'Präteritum nach dem Muster der Verbtabellen',
    stellen: [{ seite: '1.8.2', abschnitt: 'a) Das Verb: Präteritum' }],
    zitat: { seite: '1.8.2', enthaelt: ['Die Bildung des Präteritums transitiver Verben sieht wie folgt aus', 'Diese Suffixe korrespondieren mit denen des Präsens'] },
  },
  {
    // „kobeli u kṯowo – er gibt mir das Buch“, „korëḥmalle – ich liebe ihn“
    id: 'objektsuffix',
    name: 'Pronomen als Objekt: L-Suffix am Präsens',
    stellen: [
      { seite: '2.6.3', abschnitt: '1. L-Suffixe an der Präsensflexion' },
      { seite: '1.16.3', abschnitt: 'e) Objektmarkierung im Präsens I' },
    ],
    zitat: [
      { seite: '2.6.3', enthaelt: ['die an die flektierte Präsensform angefügt werden', 'Die L-Suffixe stehen auch am Präsens sowohl für das direkte'] },
      { seite: '1.16.3', enthaelt: ['Viel häufiger ist das Objekt als Suffix der Verbform angehängt'] },
    ],
    beleg: (f) => surWoerter(f.latein).length >= 1 && !/^-/.test(f.latein),
  },
  // --- Ganze Sätze (Phase 4b, Schritt 7b): Grammatik 17–24 ---
  {
    id: 'verbalsatz',
    name: 'Verbalsatz: Subjekt – Verb – Objekt',
    stellen: [{ seite: '2.1.3', abschnitt: 'd) Verbalsätze' }],
    zitat: { seite: '2.1.3', enthaelt: ['Die übliche Wortstellung des einfachen Satzes ist Subjekt-Verb-Objekt'] },
  },
  {
    id: 'modal',
    name: 'Modalverb mit Subjunktiv',
    stellen: [{ seite: '2.4.3', abschnitt: 'c) Ausdruck der Modalität' }],
    zitat: { seite: '2.4.3', enthaelt: ['Das flektierte Vollverb folgt direkt', 'werden im Surayt nicht unterschieden', 'Für das Modalverb „wollen, mögen“'] },
  },
  {
    id: 'vorschlag',
    name: 'Frage nach einem Vorschlag: Subjunktiv',
    // „Šotina ucdo qaḥwa …? – Wollen wir jetzt Kaffee trinken …?“ steht bei den Alternativfragen (Grammatik 24a)
    stellen: [
      { seite: '2.7.3', abschnitt: '1. Der Subjunktiv allgemein' },
      { seite: '2.8.3', abschnitt: '2) Alternativfragen' },
    ],
    zitat: { seite: '2.7.3', enthaelt: ['So steht der Subjunktiv bei Fragen der Vergewisserung'] },
    beleg: (f) => !f.stellen?.some((st) => st.seite === '2.8.3') || /^(wollen|sollen) wir\b|^soll ich\b/i.test(f.deutsch),
  },
  {
    id: 'jussiv',
    name: 'ṭro mit Subjunktiv: „soll“',
    stellen: [{ seite: '2.7.3', abschnitt: '2. Die Partikel' }],
    zitat: { seite: '2.7.3', enthaelt: ['hat eine jussivische Bedeutung'] },
  },
  {
    id: 'verneinung',
    name: 'Verneinung mit lo',
    stellen: [
      { seite: '2.6.3', abschnitt: '2. Verbalsatz' },
      { seite: '2.6.3', abschnitt: 'd) Negiertes Futur' },
      { seite: '2.6.3', abschnitt: 'e) Die Negationspartikel' },
    ],
    zitat: { seite: '2.6.3', enthaelt: ['Verbalsätze werden mit der Negationspartikel', 'steht die Negationspartikel vor dem Hilfsverb', 'beide werden durch', 'Bei Verben mit vokalischem Anlaut verschmilzt'] },
  },
  {
    id: 'adverb',
    name: 'Adverbien der Zeit und des Ortes',
    stellen: [{ seite: '2.2.3', abschnitt: 'b) Adverbien' }],
    zitat: { seite: '2.2.3', enthaelt: ['Zu den häufigsten Adverbien der Zeit gehören', 'Die Ortsadverbien haben keine bestimmte Kennzeichnung'] },
    // Belege: die Sätze im Abschnitt „Beispiele für die Verwendung der Adverbien“
    beleg: (f) => f.art === 'satz',
  },
  {
    id: 'frage',
    name: 'Frage mit Fragewort',
    // Die Unterabschnitte sind im Lehrbuch mit „1)“ nummeriert und stehen deshalb einzeln da
    stellen: [
      { seite: '2.8.3', abschnitt: 'a) Direkte Fragesätze' },
      { seite: '2.8.3', abschnitt: '1) Einfache Fragewörter' },
      { seite: '2.8.3', abschnitt: '2) Zusammengesetzte Fragewörter' },
    ],
    zitat: { seite: '2.8.3', enthaelt: ['Direkte Fragesätze werden überwiegend durch ein Fragewort eingeleitet', 'folgt diese direkt auf das Fragewort'] },
    beleg: (f) => f.art === 'satz',
  },
  {
    id: 'janein',
    name: 'Frage ohne Fragewort',
    stellen: [
      { seite: '2.8.3', abschnitt: '2. Direkte Fragesätze ohne' },
      { seite: '2.8.3', abschnitt: '1) Ja-/Nein-Fragen' },
      { seite: '2.8.3', abschnitt: '2) Alternativfragen' },
    ],
    zitat: { seite: '2.8.3', enthaelt: ['aus der Satzmelodie deutlich', 'In der letzten Silbe des Satzes geht man mit der Stimme nach oben', 'Die Fragepartikel'] },
    beleg: (f) => f.art === 'satz',
  },
  {
    // „An nacime këbci d zawnina raḏayto ḥaṯto – Die Kinder wollen, dass wir ein neues Auto kaufen“, „d korax – dass er sucht“
    id: 'subjunktiv',
    name: 'Subjunktiv nach d „dass“',
    stellen: [{ seite: '2.7.3', abschnitt: '1. Der Subjunktiv allgemein' }],
    zitat: { seite: '2.7.3', enthaelt: ['Der Subjunktiv wird durch die Grundform des Präsens', 'in Verbindung mit der Konjunktion'] },
    beleg: (f, ix) => !!ix.dass && surWoerter(f.latein).includes(ix.dass.form),
    // Dazu Einträge wie „d korax – dass er sucht“, „d zayrina lxu – dass wir euch besuchen“
    ausDaten: (f, ix) => !!ix.dass && surWoerter(f.latein)[0] === ix.dass.form && /^\(?dass\)? /.test(f.deutsch),
  },
  {
    // „miḏe du Aday … koṯe mu cwodo – weil Aday … von der Arbeit kommt“; „koḏacno d lathatu Holandoye – Ich weiß, dass ihr keine Niederländer seid“
    id: 'nebensatz',
    name: 'Nebensatz mit miḏe d „weil“ und d „dass“',
    stellen: [],
    zitat: [],
    glossar: (ix) => ix.weil?.fund,
    beleg: (f, ix) => f.art === 'satz' && ((!!ix.weil && /\bweil\b/.test(f.deutsch) && surWoerter(f.latein).includes(ix.weil.form)) || (!!ix.dass && /\b(weiß|wusste|sagt|sagte)\b.*, dass\b/.test(f.deutsch) && surWoerter(f.latein).includes(ix.dass.form))),
  },
  {
    id: 'und',
    name: 'Zwei Sätze mit „und“',
    stellen: [],
    zitat: [],
    glossar: (ix) => ix.und?.fund,
    // Sätze der Daten, in denen das Lehrbuch zwei Sätze mit „w“ verbindet („komoyad u ḥawlo w kogorašle – er nimmt das Seil und zieht es“)
    beleg: (f, ix) => f.art === 'satz' && !!ix.und && surWoerter(f.latein).slice(1).includes(ix.und.form) && /\bund\b/.test(f.deutsch) && /^[^,]*$/.test(f.deutsch),
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
  /**
   * Nach dem Muster der Verbtabellen gebildet (nicht aus einer Tabelle): aus der Form für
   * „er“ oder „sie“ im Glossar (`basis`) und der Endung, die die Tabellen für diese Person
   * zeigen – `wie` ist die Form eines Vorbild-Verbs mit dieser Endung („guršina“).
   */
  muster?: { basis: string; endung: string; wie: string; wieFund: Fund };
  /** Aus einer Tabelle des Lehrbuchs ohne eigene Einträge: wo sie steht („„mit“ mit Suffix, Tabelle in Grammatik 11b“) */
  tabelle?: string;
  /** Steht die Form auch als Eintrag in den Daten („acmi – mit mir“), dieser Eintrag */
  eintrag?: Fund;
  /** Zusammengesetzt aus diesen Teilen (z. B. Grundform + Objektsuffix) */
  teile?: Teilstueck[];
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
  /** Eingeschränkte Reihe: „-i“, „-ux“ … (abgelesen an ëšmo „Name“, Grammatik 5a.2 und Formentabelle B4) */
  possessivEng: PForm[];
  /** Selbständiges Demonstrativpronomen für die Nähe: hano, haṯe, hani */
  demonstrativ: { m?: Form; f?: Form; pl?: Form };
  /** Die kurzen Präpositionen nach ihrer Bedeutung: „in“ → b, „zu“ → l, „aus“ → m, „bei“ → s */
  praepositionen: Map<string, Form>;
  /** Präpositionen, die für sich stehen: „mit“ → cam, „hinter“ → bëṯr, „in“ → b, „aus“ → me (Grammatik 11b) */
  praepositionenFrei: Map<string, Form>;
  /** Präposition (Form, z. B. „cam“) → Formen mit Suffix aus der Tabelle in Grammatik 11b */
  praepSuffixe: Map<string, PForm[]>;
  /** Verb (Form für „er“) → Präposition, mit der es sein Objekt anschließt („laqën b – sie trafen (jdn.)“) */
  rektion: Map<string, Form>;
  /** kit / kito, layt / layto */
  esGibt?: { kurz: Form; lang: Form };
  esGibtNicht?: { kurz: Form; lang: Form };
  praesens?: Form;
  futur?: Form;
  /** Deutsches Verb (Infinitiv) → Verben (Zitierform) */
  verben: Map<string, string[]>;
  /** Zitierform → Grundformen des Präsens mit Person */
  grundformen: Map<string, PForm[]>;
  /** Zitierform → Präteritum mit Person (Tabellen; aus dem Glossar nach dem Muster der Tabellen) */
  praeteritum: Map<string, PForm[]>;
  /** Das Muster der Verbtabellen für das Präteritum */
  musterVergangen: Muster;
  /** Objektsuffixe am Präsens (Formentabelle 4.9, Grammatik 22a) */
  objekt: ObjektSuffixe;
  /** Deutsches Partizip („gespielt“) → Infinitive; deutsches Präteritum („spielte“) → Infinitiv und Person */
  partizip: Map<string, string[]>;
  praeteritumDe: Map<string, { inf: string; stelle: number }[]>;
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
  // --- Ganze Sätze (Grammatik 17–24) ---
  /** kib- „können“ und layb- „nicht können“ (Grammatik 20c, Formentabelle „Pseudo- und Hilfsverben“) */
  kann: PForm[];
  kannNicht: PForm[];
  /** Modalpartikel für „müssen“ (Grammatik 20c): die, die das Lehrbuch am häufigsten für „müssen“ nimmt */
  muessen?: Form;
  /** Alle Modalpartikeln für „müssen“, die das Lehrbuch nennt („In gleicher Position können auch … stehen“) */
  muessenAlle: Set<string>;
  /** ṭro (Grammatik 23d) */
  tro?: Form;
  /** Negationspartikel lo („nein, nicht“) */
  nicht?: Form;
  /** w „und“, aw „oder“ */
  und?: Form;
  oder?: Form;
  /** d „dass“ (Konjunktion, Grammatik 7) und miḏe d „weil“ (Wortschatz) */
  dass?: Form;
  weil?: Form;
  /** Fragewörter (Grammatik 24a): „wo“ → ayko … */
  fragewoerter: Map<string, Form>;
  /** Fragepartikel ma „etwa“, im Deutschen oft „denn“ (Grammatik 24a) */
  fragepartikel?: Form;
  /** Adverbien (Grammatik 18b und „(adv.)“ im Glossar): „heute“ → adyawma, „heute abend“ → adcaṣriye */
  adverbien: Map<string, Form[]>;
  /** Adverbien des Ortes und „weitere Adverbien“ (ṭawwo „gut“) – keine Zeitangaben */
  keineZeitangabe: Set<string>;
  /**
   * Personennamen aus den Daten („Aday“, „Saro“): in Umschrift und Deutsch gleich geschrieben;
   * das Geschlecht zeigt der Artikel davor („u Aday“, „i Saro“), Belege pro Eintrag.
   */
  namen: Map<string, { form: string; belege: { fund: Fund; g?: 'm' | 'f' }[] }>;
  /** Das Muster der Verbtabellen mit seiner Prüfung */
  muster: Muster;
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

// --- Verben nach dem Muster der Verbtabellen ---------------------------------------------------------
//
// Das Lehrbuch konjugiert 49 Verben in allen Personen (Verbkonjugation „Surcofo“, Formentabellen),
// das Glossar nennt von jedem Verb die Formen für „er“ und „sie“. An den Tabellen sieht man, wie
// die übrigen Personen aus diesen beiden gebildet werden: „goraš, guršo“ → gorašno (ich, m.),
// guršono (ich, f.), guršina (wir) …; „oṯe, ëṯyo“ → oṯeno, ëṯyono, oṯina. Der Baukasten liest
// dieses Muster aus den Tabellen ab (je Verbart und Stamm) und prüft es an jeder Tabelle, ohne sie
// zu kennen. Nur wo es bei allen Verben derselben Art genau trifft, bildet er damit Formen.

/** Die Personen der Präsenstabellen: er, sie, du (m./f.), ich (m./f.), sie (Pl.), ihr, wir. */
const MUSTER_PERSONEN: Person[] = [
  { p: 2, zahl: 'sg', g: 'm' },
  { p: 2, zahl: 'sg', g: 'f' },
  { p: 1, zahl: 'sg', g: 'm' },
  { p: 1, zahl: 'sg', g: 'f' },
  { p: 3, zahl: 'pl' },
  { p: 2, zahl: 'pl' },
  { p: 1, zahl: 'pl' },
];
const personKey = (x: Person) => `${x.p}${x.zahl}${x.g ?? ''}`;

/** Verbart nach den Formen für er und sie: „goraš, guršo“ (Konsonant am Ende) oder „oṯe, ëṯyo“ (-e). */
function verbArt(er: string, sie: string): 'konsonant' | 'e' | undefined {
  if (!/o$/.test(sie)) return undefined;
  if (/e$/.test(er)) return 'e';
  if (/[^aeiouëä]$/.test(er)) return 'konsonant';
  return undefined;
}

/** Der Stamm aus der Wurzelangabe des Glossars: „grš I“ → I, „ylf IIIp“ → IIIp, „tlfn“ → vier Konsonanten. */
function stammAus(wurzel: string): string {
  const m = /\b(I{1,3}p?)\b/.exec(wurzel);
  if (m) return m[1];
  const r = wurzel.split(/\s+/)[0] ?? '';
  return [...r.normalize('NFC')].length >= 4 ? 'IV' : '?';
}

/**
 * Woraus eine Form gebildet ist: aus der Form für er (A), der für sie ohne Endvokal (B), er ohne Endvokal (C);
 * im Präteritum transitiver Verben aus der Basis ohne -le (D: „grëšle“ → grëš-) oder der Basis mit verdoppeltem
 * Endkonsonanten (E: grëšš- für „grëšše“ – „Ke der 3. Person Plural bedeutet, dass der Endkonsonant der Basis
 * verdoppelt und mit einem –e versehen wird“, Grammatik 8a).
 */
type Basis = 'A' | 'B' | 'C' | 'D' | 'E';
const VOKAL_ENDE = /[aeiouëä]$/;
function basisVon(er: string, sie: string, b: Basis): string | undefined {
  if (b === 'A') return er;
  if (b === 'B') return VOKAL_ENDE.test(sie) ? sie.slice(0, -1) : undefined;
  if (b === 'C') return VOKAL_ENDE.test(er) ? er.slice(0, -1) : undefined;
  const d = /le$/.test(er) ? er.slice(0, -2) : undefined;
  if (b === 'D') return d;
  return d && /[^aeiouëä]$/.test(d) ? d + d.slice(-1) : undefined;
}

/** Wie das Muster für eine Zeit gebildet wird: Verbarten, erlaubte Basen. */
interface MusterArt {
  zeit: 'Präsens' | 'Präteritum';
  art: (er: string, sie: string) => string | undefined;
  basen: Basis[];
}

const PRAESENS_MUSTER: MusterArt = { zeit: 'Präsens', art: verbArt, basen: ['A', 'B', 'C'] };

/**
 * Präteritum (Grammatik 8a): transitive Verben „goraš – grëšle, grëšla“ (Personen durch L-Suffixe an der
 * Basis grëš-), intransitive „domax – damëx, damixo“ (zwei Basen damëx-/damix-, Suffixe wie im Präsens).
 */
const PRAETERITUM_MUSTER: MusterArt = {
  zeit: 'Präteritum',
  art: (er, sie) => (/le$/.test(er) && /la$/.test(sie) ? 'transitiv' : /o$/.test(sie) && !/le$/.test(er) ? 'intransitiv' : undefined),
  basen: ['A', 'B', 'C', 'D', 'E'],
};

interface Muster {
  /** Formen für die übrigen Personen, wo das Muster bei allen Verben derselben Art und desselben Stamms stimmt */
  bilde: (er: string, sie: string, stamm: string) => { form: string; person: Person; muster: NonNullable<PForm['muster']> }[];
  /** Ergebnis der Prüfung: je Verbart, Stamm und Person, ob das Muster stimmt */
  probe: { art: string; stamm: string; person: string; verben: number; getroffen: number }[];
}

function verbMuster(wb: Woerterbuch, tabellen: ReadonlyMap<string, PForm[]>, ma: MusterArt = PRAESENS_MUSTER): Muster {
  // Stamm eines Tabellen-Verbs aus seinem Glossar-Eintrag („goraš, guršo - grëšle, grëšla [grš I]“),
  // nach der Form für er im Präsens und im Präteritum
  const stammVon = new Map<string, string>();
  for (const f of wb.funde) {
    const m = f.herkunft === 'glossar' ? /^([^\s,]+), [^\s,]+ [-–] ([^\s,]+).*[[(]([^\])]*)[\])]/.exec(f.latein) : null;
    if (!m) continue;
    for (const k of [genau(m[1]), genau(m[2])]) if (!stammVon.has(k)) stammVon.set(k, stammAus(m[3]));
  }
  // Die Verben, an denen Grammatik 7a die Präsensbasis erklärt („goraš-/gurš-“, „domax-/dëmx-“)
  const vorbilder = new Set<string>();
  const g7 = wb.seiten.get('1.7.2');
  for (const b of g7?.bloecke ?? []) if (b.art === 'absatz' && /Präsensbasis/.test(b.teile.map((t) => t.text).join(''))) for (const t of b.teile) if (t.sur) for (const w of surWoerter(t.text.replace(/[-/]/g, ' '))) vorbilder.add(w);
  // Die vollständigen Tabellen
  interface Voll { verb: string; er: string; sie: string; art: string; stamm: string; formen: Map<string, string>; funde: Map<string, Fund>; praesensEr: string }
  const volle: Voll[] = [];
  for (const [verb, liste] of tabellen) {
    const formen = new Map<string, string>();
    const funde = new Map<string, Fund>();
    for (const f of liste) for (const x of f.personen) {
      for (const k of x.g || x.p === 3 || x.zahl === 'pl' ? [personKey(x)] : [personKey({ ...x, g: 'm' }), personKey({ ...x, g: 'f' })]) {
        if (!formen.has(k)) {
          formen.set(k, f.form);
          funde.set(k, f.fund);
        }
      }
    }
    const er = formen.get('3sgm');
    const sie = formen.get('3sgf');
    const art = er && sie ? ma.art(er, sie) : undefined;
    if (!er || !sie || !art || !MUSTER_PERSONEN.every((x) => formen.has(personKey(x)))) continue;
    const praesensEr = genau(verb.split(/\s+[-–]\s+/)[0] ?? '');
    volle.push({ verb, er, sie, art, stamm: stammVon.get(er) ?? stammVon.get(praesensEr) ?? '?', formen, funde, praesensEr });
  }
  /** Das Muster einer Person: die Bildung, die bei den meisten Verben derselben Art stimmt (ohne `ohne`) */
  const regel = (art: string, x: Person, ohne?: Voll): { basis: Basis; endung: string; wie: Voll } | undefined => {
    const zaehler = new Map<string, { n: number; wie: Voll }>();
    for (const v of volle) {
      if (v.art !== art || v === ohne) continue;
      const form = v.formen.get(personKey(x))!;
      for (const b of ma.basen) {
        const basis = basisVon(v.er, v.sie, b);
        if (basis === undefined || !form.startsWith(basis)) continue;
        const k = `${b}|${form.slice(basis.length)}`;
        const z = zaehler.get(k) ?? { n: 0, wie: v };
        z.n++;
        zaehler.set(k, z);
      }
    }
    const best = [...zaehler.entries()].sort((a, b) => b[1].n - a[1].n)[0];
    if (!best) return undefined;
    const [basis, endung] = best[0].split('|');
    // Als Vorbild am liebsten ein Verb, an dem Grammatik 7a die Präsensbasis erklärt (goraš, domax)
    const vorbild =
      volle.find((v) => v.art === art && v !== ohne && vorbilder.has(v.praesensEr) && basisVon(v.er, v.sie, basis as Basis) + endung === v.formen.get(personKey(x))) ?? best[1].wie;
    return { basis: basis as Basis, endung, wie: vorbild };
  };
  const anwenden = (r: NonNullable<ReturnType<typeof regel>>, er: string, sie: string) => {
    const b = basisVon(er, sie, r.basis);
    return b === undefined ? undefined : b + r.endung;
  };

  // Prüfung: jedes vollständige Verb mit dem Muster der anderen bilden
  const probe: Muster['probe'] = [];
  const gruppen = new Map<string, Voll[]>();
  for (const v of volle) gruppen.set(`${v.art}|${v.stamm}`, [...(gruppen.get(`${v.art}|${v.stamm}`) ?? []), v]);
  const an = new Set<string>();
  for (const [k, liste] of gruppen) {
    const [art, stamm] = k.split('|');
    for (const x of MUSTER_PERSONEN) {
      let getroffen = 0;
      for (const v of liste) {
        const r = regel(art, x, v);
        if (r && anwenden(r, v.er, v.sie) === v.formen.get(personKey(x))) getroffen++;
      }
      probe.push({ art, stamm, person: personKey(x), verben: liste.length, getroffen });
      // Nur Stämme mit einer Tabelle, in der es genau trifft – und nie daneben
      if (stamm !== '?' && getroffen === liste.length) an.add(`${art}|${stamm}|${personKey(x)}`);
    }
  }
  return {
    probe,
    bilde: (er, sie, stamm) => {
      const art = ma.art(er, sie);
      if (!art) return [];
      return MUSTER_PERSONEN.flatMap((x) => {
        if (!an.has(`${art}|${stamm}|${personKey(x)}`)) return [];
        const r = regel(art, x);
        const basis = r && basisVon(er, sie, r.basis);
        if (!r || basis === undefined) return [];
        return [
          { form: basis + r.endung, person: x, muster: { basis, endung: r.endung, wie: r.wie.formen.get(personKey(x))!, wieFund: r.wie.funde.get(personKey(x))! } },
        ];
      });
    },
  };
}

// --- Pronomen als Objekt: L-Suffixe am Präsens (Grammatik 22a, Formentabelle 4.9) -----------------------
//
// „Die L-Suffixe … die an die flektierte Präsensform angefügt werden“ (Grammatik 22a): kobeli „er gibt mir“.
// Dabei verschmelzen Verbform und Suffix („gorašno“ + „-le“ → gorašne). Die Formentabelle 4.9 zeigt alle
// Formen für vier Verben verschiedener Art (ziehen, sehen, nehmen, sagen). Für jede Verbindung von Subjekt
// und Objekt liest der Baukasten ab, wie die Tabellenform aus der Grundform entsteht (so viele Buchstaben
// weg, das hier dazu), und nimmt sie nur, wo mindestens drei der vier Verben genau so gebildet sind. Wo ein
// Verb anders gebildet ist (šoqal → šoqele), bleiben Verben mit demselben Endbuchstaben außen vor.

/** Die Objekte, die der Baukasten baut: ihn, sie (eine), dich (m./f.), mich, uns – nicht „euch“ und „sie (mehrere)“ (drei Varianten je nach Auslaut, Grammatik 22a.2). */
const OBJEKTE: Person[] = [
  { p: 3, zahl: 'sg', g: 'm' },
  { p: 3, zahl: 'sg', g: 'f' },
  { p: 2, zahl: 'sg', g: 'm' },
  { p: 2, zahl: 'sg', g: 'f' },
  { p: 1, zahl: 'sg' },
  { p: 1, zahl: 'pl' },
];
const SUBJEKTE: Person[] = [{ p: 3, zahl: 'sg', g: 'm' }, { p: 3, zahl: 'sg', g: 'f' }, ...MUSTER_PERSONEN];

interface ObjektSuffixe {
  /** Grundform (Person) + Objekt → Form: aus der Tabelle oder nach der abgelesenen Bildung */
  bilde: (verb: string, grund: PForm, s: Person, o: Person) => PForm | undefined;
  /** Prüfung je Subjekt und Objekt: wie viele der Tabellen-Verben so gebildet sind */
  probe: { subjekt: string; objekt: string; verben: number; getroffen: number }[];
}

function objektSuffixe(wb: Woerterbuch, grundformen: ReadonlyMap<string, PForm[]>, seite: GrammatikSeite | undefined): ObjektSuffixe {
  const ab = seite && abschnitt(seite, '1) Objektmarkierung in der Präsensbasis');
  const ende = seite ? seite.bloecke.findIndex((b) => b.art === 'titel' && b.text.startsWith('2) Objektmarkierung im Präteritum')) : -1;
  /** Verb → „Subjekt|Objekt“ → Form aus der Tabelle */
  const tafel = new Map<string, Map<string, Form>>();
  const person = (p: string, g: string | undefined, z: string): Person => ({ p: Number(p) as 1 | 2 | 3, zahl: z as Zahl, ...(g && z === 'sg' ? { g: g as 'm' | 'f' } : {}) });
  for (const e of seite?.eintraege ?? []) {
    const m = /Subjekt ([123])\.\s*(?:([mf])\.\s*)?(sg|pl)\., Objekt ([123])\.\s*(?:([mf])\.\s*)?(sg|pl)\./.exec(e.merkmal ?? '');
    const f = wb.nachId.get(e.id);
    if (!m || !f || !e.verb || !ab || e.block < ab[0] || (ende > 0 && e.block >= ende)) continue;
    const su = person(m[1], m[2], m[3]);
    const ob = person(m[4], m[5], m[6]);
    const liste = tafel.get(e.verb) ?? new Map<string, Form>();
    // „Subjekt 2. sg.“ ohne Geschlecht gilt für beide
    for (const s0 of su.zahl === 'sg' && su.p !== 3 && !su.g ? [{ ...su, g: 'm' as const }, { ...su, g: 'f' as const }] : [su]) {
      const k = `${personKey(s0)}|${personKey(ob)}`;
      if (!liste.has(k)) liste.set(k, { form: genau(e.latein), fund: f });
    }
    tafel.set(e.verb, liste);
  }
  const verbKey = (v: string) => genau(v.split(/\s+[-–]\s+/)[0] ?? '');
  const tafelVon = new Map([...tafel].map(([v, m]) => [verbKey(v), m]));
  // Je Subjekt und Objekt: die Bildung (weg, dazu), die bei den meisten Tabellen-Verben stimmt
  const regeln = new Map<string, { weg: number; dazu: string; gesperrt: Set<string>; wie: Form; n: number }>();
  const probe: ObjektSuffixe['probe'] = [];
  for (const s0 of SUBJEKTE) {
    for (const o of OBJEKTE) {
      if (s0.p === o.p && s0.zahl === o.zahl) continue; // „ich – mich“ ist reflexiv
      const k = `${personKey(s0)}|${personKey(o)}`;
      const faelle: { grund: string; ziel: Form }[] = [];
      for (const [verb, m] of tafel) {
        const ziel = m.get(k);
        const grund = (grundformen.get(verb) ?? []).find((f) => passt(f, s0) && (!s0.g || f.personen.some((y) => !y.g || y.g === s0.g)));
        if (ziel && grund) faelle.push({ grund: grund.form, ziel });
      }
      const zaehler = new Map<string, number>();
      for (const { grund, ziel } of faelle) {
        for (let weg = 0; weg <= Math.min(3, grund.length - 1); weg++) {
          if (ziel.form.startsWith(grund.slice(0, grund.length - weg))) zaehler.set(`${weg}|${ziel.form.slice(grund.length - weg)}`, (zaehler.get(`${weg}|${ziel.form.slice(grund.length - weg)}`) ?? 0) + 1);
        }
      }
      const best = [...zaehler.entries()].sort((a, b) => b[1] - a[1] || Number(a[0].split('|')[0]) - Number(b[0].split('|')[0]))[0];
      if (!best) continue;
      const [weg, dazu] = [Number(best[0].split('|')[0]), best[0].slice(best[0].indexOf('|') + 1)];
      const bilde = (g: string) => g.slice(0, g.length - weg) + dazu;
      const gesperrt = new Set(faelle.filter((x) => bilde(x.grund) !== x.ziel.form).map((x) => x.grund.slice(-1)));
      const treffer = faelle.filter((x) => bilde(x.grund) === x.ziel.form);
      probe.push({ subjekt: personKey(s0), objekt: personKey(o), verben: faelle.length, getroffen: treffer.length });
      if (treffer.length >= 3) regeln.set(k, { weg, dazu, gesperrt, wie: treffer[0].ziel, n: treffer.length });
    }
  }
  return {
    probe,
    bilde: (verb, grund, s0, o) => {
      const k = `${personKey(s0)}|${personKey(o)}`;
      const ausTafel = tafelVon.get(verbKey(verb))?.get(k);
      if (ausTafel) return { form: ausTafel.form, fund: ausTafel.fund, personen: [s0], teile: [{ text: ausTafel.form, fund: ausTafel.fund, rolle: 'Präsens mit Objektsuffix (Formentabelle 4.9)' }] };
      const r = regeln.get(k);
      if (!r || r.gesperrt.has(grund.form.slice(-1)) || grund.form.length <= r.weg + 1) return undefined;
      const stamm = grund.form.slice(0, grund.form.length - r.weg);
      const grundTeile = grund.teile ?? (grund.muster ? musterTeile(grund) : [{ text: grund.form, fund: grund.fund, rolle: `Grundform des Präsens · ${personText(s0)}` }]);
      return {
        form: stamm + r.dazu,
        fund: grund.fund,
        personen: [s0],
        ...(grund.muster ? { muster: grund.muster } : {}),
        teile: [
          ...(r.weg ? [{ text: `${stamm}-`, fund: grund.fund, rolle: `${grund.form} ohne -${grund.form.slice(-r.weg)}` }] : grundTeile),
          { text: `-${r.dazu}`, fund: r.wie.fund, rolle: `Objektsuffix wie in ${r.wie.form} (Formentabelle 4.9)` },
        ],
      };
    },
  };
}

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
  /**
   * `kopula`: Steht bei einer Form nicht, ob Einzahl oder Mehrzahl („latno – nicht sein · Gegenwart, 1.“),
   * gilt die Person der Kopula, die daran hängt: „Die Basen kët- und lat- in Verbindung mit den Formen
   * der Kopula (Grammatik 4b), die hier an die Basis angehängt werden“ (Grammatik 9c) – latno wie no.
   */
  const ausHilfs = (deutsch: string, zeit: string, kopula?: readonly PForm[]): PForm[] =>
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
        if (!personen.length && kopula) {
          const k = genau(e.latein);
          const dran = kopula.filter((x) => k.endsWith(x.form) && k.length > x.form.length).sort((a, b) => b.form.length - a.form.length)[0];
          if (dran) personen = dran.personen;
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

  // Possessivsuffixe, eingeschränkte Reihe (Grammatik 5a.2): an ëšmo „Name“ gezeigt – „ëšmi – mein Name“,
  // „ëšmux – dein (m.) Name“ … Die Endungen werden an den Formen abgelesen (ëšm- + -i); die Person steht in
  // der Formentabelle B4 („1. sg.“, „2. sg., m.“). Genommen wird nur, was auch in Grammatik 5a.2 steht.
  const suffixeEng: PForm[] = [];
  const eng = g5 && abschnitt(g5, '2. Die eingeschränkte Reihe');
  const pronomina = seiteMit('Pronomina');
  const engB4 = pronomina && abschnitt(pronomina, '4) Suffigiertes Possessivpronomen');
  if (g5 && eng && pronomina && engB4) {
    const inG5 = g5.eintraege.filter((e) => e.block >= eng[0] && e.block < eng[1]);
    const basis = inG5.find((e) => e.deutsch === 'Name' && surWoerter(e.latein).length === 1);
    const stamm = basis && /o$/.test(genau(basis.latein)) ? genau(basis.latein).slice(0, -1) : undefined;
    const formenG5 = new Set(inG5.map((e) => genau(e.latein)));
    for (const e of pronomina.eintraege) {
      const f = fundVon(e.id);
      const m = /([123])\.\s*(sg|pl)\.(?:,\s*([mf])\.)?/i.exec(e.merkmal ?? '');
      if (!f || !stamm || !m || e.block < engB4[0] || e.block >= engB4[1]) continue;
      const zahl = m[2].toLowerCase() as 'sg' | 'pl';
      const person: Person = { p: Number(m[1]) as 1 | 2 | 3, zahl, ...(m[3] && zahl === 'sg' ? { g: m[3] as 'm' | 'f' } : {}) };
      for (const x of e.latein.split('/').map(genau)) {
        if (x.startsWith(stamm) && x.length > stamm.length && formenG5.has(x)) suffixeEng.push({ form: x.slice(stamm.length), fund: fundVon(inG5.find((y) => genau(y.latein) === x)!.id) ?? f, personen: [person] });
      }
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

  // Präpositionen, die für sich stehen („cam u zabno – mit der Zeit“, „bëṯr u bayto – hinter dem Haus“,
  // „b dukano – in einem Geschäft“): alle aus der Liste. Gibt es eine kurze und eine lange Form („m, me“
  // „von, aus“), die lange; stehen für eine Bedeutung zwei verschiedene Wörter (gab und se „bei, neben“), keine.
  const alleListe = new Map<string, Form[]>();
  for (const f of wb.funde) {
    const st = (f.stellen ?? []).find((x) => listeDerPraepositionen.has(`${x.seite}|${x.block}`));
    const erstes = woerter(f.latein).map((w) => zerlege(w).kern)[0] ?? '';
    if (!st || !erstes || surWoerter(f.latein).length !== 1) continue;
    for (const b of bedeutungen(f.deutsch)) {
      const liste = alleListe.get(b) ?? [];
      if (!liste.some((x) => x.form === genau(erstes))) alleListe.set(b, [...liste, form(f, erstes)]);
    }
  }
  const praepositionenFrei = new Map<string, Form>();
  for (const [b, liste] of alleListe) {
    const lang = liste.filter((x) => x.form.length > 1);
    if (lang.length === 1) praepositionenFrei.set(b, lang[0]);
    else if (!lang.length && liste.length === 1) praepositionenFrei.set(b, liste[0]);
  }

  // Präpositionen mit Pronominalsuffixen: die Tabellen in Grammatik 11b („acmi“, „acmux“ …).
  // Die Spalten sind die Präpositionen (l-, b-, m-, cal, cam, s-), die Zeilen die Personen.
  const praepSuffixe = new Map<string, PForm[]>();
  // Steht die Form auch als Eintrag in den Daten („acmi – mit mir“), kommt sie mit diesem Eintrag
  const fruehe = alleSchreibweisen(wb);
  const wortMitFrueh = (g: string) =>
    fruehe
      .filter((x) => x.genau === g && x.ganz && x.fund.art === 'wort' && /^(mit|auf|in|von|aus|bei|für|zu|hinter|unter|vor) /.test(x.fund.deutsch))
      .sort((a, b) => RANG[a.fund.herkunft] - RANG[b.fund.herkunft])[0]?.fund;
  const g11 = wb.seiten.get('1.11.2');
  const suffAb = g11 && abschnitt(g11, '2. Präpositionen mit Suffixen');
  const syrisch = /[\u{700}-\u{74F}]/u;
  const zelle = (z: { teile: { text: string }[] }) => z.teile.map((x) => x.text).join('').trim();
  for (let i = suffAb?.[0] ?? 0; g11 && suffAb && i < suffAb[1]; i++) {
    const b = g11.bloecke[i];
    if (b.art !== 'tabelle' || !b.zeilen.length) continue;
    const kopf = b.zeilen[0].map(zelle);
    const spalten = kopf.flatMap((k, j) => {
      const kurz = genau(k.replace(/-$/, ''));
      const p = k && !syrisch.test(k) ? [...alleListe.values()].flat().find((x) => x.form === kurz) : undefined;
      return p ? [{ j, p }] : [];
    });
    if (spalten.length < 2) continue;
    let zahl: 'sg' | 'pl' | undefined;
    for (const z of b.zeilen.slice(1)) {
      const z0 = zelle(z[0]);
      if (/^Singular$/.test(z0)) zahl = 'sg';
      else if (/^Plural$/.test(z0)) zahl = 'pl';
      const m = /^([123])\.(?:([mf])\.)?$/.exec(z0);
      if (!m || !zahl) continue;
      const person: Person = { p: Number(m[1]) as 1 | 2 | 3, zahl, ...(m[2] && zahl === 'sg' ? { g: m[2] as 'm' | 'f' } : {}) };
      for (const { j, p } of spalten) {
        for (const w of (z[j] ? zelle(z[j]) : '').split(/\s*,\s*/).filter(Boolean)) {
          const fw = genau(w);
          const eintrag = wortMitFrueh(fw);
          const liste = praepSuffixe.get(p.form) ?? [];
          liste.push({ form: fw, fund: p.fund, personen: [person], tabelle: `„${bedeutungen(p.fund.deutsch).join(', ')}“ mit Suffix, Tabelle in Grammatik 11b`, ...(eintrag ? { eintrag } : {}) });
          praepSuffixe.set(p.form, liste);
        }
      }
    }
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
  /** Zitierform → Präteritum mit Person (Verbtabellen, Grammatik 8a) */
  const praeteritum = new Map<string, PForm[]>();
  const formenDerZeit = (verb: string, formen: readonly Fund[], zeit: string) => {
    const liste: PForm[] = [];
    for (const f of formen) {
      if (surWoerter(f.latein).length !== 1) continue;
      for (const st of f.stellen ?? []) {
        if (st.verb !== verb || zeitVon(st.merkmal ?? '') !== zeit) continue;
        const personen = personenAus(st.merkmal);
        if (!personen.length) continue;
        const da = liste.find((x) => x.form === genau(f.latein));
        if (da) da.personen.push(...personen.filter((p) => !da.personen.some((y) => y.p === p.p && y.zahl === p.zahl && y.g === p.g)));
        else liste.push({ ...form(f), personen: [...personen] });
      }
    }
    return liste;
  };
  for (const [verb, formen] of wb.gruppen) {
    const liste = formenDerZeit(verb, formen, 'Präsens');
    if (!liste.length) continue;
    const vergangen = formenDerZeit(verb, formen, 'Präteritum');
    if (vergangen.length) praeteritum.set(verb, vergangen);
    grundformen.set(verb, liste);
    for (const b of new Set(formen.flatMap((f) => bedeutungen(f.deutsch)))) {
      if (!/^[a-zäöüß]+$/.test(b)) continue; // nur einfache Verben („essen“), nicht „satt werden“
      verben.set(b, [...new Set([...(verben.get(b) ?? []), verb])]);
    }
  }

  // Verben, die nur im großen Glossar stehen: „Bei den Verben werden die Formen der Präsensbasis
  // 3.m.sg., 3.f.sg. … zitiert: goraš, guršo – grëšle, grëšla“ (Vorwort des Glossars) – also er und sie.
  // Die übrigen Personen bildet der Baukasten nach dem Muster der Verbtabellen (siehe `verbMuster`).
  const muster = verbMuster(wb, grundformen);
  // Das Präteritum ebenso: das Glossar nennt „grëšle, grëšla“ (er, sie), die übrigen Personen nach dem Muster der Tabellen
  const musterVergangen = verbMuster(wb, praeteritum, PRAETERITUM_MUSTER);
  const schonDa = new Set([...grundformen.values()].flat().map((x) => x.form));
  for (const f of wb.funde) {
    if (f.herkunft !== 'glossar' || f.art !== 'wort') continue;
    // „zowan, zawno - zwënle, zwënla [zwn I]“ (großes Glossar) oder „… – …, … (zwn I)“ (Glossar A)
    const m = /^([^\s,()[\]]+), ([^\s,()[\]]+) [-–] ([^\s,()[\]/]+)[^[(]*[[(]([^\])]*)[\])]\s*$/u.exec(f.latein);
    if (!m) continue;
    const [er, sie] = [genau(m[1]), genau(m[2])];
    const verb = `${m[1]} – ${m[3]}`;
    if (schonDa.has(er) || grundformen.has(verb)) continue;
    const liste: PForm[] = [
      { form: er, fund: f, personen: [{ p: 3, zahl: 'sg', g: 'm' }] },
      { form: sie, fund: f, personen: [{ p: 3, zahl: 'sg', g: 'f' }] },
    ];
    for (const x of muster.bilde(er, sie, stammAus(m[4]))) liste.push({ form: x.form, fund: f, personen: [x.person], muster: x.muster });
    grundformen.set(verb, liste);
    // Präteritum: „- grëšle, grëšla“ – die Formen für er und sie stehen direkt hinter dem Strich
    const vg = /[-–] ([^\s,()[\]/]+), ([^\s,()[\]/]+)\s*[[(]/u.exec(f.latein);
    if (vg) {
      const [erV, sieV] = [genau(vg[1]), genau(vg[2])];
      const vl: PForm[] = [
        { form: erV, fund: f, personen: [{ p: 3, zahl: 'sg', g: 'm' }] },
        { form: sieV, fund: f, personen: [{ p: 3, zahl: 'sg', g: 'f' }] },
      ];
      for (const x of musterVergangen.bilde(erV, sieV, stammAus(m[4]))) vl.push({ form: x.form, fund: f, personen: [x.person], muster: x.muster });
      praeteritum.set(verb, vl);
    }
    for (const b of bedeutungen(f.deutsch)) {
      if (!/^[a-zäöüß]+(?:en|ern|eln)$/.test(b)) continue;
      verben.set(b, [...new Set([...(verben.get(b) ?? []), verb])]);
    }
  }

  // Deutsche Präsensformen der Verben, damit „er isst“ schnell zu „essen“ findet
  // „sein“, „haben“, „werden“ haben eigene Regeln (Kopula, „haben“, Futur) – nicht als gewöhnliches Verb.
  const finit = new Map<string, string[]>();
  // Ebenso Partizip und Präteritum („gespielt“, „spielte“ → spielen) für die Vergangenheit
  const partizip = new Map<string, string[]>();
  const praeteritumDe = new Map<string, { inf: string; stelle: number }[]>();
  for (const inf of verben.keys()) {
    if (inf === 'sein' || inf === 'haben' || inf === 'werden') continue;
    for (const f of new Set(praesens(inf) ?? [])) finit.set(f, [...(finit.get(f) ?? []), inf]);
  }
  // (auch für gleichbedeutende Verben: „ich bin mitgekommen“ – „mitkommen“ wie „kommen“)
  const vergangenFuer = [...verben.keys(), ...Object.keys(DEUTSCHE_SYNONYME).filter((v) => /(?:en|ern|eln)$/.test(v) && !verben.has(v))];
  for (const inf of vergangenFuer) {
    if (inf === 'sein' || inf === 'haben' || inf === 'werden') continue;
    for (const p2 of partizipVon(inf)) partizip.set(p2, [...new Set([...(partizip.get(p2) ?? []), inf])]);
    (praeteritumVon(inf) ?? []).forEach((f, stelle) => praeteritumDe.set(f, [...(praeteritumDe.get(f) ?? []), { inf, stelle }]));
  }

  // Verben, die ihr Objekt mit einer Präposition anschließen: Untereinträge des großen Glossars wie
  // „laqën b – sie trafen (jdn.)“ unter loqe „treffen“ – das Objekt steht dann mit b („Koloqe bi Saro“).
  const rektion = new Map<string, Form>();
  const praepFormen = new Set([...alleListe.values()].flat().map((x) => x.form));
  for (const f of wb.funde) {
    const kopfId = /^(GL-[^.]+)\./.exec(f.id)?.[1];
    const w = surWoerter(f.latein);
    if (!kopfId || !/\bjdn\./.test(f.deutsch) || w.length !== 2 || !praepFormen.has(w[1])) continue;
    // Der Kopf des Eintrags („GL-loqe“) – steht er schon in Glossar A, ist er nicht doppelt im Übersetzer;
    // dann das Verb, dessen Form für „er“ so geschrieben wird wie die Kennung
    const kopf = wb.nachId.get(kopfId);
    const ascii = (x: string) => x.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const er = kopf
      ? genau(kopf.latein.split(/[,\s]/)[0] ?? '')
      : [...grundformen.values()].flat().find((x) => x.personen.some((p) => p.p === 3 && p.zahl === 'sg' && p.g === 'm') && `GL-${ascii(x.form)}` === kopfId)?.form;
    if (er && !rektion.has(er)) rektion.set(er, { form: w[1], fund: f });
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

  // --- Ganze Sätze (Grammatik 17–24) ---
  const schreibweisen = alleSchreibweisen(wb);
  const wortMit = (genauForm: string, passt: (f: Fund) => boolean = () => true) =>
    schreibweisen.filter((x) => x.genau === genauForm && passt(x.fund)).sort((a, b) => Number(b.ganz) - Number(a.ganz) || RANG[a.fund.herkunft] - RANG[b.fund.herkunft])[0]?.fund;
  /** Ein Wort aus den Daten mit genau dieser Bedeutung (ein Wort auf Surayt), Wortschatz zuerst */
  const wortFuer = (deutsch: string) =>
    wb.funde
      .filter((f) => surWoerter(stichwort(f.latein)).length === 1 && bedeutungen(f.deutsch).includes(deutsch))
      .sort((a, b) => RANG[a.herkunft] - RANG[b.herkunft])[0];
  const alsForm = (f: Fund | undefined) => (f ? { form: genau(stichwort(f.latein)), fund: f } : undefined);

  // „müssen“: „Zum Ausdruck der Modalverben „müssen“ und „sollen“ werden die unveränderlichen Modalpartikeln këbce und kobac
  // herangezogen. In gleicher Position können auch lazëm oder kolozam beziehungsweise majbur stehen“ (Grammatik 20c).
  // Genommen wird die, die in den Daten am häufigsten für „müssen“ steht.
  const g20 = wb.seiten.get('2.4.3');
  const mussAb = g20 && abschnitt(g20, '1. „müssen');
  const partikeln: string[] = [];
  if (g20 && mussAb) {
    for (let i = mussAb[0]; i < mussAb[1]; i++) {
      const b = g20.bloecke[i];
      if (b.art !== 'absatz' || !/Modalpartikeln .*herangezogen|In gleicher Position/.test(absatz(g20, i))) continue;
      for (const x of b.teile) if (x.sur && surWoerter(x.text).length === 1) partikeln.push(genau(x.text.trim()));
    }
  }
  const MUSS = /\b(muss|musst|müssen|müsst)\b/i;
  const zaehle = (w: string) => wb.funde.filter((f) => MUSS.test(f.deutsch) && surWoerter(f.latein).includes(w)).length;
  const muss = [...new Set(partikeln)].sort((a, b) => zaehle(b) - zaehle(a))[0];
  const mussFund = muss ? (wortMit(muss, (f) => MUSS.test(f.deutsch) || /müssen/.test(f.deutsch)) ?? wb.funde.find((f) => MUSS.test(f.deutsch) && surWoerter(f.latein).includes(muss))) : undefined;

  // ṭro: „Die Partikel ṭro zusammen mit dem ihr nachstehenden Subjunktiv hat eine jussivische Bedeutung“ (Grammatik 23d)
  const g23 = wb.seiten.get('2.7.3');
  const troAb = g23 && abschnitt(g23, '2. Die Partikel');
  let tro: Form | undefined;
  if (g23 && troAb) {
    for (let i = troAb[0]; i < troAb[1] && !tro; i++) {
      const b = g23.bloecke[i];
      const x = b.art === 'absatz' && /jussivische Bedeutung/.test(absatz(g23, i)) ? b.teile.find((t) => t.sur) : undefined;
      const f = x && wortMit(genau(x.text.trim()));
      if (x && f) tro = { form: genau(x.text.trim()), fund: f };
    }
  }

  // d „dass“: das Kleinwort „d – Konjunktion“ (Grammatik 7); miḏe d „weil“ aus dem Wortschatz
  const dFund = wb.funde.find((f) => genau(f.latein) === 'd' && f.deutsch === 'Konjunktion') ?? undefined;
  const konjunktionD: Form | undefined = dFund ? { form: genau(dFund.latein), fund: dFund } : undefined;
  const weilFund = wb.funde
    .filter((f) => f.herkunft === 'wortschatz' && bedeutungen(f.deutsch).includes('weil') && konjunktionD && surWoerter(f.latein).length === 2 && surWoerter(f.latein)[1] === konjunktionD.form)
    .sort((a, b) => (a.lektion ?? 99) - (b.lektion ?? 99))[0];
  const weilWort: Form | undefined = weilFund ? { form: surWoerter(weilFund.latein)[0], fund: weilFund } : undefined;

  // Fragewörter (Grammatik 24a): „wo?“, „welche/r/s?“ → welche, welcher, welches
  const fragewoerter = new Map<string, Form>();
  const g24 = wb.seiten.get('2.8.3');
  // Abschnitt a) reicht bis „b) Indirekte Fragesätze“ (die Unterabschnitte „1)“ stehen im Lehrbuch eine Ebene höher)
  const frageAnfang = g24 ? g24.bloecke.findIndex((b) => b.art === 'titel' && b.text.startsWith('a) Direkte Fragesätze')) : -1;
  const frageEnde = g24 ? g24.bloecke.findIndex((b) => b.art === 'titel' && /^b\)/.test(b.text)) : -1;
  const frageAb: [number, number] | undefined = frageAnfang >= 0 ? [frageAnfang, frageEnde > frageAnfang ? frageEnde : g24!.bloecke.length] : undefined;
  for (const e of g24?.eintraege ?? []) {
    const f = fundVon(e.id);
    if (!f || !frageAb || e.block >= frageAb[1] || !/\?$/.test(e.deutsch.trim()) || surWoerter(e.latein).length > 2 || e.art !== 'wort') continue;
    for (const teil of e.deutsch.replace(/\?/g, '').split(/[,?]/)) {
      const t = teil.trim().toLowerCase();
      const m = /^([a-zäöüß]+)((?:\/[a-zäöüß]{1,2})+)$/.exec(t);
      const keys = m ? [m[1], ...m[2].split('/').filter(Boolean).map((x) => m[1] + x)] : /^[a-zäöüß ]+$/.test(t) ? [t] : [];
      for (const k of keys) if (!fragewoerter.has(k)) fragewoerter.set(k, form(f));
    }
  }

  // „Die Fragepartikel ma „etwa“ … Im Deutschen bleibt ma unübersetzt oder kann mit „denn“ wiedergegeben werden“ (Grammatik 24a)
  let fragepartikel: Form | undefined;
  for (let i = 0; g24 && i < g24.bloecke.length && !fragepartikel; i++) {
    const b = g24.bloecke[i];
    const x = b.art === 'absatz' && /^Die Fragepartikel/.test(absatz(g24, i)) && /„denn“/.test(absatz(g24, i)) ? b.teile.find((t) => t.sur) : undefined;
    const f = x && wortMit(genau(x.text.trim()));
    if (x && f) fragepartikel = { form: genau(x.text.trim()), fund: f };
  }

  // Adverbien: Tabellen in Grammatik 18b, Einträge mit „(adv.)“ im Glossar
  const adverbien = new Map<string, Form[]>();
  const advDazu = (k: string, x: Form) => {
    const key = k.trim().toLowerCase();
    if (!key || !/^[a-zäöüß ]+$/.test(key)) return;
    const liste = adverbien.get(key) ?? [];
    if (!liste.some((y) => y.form === x.form)) adverbien.set(key, [...liste, x]);
  };
  const g18 = wb.seiten.get('2.2.3');
  const advAb = g18 && abschnitt(g18, 'b) Adverbien');
  const beispieleAb = g18 && abschnitt(g18, '4. Beispiele');
  // „2. Adverbien des Ortes“ und „3. Weitere Adverbien“ (ṭawwo „gut“) sind keine Zeitangaben
  const keineZeit = [g18 && abschnitt(g18, '2. Adverbien des Ortes'), g18 && abschnitt(g18, '3. Weitere Adverbien')].filter((x): x is [number, number] => !!x);
  const nichtZeit = new Set<string>();
  for (const e of g18?.eintraege ?? []) {
    const f = fundVon(e.id);
    if (!f || !advAb || e.block < advAb[0] || e.block >= advAb[1] || (beispieleAb && e.block >= beispieleAb[0]) || e.art !== 'wort') continue;
    for (const b of e.deutsch.replace(/\([^)]*\)/g, ' ').split(/[,/]/)) advDazu(b, form(f));
    if (keineZeit.some(([a, b]) => e.block >= a && e.block < b)) nichtZeit.add(genau(e.latein));
  }
  for (const f of wb.funde) {
    if (f.herkunft !== 'glossar' || !/\(adv\.\)/.test(f.latein)) continue;
    const x = alsForm(f);
    if (x) for (const b of f.deutsch.replace(/\([^)]*\)/g, ' ').split(/[,;/]/)) advDazu(b, x);
  }

  // Personennamen: „Personennamen können mit oder ohne Artikel stehen“ (Grammatik 3a)
  const namen: Tafeln['namen'] = new Map();
  for (const f of wb.funde) {
    const sur = woerter(f.latein).map((w) => zerlege(w).kern.normalize('NFC')).filter(Boolean);
    const de = new Set(f.deutsch.normalize('NFC').split(/[^\p{L}]+/u).filter((w) => /^\p{Lu}/u.test(w)));
    sur.forEach((w, i) => {
      if (!/^\p{Lu}\p{Ll}/u.test(w) || !de.has(w) || w.length < 3) return;
      const vorher = i > 0 ? artikelVor(wb, sur[i - 1].toLowerCase(), w.toLowerCase()) : undefined;
      const m = vorher?.merkmal ?? '';
      const g = /^Sg\., m\./.test(m) ? 'm' : /^Sg\., f\./.test(m) ? 'f' : undefined;
      const k = w.toLowerCase();
      const da = namen.get(k) ?? { form: w, belege: [] };
      da.belege.push({ fund: f, ...(g ? { g } : {}) });
      namen.set(k, da);
    });
  }

  const ix: Tafeln = {
    muster,
    namen,
    kann: ausHilfs('können', 'Gegenwart'),
    kannNicht: ausHilfs('nicht können', 'Gegenwart'),
    ...(muss && mussFund ? { muessen: { form: muss, fund: mussFund } } : {}),
    muessenAlle: new Set(partikeln),
    ...(tro ? { tro } : {}),
    ...(alsForm(wortFuer('nicht')) ? { nicht: alsForm(wortFuer('nicht')) } : {}),
    ...(alsForm(wortFuer('und')) ? { und: alsForm(wortFuer('und')) } : {}),
    ...(alsForm(wortFuer('oder')) ? { oder: alsForm(wortFuer('oder')) } : {}),
    ...(konjunktionD ? { dass: konjunktionD } : {}),
    ...(weilWort ? { weil: weilWort } : {}),
    fragewoerter,
    ...(fragepartikel ? { fragepartikel } : {}),
    adverbien,
    keineZeitangabe: nichtZeit,
    eingeschraenkt,
    familieKoerper,
    finit,
    zahlenAb11,
    ausnahmen,
    regeln: new Map(),
    kopula: ausHilfs('sein', 'Gegenwart'),
    kopulaVergangen: ausHilfs('sein', 'Vergangenheit'),
    kopulaNegiert: ausHilfs('nicht sein', 'Gegenwart', ausHilfs('sein', 'Gegenwart')),
    haben: ausHilfs('haben', 'Gegenwart'),
    nichtHaben: ausHilfs('nicht haben', 'Gegenwart'),
    artikel,
    possessiv: suffixe,
    possessivEng: suffixeEng,
    demonstrativ,
    praepositionen,
    praepositionenFrei,
    praepSuffixe,
    rektion,
    esGibt: paar('es gibt'),
    esGibtNicht: paar('es gibt nicht'),
    praesens: marker('Präsensmarker'),
    futur: marker('Futurmarker'),
    verben,
    grundformen,
    praeteritum,
    musterVergangen,
    objekt: objektSuffixe(wb, grundformen, seiteMit('Verben mit Objektsuffixen')),
    partizip,
    praeteritumDe,
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
    if (d.ausDaten) for (const f of wb.funde) if (d.ausDaten(f, ix) && !belege.includes(f)) belege.push(f);
    // Eine Regel, die ein Glossar-Wort trägt („w – und“): Belege aus allen Sätzen der Daten
    const traeger = d.glossar?.(ix);
    if (traeger) {
      kapitel.push(`${traeger.herkunft === 'wortschatz' ? `Wortschatz Lektion ${traeger.lektion}` : 'Glossar'}: ${traeger.latein} – ${traeger.deutsch}`);
      for (const f of wb.funde) if (d.beleg?.(f, ix)) belege.push(f);
    }
    // Der Erklärsatz ohne syrische Schrift (die zeigt die App noch nicht)
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
    const saetze = (Array.isArray(d.zitat) ? d.zitat : [d.zitat]).flatMap((z) => {
      const s = wb.seiten.get(z.seite);
      return s ? s.bloecke.flatMap((b) => ohneSchrift(b).split(/(?<=[.:])\s+(?=\p{Lu}|„)/u)).filter((t) => z.enthaelt.some((x) => t.includes(x))) : [];
    });
    // „Grammatik 4b, Grammatik 9c“ → „Grammatik 4b, 9c“
    const k = [...new Set(kapitel)].map((x, i) => (i ? x.replace(/^Grammatik /, '') : x)).join(', ');
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
  /** Für ein deutsches Wort, das so nicht im Lehrbuch steht: „„Kumpel“ wie „Freund““ */
  statt?: string;
  /** Was das Lehrbuch hier auch erlaubt (für die Gegenprobe): „i emayḏi“ neben „emi“ (Grammatik 5a.2) */
  oder?: string;
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
  /** Was der Übersetzer am Deutschen geändert hat: „„möchte“ wie „will““, „„mal“ weggelassen“ */
  hinweise?: string[];
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
  /** Mit „du“: zu einem Jungen oder einem Mädchen (damit Teilsätze zusammenpassen) */
  du?: 'm' | 'f';
  hinweise?: string[];
  /** Ein Name aus der Eingabe, der nicht im Lehrbuch steht („Adam“) – sein Geschlecht ist unbekannt */
  eingabeName?: string;
}

const text = (stuecke: readonly Stueck[]) => stuecke.map((s) => s.text).join(' ');
const mitRegel = (b: Bau, regel: RegelId): Bau => ({ ...b, regeln: [{ regel, text: text(b.stuecke) }, ...b.regeln] });
const varianteZusammen = (...v: (string | undefined)[]) => [...new Set(v.flatMap((x) => (x ? x.split(', ') : [])))].join(', ') || undefined;

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
  /** Gefunden über ein gleichbedeutendes Wort: „„Kumpel“ wie „Freund““ */
  statt?: string;
}

/** Wörter mit genau dieser deutschen Bedeutung, ohne den ausgeblendeten Eintrag. */
function direktFuer(ctx: Ctx, deutsch: string): Wahl[] {
  return kandidaten(ctx.wb, deutsch)
    .filter((s) => s.fund !== ctx.ohne)
    .map((s) => ({ s, m: merkmaleMitCache(ctx.wb, s, ctx.ohne, deutsch) }));
}

/**
 * Wörter mit dieser deutschen Bedeutung. Steht das Wort so nicht im Lehrbuch, sinngemäß:
 * erst gleichbedeutende deutsche Wörter (deutsch.ts), dann die Wortliste „Deutsch > Surayt“
 * des großen Glossars („Kirchenbesuch → cito“). Was so gefunden wurde, sagt `statt`.
 * `passt` wählt aus (z. B. nur Substantive) – ein Ersatz zählt nur, wenn danach etwas übrig bleibt.
 */
function woerterFuer(ctx: Ctx, deutsch: string, passt: (w: Wahl) => boolean = () => true): Wahl[] {
  const direkt = direktFuer(ctx, deutsch).filter(passt);
  if (direkt.length || ctx.ohne) return direkt;
  for (const syn of synonymeVon(deutsch)) {
    const da = direktFuer(ctx, syn).filter(passt);
    // Substantive groß („Kumpel“ wie „Freund“)
    const gross = (w: Wahl, x: string) => (w.m.wortart === 'nomen' ? x.charAt(0).toUpperCase() + x.slice(1) : x);
    if (da.length) return da.map((w) => ({ ...w, statt: `„${gross(w, deutsch)}“ wie „${gross(w, syn)}“` }));
  }
  const ausListe: Wahl[] = [];
  // („dass“, „mit“ … sind keine Wörter, die man in der Wortliste nachschlägt)
  if (istFunktionswort(deutsch)) return ausListe;
  for (const sur of ctx.wb.wortliste.get(deutsch) ?? []) {
    const k = genau(sur.split(/\s+/)[0] ?? '');
    for (const s of alleSchreibweisen(ctx.wb).filter((x) => x.genau === k && x.ganz && x.fund.art === 'wort')) {
      const b = bedeutungen(s.fund.deutsch)[0] ?? '';
      const w: Wahl = { s, m: merkmaleMitCache(ctx.wb, s, undefined, b), statt: `„${deutsch}“ wie „${b}“ (Wortliste des Glossars)` };
      if (passt(w)) ausListe.push(w);
    }
  }
  return ausListe;
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
  const direkt = woerterFuer(ctx, wort, (w) => w.m.wortart === 'nomen');
  const einzahl = direkt.filter((w) => w.m.zahl === 'sg' || (!opt.sicher && w.m.zahl === undefined && w.s.ganz));
  // Mehrzahl mit derselben Bedeutung: „malfone“ zu „Lehrer“, „nacime“ für „Kinder“
  const mehrzahl = direkt.filter((w) => w.m.zahl === 'pl');
  // Ein deutsches Mehrzahlwort zu einem anderen Substantiv („Häuser“ → „Haus“) – nur, wenn das Wort selbst nicht im Übersetzer steht
  const abgeleitet = direkt.length
    ? []
    : einzahlKandidaten(wort).flatMap((sg) => direktFuer(ctx, sg).filter((w) => w.m.wortart === 'nomen' && w.m.zahl === 'pl'));
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
  const form = (w: Wahl) => w.m.wortart === 'anderes' && w.m.zahl === zahl && (zahl === 'pl' ? !!w.m.geschlecht : w.m.geschlecht === g);
  const kandidatenListe = adjektivKandidaten(wort);
  let liste = kandidatenListe.flatMap((a) => direktFuer(ctx, a).filter(form));
  // Sinngemäß nur, wenn keine Form des Wortes selbst im Lehrbuch steht
  if (!liste.length && !kandidatenListe.some((a) => direktFuer(ctx, a).some((w) => w.m.wortart === 'anderes'))) {
    for (const a of kandidatenListe) {
      liste = woerterFuer(ctx, a, form);
      if (liste.length) break;
    }
  }
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
  ...(w.statt ? { statt: w.statt } : {}),
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

/**
 * `objekt`: Objekt im Präsens und Präteritum – mit bestimmtem Artikel bräuchte es oft die Objektmarkierung
 * (im Präteritum mal ja: „lo malḥaqla lu qṭoro – sie hat den Zug nicht erreicht“, mal nein: „šamici i tašciṯo
 * – sie hörten die Geschichte“)
 * (Grammatik 16e), deshalb nur ohne. `objekt-subjunktiv`: Objekt nach einem Modalverb – dort
 * steht es auch bestimmt ohne Markierung („Lazëm wa d saymat u buḥrono – Du musst die Prüfung
 * machen“, „Abicina zayrina i mazracto“, Grammatik 20c).
 */
type Rolle = 'allein' | 'subjekt' | 'praedikat' | 'objekt' | 'objekt-subjunktiv' | 'nach-praeposition' | 'nach-praeposition-frei';

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
    // (auch als Objekt nach einem Modalverb: „Kolozam d soyamno ah hërgayḏi – Ich muss meine Hausaufgaben machen“)
    const hinweis = erstes.hinweis;
    const offen = begleiterAuchMehrzahl(erstes.w);
    for (const w of nomen(ctx, kopf, { zahl: opt.zahl, sicher: true, offen })) {
      const stamm = endungslos(w);
      const art = stamm && artikelFuer(ctx, w.s.genau, w.m.geschlecht === 'mf' ? undefined : (w.m.geschlecht as 'm' | 'f'), w.m.zahl);
      // Verwandte und Körperteile: eingeschränkte Reihe, ohne Artikel („emi – meine Mutter“, Grammatik 5a.2).
      // Nur, wo es sicher ist (deutsche Bedeutung, Ausnahme oder Beleg); sonst lieber nichts.
      if (eingeschraenkt(ctx, w)) {
        if (sicherEingeschraenkt(ctx, w)) aus.push(...engerBesitz(ctx, w, besitzer, erstes));
        continue;
      }
      if (!stamm || !art || tUnklar(w)) continue;
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
            ...(w.statt ? { statt: w.statt } : {}),
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

  // Ein Personenname („Aday“) – nur, wenn das Wort kein Substantiv aus den Daten ist
  // (steht der Name selbst als Wort im Übersetzer – „Aday – Aday“ –, ist es trotzdem der Name)
  const alsName = ctx.ix.namen.get(erstes.w);
  if (
    t.length === 1 &&
    rolle !== 'praedikat' &&
    rolle !== 'nach-praeposition' &&
    alsName &&
    nomen(ctx, erstes.w, {}).every((w) => w.s.genau === alsName.form.toLowerCase())
  ) {
    const n = name(ctx, erstes.w);
    return n ? [n] : [];
  }
  // Ein Name, der nicht im Lehrbuch steht („Adam“): so übernommen, wie er getippt ist
  if (t.length === 1 && rolle !== 'nach-praeposition' && rolle !== 'allein') {
    const n = eingabeName(ctx, erstes);
    if (n) return [n];
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
        const as: Stueck = { text: a.s.genau, rolle: 'Adjektiv', fund: a.s.fund, merkmal: geschlechtText(a.m.geschlecht, a.m.zahl), ...(a.statt ? { statt: a.statt } : {}) };
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

/**
 * Ein Personenname aus den Daten („Aday“): mit Artikel, wenn das Lehrbuch das Geschlecht zeigt
 * („u Aday“), sonst ohne – „Personennamen können mit oder ohne Artikel stehen“ (Grammatik 3a).
 */
function name(ctx: Ctx, w: string): Bau | undefined {
  const n = ctx.ix.namen.get(w);
  const belege = (n?.belege ?? []).filter((b) => b.fund !== ctx.ohne);
  if (!n || !belege.length) return undefined;
  const geschlechter = [...new Set(belege.map((b) => b.g).filter(Boolean))];
  const g = geschlechter.length === 1 ? geschlechter[0] : undefined;
  const fund = belege.find((b) => b.g === g)?.fund ?? belege[0].fund;
  const ns: Stueck = { text: n.form, rolle: 'Name', fund, ...(g ? { merkmal: g === 'm' ? 'männlich (am Artikel im Lehrbuch)' : 'weiblich (am Artikel im Lehrbuch)' } : {}) };
  const art = g ? artikelFuer(ctx, n.form.toLowerCase(), g, 'sg') : undefined;
  if (!art) return { stuecke: [ns], regeln: [], zahl: 'sg' };
  return { stuecke: [art, ns], regeln: [{ regel: 'artikel', text: `${art.text} ${n.form}` }], zahl: 'sg', g };
}

/**
 * Ein Name aus der Eingabe („Ich treffe mich mit Adam“): ein Wort, das nirgends im Übersetzer steht –
 * weder als Wort noch in einer Grundform, als gleichbedeutendes Wort oder in der Wortliste – und kein
 * deutsches Funktionswort ist. Er wird so übernommen, wie er getippt ist, ohne Artikel (Grammatik 3a:
 * „Personennamen können mit oder ohne Artikel stehen“); sein Geschlecht kennt der Übersetzer nicht.
 * In der Gegenprobe nicht: Dort kommen nur Wörter aus den Daten vor.
 */
function eingabeName(ctx: Ctx, t: DeToken): Bau | undefined {
  if (ctx.ohne || !t.roh || !/^\p{L}{2,}$/u.test(t.roh) || istFunktionswort(t.w) || ctx.ix.namen.has(t.w)) return undefined;
  if (bekannt(ctx, t.w)) return undefined;
  const text = t.roh.charAt(0).toUpperCase() + t.roh.slice(1);
  return {
    stuecke: [{ text, rolle: 'Name', merkmal: 'aus deiner Eingabe – steht nicht im Lehrbuch' }],
    regeln: [],
    zahl: 'sg',
    hinweise: [`„${text}“ als Name übernommen`],
    eingabeName: text,
  };
}

const bekanntCache = new WeakMap<Woerterbuch, Map<string, boolean>>();

/** Kennt der Übersetzer das deutsche Wort (oder eine Grundform davon)? */
function bekannt(ctx: Ctx, w: string): boolean {
  let cache = bekanntCache.get(ctx.wb);
  if (!cache) bekanntCache.set(ctx.wb, (cache = new Map()));
  const da = cache.get(w);
  if (da !== undefined) return da;
  const ja =
    [w, ...grundformen(w)].some((x) => kandidaten(ctx.wb, x).length > 0 || ctx.wb.wortliste.has(x) || synonymeVon(x).length > 0 || ctx.ix.verben.has(x)) ||
    infinitiveVon(ctx, w).length > 0 ||
    ctx.ix.adverbien.has(w) ||
    ctx.ix.fragewoerter.has(w);
  cache.set(w, ja);
  return ja;
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

/**
 * „meine Mutter“, „sein Kopf“: Verwandtschaftsbezeichnungen und Körperteile mit der eingeschränkten Reihe
 * (Grammatik 5a.2): „Auch hier tritt das Suffix an das endungslose Substantiv, welches jedoch keinen Artikel
 * tragen darf“ – ëšmo → ëšmi. Nur in der Einzahl (die Beispiele des Lehrbuchs sind alle Einzahl).
 * „Alle diese Substantive können auch mit der allgemeinen Suffixreihe versehen werden“ – deshalb zählt in der
 * Gegenprobe auch die allgemeine Reihe als getroffen (`oder`).
 */
function engerBesitz(ctx: Ctx, w: Wahl, besitzer: readonly Person[], erstes: DeToken): Bau[] {
  const aus: Bau[] = [];
  if (w.m.zahl !== 'sg' || !/o$/.test(w.s.genau) || w.s.genau.length < 3) return aus;
  const stamm = w.s.genau.slice(0, -1);
  const g0 = w.m.geschlecht === 'mf' ? undefined : (w.m.geschlecht as 'm' | 'f' | undefined);
  // Die allgemeine Reihe (für die Gegenprobe): Artikel + endungsloses Substantiv + Suffix
  const art = artikelFuer(ctx, w.s.genau, g0, 'sg');
  for (const p of besitzer) {
    if (erstes.hinweis === 'pl' && p.zahl !== 'pl') continue;
    if (erstes.hinweis === 'sg' && p.zahl !== 'sg') continue;
    for (const g of p.zahl === 'sg' && p.p === 2 ? (['m', 'f'] as const) : [p.g]) {
      if ((erstes.hinweis === 'm' || erstes.hinweis === 'f') && g !== erstes.hinweis) continue;
      const suffix = formFuerPerson(ctx.ix.possessivEng, { ...p, g });
      // (In der Gegenprobe nicht aus dem Satz selbst: „ëšmi – mein Name“ zeigt die Endung -i)
      if (!suffix || suffix.fund === ctx.ohne) continue;
      const allgemein = formFuerPerson(ctx.ix.possessiv, { ...p, g });
      const wort: Stueck = {
        text: stamm + suffix.form,
        rolle: 'Substantiv mit Possessivsuffix',
        merkmal: 'eingeschränkte Reihe, ohne Artikel',
        ...(w.statt ? { statt: w.statt } : {}),
        ...(art && allgemein && !tUnklar(w) ? { oder: `${art.text} ${stamm}${allgemein.form}` } : {}),
        aus: [
          { text: `${stamm}-`, fund: w.s.fund, rolle: `${w.s.genau} ohne Endung` },
          { text: `-${suffix.form}`, fund: suffix.fund, rolle: `Possessivsuffix, eingeschränkte Reihe · ${suffix.fund.deutsch}` },
        ],
      };
      const variante = besitzer.length > 1 ? `„${erstes.w}“ = ${p.zahl === 'pl' ? 'von ihnen' : 'von ihr'}` : p.p === 2 && p.zahl === 'sg' ? (g === 'm' ? 'zu einem Jungen' : 'zu einem Mädchen') : undefined;
      aus.push({ stuecke: [wort], regeln: [{ regel: 'possessiv2', text: wort.text }], zahl: 'sg', ...(g0 ? { g: g0 } : {}), variante, ...(p.p === 2 && p.zahl === 'sg' ? { du: g } : {}) });
    }
  }
  return aus;
}

/**
 * Sicher Verwandtschaft oder Körperteil – nicht nur, weil das Wort im Wortschatz von Lektion 4 oder 7 steht
 * (dort stehen auch „Arbeit“, „Identität“): die deutsche Bedeutung („Mutter“, „Kopf“), eine der Ausnahmen
 * aus Grammatik 5a.2 („ëšmo – Name“) oder ein Eintrag mit der eingeschränkten Reihe („leba – ihr Herz“).
 */
function sicherEingeschraenkt(ctx: Ctx, w: Wahl): boolean {
  const namen = bedeutungen(w.s.fund.deutsch);
  return (
    ctx.ix.ausnahmen.has(w.s.genau) ||
    namen.some((n) => FAMILIE_KOERPER.has(n)) ||
    namen.some((n) => (ctx.ix.eingeschraenkt.get(n) ?? []).some((f) => f !== ctx.ohne))
  );
}

/** Weibliche Wörter auf -to behalten das t vor dem Suffix mal (i aṯtayḏi), mal nicht (i qrayayḏe) – das Lehrbuch erklärt es nicht. */
const tUnklar = (w: Wahl) => w.m.geschlecht === 'f' && w.m.zahl === 'sg' && /to$/.test(w.s.genau);

/** Präposition mit Artikel: „im Haus“ = bu bayto (Grammatik 11b). */
function mitPraeposition(ctx: Ctx, t: readonly DeToken[]): Bau[] {
  if (t.length < 2) return [];
  // Steht die Wendung so in den Daten („bi ḥarayto – zum Schluss“), gilt sie – nicht die Regel
  // (vor einem Pronomen baut die Tabelle dasselbe: „acmi – mit mir“)
  if (!(t.length === 2 && pronomenNachPraeposition(t[1].w)) && wendung(ctx, t).length) return [];
  const [p, ...rest] = t;
  const versch = praeposition(p.w, undefined, false);
  const artikel = versch ? versch.artikel : rest[0]?.w;
  const nach = versch ? rest : rest.slice(1);
  const aus: Bau[] = [];
  // Die deutsche Gruppe mit Artikel bauen, dann die Präposition davor schreiben („b“ + „u“ = „bu“).
  const mitArtikel = artikel && nach.length && nach.length <= 2 ? gruppe(ctx, [{ w: artikel }, ...nach], 'nach-praeposition') : [];
  for (const g of mitArtikel) {
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
  if (!versch) aus.push(...praepositionFuerSich(ctx, p, rest));
  return aus;
}

/** Das Objekt-Pronomen mit Geschlecht, wo die Form davon abhängt („dich“: zu einem Jungen / zu einem Mädchen). */
function objektVarianten(o: Person, hinweis?: DeToken['hinweis']): { x: Person; variante?: string; du?: 'm' | 'f' }[] {
  if (o.p === 2 && o.zahl === 'sg') {
    return (['m', 'f'] as const)
      .filter((g) => !(hinweis === 'm' || hinweis === 'f') || g === hinweis)
      .map((g) => ({ x: { ...o, g }, variante: g === 'm' ? 'zu einem Jungen' : 'zu einem Mädchen', du: g }));
  }
  return [{ x: o }];
}

/** Präposition mit Suffix aus der Tabelle in Grammatik 11b („acmi“, „ebux“); bei „du“ für einen Jungen und für ein Mädchen. */
function praepMitSuffix(ctx: Ctx, pr: Form, person: Person, hinweis?: DeToken['hinweis']): Bau[] {
  const aus: Bau[] = [];
  const formen = ctx.ix.praepSuffixe.get(pr.form) ?? [];
  for (const { x, variante, du } of objektVarianten(person, hinweis)) {
    for (const f of formenFuerPerson(formen, x).slice(0, 1)) {
      const eintrag = f.eintrag && f.eintrag !== ctx.ohne ? f.eintrag : undefined;
      const st: Stueck = eintrag
        ? { text: f.form, rolle: 'Präposition mit Suffix', fund: eintrag, merkmal: personText(x) }
        : { text: f.form, rolle: 'Präposition mit Suffix', merkmal: personText(x), aus: [{ text: f.form, fund: f.fund, rolle: f.tabelle ?? '' }] };
      aus.push({ stuecke: [st], regeln: [{ regel: 'praepsuffix', text: f.form }], ...(variante ? { variante, du } : {}) });
    }
  }
  return aus;
}

/** Deutsche Präposition vor einem Pronomen → Bedeutung im Lehrbuch (Spalten der Tabelle in Grammatik 11b). */
const MIT_SUFFIX: Record<string, string> = { mit: 'mit', auf: 'auf', in: 'in', von: 'aus', aus: 'aus', bei: 'bei' };

/**
 * Eine Präposition, die für sich steht (Grammatik 11b): vor einem Substantiv mit Artikel („bëṯr u bayto
 * – hinter dem Haus“), ohne Artikel („b dukano – in einem Geschäft“), vor einem Namen („cam Adam“) –
 * oder mit Suffix vor einem Pronomen („acmi – mit mir“, aus der Tabelle in Grammatik 11b).
 */
function praepositionFuerSich(ctx: Ctx, p: DeToken, rest: readonly DeToken[]): Bau[] {
  const ix = ctx.ix;
  const aus: Bau[] = [];
  if (!rest.length || rest.length > 3) return aus;
  // „mit mir“, „bei uns“, „mit dir“ (zu einem Jungen / zu einem Mädchen)
  const person = rest.length === 1 ? pronomenNachPraeposition(rest[0].w) : undefined;
  if (person) {
    const bed = MIT_SUFFIX[p.w];
    const pr = bed ? (ix.praepositionen.get(bed) ?? ix.praepositionenFrei.get(bed)) : undefined;
    return pr ? praepMitSuffix(ctx, pr, person, rest[0].hinweis) : [];
  }
  if (pronomenNachPraeposition(rest[0].w) || istPronomen(rest[0].w)) return aus;
  const erstes = rest[0].w;
  const begleiter = UNBESTIMMT.has(erstes) || KEIN.has(erstes) || possessiv(erstes) ? erstes : undefined;
  const istName = rest.length === 1 && !BESTIMMT.has(erstes) && (ix.namen.has(erstes) || !!eingabeName(ctx, rest[0]));
  const bed = praepositionFrei(p.w, begleiter, istName);
  const pr = bed && ix.praepositionenFrei.get(bed);
  if (!bed || !pr) return aus;
  // Die kurzen Präpositionen (b, l, m/me, s/se) stehen für sich nur vor einem Namen, einem Ländernamen
  // („b Holanda“, „me Ṭurcabdin“) oder einem Substantiv mit „ein“ („b dukano – in einem Geschäft“).
  // Ohne Artikel setzt das Lehrbuch oft doch einen („mi zucṯo – aus Angst“).
  const kurz = ix.praepositionen.has(bed);
  for (const g of gruppe(ctx, rest, 'nach-praeposition-frei')) {
    // Kurze Präpositionen und Artikel werden zusammengeschrieben (`mitPraeposition`)
    if (g.stuecke[0]?.rolle === 'Artikel' && kurz) continue;
    const eigenname = g.stuecke.length === 1 && (g.stuecke[0].rolle === 'Name' || /^\p{Lu}/u.test(g.stuecke[0].text));
    if (kurz && !eigenname && !(begleiter && UNBESTIMMT.has(begleiter))) continue;
    // Ohne Artikel und Begleiter ist es oft eine feste Wendung („bë fṣiḥuṯo – mit Freude“, „b ḥaylo – mit Kraft“)
    if (!eigenname && !begleiter && !BESTIMMT.has(erstes)) continue;
    const ps: Stueck = { text: pr.form, rolle: `Präposition „${bed}“`, fund: pr.fund };
    aus.push(mitRegel(verbinde({ stuecke: [ps], regeln: [] }, g), 'praeposition2'));
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
  ...(f.teile ? { aus: f.teile } : f.muster ? { aus: musterTeile(f) } : {}),
});

/** Die Teile einer Form nach dem Muster der Verbtabellen: „yëlf-“ (aus yëlfo im Glossar) + „-i“ (wie gurši). */
function musterTeile(f: PForm): Teilstueck[] {
  const m = f.muster!;
  return [
    { text: `${m.basis}-`, fund: f.fund, rolle: `aus der Form für er/sie im Glossar` },
    ...(m.endung ? [{ text: `-${m.endung}`, fund: m.wieFund, rolle: `Endung wie in ${m.wie} (Verbtabelle)` }] : []),
  ];
}

/** Das Prädikat nach „sein“: Adjektiv (angeglichen), Substantiv, Präposition oder Ortswort. */
function praedikat(ctx: Ctx, t: readonly DeToken[], x: Person, negiert: boolean): Bau[] {
  const aus: Bau[] = [];
  if (t.length === 1) {
    const w = t[0].w;
    const orte = ortswort(ctx, w);
    if (orte.length) return [{ stuecke: orte, regeln: [] }];
    // Adjektiv: in Geschlecht und Zahl wie das Subjekt (Grammatik 11a)
    for (const a of adjektiv(ctx, w, x.g, x.zahl)) {
      aus.push({ stuecke: [{ text: a.s.genau, rolle: 'Adjektiv', fund: a.s.fund, merkmal: geschlechtText(a.m.geschlecht, a.m.zahl), ...(a.statt ? { statt: a.statt } : {}) }], regeln: [{ regel: 'adjektiv', text: a.s.genau }] });
    }
  }
  // „zu Hause“: eine Wendung aus den Daten („Bu bayto yo – Er ist (gerade) zu Hause“, Grammatik 24c)
  aus.push(...wendung(ctx, t));
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

/** Alle Sätze, die die Regeln aus einem Teilsatz in der Form „Subjekt – Verb – Rest“ bauen können (ohne Gegenprobe). */
function baue(ctx: Ctx, t: readonly DeToken[], opt: { frage?: boolean; zeit?: 'vergangen' | 'subjunktiv'; vorDass?: boolean } = {}): Bau[] {
  const aus: Bau[] = [];
  const [a, b, ...rest] = t;
  if (!a || !b) return aus;
  const ix = ctx.ix;
  // Vergangenheit und Subjunktiv: nur Verbalsätze (das Präteritum der Kopula ist eine eigene Form: „ich war“)
  if (opt.zeit) return verbalsaetze(ctx, t, opt.frage ?? false, opt.zeit);

  // Kopula: „ich bin müde“, „wir waren verheiratet“, „ihr seid nicht bereit“ (Grammatik 4b, 9c, 12a)
  for (const [formen, tafel, zeit] of [
    [SEIN, ix.kopula, 'Gegenwart'],
    [WAR, ix.kopulaVergangen, 'Vergangenheit'],
  ] as const) {
    for (const x0 of subjekt(a.w, b.w, formen)) {
      // Zeitangaben („heute“) stehen im Nominalsatz vorn (Grammatik 18b)
      const { vorne, rest: ohneZeit } = zeitangabenRaus(ctx, rest);
      const negiert = ohneZeit[0]?.w === 'nicht' || KEIN.has(ohneZeit[0]?.w ?? '');
      // Verneint nur im Präsens: dafür stehen die Beispiele in Grammatik 9c.
      if (negiert && zeit !== 'Gegenwart') continue;
      const pt = ohneZeit[0]?.w === 'nicht' ? ohneZeit.slice(1) : ohneZeit;
      if (!pt.length) continue;
      for (const { x, variante, ich } of mitGeschlecht(ctx, x0)) {
        const kop = formFuerPerson(negiert ? ix.kopulaNegiert : tafel, x);
        if (!kop) continue;
        for (const p of praedikat(ctx, pt, x, negiert)) {
          const k = formStueck(kop, negiert ? 'Kopula, verneint' : 'Kopula', x, zeit);
          // „die dem betreffenden Wort oder Satzteil folgt“; verneint steht latyo davor (Beispiele in 9c)
          const stuecke = negiert ? [k, ...p.stuecke] : [...p.stuecke, k];
          let bau = mitRegel({ stuecke, regeln: p.regeln, variante: varianteZusammen(variante, p.variante), ich, ...(x.p === 2 && x.zahl === 'sg' ? { du: x.g } : {}) }, 'kopula');
          for (const v of [...vorne].reverse()) bau = mitRegel(verbinde(v, bau), 'adverb');
          aus.push(bau);
        }
      }
    }
  }

  // Kopula mit Substantiv als Subjekt: „der Bruder ist groß“ = u aḥuno rabo yo (Grammatik 11a)
  const i = t.findIndex((x, k) => k >= 2 && (x.w === 'ist' || x.w === 'sind'));
  if (i >= 2 && !istPronomen(a.w)) {
    const zahl: Zahl = t[i].w === 'ist' ? 'sg' : 'pl';
    for (const s of gruppe(ctx, t.slice(0, i), 'subjekt', { zahl })) {
      const istName = s.stuecke.some((x) => x.rolle === 'Name');
      if (!s.regeln.some((r) => r.regel === 'artikel' || r.regel === 'possessiv' || r.regel === 'possessiv2') && !istName) continue;
      const pt = t.slice(i + 1);
      if (pt.length !== 1) continue;
      // Ein Name ohne bekanntes Geschlecht: beide Formen des Adjektivs
      const geschlechter = s.g || zahl === 'pl' ? [s.g] : istName ? (['m', 'f'] as const) : [undefined];
      for (const ge of geschlechter) {
        const x: Person = { p: 3, zahl, ...(ge && zahl === 'sg' ? { g: ge } : {}) };
        const kop = formFuerPerson(ix.kopula, x);
        const variante = varianteZusammen(s.variante, !s.g && ge ? nameVariante(s, ge) : undefined);
        for (const a2 of adjektiv(ctx, pt[0].w, x.g, zahl)) {
          if (!kop) continue;
          const adj: Stueck = { text: a2.s.genau, rolle: 'Adjektiv', fund: a2.s.fund, merkmal: geschlechtText(a2.m.geschlecht, a2.m.zahl), ...(a2.statt ? { statt: a2.statt } : {}) };
          aus.push(
            mitRegel(
              { ...s, stuecke: [...s.stuecke, adj, formStueck(kop, 'Kopula', x, 'Gegenwart')], regeln: [...s.regeln, { regel: 'adjektiv', text: adj.text }], variante },
              'kopula',
            ),
          );
        }
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
    const negiert = rest.some((x) => KEIN.has(x.w));
    for (const { x, variante, ich } of mitGeschlecht(ctx, x0)) {
      const h = formFuerPerson(negiert ? ix.nichtHaben : ix.haben, x);
      if (!h) continue;
      // Das Objekt, auch mit Zeitangabe und Ort: „ich habe heute einen langen Tag in der Schule“
      const objekte = rest.length && rest.every((y) => !SEIN.includes(y.w)) ? ergaenzungen(ctx, rest, { negiert }) : [];
      for (const o of objekte) {
        if (!o.stuecke.some((y) => /Substantiv/.test(y.rolle))) continue;
        const hs = formStueck(h, negiert ? '„nicht haben“' : '„haben“', x);
        aus.push(mitRegel({ ...o, stuecke: [hs, ...o.stuecke], regeln: o.regeln, variante: varianteZusammen(variante, o.variante), ich, ...(x.p === 2 && x.zahl === 'sg' ? { du: x.g } : {}) }, 'haben'));
      }
    }
  }

  // „haben“ mit Substantiv als Subjekt: „die Wände haben Ohren“ = aš šurone këtte aḏne (Grammatik 9b)
  const hat = t.findIndex((x, k) => k >= 2 && (x.w === 'hat' || x.w === 'haben'));
  if (hat >= 2 && !istPronomen(a.w)) {
    const zahl: Zahl = t[hat].w === 'hat' ? 'sg' : 'pl';
    const negiert = KEIN.has(t[hat + 1]?.w ?? '');
    for (const s of gruppe(ctx, t.slice(0, hat), 'subjekt', { zahl })) {
      if (!s.regeln.some((r) => r.regel === 'artikel' || r.regel === 'possessiv' || r.regel === 'possessiv2')) continue;
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

  // Verbalsätze: Präsens, Futur, Modalverben, verneint, mit Ergänzungen (Grammatik 7b, 17a, 17d, 20c, 22c, 23d)
  aus.push(...verbalsaetze(ctx, t, opt.frage ?? false, undefined, opt.vorDass));

  // Wortgruppen allein: „mein Lehrer“, „drei Häuser“, „ein großes Haus“, „im Haus“ – aber nur, wenn eine Regel mitspielt
  if (!aus.length) {
    for (const g of [...gruppe(ctx, t, 'allein'), ...mitPraeposition(ctx, t)]) if (g.regeln.length) aus.push(g);
  }
  return aus;
}

// --- Ganze Sätze (Phase 4b, Schritt 7b): Grammatik 17–24 ---------------------------------------------
//
// Was hier dazukommt: Verbalsätze mit Substantiv als Subjekt (G17d), Modalverben mit Subjunktiv
// (G20c), Verneinung mit lo (G22c, d), Adverbien der Zeit und des Ortes (G18b), Fragen (G24a),
// Fragen nach einem Vorschlag und ṭro (G23d) und zwei Sätze mit „und“/„oder“/„aber“. Die deutsche
// Wortstellung wird dafür in die einfache Form „Subjekt – Verb – Rest“ gebracht (deutsch.ts),
// die Teile kommen aus den Bausteinen oben.

const LEER: Bau = { stuecke: [], regeln: [] };

/** Zwei Bausteine hintereinander (Merkmale vom ersten, Hinweise von beiden). */
function verbinde(a: Bau, b: Bau): Bau {
  const hinweise = [...(a.hinweise ?? []), ...(b.hinweise ?? [])];
  return {
    ...a,
    stuecke: [...a.stuecke, ...b.stuecke],
    regeln: [...a.regeln, ...b.regeln],
    variante: varianteZusammen(a.variante, b.variante),
    ...(a.ich ?? b.ich ? { ich: a.ich ?? b.ich } : {}),
    ...(a.du ?? b.du ? { du: a.du ?? b.du } : {}),
    ...(hinweise.length ? { hinweise: [...new Set(hinweise)] } : {}),
  };
}

/** Ein Adverb aus den Daten (Grammatik 18b, „(adv.)“ im Glossar): „heute“, „heute abend“, „hier“; auch sinngemäß („nun“ wie „jetzt“). */
function adverb(ctx: Ctx, t: readonly DeToken[]): Bau[] {
  const key = t.map((x) => x.w).join(' ');
  const finde = (k: string) => (ctx.ix.adverbien.get(k) ?? []).filter((f) => f.fund !== ctx.ohne);
  let formen = finde(key);
  let statt: string | undefined;
  if (!formen.length && !ctx.ohne) {
    for (const syn of synonymeVon(key)) {
      formen = finde(syn);
      if (formen.length) {
        statt = `„${key}“ wie „${syn}“`;
        break;
      }
    }
  }
  return formen.slice(0, 1).map((f) => ({
    stuecke: [{ ...stueck(f, 'Adverb'), ...(statt ? { statt } : {}) }],
    regeln: [{ regel: 'adverb', text: f.form }],
  }));
}

const wendungenCache = new WeakMap<Woerterbuch, Map<string, Fund[]>>();

/**
 * Eine Wendung, die genau so in den Daten steht – „zu Hause“ (bu bayto), „nach Hause“ (lu bayto):
 * ein deutscher Ausdruck aus zwei oder drei Wörtern, der als Bedeutung eines kurzen Eintrags steht.
 * Das ist keine Regel, sondern ein Eintrag aus dem Lehrbuch.
 */
function wendung(ctx: Ctx, t: readonly DeToken[]): Bau[] {
  if (t.length < 2 || t.length > 3) return [];
  let index = wendungenCache.get(ctx.wb);
  if (!index) {
    index = new Map();
    for (const f of ctx.wb.funde) {
      const n = surWoerter(f.latein.replace(/\([^)]*\)/g, ' ')).length;
      if (n < 1 || n > 3 || /[,;:/~+…]/.test(f.latein) || f.verb) continue;
      for (const b of bedeutungen(f.deutsch)) {
        if (b.split(' ').length < 2 || b.split(' ').length > 3) continue;
        index.set(b, [...(index.get(b) ?? []), f]);
      }
    }
    for (const liste of index.values()) liste.sort((a, b) => RANG[a.herkunft] - RANG[b.herkunft] || Number(!!b.audio) - Number(!!a.audio));
    wendungenCache.set(ctx.wb, index);
  }
  // Der deutsche Ausdruck mit Artikeln, so wie `bedeutungen` sie ablegt (ohne Artikel)
  const key = t.map((x) => x.w).filter((w) => !BESTIMMT.has(w) && !UNBESTIMMT.has(w)).join(' ');
  // Der Artikel muss aber passen: „in einem Dorf“ ist nicht „li qriṯo – in das Dorf“
  const artikel = t.filter((x) => BESTIMMT.has(x.w) || UNBESTIMMT.has(x.w)).map((x) => x.w);
  return (index.get(key) ?? [])
    .filter((f) => f !== ctx.ohne)
    .filter((f) => {
      const im = new Set(zerlegeDeutsch(f.deutsch).map((x) => x.w));
      return artikel.every((a) => im.has(a)) && ![...im].some((a) => (BESTIMMT.has(a) || UNBESTIMMT.has(a)) && !artikel.includes(a));
    })
    .slice(0, 1)
    .map((f) => ({ stuecke: [{ text: surWoerter(f.latein.replace(/\([^)]*\)/g, ' ')).join(' '), rolle: 'Wendung aus dem Lehrbuch', fund: f }], regeln: [] }));
}

/** Ist das Wort (oder sind die zwei Wörter) ein Adverb? */
const istAdverb = (ctx: Ctx, t: readonly DeToken[]) => adverb(ctx, t).length > 0;

/**
 * Zeitangaben aus dem Rest eines Nominalsatzes nach vorn: „ich bin heute krank“ → adyawma …,
 * wie „Ramḥël yawme dë cruto yo – Morgen ist Freitag“, „Ucdo u Aday malfono yo – Jetzt ist Aday
 * Lehrer“. Ortsadverbien („hier“) bleiben, sie sind das Prädikat.
 */
function zeitangabenRaus(ctx: Ctx, t: readonly DeToken[]): { vorne: Bau[]; rest: DeToken[] } {
  const vorne: Bau[] = [];
  const rest: DeToken[] = [];
  for (let i = 0; i < t.length; i++) {
    const zeit = (b: Bau[]) => b.filter((x) => !ctx.ix.keineZeitangabe.has(x.stuecke[0]?.text ?? ''));
    const zwei = i + 1 < t.length ? zeit(adverb(ctx, t.slice(i, i + 2))) : [];
    const eins = ORTSWORT.has(t[i].w) ? [] : zeit(adverb(ctx, t.slice(i, i + 1)));
    if (zwei.length) {
      vorne.push(zwei[0]);
      i++;
    } else if (eins.length && t.length > 1) vorne.push(eins[0]);
    else rest.push(t[i]);
  }
  return { vorne, rest };
}

/**
 * Die Ergänzungen nach dem Verb, in der Reihenfolge des Deutschen: Adverbien („heute“),
 * Wortgruppen ohne bestimmten Artikel („einen langen Tag“), Präpositionen („in der Schule“).
 * So stehen sie auch im Lehrbuch: „Kobac fayšat adlalyo harke – Du musst heute Nacht hier
 * bleiben“, „Šotina ucdo qaḥwa – Wollen wir jetzt Kaffee trinken“.
 */
function ergaenzungen(ctx: Ctx, t: readonly DeToken[], opt: { negiert?: boolean; rolle?: Rolle; rektion?: Form } = {}): Bau[] {
  const memo = new Map<string, Bau[]>();
  /** Das Objekt eines Verbs mit Präposition („treffen“ – b): Präposition davor, kurze mit dem Artikel zusammen */
  const mitRektion = (g: Bau): Bau | undefined => {
    const r = opt.rektion!;
    const [erstes, ...uebrig] = g.stuecke;
    if (!erstes || !g.stuecke.some((x) => /Substantiv|Name/.test(x.rolle))) return undefined;
    const rs: Stueck = { text: r.form, rolle: 'Präposition, die das Verb verlangt', fund: r.fund };
    if (erstes.rolle === 'Artikel' && r.form.length === 1) {
      const zusammen: Stueck = {
        text: r.form + erstes.text,
        rolle: 'Präposition mit Artikel',
        aus: [
          { text: `${r.form}-`, fund: r.fund, rolle: 'Präposition, die das Verb verlangt' },
          { text: erstes.text, fund: erstes.fund!, rolle: `Artikel · ${erstes.merkmal ?? ''}` },
        ],
      };
      return mitRegel({ ...g, stuecke: [zusammen, ...uebrig] }, 'praeposition');
    }
    return mitRegel(verbinde({ stuecke: [rs], regeln: [] }, g), 'praeposition2');
  };
  const rolle = opt.rektion ? 'nach-praeposition-frei' : (opt.rolle ?? 'objekt');
  /** Eine Wortgruppe, auch zwei mit „und“: „Saro und Aday“ = i Saro w u Aday */
  const gruppen = (teil: readonly DeToken[]): Bau[] => {
    const und = teil.findIndex((x) => x.w === 'und');
    if (und < 0) return gruppe(ctx, teil, rolle, { negiert: opt.negiert });
    if (und === 0 || und === teil.length - 1 || !ctx.ix.und) return [];
    const aus: Bau[] = [];
    for (const a of gruppe(ctx, teil.slice(0, und), rolle, { negiert: opt.negiert }).slice(0, 2)) {
      for (const b of gruppe(ctx, teil.slice(und + 1), rolle, { negiert: opt.negiert }).slice(0, 2)) {
        aus.push(mitRegel(verbinde(verbinde(a, { stuecke: [stueck(ctx.ix.und, 'Bindewort „und“')], regeln: [] }), b), 'und'));
      }
    }
    return aus;
  };
  const ab = (i: number, praepNoch: boolean): Bau[] => {
    if (i >= t.length) return [LEER];
    const k = `${i}|${praepNoch}`;
    const da = memo.get(k);
    if (da) return da;
    const aus: Bau[] = [];
    for (let n = Math.min(7, t.length - i); n >= 1 && aus.length < 4; n--) {
      const teil = t.slice(i, i + n);
      if (n > 4 && !teil.some((x) => x.w === 'und')) continue;
      // Ist ein Wort ein Adverb („morgen“), dann nicht noch als Substantiv („der Morgen“) – klein getippt sieht man es nicht.
      const adv = n <= 2 ? adverb(ctx, teil) : [];
      const pp = adv.length ? [] : mitPraeposition(ctx, teil);
      const wen = adv.length || pp.some((x) => x.regeln.some((r) => r.regel === 'praepsuffix')) ? [] : wendung(ctx, teil);
      let gr = adv.length || wen.length ? [] : gruppen(teil);
      // Das erste Objekt eines Verbs mit Präposition bekommt sie
      if (praepNoch) gr = gr.flatMap((g) => mitRektion(g) ?? []);
      const vorher = [...adv, ...wen, ...(wen.length ? [] : pp)];
      for (const [erste, noch] of [[vorher, praepNoch], [gr, false]] as const) {
        if (!erste.length) continue;
        const weiter = ab(i + n, noch);
        for (const a of erste.slice(0, 2)) for (const b of weiter.slice(0, 2)) aus.push(verbinde(a, b));
      }
    }
    memo.set(k, aus);
    return aus;
  };
  return ab(0, !!opt.rektion);
}

/** „nicht“ und „kein“ im Rest eines Satzes: Ohne „nicht“ bleibt der Rest, „kein“ bleibt stehen (die Wortgruppe baut es ohne Artikel). */
function verneinungIn(t: readonly DeToken[]): { negiert: boolean; rest: DeToken[] } {
  const ohne = t.filter((x) => x.w !== 'nicht');
  return { negiert: ohne.length < t.length || t.some((x) => KEIN.has(x.w)), rest: ohne };
}

/** Das Wort für „nicht“ (lo), „und“ (w) usw. als Stück. */
const kleinwortStueck = (f: Form | undefined, rolle: string): Stueck[] => (f ? [stueck(f, rolle)] : []);

/** Präsens: ko- + Grundform, vor Vokal k- (Grammatik 7b, 17a: „komar“, „këzze“, „kobac“). */
function praesensStueck(ctx: Ctx, f: PForm, x: Person): Stueck | undefined {
  const ko = ctx.ix.praesens;
  // h-Anlaut („howe“ → „kowe“) nennt das Lehrbuch nur für howe – „sein“, „werden“ haben eigene Regeln.
  if (!ko || /^h/.test(f.form)) return undefined;
  const vokal = /^[aeiouëä]/.test(f.form);
  const marker = vokal ? ko.form.replace(/[aeiouëä]+$/, '') : ko.form;
  return {
    text: marker + f.form,
    rolle: 'Verb im Präsens',
    merkmal: personText(x),
    aus: [
      { text: `${marker}-`, fund: ko.fund, rolle: vokal ? 'Präsensmarker, vor Vokal k- (Grammatik 17a)' : 'Präsensmarker' },
      ...(f.teile ?? (f.muster ? musterTeile(f) : [{ text: f.form, fund: f.fund, rolle: `Grundform des Präsens · ${personText(x)}` }])),
    ],
  };
}

/** Deutsches Verb (Infinitiv) → Verben im Lehrbuch; sinngemäß über gleichbedeutende Verben („gucken“ wie „sehen“). */
function verbenFuer(ctx: Ctx, inf: string): { verb: string; statt?: string }[] {
  const direkt = ctx.ix.verben.get(inf) ?? [];
  if (direkt.length) return direkt.map((verb) => ({ verb }));
  if (ctx.ohne) return [];
  for (const syn of synonymeVon(inf)) {
    const da = ctx.ix.verben.get(syn) ?? [];
    if (da.length) return da.map((verb) => ({ verb, statt: `„${inf}“ wie „${syn}“` }));
  }
  return [];
}

/** Deutsche Präsensform → Infinitive, auch von gleichbedeutenden Verben („guckst“ → gucken). */
function infinitiveVon(ctx: Ctx, finit: string): string[] {
  const da = ctx.ix.finit.get(finit) ?? [];
  if (da.length || ctx.ohne) return da;
  return Object.keys(DEUTSCHE_SYNONYME).filter((inf) => /(?:en|ern|eln)$/.test(inf) && (praesens(inf) ?? []).includes(finit));
}

/** Das Subjekt eines Verbalsatzes: ein Pronomen (fällt im Surayt weg) oder eine Wortgruppe mit Artikel/Possessiv (Grammatik 17d). */
interface SubjektTeil {
  personen: Person[];
  bau: Bau;
  /** Wo im Deutschen das Verb steht */
  verb: number;
  nomen: boolean;
}

function subjekteVon(ctx: Ctx, t: readonly DeToken[]): SubjektTeil[] {
  const aus: SubjektTeil[] = [];
  // Wer zu Pronomen und Verbform passt: „wir möchten“, „du kommst“, „er wird“
  const personenFuer = (pron: string, w: string): Person[] => [
    ...subjekt(pron, w, WERDEN),
    ...modalVon(pron, w).flatMap((m) => m.personen),
    ...infinitiveVon(ctx, w).flatMap((inf) => subjekt(pron, w, praesens(inf) ?? [])),
  ];
  // Welche dritte Person (Einzahl/Mehrzahl) zur Verbform passt: „der Lehrer kommt“, „die Kinder wollen“
  const dritte = (w: string): Zahl[] =>
    (['sg', 'pl'] as const).filter(
      (z) =>
        WERDEN[z === 'sg' ? 2 : 5] === w ||
        modalFuerDritte(w).some((m) => m.zahl === z) ||
        infinitiveVon(ctx, w).some((inf) => (praesens(inf) ?? [])[z === 'sg' ? 2 : 5] === w),
    );
  if (t[0] && istPronomen(t[0].w) && t[1]) {
    const personen = personenFuer(t[0].w, t[1].w);
    if (personen.length) aus.push({ personen: [...new Map(personen.map((p) => [`${p.p}${p.zahl}${p.g ?? ''}`, p])).values()], bau: LEER, verb: 1, nomen: false });
  }
  const bestimmtesSubjekt = (g: Bau) => g.regeln.some((r) => r.regel === 'artikel' || r.regel === 'possessiv' || r.regel === 'possessiv2') || g.stuecke.some((x) => x.rolle === 'Name');
  for (let i = 1; i <= 7 && i < t.length; i++) {
    if (istPronomen(t[0].w)) break;
    const vorn = t.slice(0, i);
    const und = vorn.findIndex((x) => x.w === 'und');
    for (const zahl of dritte(t[i].w)) {
      if (und < 0 && i <= 3) {
        for (const g of gruppe(ctx, vorn, 'subjekt', { zahl })) {
          if (!bestimmtesSubjekt(g)) continue;
          // Ein Name ohne bekanntes Geschlecht („Adam kommt“): beide Formen, je nachdem, wer gemeint ist
          if (zahl === 'sg' && !g.g && g.stuecke.some((x) => x.rolle === 'Name')) {
            for (const ge of ['m', 'f'] as const) aus.push({ personen: [{ p: 3, zahl, g: ge }], bau: { ...g, g: ge, variante: varianteZusammen(g.variante, nameVariante(g, ge)) }, verb: i, nomen: true });
            continue;
          }
          aus.push({ personen: [{ p: 3, zahl, ...(g.g && zahl === 'sg' ? { g: g.g } : {}) }], bau: g, verb: i, nomen: true });
        }
      }
      // „Saro und Aday wollen …“ – zwei Subjekte mit w „und“, das Verb in der Mehrzahl
      if (und > 0 && und < i - 1 && zahl === 'pl' && ctx.ix.und) {
        const links = gruppe(ctx, vorn.slice(0, und), 'subjekt').filter(bestimmtesSubjekt);
        const rechts = gruppe(ctx, vorn.slice(und + 1), 'subjekt').filter(bestimmtesSubjekt);
        for (const a of links.slice(0, 2)) {
          for (const b of rechts.slice(0, 2)) {
            const bau = mitRegel(verbinde(verbinde(a, { stuecke: [stueck(ctx.ix.und, 'Bindewort „und“')], regeln: [] }), b), 'und');
            aus.push({ personen: [{ p: 3, zahl: 'pl' }], bau: { ...bau, zahl: 'pl' }, verb: i, nomen: true });
          }
        }
      }
    }
  }
  return aus;
}

/** „wenn Adam ein Junge ist“ – für Namen, deren Geschlecht der Übersetzer nicht kennt */
const nameVariante = (g: Bau, ge: 'm' | 'f') => {
  const n = g.stuecke.find((x) => x.rolle === 'Name')?.text ?? '';
  return `wenn ${n} ${ge === 'm' ? 'ein Junge' : 'ein Mädchen'} ist`;
};

/** Personen mit Geschlecht, als Bau-Merkmale für das Zusammenpassen von Teilsätzen. */
function personMitGeschlecht(ctx: Ctx, x0: Person) {
  return mitGeschlecht(ctx, x0).map((m) => ({ ...m, du: m.x.p === 2 && m.x.zahl === 'sg' ? m.x.g : undefined }));
}

/**
 * Verbalsätze: Präsens („ich spiele“), Futur („ich werde spielen“, auch Präsens mit „morgen“),
 * Modalverben („ich will/kann/muss spielen“), verneint („ich spiele nicht“), mit Ergänzungen.
 * `frage`: der Satz war eine Frage – „Wollen wir …?“, „Sollen wir …?“, „Soll ich …?“ sind dann
 * Fragen nach einem Vorschlag (Subjunktiv allein, Grammatik 23d).
 */
function verbalsaetze(ctx: Ctx, t: readonly DeToken[], frage: boolean, zeit?: 'vergangen' | 'subjunktiv', vorDass?: boolean): Bau[] {
  const ix = ctx.ix;
  const vergangen = zeit === 'vergangen';
  const subjunktivNachD = zeit === 'subjunktiv';
  const aus: Bau[] = [];
  const nicht = ix.nicht;
  if (!ix.praesens) return aus;

  for (const s of subjekteVon(ctx, t)) {
    const vw = t[s.verb].w;
    const nachVerb = t.slice(s.verb + 1);
    for (const x0 of s.personen) {
      // Modalverb + … + Infinitiv
      const modale = s.nomen ? modalFuerDritte(vw).filter((m) => m.zahl === x0.zahl) : istPronomen(t[0].w) ? modalVon(t[0].w, vw).filter((m) => m.personen.some((p) => gleichePerson(p, x0))) : [];
      const futur = WERDEN.includes(vw) && (s.nomen ? WERDEN[x0.zahl === 'sg' ? 2 : 5] === vw : subjekt(t[0].w, vw, WERDEN).some((p) => gleichePerson(p, x0)));
      let mitInfinitiv = modale.length > 0 || futur;
      let inf = mitInfinitiv ? nachVerb[nachVerb.length - 1]?.w : undefined;
      // „Möchtest du Wasser?“: „wollen“ ohne Infinitiv ist ein gewöhnliches Verb (obac „wollen, mögen“)
      const alsVollverb = mitInfinitiv && !futur && !(inf && verbenFuer(ctx, inf).length) && modale.some((m) => m.modal === 'wollen');
      const wieWollen = alsVollverb && modale.some((m) => m.deutsch !== 'wollen') ? `„${vw}“ wie „wollen“` : undefined;
      if (alsVollverb) {
        modale.length = 0;
        mitInfinitiv = false;
        inf = undefined;
      }
      // „ich wollte spielen“, „ich habe spielen müssen“: Modalverben und Futur in der Vergangenheit baut der Übersetzer nicht
      if ((vergangen || subjunktivNachD) && (mitInfinitiv || alsVollverb)) continue;
      const mitte = mitInfinitiv ? nachVerb.slice(0, -1) : nachVerb;
      const { negiert, rest: mitObjekt } = verneinungIn(mitte);
      // Pronomen als Objekt direkt nach dem Verb: „ich sehe dich“, „er gibt mir das Buch“ (Grammatik 22a);
      // mit einem Pronomen im Dativ darf das Ding bestimmt sein („kobeli u kṯowo – er gibt mir das Buch“)
      const objekt = vergangen ? undefined : objektPronomen(mitObjekt);
      const rest = objekt ? mitObjekt.slice(1) : mitObjekt;
      const zukunft = rest.some((x) => ZUKUNFT.has(x.w));
      const vollverben = alsVollverb
        ? verbenFuer(ctx, 'wollen').map((v) => ({ ...v, statt: wieWollen }))
        : mitInfinitiv
        ? inf
          ? verbenFuer(ctx, inf)
          : []
        : infinitiveVon(ctx, vw)
            .filter((i) => (praesens(i) ?? [])[STELLE_VON(x0)] === vw)
            .flatMap((i) => verbenFuer(ctx, i));
      if (!vollverben.length) continue;
      const ergOhne = ergaenzungen(ctx, rest, { negiert, ...(objekt?.dativ ? { rolle: 'objekt-subjunktiv' as const } : {}) });
      const ergSubjOhne = modale.length ? ergaenzungen(ctx, rest, { negiert, rolle: 'objekt-subjunktiv' }) : ergOhne;
      // Verben mit Präposition („treffen“ – b, aus dem Glossar): ihr Objekt steht mit dieser Präposition
      const rektionVon = (verb: string) => {
        const er = (ix.grundformen.get(verb) ?? []).find((f) => f.personen.some((p) => p.p === 3 && p.zahl === 'sg' && p.g === 'm'));
        const r = er && ix.rektion.get(er.form);
        return r && r.fund !== ctx.ohne ? r : undefined;
      };
      const ergMit = new Map<string, Bau[]>();
      const ergFuer = (verb: string, subjunktiv: boolean) => {
        const r = rektionVon(verb);
        if (!r) return subjunktiv ? ergSubjOhne : ergOhne;
        // „ich treffe dich“: das Pronomen an der Präposition des Verbs (b + Suffix, Tabelle in Grammatik 11b)
        if (objekt) return praepMitSuffix(ctx, r, objekt.person, objekt.hinweis).flatMap((p) => (subjunktiv ? ergSubjOhne : ergOhne).slice(0, 2).map((e) => verbinde(p, e)));
        const k = `${r.form}|${subjunktiv}`;
        if (!ergMit.has(k)) ergMit.set(k, ergaenzungen(ctx, rest, { negiert, rektion: r }));
        return ergMit.get(k)!;
      };
      if (!vollverben.some(({ verb }) => ergFuer(verb, false).length || ergFuer(verb, modale.length > 0).length)) continue;

      for (const { x, variante, ich, du } of personMitGeschlecht(ctx, x0)) {
        for (const { verb, statt } of vollverben) {
          for (const f0 of formenFuerPerson((vergangen ? ix.praeteritum : ix.grundformen).get(verb) ?? [], x)) {
            if (f0.fund === ctx.ohne) continue;
            // Mit Pronomen als Objekt: die Form mit L-Suffix (bei „dich“ für einen Jungen und für ein Mädchen)
            for (const o of objekt && !rektionVon(verb) ? objektVarianten(objekt.person, objekt.hinweis) : [undefined]) {
            if (o && o.x.p === x.p && o.x.zahl === x.zahl) continue;
            const f = o ? ix.objekt.bilde(verb, f0, x, o.x) : f0;
            if (!f) continue;
            const subj: Stueck = { ...formStueck(f, 'Verb im Subjunktiv (Grundform des Präsens)', x), ...(statt ? { statt } : {}) };
            const lo = negiert ? kleinwortStueck(nicht, 'Negationspartikel') : [];
            if (negiert && !lo.length) continue;
            const teile: { stuecke: Stueck[]; regeln: RegelId[] }[] = [];

            if (subjunktivNachD) {
              // Nach d „dass“ der Subjunktiv: die Grundform ohne ko- (Grammatik 23d), verneint mit lo davor
              teile.push({ stuecke: [...lo, subj], regeln: ['subjunktiv', ...(negiert ? (['verneinung'] as RegelId[]) : [])] });
            } else if (vergangen) {
              // Präteritum ohne Marker (Grammatik 8a: „Saro zwënla čanṭa – Saro kaufte eine Tasche“), verneint mit lo davor
              const v: Stueck = { ...formStueck(f, 'Verb im Präteritum', x), ...(statt ? { statt } : {}) };
              // „Bei Verben mit vokalischem Anlaut verschmilzt die Negationspartikel lo mit dem Anlautvokal … zu l-“
              // (Grammatik 22e: lo aṯi > laṯi); ebenso howe – hawi und obe – hule mit h-Anlaut (lo hule > lule)
              const hAnlaut = /^(howe|obe)\b/.test(verb) && /^h/.test(f.form);
              if (negiert && nicht && (/^[aeiouëä]/.test(f.form) || hAnlaut)) {
                const rest = hAnlaut ? f.form.slice(1) : f.form;
                const l = nicht.form.replace(/[aeiouëä]+$/, '');
                const zusammen: Stueck = {
                  text: l + rest,
                  rolle: 'Verb im Präteritum, verneint',
                  merkmal: personText(x),
                  ...(statt ? { statt } : {}),
                  aus: [
                    { text: `${l}-`, fund: nicht.fund, rolle: 'Negationspartikel, vor Vokal l- (Grammatik 22e)' },
                    ...(f.muster ? musterTeile(f) : [{ text: f.form, fund: f.fund, rolle: `Präteritum · ${personText(x)}` }]),
                  ],
                };
                teile.push({ stuecke: [zusammen], regeln: ['praeteritum', 'verneinung'] });
              } else teile.push({ stuecke: [...lo, v], regeln: ['praeteritum', ...(negiert ? (['verneinung'] as RegelId[]) : [])] });
            } else if (modale.length) {
              for (const m of modale) {
                if (m.modal === 'wollen') {
                  // obac – abëc „wollen“, im Präsens mit k- (Grammatik 17a, 20c)
                  for (const w of ix.verben.get('wollen') ?? []) {
                    const wf = formFuerPerson(ix.grundformen.get(w) ?? [], x);
                    const ws = wf && praesensStueck(ctx, wf, x);
                    if (!ws) continue;
                    // „Wollen wir …?“ fragt nach einem Vorschlag: so übersetzt das Lehrbuch „Wollen wir jetzt Kaffee trinken …?“ (Grammatik 24a)
                    if (frage && !negiert && x.p === 1 && x.zahl === 'pl') teile.push({ stuecke: [subj], regeln: ['vorschlag'] });
                    teile.push({ stuecke: [...lo, { ...ws, rolle: 'Modalverb „wollen“ im Präsens', ...(m.deutsch !== 'wollen' ? { statt: `„${vw}“ wie „wollen“` } : {}) }, subj], regeln: ['modal', 'praesens', ...(negiert ? (['verneinung'] as RegelId[]) : [])] });
                    break;
                  }
                } else if (m.modal === 'können') {
                  // kib- „können“, verneint layb- (Grammatik 20c)
                  const k = formFuerPerson(negiert ? ix.kannNicht : ix.kann, x);
                  if (k) teile.push({ stuecke: [{ ...formStueck(k, negiert ? '„nicht können“' : '„können“', x, 'Gegenwart'), ...(m.deutsch !== 'können' ? { statt: `„${vw}“ wie „können“` } : {}) }, subj], regeln: ['modal'] });
                } else if (m.modal === 'müssen') {
                  if (ix.muessen) teile.push({ stuecke: [...lo, stueck(ix.muessen, 'Modalpartikel „müssen“'), subj], regeln: ['modal', ...(negiert ? (['verneinung'] as RegelId[]) : [])] });
                } else if (m.modal === 'sollen') {
                  if (frage && !negiert && x.p === 1) teile.push({ stuecke: [subj], regeln: ['vorschlag'] });
                  else if (ix.tro && !negiert) teile.push({ stuecke: [stueck(ix.tro, 'Partikel ṭro'), subj], regeln: ['jussiv'] });
                }
              }
            } else if (futur || (zukunft && !negiert)) {
              if (negiert) {
                // „Bei der Negation wird zwischen Futur und Präsens nicht unterschieden“ (Grammatik 22d)
                const p = praesensStueck(ctx, f, x);
                if (p) teile.push({ stuecke: [...lo, { ...p, ...(statt ? { statt } : {}) }], regeln: ['verneinung', 'praesens'] });
              } else if (ix.futur) {
                teile.push({ stuecke: [stueck(ix.futur, 'Futurmarker'), { ...formStueck(f, 'Verb, Grundform des Präsens', x), ...(statt ? { statt } : {}) }], regeln: ['futur'] });
              }
            } else {
              const p = praesensStueck(ctx, f, x);
              if (p) teile.push({ stuecke: [...lo, { ...p, ...(statt ? { statt } : {}) }], regeln: ['praesens', ...(negiert ? (['verneinung'] as RegelId[]) : [])] });
            }

            // Nach dem Muster der Verbtabellen gebildet? Dann trägt der Satz auch diese Regel.
            if (f.muster) for (const teil of teile) teil.regeln.push(vergangen ? 'muster2' : 'muster');
            if (o) {
              // Im Bauplan beim Verb: wen es meint („ich · Objekt: dich (m.)“)
              const wen = o.x.p === 1 ? (o.x.zahl === 'sg' ? 'mich/mir' : 'uns') : o.x.p === 2 ? `dich/dir (${o.x.g === 'f' ? 'f.' : 'm.'})` : o.x.g === 'f' ? 'sie/ihr (eine Person)' : 'ihn/ihm';
              for (const teil of teile) {
                teil.regeln.push('objektsuffix');
                teil.stuecke = teil.stuecke.map((st) => (/^Verb|Modalverb/.test(st.rolle) && st.text.includes(f.form) ? { ...st, merkmal: [st.merkmal, `Objekt: ${wen}`].filter(Boolean).join(' · ') } : st));
              }
            }
            for (const teil of teile) {
              const subjunktiv = teil.regeln.includes('modal') || teil.regeln.includes('vorschlag') || teil.regeln.includes('jussiv');
              for (const e of ergFuer(verb, subjunktiv).slice(0, 3)) {
                // „wollen“ als Vollverb nur mit einem Ding, das man will („Möchtest du Wasser?“), nicht „Ich will nach Hause“
                // (vor „dass“ auch allein: „Ich will, dass du kommst“)
                if (alsVollverb && !vorDass && !e.stuecke.some((x) => /Substantiv/.test(x.rolle))) continue;
                const duZu = o?.du ?? du;
                // „dir (f.) … zu deinem Geburtstag“: dasselbe „du“ im ganzen Satz
                if (duZu && e.du && duZu !== e.du) continue;
                let b: Bau = verbinde(s.bau, { stuecke: [...teil.stuecke], regeln: [], variante: varianteZusammen(variante, o?.variante), ...(ich ? { ich } : {}), ...(duZu ? { du: duZu } : {}) });
                b = verbinde(b, e);
                // Die Regeln: die äußere zuerst
                const anwendungen: Anwendung[] = teil.regeln.map((regel) => ({ regel, text: text(b.stuecke) }));
                b = { ...b, regeln: [...anwendungen, ...b.regeln] };
                if (s.nomen) b = mitRegel(b, 'verbalsatz');
                aus.push(b);
              }
            }
            }
          }
        }
      }
    }
  }
  return aus;
}

/** Stelle einer Person in den Formenlisten von deutsch.ts (ich, du, er/sie, wir, ihr, sie). */
const STELLE_VON = (x: Person) => (x.zahl === 'sg' ? x.p - 1 : x.p + 2);

/** Eine deutsche Verbform an zweiter Stelle? (Hilfs- und Modalverben, Verben aus den Daten, Synonyme) */
const istVerbform = (ctx: Ctx, w: string) => HILFSFORMEN.has(w) || infinitiveVon(ctx, w).length > 0;

/**
 * Ein Teilsatz in die einfache Form „Subjekt – Verb – Rest“ bringen und bauen. Erkennt:
 * Fragewort am Anfang („Wo …“), Verb am Anfang („Kommst du …?“), Zeitangabe am Anfang
 * („Morgen komme ich …“) und ein weggelassenes Subjekt nach „und“ („… und kann nicht kommen“).
 */
function teilsatz(
  ctx: Ctx,
  t0: readonly DeToken[],
  opt: { frage: boolean; denn?: boolean; subjektDavor?: DeToken[]; zeit?: 'vergangen' | 'kopula' | 'subjunktiv'; innen?: boolean; nebensatz?: boolean; vorDass?: boolean },
): { bau: Bau; subjekt: DeToken[] }[] {
  const ix = ctx.ix;
  // Nebensatz („dass du müde bist“): Verb vom Ende hinter das Subjekt
  if (opt.nebensatz) return hauptsatzStellung(t0).flatMap((v) => teilsatz(ctx, v, { ...opt, nebensatz: false }));
  // „Mir geht es gut“ wie „ich bin gut“ – so übersetzt es das Lehrbuch (deutsch.ts)
  const umgestellt = befinden(t0);
  if (umgestellt.length) {
    return umgestellt.flatMap((u) =>
      teilsatz(ctx, u.tokens, opt).map((r) => ({ ...r, bau: { ...r.bau, hinweise: [...new Set([...(r.bau.hinweise ?? []), u.hinweis])] } })),
    );
  }
  // Trennbare Verben: „Kommst du mit?“ → „mitkommst du“, „Ich kam mit“ → „ich mitkam“ (deutsch.ts)
  const getrennt = trennbar(t0, (f) => istVerbform(ctx, f) || ix.praeteritumDe.has(f));
  if (getrennt) return teilsatz(ctx, getrennt, opt);
  // Eine abgetrennte Vorsilbe, deren Verb der Übersetzer nicht kennt („sie singt uns die Lieder vor“), nicht als eigenes Wort übersetzen
  if (t0.length > 2 && TRENNBAR.includes(t0[t0.length - 1].w) && !t0.some((x) => SEIN.includes(x.w) || WAR.includes(x.w))) return [];
  // Vergangenheit: „ich habe gespielt“, „ich spielte“ → wie „ich spiele“, gebaut wird das Präteritum (Grammatik 8a)
  if (!opt.zeit || opt.zeit === 'subjunktiv') {
    if (opt.zeit === 'subjunktiv' && vergangenheit(t0, (w) => ix.partizip.get(w) ?? [], (w) => ix.praeteritumDe.get(w) ?? []).length) return [];
  }
  if (!opt.zeit) {
    const davor = opt.subjektDavor?.length && t0[0] && !istPronomen(t0[1]?.w ?? '') && (HABEN.includes(t0[0].w) || SEIN.includes(t0[0].w)) ? opt.subjektDavor : [];
    const vg = vergangenheit([...davor, ...t0], (w) => ix.partizip.get(w) ?? [], (w) => ix.praeteritumDe.get(w) ?? []);
    if (vg.length) return vg.flatMap((v) => teilsatz(ctx, v.tokens, { ...opt, subjektDavor: undefined, zeit: v.kopula ? 'kopula' : 'vergangen' }));
  }
  let t = [...t0];
  const vorne: Bau[] = [];
  let fragewort: Bau | undefined;

  // Fragewort („wo“, „wie viel“) – Grammatik 24a
  for (const n of [2, 1]) {
    const key = t.slice(0, n).map((x) => x.w).join(' ');
    const f = t.length > n && (n === 2 || FRAGEWOERTER.has(key)) ? ix.fragewoerter.get(key) : undefined;
    if (f && f.fund !== ctx.ohne) {
      fragewort = { stuecke: [stueck(f, 'Fragewort')], regeln: [] };
      t = t.slice(n);
      break;
    }
  }
  // Zeitangabe vorn („Heute habe ich …“, „Morgen kommst du?“): bleibt vorn, wie im Lehrbuch („Aṯmël mtawbal … – Gestern wurde er …“)
  if (!fragewort) {
    for (const n of [2, 1]) {
      const teil = t.slice(0, n);
      if (t.length > n + 1 && istVerbform(ctx, t[n].w) && istAdverb(ctx, teil)) {
        vorne.push(...adverb(ctx, teil).slice(0, 1));
        t = t.slice(n);
        break;
      }
    }
  }
  // Verb am Anfang: „Kommst du morgen?“ → „du kommst morgen“; „Kommt der Lehrer?“ → „der Lehrer kommt“
  // („Meine Mutter …“: „meine“ ist hier Begleiter, nicht „ich meine“)
  if (t[0] && istVerbform(ctx, t[0].w) && t[1] && !possessiv(t[0].w) && !BESTIMMT.has(t[0].w)) {
    // „Gehen wir jetzt zur Kasse.“ ist keine Frage, sondern ein Vorschlag – das Lehrbuch nimmt dafür den Subjunktiv („Zan ucdo li qaṣa.“)
    if (!opt.frage && t[1].w === 'wir' && !opt.subjektDavor?.length) return [];
    if (istPronomen(t[1].w)) t = [t[1], t[0], ...t.slice(2)];
    // „Wie ist das Wetter?“ mit Substantiv baut der Übersetzer nicht: Das Lehrbuch stellt das Subjekt mal
    // vorn („I hawa aydarbo yo?“), mal hinter die Kopula („Ayna yo aḥunax? – Welcher ist dein (f.) Bruder?“).
    else if (fragewort && SEIN.includes(t[0].w)) return [];
    else if (BESTIMMT.has(t[1].w) || possessiv(t[1].w)) {
      // Mit Fragewort steht das Verb im Lehrbuch vor dem Substantiv („M ayna mḏito koṯe u Aday? – Aus welcher
      // Stadt kommt Aday?“) – dafür gibt es keine Regel, also nicht bauen.
      if (fragewort) return [];
      const varianten = [3, 4].filter((k) => k <= t.length).map((k) => [...t.slice(1, k), t[0], ...t.slice(k)]);
      // Innen ohne Fragezeichen und Regel „Frage“ – das macht `wickle` hier einmal
      const aus = varianten.flatMap((v) => teilsatz(ctx, v, { ...opt, subjektDavor: undefined, innen: true }));
      if (aus.length) return aus.map((r) => ({ bau: wickle(ctx, r.bau, fragewort, vorne, opt), subjekt: r.subjekt }));
      return [];
    } else if (opt.subjektDavor?.length) {
      // „… und kann nicht kommen“: Subjekt des Satzes davor
      t = [...opt.subjektDavor, ...t];
    } else return [];
  }
  const subjekt = istPronomen(t[0]?.w ?? '') ? t.slice(0, 1) : [];
  // „Wo ist die Schule?“, „Wer bist du?“: Fragewort, Kopula, Subjekt (Grammatik 24a)
  if (fragewort && t.length >= 2 && (SEIN.includes(t[1].w) || SEIN.includes(t[t.length - 1].w) || (WAR.includes(t[1].w) && t.length === 2))) {
    const nurKopula = frageMitKopula(ctx, t, fragewort);
    if (nurKopula.length) return nurKopula.map((bau) => ({ bau, subjekt }));
  }
  const kern = baue(ctx, t, { frage: opt.frage, ...(opt.zeit === 'vergangen' || opt.zeit === 'subjunktiv' ? { zeit: opt.zeit } : {}), ...(opt.vorDass ? { vorDass: true } : {}) });
  return kern.map((bau) => ({ bau: opt.innen ? bau : wickle(ctx, bau, fragewort, vorne, opt), subjekt: subjekt.length ? subjekt : [] }));
}

/** Fragewort und Zeitangabe vor den Satz, Fragezeichen dahinter; „denn“ in einer Ja-/Nein-Frage ist ma (Grammatik 24a). */
function wickle(ctx: Ctx, bau: Bau, fragewort: Bau | undefined, vorne: Bau[], opt: { frage: boolean; denn?: boolean }): Bau {
  let b = bau;
  for (const v of vorne) b = mitRegel(verbinde(v, b), 'adverb');
  if (fragewort) b = mitRegel(verbinde(fragewort, b), 'frage');
  else if (opt.frage && opt.denn && ctx.ix.fragepartikel) b = mitRegel(verbinde({ stuecke: [stueck(ctx.ix.fragepartikel, 'Fragepartikel („denn“)')], regeln: [] }, b), 'janein');
  else if (opt.frage) b = mitRegel(b, 'janein');
  return b;
}

/** „Wo ist die Schule?“ → Fragewort + Kopula + Subjekt; „Wer bist du?“ → Fragewort + Kopula (Grammatik 24a). */
function frageMitKopula(ctx: Ctx, t: readonly DeToken[], fragewort: Bau): Bau[] {
  const ix = ctx.ix;
  const aus: Bau[] = [];
  // „du bist“ (nach dem Umstellen) oder „die Schule ist“
  const pronomen = istPronomen(t[0].w) && t.length === 2;
  if (pronomen) {
    // „Wo bist du?“, „Wo warst du?“
    for (const [formen, tafel, zeit] of [
      [SEIN, ix.kopula, 'Gegenwart'],
      [WAR, ix.kopulaVergangen, 'Vergangenheit'],
    ] as const) {
      for (const x0 of subjekt(t[0].w, t[1].w, formen)) {
        for (const { x, variante, ich, du } of personMitGeschlecht(ctx, x0)) {
          const kop = formFuerPerson(tafel, x);
          if (kop) aus.push(mitRegel(mitRegel({ ...verbinde(fragewort, { stuecke: [formStueck(kop, 'Kopula', x, zeit)], regeln: [] }), variante, ...(ich ? { ich } : {}), ...(du ? { du } : {}) }, 'kopula'), 'frage'));
        }
      }
    }
    return aus;
  }
  const i = t.findIndex((x) => SEIN.includes(x.w));
  if (i < 1 || i !== t.length - 1) return aus;
  const zahl: Zahl = t[i].w === 'ist' ? 'sg' : 'pl';
  for (const s of gruppe(ctx, t.slice(0, i), 'subjekt', { zahl })) {
    if (!s.regeln.some((r) => r.regel === 'artikel' || r.regel === 'possessiv' || r.regel === 'possessiv2')) continue;
    const x: Person = { p: 3, zahl, ...(s.g && zahl === 'sg' ? { g: s.g } : {}) };
    const kop = formFuerPerson(ix.kopula, x);
    if (!kop) continue;
    aus.push(mitRegel(mitRegel(verbinde(verbinde(fragewort, { stuecke: [formStueck(kop, 'Kopula', x, 'Gegenwart')], regeln: [] }), s), 'kopula'), 'frage'));
  }
  return aus;
}

/** d vor einem Satz; vor dem Artikel zusammengeschrieben wie die kurzen Präpositionen („du Aday“, Grammatik 10a). */
function mitD(d: Form, bau: Bau, rolle: string): Bau {
  const [erstes, ...rest] = bau.stuecke;
  if (erstes?.rolle === 'Artikel' && erstes.fund) {
    const zusammen: Stueck = {
      text: d.form + erstes.text,
      rolle: `${rolle} mit Artikel`,
      aus: [
        { text: `${d.form}-`, fund: d.fund, rolle },
        { text: erstes.text, fund: erstes.fund, rolle: `Artikel · ${erstes.merkmal ?? ''}` },
      ],
    };
    return { ...bau, stuecke: [zusammen, ...rest] };
  }
  return verbinde({ stuecke: [stueck(d, rolle)], regeln: [] }, bau);
}

/** Höchstens so viele Fassungen eines Satzes (sonst wird es auf dem Handy langsam und unübersichtlich). */
const FASSUNGEN_SATZ = 8;

/**
 * Ein ganzer deutscher Satz: Teilsätze an „und“, „oder“, „aber“ und Kommas, jeder für sich gebaut
 * und mit dem Wort aus den Daten verbunden (w, aw …). Fragezeichen am Ende, Füllwörter weg.
 */
function baueSatz(ctx: Ctx, anfrage: string): Bau[] {
  const satz = zerlegeSatz(anfrage);
  if (!satz.teile.length) return [];
  const woerterZahl = satz.teile.reduce((n, x) => n + x.tokens.length, 0);
  if (woerterZahl < 2 || woerterZahl > 18) return [];
  // „denn“ in einer Frage wird zur Fragepartikel ma (Grammatik 24a), sonst fallen Füllwörter weg
  const denn = satz.frage && satz.ausgelassen.includes('denn') && !!ctx.ix.fragepartikel;
  const hinweise = [
    ...satz.ersetzt,
    ...satz.ausgelassen.filter((w) => !(denn && w === 'denn')).map((w) => `„${w}“ weggelassen – dafür hat Surayt kein eigenes Wort`),
  ];
  const mitHinweis = (b: Bau): Bau => (hinweise.length ? { ...b, hinweise: [...hinweise, ...(b.hinweise ?? [])] } : b);

  // Erst den ganzen Satz als einen Teilsatz (ohne Bindewörter)
  if (satz.teile.length === 1 && !satz.teile[0].verbindung) {
    return teilsatz(ctx, satz.teile[0].tokens, { frage: satz.frage, denn }).map((r) => mitHinweis(r.bau)).slice(0, FASSUNGEN_SATZ * 2);
  }
  // „Saro und Aday wollen …“: ein Satz mit zwei Subjekten – geht das, ist es kein Satz aus zwei Teilen
  const nurUnd = satz.teile.every((x) => !x.verbindung || x.verbindung === 'und');
  const ganz = nurUnd && satz.alle.length !== satz.teile.reduce((n, x) => n + x.tokens.length, 0) ? teilsatz(ctx, satz.alle, { frage: satz.frage, denn }) : [];
  if (ganz.length) return ganz.map((r) => mitHinweis(r.bau)).slice(0, FASSUNGEN_SATZ * 2);
  // Mehrere Teilsätze: jeder muss sich bauen lassen
  let bisher: { bau: Bau; subjekt: DeToken[] }[] = [{ bau: LEER, subjekt: [] }];
  satz.teile.forEach((teil, k) => {
    const letzter = k === satz.teile.length - 1;
    const neu: { bau: Bau; subjekt: DeToken[] }[] = [];
    // Nebensatz mit „dass“/„weil“: Verb am Ende, „dass“ nach „wollen“ mit Subjunktiv, nach „wissen“, „sagen“ ohne
    const neben = teil.verbindung === 'dass' || teil.verbindung === 'weil';
    const art = teil.verbindung === 'dass' ? (k === 0 ? 'subjunktiv' : dassArt(satz.teile[k - 1].tokens)) : teil.verbindung === 'weil' ? 'indikativ' : undefined;
    const vorDass = satz.teile[k + 1]?.verbindung === 'dass';
    for (const b of bisher.slice(0, FASSUNGEN_SATZ)) {
      if (neben && !art) continue;
      const opt = neben
        ? { frage: false, nebensatz: true, ...(art === 'subjunktiv' ? { zeit: 'subjunktiv' as const } : {}) }
        : { frage: satz.frage && letzter, denn: denn && k === 0, subjektDavor: b.subjekt, ...(vorDass ? { vorDass } : {}) };
      for (const r of teilsatz(ctx, teil.tokens, opt).slice(0, 4)) {
        // Teilsätze passen zusammen: dieselbe Antwort auf „Ich bin: Junge / Mädchen“, dasselbe „du“
        if (b.bau.ich && r.bau.ich && b.bau.ich !== r.bau.ich) continue;
        if (b.bau.du && r.bau.du && b.bau.du !== r.bau.du) continue;
        let bau = r.bau;
        if (neben) {
          // d „dass“ (mit dem Artikel zusammengeschrieben: „miḏe du Aday …“), bei „weil“ miḏe davor
          const d = ctx.ix.dass;
          if (!d || (teil.verbindung === 'weil' && !ctx.ix.weil)) continue;
          if (!teil.ohneD) bau = mitD(d, bau, teil.verbindung === 'weil' ? 'Konjunktion d („weil“: miḏe d)' : 'Konjunktion d „dass“');
          if (teil.verbindung === 'weil') bau = verbinde({ stuecke: [stueck(ctx.ix.weil!, '„weil“: miḏe d')], regeln: [] }, bau);
          if (art === 'indikativ') bau = mitRegel(bau, 'nebensatz');
          if (satz.frage && letzter) bau = mitRegel(bau, 'janein');
        }
        // Mit Komma getrennte Sätze stehen auch im Surayt nur nebeneinander („Mën këmmat, saymina …?“)
        else if (k > 0 && teil.verbindung) {
          const wort = teil.verbindung === 'oder' ? ctx.ix.oder : teil.verbindung === 'und' ? ctx.ix.und : undefined;
          if (!wort) continue;
          bau = verbinde({ stuecke: [stueck(wort, `Bindewort „${teil.verbindung}“`)], regeln: [] }, bau);
        }
        let zusammen = verbinde(b.bau, bau);
        if (k > 0 && teil.verbindung && !neben) zusammen = mitRegel(zusammen, 'und');
        neu.push({ bau: zusammen, subjekt: r.subjekt.length ? r.subjekt : b.subjekt });
      }
    }
    bisher = neu;
  });
  return bisher.map((r) => mitHinweis(r.bau)).slice(0, FASSUNGEN_SATZ * 2);
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
  const gesehen = new Map<string, Regelsatz>();
  for (const b of baueSatz(ctx, anfrage)) {
    if (erlaubt && b.regeln.some((r) => !erlaubt.has(r.regel))) continue;
    const frage = b.regeln.some((r) => r.regel === 'frage' || r.regel === 'janein');
    const latein = text(b.stuecke) + (frage ? '?' : '');
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
      ...(hinweiseVon(b).length ? { hinweise: hinweiseVon(b) } : {}),
    });
  }
  return [...gesehen.values()];
}

/** Höchstens so viele Fassungen zeigt der Übersetzer (Junge/Mädchen und gleichbedeutende Wörter). */
const FASSUNGEN_REGELN = 6;

/** Was der Übersetzer am Deutschen geändert hat: weggelassene Füllwörter und gleichbedeutende Wörter. */
function hinweiseVon(b: Bau): string[] {
  const statt = b.stuecke.flatMap((x) => (x.statt ? [x.statt] : []));
  return [...new Set([...(b.hinweise ?? []), ...statt])];
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
    t.some((x) => SEIN.includes(x.w) || WAR.includes(x.w) || HABEN.includes(x.w) || WERDEN.includes(x.w) || x.w === 'gibt' || BESTIMMT.has(x.w) || !!possessiv(x.w) || ix.finit.has(x.w) || ix.partizip.has(x.w) || ix.praeteritumDe.has(x.w) || /^(im|ins|vom|beim|zum|zur|in|aus|bei|zu|mit|auf|hinter|unter)$/.test(x.w));
  for (const f of wb.funde) {
    const dt = zerlegeDeutsch(f.deutsch);
    if (dt.length < 2 || dt.length > 12 || !hinweis(dt)) continue;
    // „der Laden, das Geschäft“: bei kurzen Wörterbuch-Einträgen jede Bedeutung einzeln (nicht bei Sätzen)
    // („kurz“: höchstens drei Wörter, ohne Zusätze wie „f.“, „pl.“ und Klammern gezählt)
    const kurz =
      f.art === 'wort' &&
      surWoerter(f.latein.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/(?:^|\s)(?:f|m|pl|Pl|Sg|sg)\.(?=\s)/g, ' ')).length <= 3;
    // („falsch, fehlerhaft“ ist kein Adjektiv mit Substantiv – die ganze Zeile nur ohne Komma)
    // („er zieht dich (f.)/für dich (f.)“: zwei Übersetzungen mit Schrägstrich)
    const deutsche = kurz ? [...(/[,;]/.test(f.deutsch) ? [] : [f.deutsch]), ...f.deutsch.split(/[,;]|\/(?=\s*\p{L}{2})/u)] : [f.deutsch];
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
  const allesErklaert = new Map<Fund, boolean>();
  const woerterIn = (f: Fund) => {
    let set = woerterImSatz.get(f);
    if (!set) {
      set = new Set<string>(surWoerter(f.latein));
      const e = erklaere(wb, f.latein, { ohne: f });
      for (const t of e.teile) {
        const funde = t.art === 'eintrag' ? t.funde : t.art === 'zerlegt' ? t.stuecke.flatMap((x) => x.funde) : [];
        for (const x of funde) set.add(wortVon(x));
      }
      allesErklaert.set(f, !e.gekuerzt && e.teile.every((t) => t.art === 'eintrag' || t.art === 'zerlegt'));
      woerterImSatz.set(f, set);
    }
    return set;
  };
  /** Die Wörter mit eigener Bedeutung (nicht Kopula, Artikel, Marker …) */
  const inhaltswoerter = (r: Regelsatz) =>
    r.stuecke.flatMap((x) => (x.aus ? x.aus.slice(x.rolle === 'Verb im Präsens' ? 1 : 0, x.rolle === 'Verb im Präsens' ? 2 : 1) : [x])).filter(
      (x) => !!x.fund && /Substantiv|Adjektiv|Zahl|Verb|Grundform|ohne Endung/.test(x.rolle),
    );
  const kleine = new Set(
    [
      ...ix.praepositionen.values(),
      ...[ix.nicht, ix.und, ix.oder, ix.futur, ix.praesens, ix.fragepartikel, ix.muessen, ix.tro].filter((x): x is Form => !!x),
    ].map((x) => x.form),
  );
  for (const x of [...ix.kopula, ...ix.kopulaVergangen, ...ix.kopulaNegiert, ...ix.haben, ...ix.nichtHaben, ...ix.kann, ...ix.kannNicht]) kleine.add(x.form);
  /** Artikel (auch mit kurzer Präposition oder d: „bu“, „di“), Präpositionen, Kopula, Partikeln */
  const funktionswort = (w: string, naechstes: string) => kleine.has(w) || !!artikelVor(wb, w, naechstes);
  const praesentativ = new Set(
    [...wb.seiten.values()].filter((x) => x.titel === 'Pseudo- und Hilfsverben').flatMap((x) => x.eintraege.filter((e) => e.deutsch === 'da ist').map((e) => genau(e.latein))),
  );
  /** Benutzt der Satz dieselben Wörter wie das Lehrbuch? Nur dann prüft er die Regeln. */
  const vergleichbar = (p: Regelprobe, r: Regelsatz) => {
    const da = woerterIn(p.fund);
    // Steht ein Wort des Lehrbuch-Satzes nirgends in den Daten („koxël“, eine Form aus einem
    // Lesestück), kann der Baukasten ihn gar nicht treffen – er prüft dann die Wortwahl, nicht die Regel.
    if (!allesErklaert.get(p.fund)) return false;
    // Sagt das Lehrbuch mit einem weiteren Wort mehr („b gawa di rawmo – im Teich“: gawa „Inneres“),
    // ist es eine andere Wendung. Artikel, Präpositionen, Kopula und Partikeln zählen dabei nicht.
    const gebautSet = new Set(surWoerter(r.latein));
    const mehr = echtVon(p.fund).every((e) => {
      const w = surWoerter(e);
      return w.some((x, i) => !gebautSet.has(x) && !funktionswort(x, w[i + 1] ?? ''));
    });
    if (mehr) return false;
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
  const istWendung = (f: Fund) =>
    (/^GL-[^.]+\.(?!\d+\.\d+$)[^.]*[a-z]/.test(f.id) && !/\.\d+\.\d+$/.test(f.id)) ||
    // Glossar A: mehrteilige Wendungen einer Zeile („b gawa di rawmo – im Teich, im See“)
    (/^G-/.test(f.id) && f.art === 'wort' && surWoerter(f.latein.replace(/\([^)]*\)/g, ' ')).length > 1 && !/[,;]/.test(f.latein));
  /**
   * Getroffen – auch wenn Wortschatz oder Glossar das Wort ohne Artikel nennen
   * („mawlodayḏax – dein (f.) Geburtstag“, „lwošo – das Kleiden“).
   */
  /**
   * Was das Lehrbuch freistellt, zählt beim Vergleich nicht: der Artikel vor einem Namen
   * („Personennamen können mit oder ohne Artikel stehen“, Grammatik 3a) und welche der
   * Modalpartikeln für „müssen“ (Grammatik 20c: „In gleicher Position können auch … stehen“).
   */
  const frei = (w: readonly string[]) =>
    w.filter((x, i) => !(i + 1 < w.length && ix.namen.has(w[i + 1]) && artikelVor(wb, x, w[i + 1]))).map((x) => (ix.muessenAlle.has(x) ? '·müssen·' : x)).join(' ');
  const trifft = (p: Regelprobe, r: Regelsatz) => {
    const echt = echtVon(p.fund);
    if (echt.some((e) => gleicherText(e, r.latein))) return true;
    // Was das Lehrbuch auch erlaubt („i emayḏi“ statt „emi“, Grammatik 5a.2)
    if (r.stuecke.some((x) => x.oder)) {
      const anders = r.stuecke.map((x) => x.oder ?? x.text).join(' ') + (/\?$/.test(r.latein) ? '?' : '');
      if (echt.some((e) => gleicherText(e, anders))) return true;
    }
    if (echt.some((e) => frei(surWoerter(e)) === frei(surWoerter(r.latein)))) return true;
    // Ein Adverb an anderer Stelle zählt als getroffen: Das Lehrbuch stellt Adverbien mal vor, mal
    // hinter das Verb („Kiban ḥeloyo ëzzan – Wir können früh gehen“, „Kobac fayšat adlalyo harke –
    // Du musst heute Nacht hier bleiben“, Grammatik 18b).
    const adverbien = r.stuecke.filter((x) => x.rolle === 'Adverb').map((x) => x.text);
    if (adverbien.length) {
      const ohne = (w: string[]) => w.filter((x) => !adverbien.includes(x)).join(' ');
      const gebaut = surWoerter(r.latein);
      if (echt.some((e) => {
        const w = surWoerter(e);
        return w.length === gebaut.length && adverbien.every((a) => w.includes(a)) && ohne(w) === ohne(gebaut);
      })) return true;
    }
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
      const pruefbar = istWendung(p.fund) ? [] : gueltig.filter((r) => vergleichbar(p, r));
      p.vergleichbar = pruefbar.length > 0;
      const schuld = new Set<RegelId>();
      for (const r of pruefbar) {
        const falsch = r.regeln.filter((x) => !kommtVor(x.text, echt));
        for (const x of falsch.length ? falsch : r.regeln.slice(0, 1)) schuld.add(x.regel);
      }
      p.schuld = [...schuld];
      for (const id of schuld) regeln.get(id)!.daneben++;
    }
    // Das Muster der Verbtabellen hat seine eigene Gegenprobe: an jeder vollständigen Tabelle (siehe `verbMuster`)
    regeln.get('muster')!.belegeGetroffen += ix.muster.probe.filter((x) => x.stamm !== '?' && x.verben > 0 && x.getroffen === x.verben).length;
    regeln.get('muster2')!.belegeGetroffen += ix.musterVergangen.probe.filter((x) => x.stamm !== '?' && x.verben > 0 && x.getroffen === x.verben).length;
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
  // Die besten zuerst: Formen aus den Tabellen vor solchen nach dem Muster, wörtliche vor sinngemäßen
  const kosten = (r: Regelsatz) => r.regeln.filter((x) => x.regel === 'muster').length + 2 * (r.hinweise ?? []).filter((h) => / wie /.test(h)).length;
  return regelsaetze({ wb, ix, ohne: opt.ohne, ich: opt.ich }, anfrage, erlaubt)
    .sort((a, b) => kosten(a) - kosten(b))
    .slice(0, FASSUNGEN_REGELN);
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

/** Die Bausteine vorbereiten (eigener Schritt, damit das Handy beim Öffnen des Übersetzers nicht lange hängt). */
export const regelnVorbereiten = (wb: Woerterbuch) => void tafeln(wb);

/** Die Prüfung des Musters der Verbtabellen (für Tests und den Fahrplan). */
export const verbMusterProbe = (wb: Woerterbuch) => tafeln(wb).muster.probe;
