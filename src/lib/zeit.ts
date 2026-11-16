// Kalendertage in der Ortszeit des Geräts. Tagesserie, Tagesziel und
// Karteikasten rechnen in ganzen Tagen: Wer abends um elf und morgens um acht
// übt, hat an zwei Tagen geübt.

const TAG_MS = 86_400_000;

/** Laufende Nummer des Kalendertags, an dem `ms` liegt (Ortszeit). */
export function tagNummer(ms: number): number {
  const d = new Date(ms);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / TAG_MS);
}

/** „2026-11-16“ – Schlüssel eines Tages, z. B. für die XP pro Tag. */
export function tagSchluessel(nummer: number): string {
  return new Date(nummer * TAG_MS).toISOString().slice(0, 10);
}

export function tagAusSchluessel(schluessel: string): number {
  return Math.round(Date.parse(schluessel + 'T00:00:00Z') / TAG_MS);
}

/** Wochentag eines Tages: 0 = Montag … 6 = Sonntag. */
export function wochentag(nummer: number): number {
  return (new Date(nummer * TAG_MS).getUTCDay() + 6) % 7;
}

/** Kalenderwoche nach ISO 8601, z. B. „2026-W47“. Wechselt montags. */
export function wochenSchluessel(nummer: number): string {
  // Der Donnerstag derselben Woche entscheidet über das Jahr.
  const donnerstag = nummer - wochentag(nummer) + 3;
  const jahr = new Date(donnerstag * TAG_MS).getUTCFullYear();
  const ersterDonnerstag = (() => {
    const neujahr = Math.round(Date.UTC(jahr, 0, 1) / TAG_MS);
    return neujahr + ((3 - wochentag(neujahr) + 7) % 7);
  })();
  const woche = 1 + Math.round((donnerstag - ersterDonnerstag) / 7);
  return `${jahr}-W${String(woche).padStart(2, '0')}`;
}

/** Gilt ein Tag als Übungstag? `tage` hält die XP pro Tag („2026-11-16“ → 25). */
const aktiv = (tage: Readonly<Record<string, number>>, nummer: number) => (tage[tagSchluessel(nummer)] ?? 0) > 0;

/**
 * Tagesserie: wie viele Tage hintereinander geübt wurde. Wer heute noch nicht
 * geübt hat, verliert die Serie nicht gleich – sie zählt bis gestern und
 * `heuteDabei` ist `false`.
 */
export function serie(tage: Readonly<Record<string, number>>, heute: number): { laenge: number; heuteDabei: boolean } {
  const heuteDabei = aktiv(tage, heute);
  let laenge = 0;
  for (let t = heuteDabei ? heute : heute - 1; aktiv(tage, t); t--) laenge++;
  return { laenge, heuteDabei };
}

/** Die längste Serie, die es je gab. */
export function laengsteSerie(tage: Readonly<Record<string, number>>): number {
  const nummern = Object.keys(tage)
    .filter((k) => tage[k] > 0)
    .map(tagAusSchluessel)
    .sort((a, b) => a - b);
  let beste = 0;
  let lauf = 0;
  nummern.forEach((n, i) => {
    lauf = i > 0 && n === nummern[i - 1] + 1 ? lauf + 1 : 1;
    beste = Math.max(beste, lauf);
  });
  return beste;
}
