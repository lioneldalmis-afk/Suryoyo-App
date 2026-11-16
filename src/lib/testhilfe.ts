// Hilfen für die Tests (gehört nicht zur App).

/** Zufall mit festem Startwert, damit die Tests immer gleich laufen. */
export function zufall(start: number) {
  let a = start;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lernstand „einmal richtig geübt“ für die angegebenen Einträge. */
export const geuebtAm = (ids: readonly string[], zuletzt: number, stufe = 1) =>
  Object.fromEntries(ids.map((id) => [id, { stufe, richtig: 1, falsch: 0, zuletzt }]));
