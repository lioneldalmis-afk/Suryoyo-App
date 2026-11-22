// Deutsche Grammatik für den Baukasten (Fahrplan, Phase 4b, Schritt 5): Was
// jemand auf Deutsch tippt, muss der Baukasten verstehen – wer spricht (ich, du,
// er …), welche Zeit, welches Wort ein Substantiv in der Mehrzahl ist. Hier steht
// nur Deutsch, kein Surayt.

/** Eine grammatische Person: 1./2./3., Einzahl oder Mehrzahl, bei der Einzahl evtl. Geschlecht. */
export interface Person {
  p: 1 | 2 | 3;
  zahl: 'sg' | 'pl';
  /** Nur, wenn es feststeht (er → m., sie + „ist“ → f.). */
  g?: 'm' | 'f';
}

export const gleichePerson = (a: Person, b: Person) => a.p === b.p && a.zahl === b.zahl;

/** „ich“, „du“, „er“, „sie (eine Person)“, „wir“, „ihr“, „sie (mehrere)“ */
export function personText(x: Person): string {
  if (x.zahl === 'pl') return x.p === 1 ? 'wir' : x.p === 2 ? 'ihr' : 'sie (mehrere)';
  if (x.p === 1) return 'ich';
  if (x.p === 2) return 'du';
  return x.g === 'f' ? 'sie (eine Person)' : x.g === 'm' ? 'er' : 'er/sie';
}

/** Index in den Formen-Listen unten: ich, du, er/sie, wir, ihr, sie (Pl.) */
const STELLE = (x: Person) => (x.zahl === 'sg' ? x.p - 1 : x.p + 2);

/** Die Personen in der Reihenfolge der Formen-Listen. */
export const PERSONEN: Person[] = [
  { p: 1, zahl: 'sg' },
  { p: 2, zahl: 'sg' },
  { p: 3, zahl: 'sg' },
  { p: 1, zahl: 'pl' },
  { p: 2, zahl: 'pl' },
  { p: 3, zahl: 'pl' },
];

/** Hilfsverben: Präsens (und bei „sein“ Präteritum) für ich, du, er/sie, wir, ihr, sie. */
export const SEIN = ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'];
export const WAR = ['war', 'warst', 'war', 'waren', 'wart', 'waren'];
export const HABEN = ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'];
export const WERDEN = ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'];

/** Personalpronomen im Nominativ. „sie“ ist erst mit dem Verb eindeutig; „es“ hat im Surayt keine eigene Form und bleibt draußen. */
const PRONOMEN: Record<string, Person[]> = {
  ich: [{ p: 1, zahl: 'sg' }],
  du: [{ p: 2, zahl: 'sg' }],
  er: [{ p: 3, zahl: 'sg', g: 'm' }],
  sie: [
    { p: 3, zahl: 'sg', g: 'f' },
    { p: 3, zahl: 'pl' },
  ],
  wir: [{ p: 1, zahl: 'pl' }],
  ihr: [{ p: 2, zahl: 'pl' }],
};

/** Welche Personen passen zu Pronomen und Verbform? („sie ist“ → 3. Sg. f., „sie sind“ → 3. Pl.) */
export function subjekt(pronomen: string, verb: string, formen: readonly string[]): Person[] {
  return (PRONOMEN[pronomen] ?? []).filter((x) => formen[STELLE(x)] === verb);
}

export const istPronomen = (w: string) => w in PRONOMEN;

/** Die Form eines Verbs (aus einer der Listen oben) für eine Person. */
export const formFuer = (formen: readonly string[], x: Person) => formen[STELLE(x)];

// --- Präsens deutscher Verben ---------------------------------------------------------

/** Starke und unregelmäßige Verben: Form für du und er/sie, wo sie vom Stamm abweicht. */
const UNREGELMAESSIG: Record<string, [string, string]> = {
  essen: ['isst', 'isst'],
  fressen: ['frisst', 'frisst'],
  messen: ['misst', 'misst'],
  vergessen: ['vergisst', 'vergisst'],
  sehen: ['siehst', 'sieht'],
  lesen: ['liest', 'liest'],
  geben: ['gibst', 'gibt'],
  nehmen: ['nimmst', 'nimmt'],
  sprechen: ['sprichst', 'spricht'],
  brechen: ['brichst', 'bricht'],
  treffen: ['triffst', 'trifft'],
  helfen: ['hilfst', 'hilft'],
  werfen: ['wirfst', 'wirft'],
  sterben: ['stirbst', 'stirbt'],
  stehlen: ['stiehlst', 'stiehlt'],
  empfehlen: ['empfiehlst', 'empfiehlt'],
  treten: ['trittst', 'tritt'],
  schlafen: ['schläfst', 'schläft'],
  fahren: ['fährst', 'fährt'],
  tragen: ['trägst', 'trägt'],
  schlagen: ['schlägst', 'schlägt'],
  graben: ['gräbst', 'gräbt'],
  wachsen: ['wächst', 'wächst'],
  waschen: ['wäschst', 'wäscht'],
  fallen: ['fällst', 'fällt'],
  halten: ['hältst', 'hält'],
  lassen: ['lässt', 'lässt'],
  laufen: ['läufst', 'läuft'],
  fangen: ['fängst', 'fängt'],
  raten: ['rätst', 'rät'],
  backen: ['bäckst', 'bäckt'],
  stoßen: ['stößt', 'stößt'],
};

/** Ganz unregelmäßig: ich, du, er/sie, wir, ihr, sie. */
const GANZ: Record<string, string[]> = {
  sein: SEIN,
  haben: HABEN,
  werden: WERDEN,
  wissen: ['weiß', 'weißt', 'weiß', 'wissen', 'wisst', 'wissen'],
  wollen: ['will', 'willst', 'will', 'wollen', 'wollt', 'wollen'],
  können: ['kann', 'kannst', 'kann', 'können', 'könnt', 'können'],
  müssen: ['muss', 'musst', 'muss', 'müssen', 'müsst', 'müssen'],
  dürfen: ['darf', 'darfst', 'darf', 'dürfen', 'dürft', 'dürfen'],
  sollen: ['soll', 'sollst', 'soll', 'sollen', 'sollt', 'sollen'],
  mögen: ['mag', 'magst', 'mag', 'mögen', 'mögt', 'mögen'],
  tun: ['tue', 'tust', 'tut', 'tun', 'tut', 'tun'],
};

/**
 * Präsens eines deutschen Verbs im Infinitiv: ich, du, er/sie, wir, ihr, sie.
 * „schlafen“ → schlafe, schläfst, schläft, schlafen, schlaft, schlafen.
 * Mit Vorsilbe wie das Grundverb („vergessen“, „zerbrechen“).
 */
export function praesens(infinitiv: string): string[] | undefined {
  const inf = infinitiv.toLowerCase();
  if (!/^[a-zäöüß]+$/.test(inf)) return undefined;
  const ganz = Object.keys(GANZ).find((v) => inf === v);
  if (ganz) return GANZ[ganz];
  // „sammeln“, „wandern“ → sammel-, wander-; „gehen“ → geh-
  const stamm = /(?:el|er)n$/.test(inf) ? inf.slice(0, -1) : inf.endsWith('en') ? inf.slice(0, -2) : undefined;
  if (!stamm) return undefined;
  // „atmen“, „rechnen“, „arbeiten“, „finden“: mit -e- vor -st und -t (aber „kommst“, „lernst“)
  const mitE = /[dt]$/.test(stamm) || /[^aeiouäöülrhmn][mn]$/.test(stamm);
  const ich = /el$/.test(stamm) ? `${stamm.slice(0, -2)}le` : `${stamm}e`;
  const du = /[sßxz]$/.test(stamm) ? `${stamm}t` : mitE ? `${stamm}est` : `${stamm}st`;
  const er = mitE ? `${stamm}et` : `${stamm}t`;
  const formen = [ich, du, er, inf, er, inf];
  // Starke Verben, auch mit Vorsilbe („vergessen“ steht selbst in der Liste, „zerbrechen“ über „brechen“)
  const grund = Object.keys(UNREGELMAESSIG)
    .filter((v) => inf.endsWith(v))
    .sort((a, b) => b.length - a.length)[0];
  if (grund) {
    const vorsilbe = inf.slice(0, inf.length - grund.length);
    const [d, e] = UNREGELMAESSIG[grund];
    formen[1] = vorsilbe + d;
    formen[2] = vorsilbe + e;
  }
  return formen;
}

// --- Substantive und Adjektive --------------------------------------------------------------

/** Den letzten Umlaut zurücknehmen: „brüder“ → „bruder“, „häus“ → „haus“. */
function ohneUmlaut(w: string): string {
  const i = Math.max(w.lastIndexOf('ä'), w.lastIndexOf('ö'), w.lastIndexOf('ü'));
  if (i < 0) return w;
  const ersatz: Record<string, string> = { ä: 'a', ö: 'o', ü: 'u' };
  return w.slice(0, i) + ersatz[w[i]] + w.slice(i + 1);
}

/**
 * Mögliche Einzahl zu einem Wort, das eine Mehrzahl sein könnte:
 * „häuser“ → „haus“, „frauen“ → „frau“, „mütter“ → „mutter“, „autos“ → „auto“.
 * Ob es das Wort gibt, prüft der Aufrufer an den Daten.
 */
export function einzahlKandidaten(wort: string): string[] {
  const w = wort.toLowerCase();
  const aus = new Set<string>();
  for (const endung of ['en', 'n', 'er', 'e', 's', '']) {
    if (!w.endsWith(endung) || w.length - endung.length < 2) continue;
    const stamm = w.slice(0, w.length - endung.length);
    aus.add(stamm);
    aus.add(ohneUmlaut(stamm));
  }
  aus.delete(w);
  return [...aus];
}

/**
 * Deutsche Substantive, bei denen Einzahl und Mehrzahl oft gleich lauten („der
 * Lehrer“ – „die Lehrer“, „das Zimmer“ – „die Zimmer“). Mit einem Wort davor, das
 * auch Mehrzahl sein kann („die“, „meine“), ist die Zahl dann offen.
 */
export const zahlOffen = (wort: string) => /(?:er|el|en|chen|lein)$/.test(wort.toLowerCase());

/** Grundform eines deutschen Adjektivs: „großer“, „große“, „großes“ → „groß“; „müde“ bleibt „müde“. */
export function adjektivKandidaten(wort: string): string[] {
  const w = wort.toLowerCase();
  const aus = [w];
  for (const endung of ['em', 'en', 'er', 'es', 'e']) {
    if (w.endsWith(endung) && w.length - endung.length >= 2) aus.push(w.slice(0, -endung.length), `${w.slice(0, -endung.length)}e`);
  }
  return [...new Set(aus)];
}

// --- Wörtchen ----------------------------------------------------------------------------------

/** Bestimmter Artikel (alle Fälle). */
export const BESTIMMT = new Set(['der', 'die', 'das', 'den', 'dem', 'des']);
/** Unbestimmter Artikel – im Surayt ohne eigenes Wort („Saro zwënla čanṭa – Saro kaufte eine Tasche“). */
export const UNBESTIMMT = new Set(['ein', 'eine', 'einen', 'einem', 'einer', 'eines']);
export const KEIN = new Set(['kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines']);
/** Artikel, mit denen ein Substantiv auch in der Mehrzahl stehen kann. */
export const AUCH_MEHRZAHL = new Set(['die', 'keine']);

/** Possessivbegleiter: Wortstamm → Personen („ihr“ ist „von ihr“ oder „von ihnen“). */
const POSSESSIV: [RegExp, Person[]][] = [
  [/^mein(?:e|en|em|er|es)?$/, [{ p: 1, zahl: 'sg' }]],
  [/^dein(?:e|en|em|er|es)?$/, [{ p: 2, zahl: 'sg' }]],
  [/^sein(?:e|en|em|er|es)?$/, [{ p: 3, zahl: 'sg', g: 'm' }]],
  [
    /^ihr(?:e|en|em|er|es)?$/,
    [
      { p: 3, zahl: 'sg', g: 'f' },
      { p: 3, zahl: 'pl' },
    ],
  ],
  [/^uns(?:er|ere|eren|erem|erer|eres|re|ren|rem|rer|res)$/, [{ p: 1, zahl: 'pl' }]],
  [/^(?:euer|eure|euren|eurem|eurer|eures)$/, [{ p: 2, zahl: 'pl' }]],
];

export function possessiv(wort: string): Person[] | undefined {
  return POSSESSIV.find(([muster]) => muster.test(wort))?.[1];
}

/**
 * Begleiter, die wie Adjektive gebeugt werden, aber keine sind: „diese Familie“, „jeder Tag“,
 * „alle Kinder“. Sie stehen im Surayt anders (Demonstrativ, kul …) – nicht als Adjektiv bauen.
 */
export const istBegleiter = (wort: string) =>
  /^(?:dies|jen|welch|solch|manch|jed)(?:er|e|es|en|em)?$|^(?:all|viel|einig|beid|mehrer|wenig|ander)(?:e|en|em|er|es)?$/.test(wort.toLowerCase());

/**
 * Verwandtschaftsbezeichnungen und Körperteile auf Deutsch. Für sie gilt im Surayt die
 * eingeschränkte Reihe der Possessivsuffixe (Grammatik 5a.2) – der Baukasten erkennt sie
 * daran, auch wenn ein Wort nicht im Wortschatz der Lektionen 4 und 7 steht („qarco – Kopf“).
 */
export const FAMILIE_KOERPER = new Set(
  (
    'vater mutter eltern bruder schwester sohn tochter kind kinder onkel tante cousin cousine neffe nichte enkel enkelin ' +
    'großvater großmutter opa oma oma opa schwager schwägerin schwiegervater schwiegermutter schwiegersohn schwiegertochter ' +
    'ehemann ehefrau gatte gattin verwandte verwandter familie ' +
    'kopf gesicht haar haare auge augen ohr ohren nase mund lippe lippen zahn zähne zunge hals nacken schulter schultern ' +
    'arm arme hand hände finger daumen brust bauch rücken bein beine knie fuß füße zeh zehe zehen herz lunge leber niere nieren ' +
    'magen blut haut knochen gehirn stirn wange kinn bart körper seele'
  ).split(' '),
);

/** Ist der Begleiter „die“ oder ein Possessiv auf -e („meine“) – dann kann das Substantiv auch Mehrzahl sein. */
export const begleiterAuchMehrzahl = (wort: string) => AUCH_MEHRZAHL.has(wort) || (!!possessiv(wort) && /e$/.test(wort));

/**
 * Präpositionen mit Artikel, wie sie das Lehrbuch übersetzt (Grammatik 11b):
 * „im Haus“ = bu bayto (b „in“), „ins Haus“ = lu bayto (l), „aus dem Haus“ = mu bayto
 * (m „von, aus“), „bei dem Haus“ = su bayto (s „bei“). Der Schlüssel ist die
 * Bedeutung der Präposition im Lehrbuch, `artikel` der deutsche Artikel, falls er
 * schon in der Präposition steckt („im“ = „in dem“).
 */
export interface DePraeposition {
  /** Bedeutung, unter der die Präposition im Lehrbuch steht: „in“, „zu“, „aus“, „bei“ */
  bedeutung: string;
  /** Der Artikel steckt schon drin („im“, „ins“, „vom“, „zum“, „zur“, „beim“). */
  artikel?: string;
}

const VERSCHMOLZEN: Record<string, DePraeposition> = {
  im: { bedeutung: 'in', artikel: 'dem' },
  ins: { bedeutung: 'zu', artikel: 'das' },
  vom: { bedeutung: 'aus', artikel: 'dem' },
  beim: { bedeutung: 'bei', artikel: 'dem' },
};

/**
 * Welche Präposition des Lehrbuchs passt? „in“ mit Dativ (Ort: „in dem“, „in der“,
 * „in den“ + Mehrzahl) ist b, „in“ mit Akkusativ (Richtung: „in das“, „in die“,
 * „in den“ + Einzahl) ist l – so stehen die Beispiele in Grammatik 11b.
 */
export function praeposition(wort: string, artikel: string | undefined, mehrzahl: boolean): DePraeposition | undefined {
  const v = VERSCHMOLZEN[wort];
  if (v) return artikel ? undefined : v;
  if (!artikel || !BESTIMMT.has(artikel)) return undefined;
  if (wort === 'in') {
    if (artikel === 'dem' || artikel === 'der' || (artikel === 'den' && mehrzahl)) return { bedeutung: 'in' };
    if (artikel === 'das' || artikel === 'die' || (artikel === 'den' && !mehrzahl)) return { bedeutung: 'zu' };
    return undefined;
  }
  if (wort === 'aus' || wort === 'von') return artikel === 'des' ? undefined : { bedeutung: 'aus' };
  if (wort === 'bei') return artikel === 'dem' || artikel === 'der' || artikel === 'den' ? { bedeutung: 'bei' } : undefined;
  // „zu“, „für“ usw. zeigt Grammatik 11b nicht – „zum Schluss“ heißt z. B. „bi ḥarayto“.
  return undefined;
}

/** Ortsangaben ohne Beugung, die als Ergänzung zu „sein“ und „es gibt“ stehen können. */
export const ORTSWORT = new Set(['hier', 'dort', 'da', 'draußen', 'drinnen', 'oben', 'unten']);

// --- Eingabe zerlegen --------------------------------------------------------------------------

/** Ein Wort der Eingabe, klein; `hinweis` aus einer Klammer dahinter („dein (m.)“, „ihre (Pl.)“). */
export interface DeToken {
  w: string;
  hinweis?: 'm' | 'f' | 'sg' | 'pl';
}

/** Zerlegt einen deutschen Satz: klein, ohne Satzzeichen, Klammerzusätze als Hinweis am Wort davor. */
export function zerlegeDeutsch(text: string): DeToken[] {
  const aus: DeToken[] = [];
  for (const m of text.normalize('NFC').matchAll(/\(([^)]*)\)|[\p{L}\p{N}]+/gu)) {
    if (m[1] !== undefined) {
      const h = m[1].trim().toLowerCase();
      const hinweis = /^m\.?$/.test(h) ? 'm' : /^f\.?$/.test(h) ? 'f' : /^(sg|sing)\.?$/.test(h) ? 'sg' : /^pl\.?$/.test(h) ? 'pl' : undefined;
      if (hinweis && aus.length) aus[aus.length - 1].hinweis = hinweis;
      // „(dass) wir machen“ ist im Lehrbuch die Grundform ohne ko- – das „dass“ gehört dazu.
      if (h === 'dass') aus.push({ w: 'dass' });
      continue;
    }
    aus.push({ w: m[0].toLowerCase() });
  }
  return aus;
}
