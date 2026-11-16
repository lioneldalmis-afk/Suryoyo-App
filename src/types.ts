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
}

/** Eintrag im Lernpfad (auch für Lektionen, deren Inhalte noch fehlen). */
export interface KursLektion {
  nr: number;
  latein: string;
  deutsch: string;
  syrisch: string;
}
