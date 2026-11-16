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
