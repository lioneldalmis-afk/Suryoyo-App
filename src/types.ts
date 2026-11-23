export type Art = 'wort' | 'satz';
export type Quelle = 'lehrbuch' | 'community';

/** Ein Wort oder Satz – das einheitliche Format für alle Inhalte der App. */
export interface Eintrag {
  id: string;
  /** Surayt in lateinischer Umschrift, wie im Lehrbuch. */
  latein: string;
  /** Surayt in syrischer Schrift (wird später per Schalter eingeblendet). */
  syrisch: string;
  deutsch: string;
  audio?: string;
  /** Zweite Aufnahme desselben Eintrags (im Lehrbuch bei der syrischen Schrift verlinkt). */
  audio2?: string;
  /** Zusatz hinter dem Wort, z. B. „(m.)“. */
  hinweis?: string;
  /** Nur bei Dialogzeilen. */
  sprecher?: string;
  /** Hervorgehobener Teil der Umschrift (Start, Ende), z. B. der Laut, um den es in einem Beispiel geht. */
  hervor?: [number, number];
  lektion: number;
  art: Art;
  quelle: Quelle;
  tags: string[];
}

export interface Ueberschrift {
  latein: string;
  syrisch: string;
  deutsch: string;
  audio?: string;
}

export interface Lektion {
  nr: number;
  titel: Ueberschrift;
  /** Eigene Überschrift des Dialogs oder Lesetextes, z. B. „Malfono Aday – Der Lehrer Aday“. */
  textTitel?: Ueberschrift;
  quelle: { name: string; url: string; abgerufen: string };
  einleitung: Eintrag[];
  /** Dialog oder Lesetext der Lektion. In Dialogen hat jede Zeile einen `sprecher`. */
  text: Eintrag[];
  wortschatz: Eintrag[];
  /** Nur Lektion 1 und 2: Alphabet und Aussprache statt eines Textes. */
  aussprache?: Aussprache;
}

/** Ein Buchstabe oder Laut mit Erklärung und Beispielwörtern. */
export interface Laut {
  id: string;
  /** Der Buchstabe in Umschrift („ḥ“, „A a“) bzw. bei syrischen Buchstaben der Lautwert („b“). */
  zeichen: string;
  /** Der Buchstabe in syrischer Schrift. */
  syrisch: string;
  /** Name des syrischen Buchstabens („Olaf“), mit Aufnahme in `audio`. */
  name?: string;
  audio?: string;
  /** Erklärung der Aussprache, wörtlich aus dem Lehrbuch. */
  beschreibung?: string;
  beispiele: Eintrag[];
}

/** Zwei Wörter, die sich nur in einem Laut unterscheiden, z. B. „talyo – ṭalyo“. */
export interface Hoerpaar {
  id: string;
  /** Die beiden Laute, z. B. „t - ṭ“. */
  laute: string;
  woerter: [Eintrag, Eintrag];
}

/**
 * Inhalte der Lektionen 1 und 2. Die Absätze in `texte` stehen wörtlich im
 * Lehrbuch; die Überschriften der Abschnitte gehören zur Oberfläche.
 */
export interface Aussprache {
  texte: { alphabet?: string[]; konsonanten?: string[]; vokale?: string[]; betonung?: string[] };
  /** Die Buchstaben der Umschrift: „Aa“, „Ää“, „Bb“ … */
  alphabet?: string[];
  /** Die syrischen Buchstaben mit Namen. */
  schrift?: Laut[];
  /** Buchstaben, die für Surayt neu eingeführt wurden (č, j, ž). */
  neueBuchstaben?: Laut[];
  konsonanten?: Laut[];
  vokale?: Laut[];
  hoerpaare?: Hoerpaar[];
}

/** Eintrag im Lernpfad (auch für Lektionen, deren Inhalte noch fehlen). */
export interface KursLektion {
  nr: number;
  latein: string;
  deutsch: string;
  syrisch: string;
}

/** Eine Wendung aus dem Glossar A (Kunoš mele), wörtlich aus dem Lehrbuch. */
export interface GlossarTeil {
  latein: string;
  deutsch: string;
  syrisch: string;
  /** Lektionen, auf die das Glossar verweist (kann leer sein). */
  lektionen: number[];
}

/** Eine Zeile des Glossars; sie kann mehrere Wendungen bündeln (`teile`). */
export interface GlossarEintrag {
  id: string;
  /** Die ganze Zeile, wie sie im Lehrbuch steht. */
  voll: { latein: string; deutsch: string; syrisch: string };
  lektionen: number[];
  teile: GlossarTeil[];
}

export interface Glossar {
  quelle: { name: string; url: string; abgerufen: string };
  eintraege: GlossarEintrag[];
}

// --- Großes Glossar, Teil 5 des Lehrbuchs (Fahrplan, Phase 4b, Schritt 7) ---------------

/** Ein Beispiel aus dem großen Glossar, wörtlich, mit Fundstelle („L.19“, „Q.4,43“, „G.20“). */
export interface GlossarBeispiel {
  latein: string;
  syrisch: string;
  deutsch: string;
  verweis?: string;
}

/** Eine Bedeutung (⑴, ⑵ …) mit ihren Beispielen. */
export interface GlossarSinn {
  deutsch: string;
  beispiele: GlossarBeispiel[];
}

/**
 * Ein Eintrag aus „Surayt > Deutsch“ (Teil 5.1), wörtlich: der Kopf mit seinen Zusätzen
 * („rabo (m.), f. rabṯo, pl. rabe“, „goraš, guršo - grëšle, grëšla [grš I]“).
 */
export interface GrossEintrag {
  id: string;
  latein: string;
  /** Gleich geschriebene Stichwörter sind im Glossar nummeriert („kët¹“, „kët²“). */
  nr?: number;
  syrisch: string;
  /** Fundstellen im Kopf: „L.4“, „G.9a“, „Q.9,2“ */
  verweise?: string[];
  sinne: GlossarSinn[];
  /** Querverweise: „→ hiw, mitahwe“, „= kito“ */
  siehe?: string;
  /** Untereinträge (eingerückt) gehören zu diesem Haupteintrag. */
  unter?: string;
}

/** Eine Zeile der Wortliste „Deutsch > Surayt“ (Teil 5.2). */
export interface WortlistenZeile {
  deutsch: string;
  latein: string[];
  voll: string;
}

export interface GrossesGlossar {
  quelle: { name: string; url: string; abgerufen: string };
  eintraege: GrossEintrag[];
  wortliste: WortlistenZeile[];
}

// --- Grammatik, Verb- und Formentabellen (Fahrplan, Phase 4b, Schritt 2) ---------------

/** Ein Teil einer Tabellenzelle: Text mit eigener Aufnahme (oder eine Zeile ohne). */
export interface GrammatikTeil {
  text: string;
  audio?: string;
  /** Kursiv gesetzt (Umschrift). */
  sur?: true;
  /** Fett hervorgehobene Stellen (Anfang, Ende), z. B. die Endung, um die es geht. */
  fett?: [number, number][];
  /** Beginnt eine neue Zeile in der Zelle. */
  neueZeile?: true;
}

export interface GrammatikZelle {
  teile: GrammatikTeil[];
  /** Kopfzelle (th) */
  kopf?: true;
  /** colspan / rowspan */
  breit?: number;
  hoch?: number;
}

/** Ein Stück Fließtext: kursiv (Umschrift), syrische Schrift oder fett. */
export interface GrammatikStueck {
  text: string;
  sur?: true;
  syr?: true;
  fett?: true;
}

export type GrammatikBlock =
  /** Überschrift; `ebene` 0 („A: …“) bis 3 („1. …“). */
  | { art: 'titel'; text: string; ebene: number }
  | { art: 'absatz'; teile: GrammatikStueck[] }
  | { art: 'tabelle'; zeilen: GrammatikZelle[][] };

/** Eine Form oder ein Beispiel aus einer Grammatik- oder Formentabelle, wörtlich aus dem Lehrbuch. */
export interface GrammatikEintrag {
  id: string;
  latein: string;
  syrisch: string;
  deutsch: string;
  audio?: string;
  audio2?: string;
  /** Zusatz in der Zelle, z. B. „(f.)“. */
  hinweis?: string;
  /** Beschriftung aus der Tabelle, z. B. „Präsens, Sg., 1. f.“ oder „Plural“. */
  merkmal?: string;
  /** Bei Verbformen: das Verb, wie es das Lehrbuch vorstellt („goraš – grëšle“). */
  verb?: string;
  fett?: [number, number][];
  /** Lektion der Grammatik-Seite (fehlt bei Verb- und Formentabellen). */
  lektion?: number;
  art: Art;
  quelle: Quelle;
  /** Index des Blocks (Tabelle oder Absatz) auf der Seite, in dem der Eintrag steht. */
  block: number;
  tags: string[];
}

export interface GrammatikSeite {
  /** Kapitelnummer im Lehrbuch, z. B. „1.4.3“, „1.17“, „4.2“. */
  id: string;
  titel: string;
  /** Grammatik einer Lektion, Verbkonjugation (Surcofo) oder Formentabelle (Teil 4). */
  art: 'grammatik' | 'verben' | 'formen';
  lektion?: number;
  url: string;
  bloecke: GrammatikBlock[];
  eintraege: GrammatikEintrag[];
}

export interface Grammatik {
  quelle: { name: string; url: string; abgerufen: string };
  seiten: GrammatikSeite[];
}
