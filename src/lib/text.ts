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
