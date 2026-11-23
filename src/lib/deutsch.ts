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
  // „sammeln“ → ich sammle; „spielen“, „teilen“ (Stamm auf -el, aber Infinitiv auf -en) → ich spiele
  const ich = /eln$/.test(inf) ? `${stamm.slice(0, -2)}le` : `${stamm}e`;
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

// --- Vergangenheit deutscher Verben ------------------------------------------------------------
//
// „ich habe gespielt“, „ich bin gegangen“ (Perfekt) und „ich spielte“, „ich ging“ (Präteritum) sagen
// im Surayt dasselbe: das Präteritum (Grammatik 8a). Hier steht nur, wie man das im Deutschen erkennt.

/** Starke und unregelmäßige Verben: Präteritum (ich/er) und Partizip II. */
const STARK: Record<string, [string, string]> = {
  gehen: ['ging', 'gegangen'], kommen: ['kam', 'gekommen'], sehen: ['sah', 'gesehen'], essen: ['aß', 'gegessen'],
  trinken: ['trank', 'getrunken'], schlafen: ['schlief', 'geschlafen'], fahren: ['fuhr', 'gefahren'], lesen: ['las', 'gelesen'],
  schreiben: ['schrieb', 'geschrieben'], sprechen: ['sprach', 'gesprochen'], geben: ['gab', 'gegeben'], nehmen: ['nahm', 'genommen'],
  helfen: ['half', 'geholfen'], finden: ['fand', 'gefunden'], laufen: ['lief', 'gelaufen'], bleiben: ['blieb', 'geblieben'],
  sitzen: ['saß', 'gesessen'], stehen: ['stand', 'gestanden'], liegen: ['lag', 'gelegen'], treffen: ['traf', 'getroffen'],
  tun: ['tat', 'getan'], rufen: ['rief', 'gerufen'], fallen: ['fiel', 'gefallen'], halten: ['hielt', 'gehalten'],
  lassen: ['ließ', 'gelassen'], fangen: ['fing', 'gefangen'], waschen: ['wusch', 'gewaschen'], tragen: ['trug', 'getragen'],
  schlagen: ['schlug', 'geschlagen'], wachsen: ['wuchs', 'gewachsen'], sterben: ['starb', 'gestorben'], werfen: ['warf', 'geworfen'],
  vergessen: ['vergaß', 'vergessen'], beginnen: ['begann', 'begonnen'], gewinnen: ['gewann', 'gewonnen'], schwimmen: ['schwamm', 'geschwommen'],
  singen: ['sang', 'gesungen'], springen: ['sprang', 'gesprungen'], ziehen: ['zog', 'gezogen'], fliegen: ['flog', 'geflogen'],
  verlieren: ['verlor', 'verloren'], bitten: ['bat', 'gebeten'], denken: ['dachte', 'gedacht'], bringen: ['brachte', 'gebracht'],
  kennen: ['kannte', 'gekannt'], nennen: ['nannte', 'genannt'], rennen: ['rannte', 'gerannt'], wissen: ['wusste', 'gewusst'],
  stehlen: ['stahl', 'gestohlen'], brechen: ['brach', 'gebrochen'], heißen: ['hieß', 'geheißen'], schneiden: ['schnitt', 'geschnitten'],
  steigen: ['stieg', 'gestiegen'], schweigen: ['schwieg', 'geschwiegen'], greifen: ['griff', 'gegriffen'], leiden: ['litt', 'gelitten'],
  streiten: ['stritt', 'gestritten'], reiten: ['ritt', 'geritten'], schieben: ['schob', 'geschoben'], frieren: ['fror', 'gefroren'],
  riechen: ['roch', 'gerochen'], biegen: ['bog', 'gebogen'], lügen: ['log', 'gelogen'], hängen: ['hing', 'gehangen'],
  braten: ['briet', 'gebraten'], raten: ['riet', 'geraten'], schließen: ['schloss', 'geschlossen'], schießen: ['schoss', 'geschossen'],
  gießen: ['goss', 'gegossen'], genießen: ['genoss', 'genossen'], fließen: ['floss', 'geflossen'], wiegen: ['wog', 'gewogen'],
  scheinen: ['schien', 'geschienen'], schreien: ['schrie', 'geschrien'], weisen: ['wies', 'gewiesen'], meiden: ['mied', 'gemieden'],
  treten: ['trat', 'getreten'], messen: ['maß', 'gemessen'], fressen: ['fraß', 'gefressen'], graben: ['grub', 'gegraben'],
  stoßen: ['stieß', 'gestoßen'], backen: ['backte', 'gebacken'], senden: ['sandte', 'gesandt'], wenden: ['wandte', 'gewandt'],
  sein: ['war', 'gewesen'], haben: ['hatte', 'gehabt'], werden: ['wurde', 'geworden'],
  können: ['konnte', 'gekonnt'], wollen: ['wollte', 'gewollt'], müssen: ['musste', 'gemusst'], dürfen: ['durfte', 'gedurft'],
  sollen: ['sollte', 'gesollt'], mögen: ['mochte', 'gemocht'],
};

/** Vorsilben, die nicht abgetrennt werden und kein ge- bekommen („besuchen“ → besucht, „verstehen“ → verstanden). */
const UNTRENNBAR = /^(be|er|ver|zer|ent|emp|miss|ge)(?=.{3,})/;
/** Vorsilben, die im Satz abgetrennt werden („mitkommen“ → ich komme mit, mitgekommen). */
export const TRENNBAR = ['zurück', 'zusammen', 'heim', 'weg', 'los', 'fern', 'fest', 'mit', 'an', 'auf', 'aus', 'ein', 'ab', 'vor', 'nach', 'zu', 'her', 'hin', 'dazu'];

/** Grundverb und Vorsilbe: „mitkommen“ → mit + kommen, „verstehen“ → ver + stehen (untrennbar). */
function zerlegeVerb(inf: string): { vor: string; grund: string; trennbar: boolean } | undefined {
  const stark = Object.keys(STARK).filter((v) => inf.endsWith(v) && inf !== v).sort((a, b) => b.length - a.length)[0];
  const vorStark = stark && inf.slice(0, -stark.length);
  if (vorStark && TRENNBAR.includes(vorStark)) return { vor: vorStark, grund: stark, trennbar: true };
  if (vorStark && /^(be|er|ver|zer|ent|emp|miss|ge)$/.test(vorStark)) return { vor: vorStark, grund: stark, trennbar: false };
  const t = TRENNBAR.find((x) => inf.startsWith(x) && inf.length - x.length >= 4);
  if (t) return { vor: t, grund: inf.slice(t.length), trennbar: true };
  const u = UNTRENNBAR.exec(inf);
  if (u) return { vor: u[1], grund: inf.slice(u[1].length), trennbar: false };
  return undefined;
}

/** Stamm eines regelmäßigen Verbs und ob vor -t ein -e- steht („arbeiten“ → arbeit, ja; „spielen“ → spiel, nein). */
function schwacherStamm(inf: string): { stamm: string; mitE: boolean } | undefined {
  const stamm = /(?:el|er)n$/.test(inf) ? inf.slice(0, -1) : inf.endsWith('en') ? inf.slice(0, -2) : undefined;
  if (!stamm) return undefined;
  return { stamm, mitE: /[dt]$/.test(stamm) || /[^aeiouäöülrhmn][mn]$/.test(stamm) };
}

/** Präteritum: ich, du, er/sie, wir, ihr, sie („spielte, spieltest …“, „ging, gingst …“). Abgetrennte Vorsilben bleiben draußen. */
export function praeteritumVon(infinitiv: string): string[] | undefined {
  const inf = infinitiv.toLowerCase();
  if (!/^[a-zäöüß]+$/.test(inf)) return undefined;
  const z = STARK[inf] ? undefined : zerlegeVerb(inf);
  // „mitkommen“ → „mitkam“ (so steht es zusammengezogen, nachdem `trennbar` die Vorsilbe zurückgeholt hat)
  if (z?.trennbar) return praeteritumVon(z.grund)?.map((f) => z.vor + f);
  const stark = STARK[inf] ?? (z && STARK[z.grund] ? [z.vor + STARK[z.grund][0], ''] : undefined);
  if (stark) {
    const S = stark[0];
    if (/e$/.test(S)) return [S, `${S}st`, S, `${S}n`, `${S}t`, `${S}n`];
    const du = /[sßz]$/.test(S) ? `${S}est` : /[dt]$/.test(S) ? `${S}est` : `${S}st`;
    const ihr = /[dt]$/.test(S) ? `${S}et` : `${S}t`;
    return [S, du, S, `${S}en`, ihr, `${S}en`];
  }
  const st = schwacherStamm(inf);
  if (!st) return undefined;
  const te = `${st.stamm}${st.mitE ? 'e' : ''}te`;
  return [te, `${te}st`, te, `${te}n`, `${te}t`, `${te}n`];
}

/**
 * Partizip II: „gespielt“, „gegangen“, „besucht“, „verstanden“, „telefoniert“, „mitgekommen“, „angerufen“.
 * Bei regelmäßigen Verben, die mit einer Vorsilbe beginnen könnten („antworten“, „einkaufen“), beide
 * Möglichkeiten – getippt wird nur die richtige.
 */
export function partizipVon(infinitiv: string): string[] {
  const inf = infinitiv.toLowerCase();
  if (!/^[a-zäöüß]+$/.test(inf)) return [];
  if (STARK[inf]) return [STARK[inf][1]];
  const aus: string[] = [];
  const z = zerlegeVerb(inf);
  if (z) {
    for (const grund of STARK[z.grund] ? [STARK[z.grund][1]] : partizipVon(z.grund)) aus.push(z.trennbar ? z.vor + grund : z.vor + grund.replace(/^ge/, ''));
    if (STARK[z.grund] || !z.trennbar) return aus;
  }
  if (/ieren$/.test(inf)) return [...aus, `${inf.slice(0, -2)}t`];
  const st = schwacherStamm(inf);
  return st ? [...aus, `ge${st.stamm}${st.mitE ? 'e' : ''}t`] : aus;
}

/**
 * Trennbare Verben: „Kommst du morgen mit?“ → „mitkommst du morgen“, „Ich rufe dich an“ → „ich anrufe dich“.
 * Die Vorsilbe am Satzende kommt wieder ans Verb, wenn es die zusammengesetzte Form gibt (`kennt`) –
 * so findet der Übersetzer „mitkommen“, „anrufen“, „aufstehen“.
 */
export function trennbar(t: readonly DeToken[], kennt: (form: string) => boolean): DeToken[] | undefined {
  const letzt = t[t.length - 1];
  if (!letzt || t.length < 2 || !TRENNBAR.includes(letzt.w)) return undefined;
  for (let k = 0; k <= Math.min(3, t.length - 2); k++) {
    const form = letzt.w + t[k].w;
    if (kennt(form)) return [...t.slice(0, k), { w: form }, ...t.slice(k + 1, -1)];
  }
  return undefined;
}

export interface Vergangen {
  /** Der Satz im Präsens („ich habe Fußball gespielt“ → „ich spiele Fußball“) */
  tokens: DeToken[];
  /** „ich bin müde gewesen“ → „ich war müde“: die Kopula hat ihre eigene Vergangenheit */
  kopula?: true;
}

/**
 * Perfekt und Präteritum erkennen und den Satz ins Präsens umstellen, damit der Baukasten ihn wie gewohnt
 * zerlegt – gebaut wird dann das Präteritum. `partizip`/`praeteritum` sagen, zu welchen Verben eine Form
 * gehört (aus den Verben, die der Übersetzer kennt). „ich bin müde gewesen“ wird „ich war müde“.
 */
export function vergangenheit(
  t: readonly DeToken[],
  partizip: (w: string) => string[],
  praeteritum: (w: string) => { inf: string; stelle: number }[],
): Vergangen[] {
  const aus: Vergangen[] = [];
  /** Die Person zu einer Verbform: Pronomen davor oder dahinter, sonst ein Substantiv (3. Person) */
  const stellen = (k: number, formen: readonly string[]): number[] => {
    const w = t[k].w;
    const pron = [t[k - 1]?.w, t[k + 1]?.w].find((x) => x && x in PRONOMEN);
    if (pron) return subjekt(pron, w, formen).map((x) => (x.zahl === 'sg' ? x.p - 1 : x.p + 2));
    return [2, 5].filter((i) => formen[i] === w);
  };
  // Perfekt: Hilfsverb vorn, Partizip am Ende („ich habe heute Fußball gespielt“, „Hast du gegessen?“)
  const letzt = t.length - 1;
  for (let k = 0; k <= Math.min(4, letzt - 1); k++) {
    const hilfs = HABEN.includes(t[k].w) ? HABEN : SEIN.includes(t[k].w) ? SEIN : undefined;
    if (!hilfs) continue;
    if (hilfs === SEIN && t[letzt].w === 'gewesen') {
      for (const i of stellen(k, SEIN)) aus.push({ tokens: [...t.slice(0, k), { w: WAR[i] }, ...t.slice(k + 1, letzt)], kopula: true });
      break;
    }
    const infs = partizip(t[letzt].w);
    if (!infs.length) continue;
    for (const i of stellen(k, hilfs)) {
      for (const inf of infs) {
        const p = praesens(inf)?.[i];
        if (p) aus.push({ tokens: [...t.slice(0, k), { w: p }, ...t.slice(k + 1, letzt)] });
      }
    }
    break;
  }
  if (aus.length) return aus;
  // Präteritum: „ich spielte“, „Aday kam“, „Wo warst du?“ (sein hat eigene Formen)
  for (let k = 0; k <= Math.min(3, letzt); k++) {
    const formen = praeteritum(t[k].w);
    if (!formen.length) continue;
    for (const { inf, stelle } of formen) {
      const alle = praeteritumVon(inf) ?? [];
      if (!stellen(k, alle).includes(stelle)) continue;
      const p = praesens(inf)?.[stelle];
      if (p && !aus.some((a) => a.tokens[k].w === p)) aus.push({ tokens: [...t.slice(0, k), { w: p }, ...t.slice(k + 1)] });
    }
    if (aus.length) break;
  }
  return aus;
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
export const zahlOffen = (wort: string) => /(?:er|el|en|chen|lein)$/.test(wort.toLowerCase()) && !EINZAHL_KLAR.has(wort.toLowerCase());

/** Wörter auf -er, deren Mehrzahl anders lautet („Mutter“ – „Mütter“, „Schwester“ – „Schwestern“): „meine Mutter“ ist Einzahl. */
const EINZAHL_KLAR = new Set(
  'mutter vater bruder tochter schwester großmutter großvater schwiegermutter schwiegervater schwager feder mauer leiter nummer kammer schulter butter'.split(' '),
);

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
    'magen blut haut knochen gehirn stirn wange kinn bart körper seele schwanz flügel fell'
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

/**
 * „zum“ und „zur“ übersetzt das Lehrbuch wie „ins“ mit l „zu“: „an nacime këzzën li madrašto – die
 * Kinder gehen zur Schule“ (Lektion 4), „kobac d ëzzux lu taxtor – du musst zum Arzt“ (Lektion 14).
 */
const VERSCHMOLZEN: Record<string, DePraeposition> = {
  im: { bedeutung: 'in', artikel: 'dem' },
  ins: { bedeutung: 'zu', artikel: 'das' },
  zum: { bedeutung: 'zu', artikel: 'dem' },
  zur: { bedeutung: 'zu', artikel: 'der' },
  vom: { bedeutung: 'aus', artikel: 'dem' },
  beim: { bedeutung: 'bei', artikel: 'dem' },
};

/** Der Fall eines Possessivbegleiters wie beim Artikel: „meinem“ wie „dem“, „meiner“ wie „der“, „mein“ wie „das“. */
function artikelWie(w: string): string | undefined {
  const m = /^(?:mein|dein|sein|ihr|unser|euer|eur)(|e|en|em|er|es)$/.exec(w);
  if (!m || !possessiv(w)) return undefined;
  return { '': 'das', e: 'die', en: 'den', em: 'dem', er: 'der', es: 'des' }[m[1]];
}

/**
 * Welche Präposition des Lehrbuchs passt? „in“ mit Dativ (Ort: „in dem“, „in der“,
 * „in den“ + Mehrzahl) ist b, „in“ mit Akkusativ (Richtung: „in das“, „in die“,
 * „in den“ + Einzahl) ist l – so stehen die Beispiele in Grammatik 11b.
 */
export function praeposition(wort: string, begleiter: string | undefined, mehrzahl: boolean): DePraeposition | undefined {
  const v = VERSCHMOLZEN[wort];
  if (v) return begleiter ? undefined : v;
  // „in meinem Haus“ wie „in dem Haus“: Im Surayt steht der Artikel auch vor dem Substantiv mit Possessivsuffix (Grammatik 5a)
  const artikel = begleiter && (BESTIMMT.has(begleiter) ? begleiter : artikelWie(begleiter));
  if (!artikel) return undefined;
  if (wort === 'in') {
    if (artikel === 'dem' || artikel === 'der' || (artikel === 'den' && mehrzahl)) return { bedeutung: 'in' };
    if (artikel === 'das' || artikel === 'die' || (artikel === 'den' && !mehrzahl)) return { bedeutung: 'zu' };
    return undefined;
  }
  if (wort === 'aus' || wort === 'von') return artikel === 'des' ? undefined : { bedeutung: 'aus' };
  if (wort === 'bei') return artikel === 'dem' || artikel === 'der' || artikel === 'den' ? { bedeutung: 'bei' } : undefined;
  // „zu dem“, „zu der“ wie „zum“, „zur“ (feste Wendungen wie „zum Schluss“ – bi ḥarayto – kennt der Übersetzer aus den Daten)
  if (wort === 'zu') return artikel === 'dem' || artikel === 'der' || artikel === 'den' ? { bedeutung: 'zu' } : undefined;
  return undefined;
}

/**
 * Präpositionen, die im Surayt für sich stehen – vor einem Substantiv mit oder ohne Artikel, vor
 * einem Namen oder mit Suffix („mit mir“): Bedeutung, unter der die Präposition im Lehrbuch steht
 * („Die häufigsten Präpositionen sind b „in“, bëṯr „hinter“, cal „auf“, cam „mit“ …“, Grammatik 11b).
 * `begleiter`: das Wort danach, wenn es ein Begleiter ist („einem“, „meiner“), sonst nichts.
 * „in“ und „zu“ nur ohne bestimmten Artikel (mit Artikel: `praeposition`), „nach“ nur vor Namen
 * („l Holanda – nach Holland“), weil „nach dem Essen“ etwas anderes heißt.
 */
export function praepositionFrei(wort: string, begleiter: string | undefined, name: boolean): string | undefined {
  // Fall des Begleiters an der Endung: „einem“, „meinem“ (Dativ), „einen“, „meine“ (Akkusativ)
  const dativ = !!begleiter && /(?:em|er|m)$/.test(begleiter);
  const akkusativ = !!begleiter && !dativ;
  switch (wort) {
    case 'mit':
      return 'mit';
    case 'auf':
      return 'auf';
    case 'hinter':
      return 'hinter';
    case 'unter':
      return 'unter';
    case 'in':
      return name || dativ ? 'in' : akkusativ ? 'zu' : undefined;
    case 'zu':
      return 'zu';
    case 'nach':
      return name ? 'zu' : undefined;
    case 'aus':
    case 'von':
      return 'aus';
    default:
      return undefined;
  }
}

/** Personalpronomen nach einer Präposition („mit mir“, „auf dich“) → Person. „sie“ (eine oder mehrere) und „es“ bleiben draußen. */
const NACH_PRAEPOSITION: Record<string, Person> = {
  mir: { p: 1, zahl: 'sg' },
  mich: { p: 1, zahl: 'sg' },
  dir: { p: 2, zahl: 'sg' },
  dich: { p: 2, zahl: 'sg' },
  ihm: { p: 3, zahl: 'sg', g: 'm' },
  ihn: { p: 3, zahl: 'sg', g: 'm' },
  ihr: { p: 3, zahl: 'sg', g: 'f' },
  uns: { p: 1, zahl: 'pl' },
  euch: { p: 2, zahl: 'pl' },
  ihnen: { p: 3, zahl: 'pl' },
};
export const pronomenNachPraeposition = (w: string): Person | undefined => NACH_PRAEPOSITION[w];

/** Präpositionen, Bindewörter und andere kleine Wörter – nie ein Name. */
const FUNKTIONSWOERTER = new Set(
  (
    'an am auf aus bei beim bis durch für gegen hinter in im ins mit nach neben ohne seit über um unter vom von vor zu zum zur zwischen ' +
    'und oder aber denn sondern dass weil wenn ob als wie während obwohl damit bevor nachdem sobald falls ' +
    'nicht auch noch schon sehr ja nein nur so dann da hier dort es man sich mich dich uns euch mir dir ihm ihn ihnen ' +
    'was wer wen wem wo wann warum wohin woher etwas nichts alles jemand niemand'
  ).split(' '),
);

export const istFunktionswort = (w: string) =>
  FUNKTIONSWOERTER.has(w) || BESTIMMT.has(w) || UNBESTIMMT.has(w) || KEIN.has(w) || w in PRONOMEN || !!possessiv(w) || istBegleiter(w) ||
  HILFSFORMEN.has(w) || FUELLWOERTER.has(w) || ZUKUNFT.has(w) || FRAGEWOERTER.has(w);

/**
 * Ein Personalpronomen als Objekt am Anfang der Ergänzungen („ich sehe dich“, „er gibt mir das Buch“).
 * „sie“ (eine oder mehrere?) und „es“ (im Surayt männlich oder weiblich) bleiben draußen, „euch“ und „ihnen“
 * auch (Grammatik 22a: drei Varianten je nach Auslaut). „ihr“ nur vor einem Artikel oder am Ende
 * („ich gebe ihr das Buch“), sonst ist es meist „ihr Buch“.
 */
export function objektPronomen(t: readonly DeToken[]): { person: Person; dativ: boolean; hinweis?: DeToken['hinweis'] } | undefined {
  const w = t[0]?.w;
  const naechstes = t[1]?.w;
  const AKK: Record<string, Person> = { mich: { p: 1, zahl: 'sg' }, dich: { p: 2, zahl: 'sg' }, ihn: { p: 3, zahl: 'sg', g: 'm' }, uns: { p: 1, zahl: 'pl' } };
  const DAT: Record<string, Person> = { mir: { p: 1, zahl: 'sg' }, dir: { p: 2, zahl: 'sg' }, ihm: { p: 3, zahl: 'sg', g: 'm' }, ihr: { p: 3, zahl: 'sg', g: 'f' } };
  if (!w) return undefined;
  const hinweis = t[0].hinweis;
  if (w in AKK) return { person: AKK[w], dativ: w === 'uns', ...(hinweis ? { hinweis } : {}) };
  if (w === 'ihr' && naechstes && !BESTIMMT.has(naechstes) && !UNBESTIMMT.has(naechstes) && !KEIN.has(naechstes)) return undefined;
  if (w in DAT) return { person: DAT[w], dativ: true, ...(hinweis ? { hinweis } : {}) };
  return undefined;
}

/** Ortsangaben ohne Beugung, die als Ergänzung zu „sein“ und „es gibt“ stehen können. */
export const ORTSWORT = new Set(['hier', 'dort', 'da', 'draußen', 'drinnen', 'oben', 'unten']);

// --- Eingabe zerlegen --------------------------------------------------------------------------

/** Ein Wort der Eingabe, klein; `hinweis` aus einer Klammer dahinter („dein (m.)“, „ihre (Pl.)“). */
export interface DeToken {
  w: string;
  hinweis?: 'm' | 'f' | 'sg' | 'pl';
  /** So wie getippt („Adam“) – für Namen, die nicht im Lehrbuch stehen */
  roh?: string;
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
      if (h === 'dass') aus.push({ w: 'dass', roh: '(dass)' });
      continue;
    }
    const w = m[0].toLowerCase();
    // „geht's“, „gibt's“ (das „s“ nach dem Apostroph), „gehts“ → „geht es“
    if (w === 's' && aus.length) aus.push({ w: 'es' });
    else if (/^(geht|ging|gibt|gab)s$/.test(w)) aus.push({ w: w.slice(0, -1) }, { w: 'es' });
    else aus.push({ w, roh: m[0] });
  }
  return aus;
}

// --- Ganze Sätze (Phase 4b, Schritt 7b) -------------------------------------------------------
//
// Damit der Übersetzer Alltagssätze versteht („Wollen wir Fußball spielen?“, „Ich bin krank
// und kann nicht kommen.“): Modalverben, Fragen, Verneinung, Zeitangaben, Sätze mit „und“
// und gleichbedeutende Wörter. Auch hier nur Deutsch.

export type Modalverb = 'wollen' | 'können' | 'müssen' | 'sollen';

/**
 * Modalverben im Präsens. „dürfen“ ist im Surayt dasselbe wie „können“, „mögen“ (mit Verb)
 * dasselbe wie „wollen“ (Grammatik 20c); „möchten“ ist die höfliche Form von „mögen“.
 */
const MODAL_FORMEN: [string, Modalverb, string[]][] = [
  ['wollen', 'wollen', GANZ.wollen],
  ['möchten', 'wollen', ['möchte', 'möchtest', 'möchte', 'möchten', 'möchtet', 'möchten']],
  ['mögen', 'wollen', GANZ.mögen],
  ['können', 'können', GANZ.können],
  ['dürfen', 'können', GANZ.dürfen],
  ['müssen', 'müssen', GANZ.müssen],
  ['sollen', 'sollen', GANZ.sollen],
];

/** Welches Modalverb und welche Personen passen zu Pronomen und Verbform? „wir möchten“ → wollen, wir. */
export function modalVon(pronomen: string, verb: string): { modal: Modalverb; deutsch: string; personen: Person[] }[] {
  return MODAL_FORMEN.flatMap(([deutsch, modal, formen]) => {
    const personen = subjekt(pronomen, verb, formen);
    return personen.length ? [{ modal, deutsch, personen }] : [];
  });
}

/** Ist das Wort eine Form eines Modalverbs (für eine dritte Person, z. B. „der Lehrer will“)? */
export function modalFuerDritte(verb: string): { modal: Modalverb; deutsch: string; zahl: 'sg' | 'pl' }[] {
  return MODAL_FORMEN.flatMap(([deutsch, modal, formen]) => [
    ...(formen[2] === verb ? [{ modal, deutsch, zahl: 'sg' as const }] : []),
    ...(formen[5] === verb ? [{ modal, deutsch, zahl: 'pl' as const }] : []),
  ]);
}

/** Alle deutschen Verbformen der Hilfs- und Modalverben – um Fragen („Kommst du …?“) umzustellen. */
export const HILFSFORMEN = new Set([...SEIN, ...WAR, ...HABEN, ...WERDEN, ...MODAL_FORMEN.flatMap(([, , f]) => f)]);

/** Fragewörter am Satzanfang (Grammatik 24a). */
export const FRAGEWOERTER = new Set([
  'wo', 'was', 'wann', 'wie', 'warum', 'wieso', 'weshalb', 'weswegen', 'wer', 'wen', 'wem', 'woher', 'wohin',
  'welche', 'welcher', 'welches', 'welchen', 'welchem', 'womit', 'wofür', 'wozu',
]);

/**
 * Zeitangaben, die in die Zukunft weisen. Das Lehrbuch übersetzt ein deutsches Präsens dann
 * mit dem Futur („Šmuni, mën gëd saymat ramḥël? – Šmuni, was machst du morgen?“, Lektion 8).
 */
export const ZUKUNFT = new Set(['morgen', 'übermorgen', 'bald', 'später', 'nachher', 'demnächst']);

/**
 * Wörtchen, die im Deutschen nur färben und im Surayt kein eigenes Wort haben – der Übersetzer
 * lässt sie weg und sagt es dazu („Kommst du mal?“ → wie „Kommst du?“).
 */
export const FUELLWOERTER = new Set(['mal', 'doch', 'denn', 'halt', 'eben', 'eigentlich', 'wohl', 'einfach', 'echt', 'bitte', 'gerne', 'gern']);

/**
 * Gleichbedeutende deutsche Wörter (Umgangssprache, Synonyme): Steht ein Wort nicht im
 * Lehrbuch, versucht der Übersetzer diese – der Reihe nach – und sagt dazu, was er genommen
 * hat. Nur Deutsch; ob es das Wort auf Surayt gibt, entscheiden die Daten.
 */
export const SYNONYME: Record<string, string[]> = {
  // Verben
  gucken: ['schauen', 'sehen'],
  kucken: ['schauen', 'sehen'],
  schauen: ['sehen'],
  anschauen: ['sehen'],
  angucken: ['sehen'],
  kriegen: ['bekommen'],
  erhalten: ['bekommen'],
  quatschen: ['sprechen', 'reden'],
  reden: ['sprechen'],
  plaudern: ['sprechen'],
  unterhalten: ['sprechen'],
  futtern: ['essen'],
  speisen: ['essen'],
  pennen: ['schlafen'],
  kapieren: ['verstehen'],
  begreifen: ['verstehen'],
  zocken: ['spielen'],
  laufen: ['gehen'],
  rennen: ['laufen'],
  fahren: ['gehen'],
  wohnen: ['leben'],
  heimkommen: ['kommen'],
  // Trennbare Verben, die das Lehrbuch nicht eigens nennt: wie das Grundverb
  mitkommen: ['kommen'],
  mitgehen: ['gehen'],
  mitspielen: ['spielen'],
  mitmachen: ['machen'],
  mitessen: ['essen'],
  einkaufen: ['kaufen'],
  abholen: ['holen', 'nehmen'],
  aufmachen: ['öffnen'],
  zumachen: ['schließen'],
  wiederkommen: ['zurückkehren', 'kommen'],
  zurückkommen: ['zurückkehren', 'kommen'],
  besorgen: ['kaufen'],
  schenken: ['geben'],
  jobben: ['arbeiten'],
  schaffen: ['arbeiten'],
  beginnen: ['anfangen'],
  anfangen: ['beginnen'],
  losgehen: ['anfangen'],
  aufhören: ['beenden'],
  enden: ['aufhören'],
  lieben: ['mögen'],
  gernhaben: ['lieben', 'mögen'],
  heulen: ['weinen'],
  telefonieren: ['anrufen'],
  anrufen: ['telefonieren'],
  erzählen: ['sagen'],
  meinen: ['sagen', 'denken'],
  glauben: ['denken'],
  // Substantive
  kumpel: ['freund'],
  kumpels: ['freunde'],
  bub: ['junge'],
  bube: ['junge'],
  kerl: ['mann'],
  typ: ['mann'],
  mama: ['mutter'],
  mutti: ['mutter'],
  papa: ['vater'],
  vati: ['vater'],
  oma: ['großmutter'],
  omi: ['großmutter'],
  opa: ['großvater'],
  opi: ['großvater'],
  kids: ['kinder'],
  gör: ['kind'],
  baby: ['kind'],
  wagen: ['auto'],
  karre: ['auto'],
  handy: ['telefon'],
  smartphone: ['telefon'],
  wohnung: ['haus'],
  bude: ['zimmer'],
  kohle: ['geld'],
  knete: ['geld'],
  kaff: ['dorf'],
  laden: ['geschäft'],
  mahlzeit: ['essen'],
  abendbrot: ['abendessen'],
  getränk: ['trinken'],
  bursche: ['junge'],
  mädel: ['mädchen'],
  gattin: ['frau'],
  ehefrau: ['frau'],
  ehemann: ['mann'],
  gatte: ['mann'],
  // Adjektive und Adverbien
  super: ['gut', 'schön'],
  toll: ['schön', 'gut'],
  klasse: ['gut'],
  prima: ['gut'],
  cool: ['gut'],
  okay: ['gut'],
  ok: ['gut'],
  lecker: ['schmackhaft'],
  hübsch: ['schön'],
  prächtig: ['schön'],
  riesig: ['groß'],
  winzig: ['klein'],
  mies: ['schlecht'],
  übel: ['schlecht'],
  kaputt: ['müde'],
  erschöpft: ['müde'],
  fertig: ['müde'],
  froh: ['glücklich'],
  happy: ['glücklich'],
  sauer: ['böse'],
  wütend: ['böse'],
  eklig: ['schlecht'],
  gemeinsam: ['zusammen'],
  nun: ['jetzt'],
  grad: ['jetzt'],
  gerade: ['jetzt'],
  sofort: ['gleich'],
  heuer: ['dieses jahr'],
};

/**
 * Deutsche Wendungen, die das Lehrbuch wörtlich übersetzt: „zu Hause“ wie „im Haus“ (bu bayto),
 * „nach Hause“ wie „ins Haus“ (lu bayto) – so stehen sie in den Sätzen des Lehrbuchs
 * („Kale bu bayto – Er ist (gerade) zu Hause“, „Lazëm yo d ëzzux lu bayto – Du musst nach Hause gehen“).
 */
export const WENDUNGEN: [string, string, string][] = [
  ['zu hause', 'im haus', '„zu Hause“ wie „im Haus“'],
  ['zuhause', 'im haus', '„zuhause“ wie „im Haus“'],
  ['daheim', 'im haus', '„daheim“ wie „im Haus“'],
  ['nach hause', 'ins haus', '„nach Hause“ wie „ins Haus“'],
  ['heim', 'ins haus', '„heim“ wie „ins Haus“'],
];

// --- „Mir geht es gut“ -----------------------------------------------------------------------
//
// Das Lehrbuch übersetzt „es geht jemandem gut“ wie „jemand ist gut“: „Tawdi, ṭawwe na. – Danke,
// uns geht es gut.“ (Lektion 3), „latno ṭawwo – mir geht es nicht gut“ (Lektion 14), „aydarbo hat?
// – wie geht es dir?“. Der Übersetzer stellt den deutschen Satz deshalb so um.

/** Dativ-Pronomen → Pronomen im Nominativ und Stelle in den Formenlisten (ich, du, er/sie, wir, ihr, sie). */
const DATIV: Record<string, [string, number]> = {
  mir: ['ich', 0],
  dir: ['du', 1],
  ihm: ['er', 2],
  ihr: ['sie', 2],
  uns: ['wir', 3],
  euch: ['ihr', 4],
  ihnen: ['sie', 5],
};

/** Begleiter im Dativ (Einzahl) → Nominativ: „meiner Mutter“ → „meine Mutter“, „dem Lehrer“ → „der Lehrer“. */
function nominativ(w: string): string | undefined {
  if (w === 'dem') return 'der';
  if (w === 'der') return 'die';
  // „meinem“, „unserem“, „unserm“ → männlich/sächlich; „meiner“, „unserer“, „eurer“ → weiblich
  const m = /^(ein|kein|mein|dein|sein|ihr|unser|eur)(em|er|m)$/.exec(w);
  if (!m) return undefined;
  if (m[2] === 'er') return `${m[1]}e`;
  return m[1] === 'eur' ? 'euer' : m[1];
}

/** Eine Wortgruppe im Dativ in den Nominativ („meiner Mutter“ → „meine Mutter“); ein Name bleibt, wie er ist. */
function gruppeNominativ(t: readonly DeToken[]): DeToken[] | undefined {
  if (t.length === 1) return istPronomen(t[0].w) || t[0].w in DATIV || t[0].w === 'es' ? undefined : [...t];
  if (t.length > 3) return undefined;
  const n = nominativ(t[0].w);
  return n ? [{ ...t[0], w: n, roh: n }, ...t.slice(1)] : undefined;
}

export interface Umstellung {
  tokens: DeToken[];
  hinweis: string;
}

/**
 * „mir geht es gut“ → „ich bin gut“, „es geht mir gut“, „geht es dir gut?“ → „bist du gut?“,
 * „wie geht es dir?“ → „wie bist du?“, „Adam geht es gut“, „meiner Mutter geht es gut“ →
 * „meine Mutter ist gut“; mit „ging“ in der Vergangenheit („mir ging es gut“ → „ich war gut“).
 * Mehrere Möglichkeiten, wenn nicht klar ist, wo die Wortgruppe endet.
 */
export function befinden(t: readonly DeToken[]): Umstellung[] {
  const i = t.findIndex((x, k) => (x.w === 'geht' || x.w === 'ging') && (t[k + 1]?.w === 'es' || t[k - 1]?.w === 'es'));
  if (i < 0) return [];
  const formen = t[i].w === 'geht' ? SEIN : WAR;
  const aus: Umstellung[] = [];
  const woerter = (x: readonly DeToken[]) => x.map((y) => y.roh ?? y.w).join(' ');
  /** Wer? (Dativ) und was danach kommt → „wer – ist – Rest“ bzw. für Fragen „ist – wer – Rest“ */
  const satz = (wer: readonly DeToken[], rest: readonly DeToken[], vorne: readonly DeToken[], verbVorn: boolean) => {
    if (!wer.length) return;
    let subjekt: DeToken[] | undefined;
    let verb: string;
    if (wer.length === 1 && wer[0].w in DATIV) {
      const [nom, stelle] = DATIV[wer[0].w];
      subjekt = [{ w: nom }];
      verb = formen[stelle];
    } else {
      subjekt = gruppeNominativ(wer);
      verb = formen[2];
    }
    if (!subjekt) return;
    const v = { w: verb };
    const tokens = [...vorne, ...(verbVorn ? [v, ...subjekt] : [...subjekt, v]), ...rest];
    aus.push({ tokens, hinweis: `„${woerter(t)}“ wie „${woerter(tokens)}“ – so übersetzt es das Lehrbuch` });
  };
  const vorne = t.slice(0, i);
  // „mir geht es gut“, „meiner Mutter geht es gut“
  if (t[i + 1]?.w === 'es' && vorne.length && !FRAGEWOERTER.has(vorne[0].w)) satz(vorne, t.slice(i + 2), [], false);
  // „es geht mir gut“, „geht es dir gut?“, „wie geht es dir?“, „wie geht es deiner Mutter?“
  const esVorn = t[i - 1]?.w === 'es' && i === 1;
  const nachEs = esVorn ? i + 1 : t[i + 1]?.w === 'es' ? i + 2 : -1;
  const davor = esVorn ? [] : vorne;
  if (nachEs > 0 && (esVorn || !davor.length || (davor.length === 1 && FRAGEWOERTER.has(davor[0].w)))) {
    const hinten = t.slice(nachEs);
    const frage = !esVorn;
    for (let n = 1; n <= Math.min(3, hinten.length); n++) {
      // Ohne Fragewort muss noch etwas folgen („gut“); „wie geht es dir“ endet mit der Wortgruppe
      if (!davor.length && n === hinten.length) continue;
      satz(hinten.slice(0, n), hinten.slice(n), davor, frage);
    }
  }
  return aus;
}

/** Gleichbedeutende Wörter zu einem deutschen Wort (ohne das Wort selbst). */
export function synonymeVon(wort: string): string[] {
  const w = wort.toLowerCase();
  return (SYNONYME[w] ?? []).filter((x) => x !== w);
}

/**
 * „sich treffen mit jemandem“ heißt dasselbe wie „jemanden treffen“ – so steht „treffen“ im Lehrbuch
 * („laqën b – sie trafen (jdn.)“, „Koloqe bi Saro w u Aday – Er trifft Saro und Aday“).
 */
const SICH_MIT: Record<string, string> = { treffen: '„sich treffen mit“ wie „treffen“' };
const REFLEXIV = new Set(['mich', 'dich', 'sich', 'uns', 'euch']);

function ohneReflexiv(t: DeToken[], ersetzt: string[]): DeToken[] {
  for (const [inf, anzeige] of Object.entries(SICH_MIT)) {
    const formen = new Set([...(praesens(inf) ?? []), inf]);
    const v = t.findIndex((x) => formen.has(x.w));
    if (v < 0) continue;
    const r = t.findIndex((x, k) => k > v && k <= v + 2 && REFLEXIV.has(x.w));
    const mit = t.findIndex((x, k) => k > r && x.w === 'mit');
    if (r < 0 || mit < 0) continue;
    ersetzt.push(anzeige);
    return t.filter((_, k) => k !== r && k !== mit);
  }
  return t;
}

/** Ein Teilsatz: seine Wörter und das Bindewort davor („und“, „aber“, „oder“). */
export interface DeTeilsatz {
  /** Bindewort davor; „dass“ und „weil“ leiten einen Nebensatz ein (Verb am Ende) */
  verbindung?: 'und' | 'aber' | 'oder' | 'dass' | 'weil';
  /** „(dass) wir machen“: so übersetzt das Lehrbuch die Grundform allein, ohne d */
  ohneD?: boolean;
  tokens: DeToken[];
}

/**
 * Ein Nebensatz in die Stellung des Hauptsatzes: „(dass) du müde bist“ → „du bist müde“. Das Verb am
 * Ende kommt hinter das Subjekt; wie lang das Subjekt ist, steht nicht fest – deshalb mehrere Möglichkeiten
 * („weil der Lehrer krank ist“ → „der Lehrer ist krank“). Ein Pronomen ist ein Wort.
 */
export function hauptsatzStellung(t: readonly DeToken[]): DeToken[][] {
  if (t.length < 2) return [];
  const verb = t[t.length - 1];
  const vorn = t.slice(0, -1);
  const stellen = istPronomen(t[0].w) ? [1] : [1, 2, 3, 4].filter((k) => k <= vorn.length);
  return stellen.map((k) => [...vorn.slice(0, k), verb, ...vorn.slice(k)]);
}

/**
 * Welcher Satz folgt auf „dass“? Nach „wollen“, „möchten“, „mögen“ der Subjunktiv („An nacime këbci d
 * zawnina raḏayto ḥaṯto – Die Kinder wollen, dass wir ein neues Auto kaufen“, Grammatik 23d), nach „wissen“,
 * „sagen“ ein gewöhnlicher Satz („koḏacno d lathatu Holandoye – Ich weiß, dass ihr keine Niederländer seid“).
 * Sonst ist es nicht klar – dann baut der Übersetzer den Satz nicht.
 */
export function dassArt(hauptsatz: readonly DeToken[]): 'subjunktiv' | 'indikativ' | undefined {
  const w = new Set(hauptsatz.map((x) => x.w));
  const formen = (inf: string) => [...(praesens(inf) ?? []), ...(praeteritumVon(inf) ?? []), ...partizipVon(inf)];
  if (['wollen', 'mögen'].some((v) => formen(v).some((f) => w.has(f))) || ['möchte', 'möchtest', 'möchten', 'möchtet'].some((f) => w.has(f))) return 'subjunktiv';
  if (['wissen', 'sagen'].some((v) => formen(v).some((f) => w.has(f)))) return 'indikativ';
  return undefined;
}

/** Ein deutscher Satz, für den Baukasten vorbereitet. */
export interface DeSatz {
  /** Endet mit „?“ */
  frage: boolean;
  teile: DeTeilsatz[];
  /** Alle Wörter (ohne Füllwörter), auch die Bindewörter – für „Saro und Aday wollen …“ */
  alle: DeToken[];
  /** Weggelassene Füllwörter („mal“, „doch“ …) */
  ausgelassen: string[];
  /** Wendungen, die wörtlich übersetzt werden: „„zu Hause“ wie „im Haus““ */
  ersetzt: string[];
}

const BINDEWORT = new Set(['und', 'aber', 'oder']);

/**
 * Bereitet einen deutschen Satz vor: Fragezeichen merken, Füllwörter weglassen, an „und“,
 * „aber“, „oder“ und Kommas in Teilsätze trennen. Ob ein Teil ein ganzer Satz ist, entscheidet
 * der Baukasten.
 */
export function zerlegeSatz(text: string): DeSatz {
  const frage = /\?\s*$/.test(text);
  const ausgelassen: string[] = [];
  const teile: DeTeilsatz[] = [];
  const alle: DeToken[] = [];
  let aktuell: DeTeilsatz = { tokens: [] };
  for (const stueck of text.split(/[,;]/)) {
    if (aktuell.tokens.length) {
      teile.push(aktuell);
      aktuell = { tokens: [] };
    }
    for (const t of zerlegeDeutsch(stueck)) {
      if (FUELLWOERTER.has(t.w)) {
        ausgelassen.push(t.w);
        continue;
      }
      alle.push(t);
      if (BINDEWORT.has(t.w) || t.w === 'dass' || t.w === 'weil') {
        if (aktuell.tokens.length) teile.push(aktuell);
        aktuell = { verbindung: t.w as DeTeilsatz['verbindung'], tokens: [], ...(t.roh === '(dass)' ? { ohneD: true } : {}) };
        continue;
      }
      aktuell.tokens.push(t);
    }
  }
  if (aktuell.tokens.length) teile.push(aktuell);
  const ersetzt: string[] = [];
  const wendungen = (t: DeToken[]) => {
    let w = t.map((x) => x.w).join(' ');
    for (const [von, zu, anzeige] of WENDUNGEN) {
      const re = new RegExp(`(?<![\\p{L}])${von}(?![\\p{L}])`, 'u');
      if (re.test(w)) {
        w = w.replace(re, zu);
        ersetzt.push(anzeige);
      }
    }
    return w.split(' ').filter(Boolean).map((x) => ({ w: x }) as DeToken);
  };
  // Hinweise aus Klammern („dein (f.)“) bleiben nur, wo nichts ersetzt wurde
  const mitWendungen = (t: DeToken[]) => (WENDUNGEN.some(([von]) => ` ${t.map((x) => x.w).join(' ')} `.includes(` ${von} `)) ? wendungen(t) : t);
  return {
    frage,
    teile: teile.map((x) => ({ ...x, tokens: ohneReflexiv(mitWendungen(x.tokens), ersetzt) })),
    alle: ohneReflexiv(mitWendungen(alle), []),
    ausgelassen,
    ersetzt: [...new Set(ersetzt)],
  };
}

/**
 * Mögliche Grundformen eines deutschen Wortes, für die Suche nach einzelnen Wörtern:
 * Verbformen („spielst“, „gespielt“, „isst“, „kann“) → Infinitiv, Mehrzahl → Einzahl,
 * gebeugte Adjektive → Grundform. Ob es das Wort gibt, entscheiden die Daten.
 */
export function grundformen(wort: string): string[] {
  const w = wort.toLowerCase();
  const aus = new Set<string>();
  // Hilfs- und Modalverben, starke Verben (Listen oben)
  for (const [inf, formen] of Object.entries(GANZ)) if (formen.includes(w)) aus.add(inf);
  for (const [inf, [du, er]] of Object.entries(UNREGELMAESSIG)) if (w === du || w === er) aus.add(inf);
  if (['möchte', 'möchtest', 'möchten', 'möchtet'].includes(w)) aus.add('wollen');
  // Partizip „gespielt“, „gegessen“ → spielen, essen
  const ge = /^ge(.+?)(?:t|et|en)$/.exec(w);
  if (ge && ge[1].length >= 2) {
    aus.add(`${ge[1]}en`);
    aus.add(`${ge[1]}n`);
  }
  // Präsens und Präteritum regelmäßiger Verben: „spiele“, „spielst“, „spielt“, „spielte“, „spielten“
  const stamm = /^(.{2,}?)(?:e|st|est|t|et|te|ten|test|tet)$/.exec(w);
  if (stamm) {
    aus.add(`${stamm[1]}en`);
    aus.add(`${stamm[1]}n`);
  }
  for (const x of einzahlKandidaten(w)) aus.add(x);
  for (const x of adjektivKandidaten(w)) aus.add(x);
  aus.delete(w);
  return [...aus];
}
