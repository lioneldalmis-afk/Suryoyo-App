// Baukasten, Teil 1 (Fahrplan, Phase 4b, Schritt 4): „Ein Wort tauschen“.
//
// Steht ein deutscher Satz nicht im Übersetzer, sucht der Baukasten einen
// Lehrbuch-Satz, der genauso gebaut ist und sich nur in einem Wort
// unterscheidet, und tauscht dieses Wort aus:
//
//   Lehrbuch:  gëd goraš – er wird ziehen,  gëd domax – er wird schlafen
//   gesucht:   er wird essen  →  gëd + die Form von „essen“ für „er“ aus der Verbtabelle
//
// Regeln (alle aus dem Fahrplan):
// - Vorlage ist nur ein Satzbau, den das Lehrbuch mindestens zweimal mit
//   verschiedenen Wörtern an derselben Stelle zeigt – sonst weiß niemand, ob man
//   das Wort dort tauschen kann. Alle übrigen Wörter sind gleich, auf Surayt und
//   auf Deutsch, und das Deutsche hat außer dem Wort noch mindestens ein weiteres.
// - Das neue Wort ist „gleichartig“: bei Verbformen gleiche Zeit und Person (laut
//   Verbtabelle), bei Zahlen gleiches Geschlecht (laut Zahlentabelle; die Eins
//   steht mit der Einzahl, die übrigen mit der Mehrzahl), sonst gleiches
//   Geschlecht und gleiche Zahl. Was ein Wort ist, sagt nur das Lehrbuch: der
//   Artikel davor (u, i, aK – „Das Geschlecht der Substantive erkennt man
//   eindeutig am Artikel“, Grammatik 4), Zusätze wie „(f.)“ oder „Pl.“, die
//   Beschriftungen der Tabellen. Fehlt etwas, wird nichts zusammengesetzt. Die
//   Endungsregel „-to/-ṯo ist weiblich“ zählt nicht – das Lehrbuch nennt selbst
//   Ausnahmen (u bayto).
// - Gegenprobe: Jeder deutsche Satz des Lehrbuchs wird zusammengesetzt, ohne
//   dass der Baukasten ihn kennt (nicht als Vorlage, nicht als Beleg für ein
//   Merkmal, nicht als Wort), und mit dem echten Surayt verglichen. Ein Satzbau
//   wird nur benutzt, wenn er dabei mindestens einen seiner Belege genau trifft
//   und nie danebenliegt. Dass das Lehrbuch ihn zweimal zeigt, zählt dabei
//   weiter – sonst ließe sich ein Satzbau mit genau zwei Belegen nie prüfen.
// - Was der Baukasten baut, trägt immer das Schild „Zusammengesetzt – nicht
//   geprüft“, hat keine Aufnahme und erscheint nur im Übersetzer. Es steht nie
//   in den Daten.
//
// Welche Wörter Artikel sind, welche Form welche Person hat usw., steht nicht hier
// im Code, sondern kommt aus den Daten.

import { woerter, zerlege } from './text';
import { person, stichwort, type Fund, type Woerterbuch } from './woerterbuch';
import { alleSchreibweisen, artikelVor, type Schreibweise } from './wortfuerwort';

// --- Wörter vergleichen --------------------------------------------------------------

/** Ein Surayt-Wort genau, wie es dasteht, nur klein und ohne Satzzeichen („Ëšmi,“ → „ëšmi“). */
export const genau = (w: string) => zerlege(w).kern.normalize('NFC').toLowerCase();
/** Die Wörter eines Surayt-Textes, genau. */
export const surWoerter = (text: string) => woerter(text).map(genau).filter(Boolean);
/** Gleicher Surayt-Text (Satzzeichen und Großschreibung zählen nicht, Sonderzeichen schon). */
export const gleicherText = (a: string, b: string) => surWoerter(a).join(' ') === surWoerter(b).join(' ');

/** Deutsche Artikel. Vor dem getauschten Wort zählen sie (sie zeigen Zahl und Fall), sonst nicht („Glas Wein“ = „ein Glas Wein“). */
const ARTIKEL = new Set(['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines']);

/** Ein deutsches Wort ohne Artikel, mit dem Artikel, der direkt davor steht. */
interface DeWort {
  wort: string;
  artikel: string;
}

/** Die deutschen Wörter eines Textes ohne Klammerzusätze, klein; Artikel hängen am folgenden Wort. */
function deWoerter(text: string): DeWort[] {
  const roh = text
    .replace(/\([^)]*\)/g, ' ')
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const aus: DeWort[] = [];
  let artikel = '';
  for (const w of roh) {
    if (ARTIKEL.has(w)) {
      artikel = w;
      continue;
    }
    aus.push({ wort: w, artikel });
    artikel = '';
  }
  return aus;
}

const nurWoerter = (d: readonly DeWort[]) => d.map((x) => x.wort).join(' ');

/** Die Bedeutungen eines Eintrags einzeln: „der Laden, das Geschäft“ → „laden“, „geschäft“. */
export const bedeutungen = (deutsch: string) =>
  deutsch
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;/]/)
    .map((teil) => nurWoerter(deWoerter(teil)))
    .filter(Boolean);

/** Ist das Wort im Deutschen großgeschrieben (ein Substantiv)? Gilt für die Bedeutung, so wie sie im Lehrbuch steht. */
const grossGeschrieben = (deutsch: string, wort: string) => {
  const treffer = deutsch.normalize('NFC').split(/[^\p{L}\p{N}]+/u).find((w) => w.toLowerCase() === wort.split(' ')[0]);
  return !!treffer && /^\p{Lu}/u.test(treffer);
};

// --- Merkmale aus dem Lehrbuch ---------------------------------------------------------

export type Geschlecht = 'm' | 'f' | 'mf';
export type Zahl = 'sg' | 'pl';

/** Woran man ein Merkmal sieht – immer an einem Eintrag aus den Daten. */
export interface Beleg {
  fund: Fund;
  /** artikel: „u bayto“; zusatz: „aḏno (f.), Pl. aḏne“; tabelle: Beschriftung einer Tabelle; zahlen: Zahlentabelle; verb: Verbtabelle */
  art: 'artikel' | 'zusatz' | 'tabelle' | 'zahlen' | 'verb';
  geschlecht?: Geschlecht;
  zahl?: Zahl;
  /** Bei Verbformen: Zeit und Person („Präsens|er“) */
  form?: string;
}

/** Wortart, wie sie der Baukasten unterscheidet. */
export type Wortart = 'verb' | 'zahl' | 'nomen' | 'anderes';

/** Was ein Wort ist, so wie das Lehrbuch es zeigt. */
export interface Merkmale {
  wortart: Wortart;
  geschlecht?: Geschlecht;
  zahl?: Zahl;
  /** Verbformen: alle Zeiten und Personen dieser Form */
  formen?: string[];
  belege: Beleg[];
}

/**
 * Zeit aus der Beschriftung einer Verbtabelle. Die Verbkonjugation nennt die
 * Grundform „Präsens“ (Abschnitt „Präsensbasis: G7.a“), die Formentabellen
 * „Präsensbasis“ – das ist dasselbe. „Präsens (G.7b)“ in den Zeitformen ist
 * dagegen die Form mit ko- und bleibt getrennt, ebenso „Futur (G.7b)“ usw.
 *   „Präsens - /a/, Sg., 3. m.“ → „Präsens“, „Präsensbasis (G.7a), …“ → „Präsens“,
 *   „Präsens (G.7b), …“ → „Präsens (G.7b)“
 */
export function zeitVon(merkmal: string): string | undefined {
  const z = merkmal
    .split(',')[0]
    .replace(/\s+-\s+\/.*\/\s*$/, '')
    .trim();
  if (/^(Singular|Plural|Sg|Pl|\d)/.test(z) || !z) return undefined;
  const name = z.replace(/\s*\([^)]*\)/g, '');
  if (name === 'Präsensbasis') return 'Präsens';
  if (name === 'Präteritumsbasis') return 'Präteritum';
  return z;
}

/** „Präsens|er“: Zeit und Person einer Verbform, aus der Beschriftung der Tabelle. */
function verbForm(merkmal: string | undefined): string | undefined {
  if (!merkmal) return undefined;
  const zeit = zeitVon(merkmal);
  const wer = person(merkmal);
  return zeit && wer ? `${zeit}|${wer.klar}` : undefined;
}

/** Wie eine Verbform beschrieben wird: „Präsens|ich, weiblich“ → „Präsens · ich, weiblich“. */
export const formText = (form: string) => form.replace('|', ' · ');

/** Geschlecht im Zusatz oder in der Bedeutung: „(f.)“, „(m.Sg.)“, „(f.Pl.)“. */
function geschlechtIn(text: string): { geschlecht?: Geschlecht; zahl?: Zahl } {
  const m = /\((m|f)\.\s?(Sg|Pl)?\.?\)/.exec(text);
  if (!m) return {};
  return { geschlecht: m[1] as 'm' | 'f', ...(m[2] ? { zahl: m[2] === 'Pl' ? 'pl' : 'sg' } : {}) };
}

/** Die Überschrift über einem Block einer Grammatik-Seite (für „Maskuline Substantive“ usw.). */
export function ueberschriftVor(wb: Woerterbuch, seiteId: string, block: number): string {
  const seite = wb.seiten.get(seiteId);
  for (let i = block; i >= 0 && seite; i--) {
    const b = seite.bloecke[i];
    if (b?.art === 'titel') return b.text;
  }
  return '';
}

interface MerkmalIndex {
  /** Die Bedeutungen jedes Eintrags einzeln („laden“, „geschäft“) */
  bedeutungVon: Map<Fund, string[]>;
  /** Belege nach Schreibweise (genau) */
  belege: Map<string, Beleg[]>;
  /** Schreibweisen nach deutscher Bedeutung („wein“ → ḥamro …) */
  nachBedeutung: Map<string, Schreibweise[]>;
  /** Alle Einträge zu einer Schreibweise */
  nachForm: Map<string, Schreibweise[]>;
}

const merkmalIndexe = new WeakMap<Woerterbuch, MerkmalIndex>();

function merkmalIndex(wb: Woerterbuch): MerkmalIndex {
  const da = merkmalIndexe.get(wb);
  if (da) return da;
  const belege = new Map<string, Beleg[]>();
  const dazu = (form: string, b: Beleg) => belege.set(form, [...(belege.get(form) ?? []), b]);

  for (const f of wb.funde) {
    const ws = woerter(f.latein.replace(/\([^)]*\)/g, ' ')).map(genau).filter(Boolean);

    // Der Artikel davor: „u bayto“, „bi qriṯo“, „ak kṯowe“ (Grammatik 3, 4 und 11)
    for (let i = 0; i + 1 < ws.length; i++) {
      // Artikel sind kurz (u, i, an, ak, bu, lak …) – längere Wörter muss man nicht prüfen.
      if (ws[i].length > 3) continue;
      const art = artikelVor(wb, ws[i], ws[i + 1]);
      const m = art?.merkmal ?? '';
      if (!art || !m) continue;
      const zahl: Zahl | undefined = /^Sg\./.test(m) ? 'sg' : /^Pl\./.test(m) ? 'pl' : undefined;
      const g = /\bm\.$/.test(m) ? 'm' : /\bf\.$/.test(m) ? 'f' : undefined;
      if (zahl) dazu(ws[i + 1], { fund: f, art: 'artikel', zahl, ...(g ? { geschlecht: g } : {}) });
    }

    // Zusätze im Wortschatz und Glossar: „aḏno (f.), Pl. aḏne“, „ṭawwo – gut (m.Sg.)“
    if (f.art === 'wort' && (f.herkunft === 'wortschatz' || f.herkunft === 'glossar' || f.herkunft === 'aussprache')) {
      const text = `${f.latein} ${f.hinweis ?? ''}`;
      const [kopf, ...mehrzahl] = text.split(/\b[Pp]l\.\s/);
      const imZusatz = geschlechtIn(kopf);
      // Die Bedeutung trägt das Geschlecht nur, wenn sie aus einzelnen Wörtern besteht („gut (m.Sg.)“, nicht „ich (f.) liebe dich (m.)“).
      const inBedeutung = /^[\p{L}-]+(?:, [\p{L}-]+)* \((?:m|f)\.\s?(?:Sg|Pl)?\.?\)$/u.test(f.deutsch.trim()) ? geschlechtIn(f.deutsch) : {};
      const g = imZusatz.geschlecht ?? inBedeutung.geschlecht;
      const zahl = imZusatz.zahl ?? inBedeutung.zahl;
      const stich = surWoerter(stichwort(f.latein));
      if (stich.length === 1 && (g || mehrzahl.length)) {
        // Das Stichwort ist die Einzahl, wenn eine Mehrzahl dabeisteht oder ein Geschlecht ohne „Pl.“
        dazu(stich[0], { fund: f, art: 'zusatz', zahl: zahl ?? 'sg', ...(g ? { geschlecht: g } : {}) });
      }
      for (const teil of mehrzahl.join(' ').replace(/\([^)]*\)/g, ' ').split(/[,;]/)) {
        const w = surWoerter(teil.replace(/^\s*[Pp]l\.\s*/, ''));
        if (w.length === 1) dazu(w[0], { fund: f, art: 'zusatz', zahl: 'pl', ...(g ? { geschlecht: g } : {}) });
      }
    }

    // Beschriftungen der Tabellen
    for (const st of f.stellen ?? []) {
      const m = st.merkmal ?? '';
      const seite = wb.seiten.get(st.seite);
      if (!seite) continue;
      // Verbtabellen: Zeit und Person
      const form = st.verb ? verbForm(m) : undefined;
      if (form && ws.length === 1) dazu(ws[0], { fund: f, art: 'verb', form });
      // Zahlentabelle: „Maskulin“ / „Feminin“
      if (seite.titel === 'Die Zahlen' && ws.length === 1 && /^(Maskulin|Feminin)$/.test(m)) {
        dazu(ws[0], { fund: f, art: 'zahlen', geschlecht: m === 'Maskulin' ? 'm' : 'f' });
      }
      // Pluralbildung (Grammatik 6): „Maskuline Substantive“ – Singular / Plural
      const titel = ueberschriftVor(wb, st.seite, st.block);
      if (ws.length === 1 && /^(Singular|Plural)$/.test(m) && /Maskuline|Feminine/.test(titel)) {
        dazu(ws[0], { fund: f, art: 'tabelle', geschlecht: /Maskuline/.test(titel) ? 'm' : 'f', zahl: m === 'Singular' ? 'sg' : 'pl' });
      }
      // Adjektiv (Grammatik 11): „m.Sg.“, „f.Sg.“, „Pl.“ – „eine gemeinsame Pluralform“
      if (ws.length === 1 && /^(m|f)\.Sg\.$/.test(m)) dazu(ws[0], { fund: f, art: 'tabelle', geschlecht: m[0] as 'm' | 'f', zahl: 'sg' });
      if (ws.length === 1 && m === 'Pl.' && /gemeinsame Pluralform/.test(absatzVor(wb, st.seite, st.block))) {
        dazu(ws[0], { fund: f, art: 'tabelle', geschlecht: 'mf', zahl: 'pl' });
      }
      // Beispiele mit Geschlecht oder Zahl (Grammatik 8 und 11): „ḥḏo aṯto“ (f.), „tene basime“ (Pl.)
      if (ws.length > 1 && /^(m|f|Pl)\.$/.test(m)) {
        for (const w of ws) dazu(w, { fund: f, art: 'tabelle', ...(m === 'Pl.' ? { zahl: 'pl' as Zahl } : { geschlecht: m[0] as 'm' | 'f' }) });
      }
    }
  }

  const bedeutungVon = new Map(wb.funde.map((f) => [f, [...new Set(bedeutungen(f.deutsch))]]));
  const nachBedeutung = new Map<string, Schreibweise[]>();
  const nachForm = new Map<string, Schreibweise[]>();
  for (const s of alleSchreibweisen(wb)) {
    nachForm.set(s.genau, [...(nachForm.get(s.genau) ?? []), s]);
    if (s.fund.art !== 'wort') continue;
    for (const b of bedeutungVon.get(s.fund) ?? []) nachBedeutung.set(b, [...(nachBedeutung.get(b) ?? []), s]);
  }
  const index = { bedeutungVon, belege, nachBedeutung, nachForm };
  merkmalIndexe.set(wb, index);
  return index;
}

/** Der Absatz vor einem Block (für „… eine gemeinsame Pluralform.“ über der Tabelle der Adjektive). */
function absatzVor(wb: Woerterbuch, seiteId: string, block: number): string {
  const seite = wb.seiten.get(seiteId);
  const texte: string[] = [];
  for (let i = block - 1; i >= 0 && seite; i--) {
    const b = seite.bloecke[i];
    if (b?.art === 'titel') break;
    if (b?.art === 'absatz') texte.push(b.teile.map((t) => t.text).join(''));
  }
  return texte.join(' ');
}

/** Nur eindeutige Angaben zählen: Zeigt das Lehrbuch ein Wort einmal männlich, einmal weiblich, ist das Geschlecht offen. */
const eindeutig = <T,>(werte: (T | undefined)[]): T | undefined => {
  const da = [...new Set(werte.filter((w): w is T => w !== undefined))];
  return da.length === 1 ? da[0] : undefined;
};

/**
 * Die Merkmale einer Schreibweise mit der Bedeutung aus `fund`, so wie das Lehrbuch
 * sie zeigt. `ohne`: diesen Eintrag nicht als Beleg nehmen (Gegenprobe).
 */
export function merkmale(wb: Woerterbuch, s: Pick<Schreibweise, 'fund' | 'genau'>, ohne?: Fund): Merkmale {
  const alle = (merkmalIndex(wb).belege.get(s.genau) ?? []).filter((b) => b.fund !== ohne);
  // Verbformen: nur mit der Bedeutung eines Verbs („domax – schlafen“)
  const verb = s.fund.verb ? alle.filter((b) => b.art === 'verb' && b.fund.verb === s.fund.verb) : [];
  if (verb.length) {
    return { wortart: 'verb', formen: [...new Set(verb.map((b) => b.form!))].sort(), belege: verb };
  }
  const zahlen = alle.filter((b) => b.art === 'zahlen');
  if (zahlen.length) {
    const g = eindeutig(zahlen.map((b) => b.geschlecht));
    // Die Eins steht mit der Einzahl („ḥḏo aṯto – eine Frau“, Grammatik 8), die übrigen Zahlen mit der Mehrzahl.
    const zahl = eindeutig(zahlen.map((b): Zahl => (b.fund.deutsch.trim() === '1' ? 'sg' : 'pl')));
    return { wortart: 'zahl', ...(g ? { geschlecht: g } : {}), ...(zahl ? { zahl } : {}), belege: zahlen };
  }
  const nomen = alle.filter((b) => b.art !== 'verb');
  const wort = bedeutungen(s.fund.deutsch)[0] ?? '';
  const wortart: Wortart = grossGeschrieben(s.fund.deutsch, wort) ? 'nomen' : 'anderes';
  // Der Artikel zählt nur bei Substantiven: „dat tre“ (der Zweite) macht „tre“ nicht zur Mehrzahl.
  const zaehlt = nomen.filter((b) => b.art !== 'artikel' || wortart === 'nomen');
  const g = eindeutig(zaehlt.map((b) => b.geschlecht));
  const zahl = eindeutig(zaehlt.map((b) => b.zahl));
  return { wortart, ...(g ? { geschlecht: g } : {}), ...(zahl ? { zahl } : {}), belege: zaehlt };
}

const merkmalCache = new WeakMap<Woerterbuch, Map<Schreibweise, Merkmale>>();

/**
 * Wie `merkmale`, aber zwischengespeichert: Der ausgeblendete Eintrag zählt nur,
 * wenn er wirklich ein Beleg für dieses Wort ist (das spart in der Gegenprobe Zeit).
 */
export function merkmaleMitCache(wb: Woerterbuch, s: Schreibweise, ohne?: Fund): Merkmale {
  if (ohne && (merkmalIndex(wb).belege.get(s.genau) ?? []).some((b) => b.fund === ohne)) return merkmale(wb, s, ohne);
  let cache = merkmalCache.get(wb);
  if (!cache) merkmalCache.set(wb, (cache = new Map()));
  let m = cache.get(s);
  if (!m) cache.set(s, (m = merkmale(wb, s)));
  return m;
}

/** Sind die Merkmale vollständig genug, um ein Wort zu tauschen? */
export function vollstaendig(m: Merkmale): boolean {
  if (m.wortart === 'verb') return !!m.formen?.length;
  if (m.wortart === 'zahl') return (m.geschlecht === 'm' || m.geschlecht === 'f') && !!m.zahl;
  return !!m.geschlecht && !!m.zahl;
}

/** Gleichartig: gleiche Wortart, gleiche Zeit und Person, gleiches Geschlecht, gleiche Zahl. */
const schluesselVon = (m: Merkmale) =>
  m.wortart === 'verb' ? `verb|${m.formen!.join('+')}` : `${m.wortart}|${m.geschlecht ?? ''}|${m.zahl ?? ''}`;

/** „männlich, Einzahl“, „Präsens · er“ – für den Bauplan. */
export function merkmalText(m: Merkmale): string {
  if (m.wortart === 'verb') return (m.formen ?? []).map(formText).join(' / ');
  const g = m.geschlecht === 'm' ? 'männlich' : m.geschlecht === 'f' ? 'weiblich' : m.geschlecht === 'mf' ? 'männlich und weiblich gleich' : '';
  const z = m.zahl === 'sg' ? 'Einzahl' : m.zahl === 'pl' ? 'Mehrzahl' : '';
  if (m.wortart === 'zahl') return ['Zahl', g, m.zahl === 'sg' ? 'mit Einzahl' : m.zahl === 'pl' ? 'mit Mehrzahl' : ''].filter(Boolean).join(', ');
  return [g, z].filter(Boolean).join(', ');
}

// --- Satzbaupläne ------------------------------------------------------------------------

/** Ein Lehrbuch-Satz mit seinem Wort an der Lücke. */
export interface Vorlagenbeleg {
  fund: Fund;
  /** Das Wort an der Lücke, genau, und der Eintrag, der seine Bedeutung gibt. */
  wort: Schreibweise;
  /** Wo das Wort im Surayt-Satz steht (Index unter den Wörtern). */
  stelle: number;
  /** Seine deutsche Bedeutung, so wie sie im Satz steht („wein“). */
  deutsch: string;
}

/** Ein Satzbau, den das Lehrbuch mindestens zweimal mit verschiedenen Wörtern zeigt. */
export interface Satzbau {
  /** Surayt mit „_“ an der Lücke, z. B. „koso d _“ */
  sur: string;
  /** Deutsch ohne Artikel, mit „_“ an der Lücke, z. B. „glas _“ */
  de: string;
  vor: string[];
  /** Der deutsche Artikel direkt vor der Lücke (oder leer). */
  artikel: string;
  nach: string[];
  belege: Vorlagenbeleg[];
}

/** Ab so vielen verschiedenen Wörtern an der Lücke taugt ein Satzbau als Vorlage. */
export const MINDESTENS_BELEGE = 2;
/** Längere deutsche Lücken gibt es nicht („Frau des Onkels“ ist schon lang). */
const LUECKE_HOECHSTENS = 3;

/** Alle Satzbaupläne aus den Daten – auch die, die die Gegenprobe nicht bestehen. */
export function satzbauplaene(wb: Woerterbuch): Satzbau[] {
  const da = plaene.get(wb);
  if (da) return da;
  const { nachForm, bedeutungVon } = merkmalIndex(wb);
  const gruppen = new Map<string, Satzbau>();
  for (const f of wb.funde) {
    // Aufzählungen („goraš, guršo – grëšle“) und Platzhalter („cal+Suffix“) sind keine Sätze.
    if (/[;:+…~/]/.test(f.latein) || (f.art === 'wort' && f.latein.includes(','))) continue;
    const sur = surWoerter(f.latein);
    if (sur.length < 2) continue;
    const de = deWoerter(f.deutsch);
    sur.forEach((w, i) => {
      for (const s of nachForm.get(w) ?? []) {
        if (s.fund === f || s.fund.art !== 'wort') continue;
        for (const b of bedeutungVon.get(s.fund) ?? []) {
          const bw = b.split(' ');
          if (bw.length > LUECKE_HOECHSTENS) continue;
          const stellen: number[] = [];
          for (let j = 0; j + bw.length <= de.length; j++) if (bw.every((x, k) => de[j + k].wort === x)) stellen.push(j);
          if (stellen.length !== 1) continue;
          const j = stellen[0];
          const vor = de.slice(0, j).map((x) => x.wort);
          const nach = de.slice(j + bw.length).map((x) => x.wort);
          // Besteht das Deutsche nur aus dem getauschten Wort („yawme d ḥušabo – Sonntag“), zeigt es den Satzbau nicht.
          if (!vor.length && !nach.length) continue;
          const artikel = de[j].artikel;
          const plan = {
            sur: [...sur.slice(0, i), '_', ...sur.slice(i + 1)].join(' '),
            de: [...vor, ...(artikel ? [artikel] : []), '_', ...nach].join(' '),
          };
          const k = `${plan.sur}||${plan.de}`;
          const g = gruppen.get(k) ?? { ...plan, vor, artikel, nach, belege: [] };
          gruppen.set(k, g);
          if (!g.belege.some((x) => x.fund === f && x.wort.fund === s.fund)) g.belege.push({ fund: f, wort: s, stelle: i, deutsch: b });
        }
      }
    });
  }
  const liste = [...gruppen.values()].filter((g) => new Set(g.belege.map((b) => b.wort.genau)).size >= MINDESTENS_BELEGE);
  plaene.set(wb, liste);
  return liste;
}

const plaene = new WeakMap<Woerterbuch, Satzbau[]>();

// --- Zusammensetzen ----------------------------------------------------------------------

/** Ein Wort im Bauplan: die Schreibweise, ihr Eintrag und was das Lehrbuch über sie sagt. */
export interface Baustein {
  wort: Schreibweise;
  merkmale: Merkmale;
}

/** Ein zusammengesetzter Satz – nie in den Daten, immer „Zusammengesetzt – nicht geprüft“. */
export interface Zusammengesetzt {
  stufe: 'zusammengesetzt';
  latein: string;
  deutsch: string;
  satzbau: Satzbau;
  /** „Gleich gebaut wie“: der Lehrbuch-Satz, in dem getauscht wurde. */
  vorlage: Vorlagenbeleg;
  /** Was getauscht wurde: das Wort der Vorlage und das neue. */
  alt: Baustein;
  neu: Baustein;
}

export interface Optionen {
  /** Diesen Eintrag nicht kennen (Gegenprobe): nicht als Vorlage, nicht als Beleg, nicht als Wort. */
  ohne?: Fund;
  /** Nur diese Satzbaupläne (sonst die, die die Gegenprobe bestanden haben). */
  plaene?: readonly Satzbau[];
}

/** Höchstens so viele Fassungen zeigt der Übersetzer (z. B. bei zwei Wörtern für „Problem“). */
export const FASSUNGEN = 3;

/** Wo in der Eingabe die Lücke eines Satzbaus steht, und was dort steht. */
function lueckeIn(eingabe: readonly DeWort[], plan: Satzbau): string | undefined {
  const n = eingabe.length - plan.vor.length - plan.nach.length;
  if (n < 1 || n > LUECKE_HOECHSTENS) return undefined;
  const passt = (a: readonly DeWort[], b: readonly string[]) => a.every((x, k) => x.wort === b[k]);
  if (!passt(eingabe.slice(0, plan.vor.length), plan.vor) || !passt(eingabe.slice(eingabe.length - plan.nach.length), plan.nach)) return undefined;
  const luecke = eingabe.slice(plan.vor.length, plan.vor.length + n);
  if (luecke[0].artikel !== plan.artikel || luecke.slice(1).some((x) => x.artikel)) return undefined;
  return nurWoerter(luecke);
}

/** Das Wort in den Satz setzen: Satzzeichen bleiben, am Satzanfang groß. */
function einsetzen(vorlage: Fund, stelle: number, neu: string): string {
  let i = -1;
  return woerter(vorlage.latein)
    .map((w) => {
      const z = zerlege(w);
      if (!z.kern) return w;
      i++;
      if (i !== stelle) return w;
      const gross = /^\p{Lu}/u.test(z.kern) && !/^\p{Lu}/u.test(neu);
      const wort = gross ? neu[0].toUpperCase() + neu.slice(1) : neu;
      return `${z.vor}${wort}${z.nach}`;
    })
    .join(' ');
}

/** Sonderzeichen für einen regulären Ausdruck entschärfen. */
const entschaerfe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Die Wörter `teile` hintereinander, mit beliebigen Satzzeichen dazwischen. */
const folge = (teile: readonly string[]) => new RegExp(`(?<![\\p{L}\\p{N}])${teile.map(entschaerfe).join('[^\\p{L}\\p{N}]+')}(?![\\p{L}\\p{N}])`, 'iu');

/** Der deutsche Satz der Vorlage mit dem neuen Wort, so wie es getippt wurde: „ein Glas Bier“ → „ein Glas Milch“. */
function deutschMit(vorlage: Vorlagenbeleg, luecke: string, anfrage: string): string {
  const getippt = folge(luecke.split(' ')).exec(anfrage)?.[0] ?? luecke;
  const ohneKlammern = vorlage.fund.deutsch.replace(/\s*\([^)]*\)/g, '');
  const alt = folge(vorlage.deutsch.split(' '));
  return alt.test(ohneKlammern) ? ohneKlammern.replace(alt, getippt) : anfrage;
}

/**
 * Die Wörter mit dieser deutschen Bedeutung. Zahlen stehen im Wortschatz als Wort
 * („šawco – sieben“), in der Zahlentabelle als Ziffer („šawco, šwac – 7“): Teilen
 * sich „sieben“ und „7“ ein Wort, gehören auch die übrigen Formen der Ziffer dazu.
 */
export function kandidaten(wb: Woerterbuch, luecke: string): Schreibweise[] {
  const { nachBedeutung, belege } = merkmalIndex(wb);
  const direkt = nachBedeutung.get(luecke) ?? [];
  const ziffern = new Set(direkt.flatMap((s) => (belege.get(s.genau) ?? []).filter((b) => b.art === 'zahlen').map((b) => b.fund.deutsch.trim())));
  ziffern.delete(luecke);
  return [...new Set([...direkt, ...[...ziffern].flatMap((z) => nachBedeutung.get(z) ?? [])])];
}

/** Die Satzbaupläne, die die Gegenprobe bestanden haben. */
export function eingeschaltet(wb: Woerterbuch): Satzbau[] {
  const da = an.get(wb);
  if (da) return da;
  const probe = gegenprobe(wb);
  const liste = satzbauplaene(wb).filter((p) => probe.plaene.get(p)?.an);
  an.set(wb, liste);
  return liste;
}

const an = new WeakMap<Woerterbuch, Satzbau[]>();

/**
 * Setzt einen deutschen Satz nach einem Satzbau aus dem Lehrbuch zusammen, indem
 * ein Wort getauscht wird. Gibt nichts zurück, wenn kein Satzbau genau passt oder
 * ein Merkmal fehlt – lieber nichts als Unsinn.
 */
export function tausche(wb: Woerterbuch, anfrage: string, opt: Optionen = {}): Zusammengesetzt[] {
  const plaeneHier = opt.plaene ?? eingeschaltet(wb);
  const eingabe = deWoerter(anfrage);
  if (eingabe.length < 2) return [];
  const aus: (Zusammengesetzt & { rang: number })[] = [];

  for (const plan of plaeneHier) {
    const luecke = lueckeIn(eingabe, plan);
    if (!luecke) continue;
    const belege = plan.belege.filter((b) => b.fund !== opt.ohne);
    // Dasselbe Wort wie in einer Vorlage – das ist der Lehrbuch-Satz selbst, nichts zu tauschen.
    if (!belege.length || belege.some((b) => b.deutsch === luecke)) continue;
    for (const kandidat of kandidaten(wb, luecke)) {
      if (kandidat.fund === opt.ohne) continue;
      const neu = merkmale(wb, kandidat, opt.ohne);
      if (!vollstaendig(neu)) continue;
      // Gleich gebaut wie: ein Beleg mit einem gleichartigen Wort an der Lücke
      const passend = belege
        .map((b) => ({ b, m: merkmale(wb, b.wort, opt.ohne) }))
        .filter(({ m }) => vollstaendig(m) && schluesselVon(m) === schluesselVon(neu))
        .sort((x, y) => Number(!!y.b.fund.audio) - Number(!!x.b.fund.audio) || x.b.fund.latein.length - y.b.fund.latein.length);
      const vorlage = passend[0];
      if (!vorlage) continue;
      const latein = einsetzen(vorlage.b.fund, vorlage.b.stelle, kandidat.genau);
      // Kommt dabei ein Lehrbuch-Satz heraus („2 Männer“ → tre gawre), ist nichts zusammengesetzt.
      if (belege.some((b) => gleicherText(b.fund.latein, latein))) continue;
      aus.push({
        stufe: 'zusammengesetzt',
        latein,
        deutsch: deutschMit(vorlage.b, luecke, anfrage.trim()),
        satzbau: plan,
        vorlage: vorlage.b,
        alt: { wort: vorlage.b.wort, merkmale: vorlage.m },
        neu: { wort: kandidat, merkmale: neu },
        // Stichwörter mit Aufnahme zuerst, dann Satzbaupläne mit mehr Belegen
        rang: Number(kandidat.ganz) * 2 + Number(!!kandidat.fund.audio) + plan.belege.length / 100,
      });
    }
  }
  const gesehen = new Set<string>();
  return aus
    .sort((a, b) => b.rang - a.rang)
    .filter((z) => {
      const k = surWoerter(z.latein).join(' ');
      if (gesehen.has(k)) return false;
      gesehen.add(k);
      return true;
    })
    .slice(0, FASSUNGEN)
    .map(({ rang: _, ...z }) => z);
}

// --- Gegenprobe ------------------------------------------------------------------------------

export type Ergebnis = 'getroffen' | 'daneben';

export interface Probe {
  fund: Fund;
  /** Was der Baukasten ohne diesen Eintrag gebaut hat */
  gebaut: Zusammengesetzt[];
  ergebnis: Ergebnis;
}

export interface Gegenprobe {
  /** Jeder deutsche Satz des Lehrbuchs, für den der Baukasten etwas gebaut hat */
  proben: Probe[];
  /** Pro Satzbau: getroffene Belege, Fehlgriffe, eingeschaltet? */
  plaene: Map<Satzbau, { belegeGetroffen: number; getroffen: number; daneben: number; an: boolean }>;
}

const proben = new WeakMap<Woerterbuch, Gegenprobe>();

/** Die Surayt-Fassungen eines Eintrags („gëd goraš / goraš“ sind zwei). */
const fassungen = (latein: string) => [latein, ...latein.split(/\s*[,;/~]\s*/)].filter((t) => surWoerter(t).length);

/**
 * Die Gegenprobe: Jeder deutsche Satz des Lehrbuchs wird mit allen Satzbauplänen
 * zusammengesetzt, ohne dass der Baukasten den Satz kennt, und mit dem echten
 * Surayt verglichen.
 */
export function gegenprobe(wb: Woerterbuch): Gegenprobe {
  const da = proben.get(wb);
  if (da) return da;
  const alle = satzbauplaene(wb);
  const plaene = new Map(alle.map((p) => [p, { belegeGetroffen: 0, getroffen: 0, daneben: 0, an: false }]));
  const liste: Probe[] = [];
  for (const f of wb.funde) {
    // Nur Satzbaupläne, deren deutsche Wörter alle vorkommen – das spart auf dem Handy Zeit.
    const da = new Set(deWoerter(f.deutsch).map((x) => x.wort));
    const passend = alle.filter((p) => p.vor.every((w) => da.has(w)) && p.nach.every((w) => da.has(w)));
    if (!passend.length) continue;
    const deutsche = f.art === 'wort' ? [f.deutsch, ...f.deutsch.split(/[,;]/)] : [f.deutsch];
    const gebaut: Zusammengesetzt[] = [];
    for (const d of new Set(deutsche.map((x) => x.trim()).filter(Boolean))) {
      for (const z of tausche(wb, d, { ohne: f, plaene: passend })) if (!gebaut.some((g) => gleicherText(g.latein, z.latein))) gebaut.push(z);
    }
    if (!gebaut.length) continue;
    const echt = fassungen(f.latein);
    const richtig = (z: Zusammengesetzt) => echt.some((e) => gleicherText(e, z.latein));
    // Pro Satzbau: lag er hier richtig oder daneben?
    for (const plan of new Set(gebaut.map((z) => z.satzbau))) {
      const eigene = gebaut.filter((z) => z.satzbau === plan);
      const s = plaene.get(plan)!;
      if (eigene.some(richtig)) {
        s.getroffen++;
        if (plan.belege.some((b) => b.fund === f)) s.belegeGetroffen++;
      } else s.daneben++;
    }
    liste.push({ fund: f, gebaut, ergebnis: gebaut.some(richtig) ? 'getroffen' : 'daneben' });
  }
  for (const s of plaene.values()) s.an = s.belegeGetroffen >= 1 && s.daneben === 0;
  const ergebnis = { proben: liste, plaene };
  proben.set(wb, ergebnis);
  return ergebnis;
}

// --- Gibt es schon etwas Geprüftes? ------------------------------------------------------------

const geprueft = new WeakMap<Woerterbuch, Set<string>>();

/**
 * Steht die Eingabe als Bedeutung eines Eintrags in den Daten (Artikel egal)? Dann
 * wird nichts zusammengesetzt – Geprüftes geht vor.
 */
export function stehtSchonDa(wb: Woerterbuch, anfrage: string): boolean {
  let set = geprueft.get(wb);
  if (!set) {
    set = new Set<string>();
    for (const f of wb.funde) {
      set.add(nurWoerter(deWoerter(f.deutsch)));
      for (const b of bedeutungen(f.deutsch)) set.add(b);
    }
    geprueft.set(wb, set);
  }
  return set.has(nurWoerter(deWoerter(anfrage)));
}

/** Für den Übersetzer: zusammensetzen, aber nur, wenn nichts Geprüftes passt. */
export function setzeZusammen(wb: Woerterbuch, anfrage: string): Zusammengesetzt[] {
  if (stehtSchonDa(wb, anfrage)) return [];
  return tausche(wb, anfrage);
}
