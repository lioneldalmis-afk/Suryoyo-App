/** „Šlomo“ → „slomo“: ohne diakritische Zeichen, klein. Grundlage für Vergleiche (und später die Suche). */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Die einzelnen Wörter eines Surayt-Textes, gefaltet und ohne Satzzeichen. */
export function tokens(text: string): string[] {
  return fold(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Deutsche Bedeutung ohne Klammerzusätze und Satzzeichen: „gut (m.Sg.)“ → „gut“. */
export function kern(deutsch: string): string {
  return deutsch
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[!?.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Stichwort und Zusatz so zusammensetzen, wie sie im Lehrbuch stehen:
 * „bayto“ + „(m.)“ → „bayto (m.)“, aber „cammo“ + „, pl. cammone“ → „cammo, pl. cammone“.
 */
export const vorHinweis = (hinweis: string) => (/^[,;:]/.test(hinweis) ? '' : ' ');

/** „Ḥḥ“, „Ë ë“ oder „ḥ“ → „ḥ“: der Kleinbuchstabe, unter dem ein Laut nachgeschlagen wird. */
export const lautSchluessel = (zeichen: string) => ([...zeichen.normalize('NFC').trim()].at(-1) ?? '').toLowerCase();

/** Die Wörter eines Satzes, wie sie dastehen – mit Satzzeichen: „Šlomo, ono …“ → [„Šlomo,“, „ono“, …]. */
export const woerter = (satz: string) => satz.split(/\s+/).filter(Boolean);

/** „Šlomo,“ → Satzzeichen davor, das Wort selbst, Satzzeichen dahinter. */
export function zerlege(wort: string): { vor: string; kern: string; nach: string } {
  const [, vor = '', kern = '', nach = ''] = /^([^\p{L}\p{N}\p{M}]*)(.*?)([^\p{L}\p{N}\p{M}]*)$/u.exec(wort) ?? [];
  return { vor, kern, nach };
}

/** Wortbausteine eines Satzes ohne Satzzeichen: „Šlomo, ono ëšmi Afrem yo.“ → [„Šlomo“, „ono“, „ëšmi“, „Afrem“, „yo“]. */
export const bausteineAus = (satz: string) => woerter(satz).map((w) => zerlege(w).kern).filter(Boolean);

/** Gleiches Wort? Groß- und Kleinschreibung zählt nicht, Sonderzeichen schon („talyo“ ≠ „ṭalyo“). */
export const gleichesWort = (a: string, b: string) => a.normalize('NFC').toLowerCase() === b.normalize('NFC').toLowerCase();
