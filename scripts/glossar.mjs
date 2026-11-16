// Glossar A (Kunoš mele): alle Wörter von Level A mit Verweis auf die Lektion.
// Grundlage für den Übersetzer (Fahrplan, Phase 4). Das Glossar hat keine
// Aufnahmen; die lassen sich über `lektionen` aus dem Wortschatz zuordnen.
//
// Eine Zeile kann mehrere Wendungen bündeln, getrennt durch „ - “:
//   „abro, Pl. abne (L.4) - abne d cammo (L.4)“ ║ „Sohn - Cousins, …“
// `voll` enthält die Zeile wörtlich. `teile` zerlegt sie nur, wenn Umschrift,
// Deutsch und syrische Schrift gleich viele Teile haben – sonst ist die ganze
// Zeile ein Teil.

import { slug } from './slug.mjs';
import { clean, datei, load, quelle, schreibe, SYRISCH } from './lehrbuch.mjs';

const KAPITEL = '1.19';
// „(L.4)“, „(L.11.6)“, „(L.8,2)“ (Lektion, Abschnitt), „(L16)“, „(G.3b)“ (Grammatik)
const VERWEIS = /\s*\((?:L|G)\.?\s*\d[^)]*\)/g;
const TRENNER = ' - ';

/** „(L.6, L.12)“ → [6, 12], „(L.11.6)“ → [11]; Grammatik-Verweise („G.3b“) zählen nicht. */
const lektionenIn = (text) =>
  [...new Set([...(text.match(VERWEIS) ?? [])].flatMap((v) => [...v.matchAll(/L\.?\s*(\d+)/g)].map((m) => Number(m[1]))))];

export async function extrahiereGlossar() {
  const { $ } = await load(KAPITEL);
  const zeilen = $('main#articles section table tr')
    .toArray()
    .map((tr) => $(tr).find('td').toArray().map((td) => clean($(td).text())))
    .filter((z) => z.length === 3 && SYRISCH.test(z[2]));

  const vergeben = new Set();
  const eintraege = zeilen.map(([latein, deutsch, syrisch]) => {
    const lat = latein.split(TRENNER);
    const de = deutsch.split(TRENNER);
    const syr = syrisch.split(TRENNER);
    const zerlegbar = lat.length > 1 && lat.length === de.length && lat.length === syr.length;
    const teile = (zerlegbar ? lat : [latein]).map((l, i) => ({
      latein: l.replace(VERWEIS, '').trim(),
      deutsch: zerlegbar ? de[i] : deutsch,
      syrisch: zerlegbar ? syr[i] : syrisch,
      lektionen: lektionenIn(l),
    }));
    let id = `G-${slug(teile[0].latein)}`;
    for (let n = 2; vergeben.has(id); n++) id = `G-${slug(teile[0].latein)}-${n}`;
    vergeben.add(id);
    return { id, voll: { latein, deutsch, syrisch }, lektionen: lektionenIn(latein), teile };
  });

  await schreibe(datei('glossar-a.json'), { quelle: quelle(KAPITEL), eintraege });
  const zerlegt = eintraege.filter((e) => e.teile.length > 1).length;
  const ohneDeutsch = eintraege.filter((e) => !e.voll.deutsch).length;
  console.log(
    `Glossar A: ${eintraege.length} Einträge, davon ${zerlegt} in Teilwendungen zerlegt, ` +
      `${eintraege.reduce((n, e) => n + e.teile.length, 0)} Wendungen insgesamt, ${ohneDeutsch} ohne deutsche Bedeutung`,
  );
}
