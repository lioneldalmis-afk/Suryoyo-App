// Das große Glossar „Kunoš mele“ (Teil 5 des Lehrbuchs, Level A und B samt Lesestücken)
// → src/data/glossar.json (Fahrplan, Phase 4b, Schritt 7).
//
// Teil 5.1 „Surayt > Deutsch“ steht als Absatz pro Eintrag auf der Website, Untereinträge
// eingerückt. So sieht ein Eintrag aus (Vorwort des Glossars, Kapitel 5.0):
//
//   rabo (m.), f. rabṯo, pl. rabe „groß“
//   goraš, guršo – grëšle, grëšla „ziehen“ [grš I]
//   obac, ëbco - abëc, abico [ʾbc I] (L.4) ⑴ wollen, mögen | Beispiel (L.19); … ⑵ verlangen
//
// Übernommen wird wörtlich: der Kopf (Umschrift samt Zusätzen wie „(m.)“, „f. …“, „pl. …“,
// „[ʾbc I]“), die syrische Schrift, jede Bedeutung (⑴, ⑵ …) mit ihren Beispielen (Umschrift,
// Schrift, Deutsch, Fundstelle wie „L.19“ oder „Q.4,43“) und die Verweise („→ …“, „= kito“).
// Fundstellen im Kopf („(L.4)“) stehen in `verweise`.
//
// Teil 5.2 „Deutsch > Surayt“ ist eine Wortliste: deutsches Stichwort und die Grundformen auf
// Surayt (nur Umschrift). Sie steht in `wortliste`.

import { slug } from './slug.mjs';
import { clean, datei, glatt, load, quelle, SYRISCH } from './lehrbuch.mjs';

const DATEI = 'glossar.json';
const TEIL_SUR = '5.1';
const TEIL_DE = '5.2';

/** „(L.4)“, „(L. 20)“, „(L.10.4)“, „(Q.4,43)“, „(G.9a)“ – Fundstellen, keine Zusätze wie „(+ L.Suf.)“. */
const STELLE = String.raw`(?:L\.?\s?\d+(?:[.,]\d+)*|Q\.?\s?\d+(?:,\s?\d+)*|G\.?\s?\d+[a-z]?(?:[.,]\d+(?:-\d+)?)*)`;
/** Auch mehrere in einer Klammer: „(L4; L.10)“. */
const FUNDSTELLE = new RegExp(String.raw`\(${STELLE}(?:;\s?${STELLE})*\)`, 'g');
const NUMMER = /[\u{2474}-\u{2487}]/gu; // ⑴ … ⒇

const istSerto = (el) => /Serto/.test(el.attribs?.style ?? '');
const farbe = (el) => /color:\s*(#[0-9a-f]{6})/i.exec(el.attribs?.style ?? '')?.[1]?.toLowerCase();

/** „L.19“ → 19, „G.20“ → 20 (Grammatik der Lektion), „Q.4,43“ → keine Lektion. */
function lektionAus(verweis) {
  const m = /^(?:L|G)\.?\s?(\d+)/.exec(verweis ?? '');
  return m ? Number(m[1]) : undefined;
}

/** Syrische Schrift aus einem Kopf: nur die Stücke mit Schrift, Bindestriche dazwischen bleiben. */
function schriftAus(text) {
  return text
    .replace(/\[[^\]]*\]/g, ' ') // die Wurzel („[ʾbc I ܐܒܥ]“) gehört nicht zum Wort
    .split(/\s+/)
    .filter((t) => SYRISCH.test(t) || t === '-' || t === '–')
    .join(' ')
    .replace(/^[\s–-]+|[\s–-]+$/g, '');
}

/** Umschrift aus einem Kopf: ohne Schrift, ohne Fundstellen, Leerzeichen geglättet. */
function umschriftAus(text) {
  return clean(
    text
      .replace(/[\u{700}-\u{74F}\u{640}\u{60C}\u{61F}\u{300}-\u{36F}]+/gu, ' ')
      .replace(FUNDSTELLE, ' '),
  )
    .replace(/\s+([,\])])/g, '$1')
    .replace(/\[\s+/g, '[')
    .replace(/\(\s*\)/g, '') // „këbce (d) (ܕ)“: die Klammer mit der Schrift
    .replace(/(?:\s\/)+(?=\s|$)/g, '') // „xile/axile ܟ݂ܝܠܶܗ/ܐܰܟ݂ܝܠܶܗ“: der Strich zwischen den Schriftformen
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Ein Absatz von 5.1 in seine Teile: Kopf, Bedeutungen mit Beispielen, Verweise.
 * Die Farben der Website zeigen, was was ist: #062a06 umschließt eine Bedeutung samt
 * Beispielen, #706d10 ein Beispiel, #0c5252 einen Verweis; Schrift steht in „Serto“.
 */
function absatzLesen($, p) {
  let kopf = '';
  const sinne = [];
  const siehe = [];
  let sinn = null;
  let beispiel = null;

  function geh(node, ort) {
    for (const c of $(node).contents().toArray()) {
      if (c.type === 'text') {
        const t = glatt($(c).text());
        if (ort.verweis) siehe.push(t);
        else if (ort.beispiel) {
          if (ort.serto) beispiel.syrisch += t;
          else if (ort.em) beispiel.latein += t;
          else if (ort.klein) beispiel.rest += t;
          else beispiel.rest += t;
        } else if (ort.sinn) {
          if (ort.nummer) continue;
          if (/\|/.test(t)) {
            sinn.deutsch += t.split('|')[0];
            sinn.nachStrich = true;
          } else if (!sinn.nachStrich) sinn.deutsch += t;
        } else if (sinne.length && /^\s*\|\s*$/.test(t)) {
          // „Absicht | latlan niya pis …“: Der Strich vor den Beispielen steht manchmal außerhalb der Bedeutung.
          sinne.at(-1).nachStrich = true;
        } else kopf += t;
        continue;
      }
      if (c.type !== 'tag') continue;
      const f = farbe(c);
      const neu = { ...ort };
      if (c.tagName === 'em' || c.tagName === 'i') neu.em = true;
      if (istSerto(c)) neu.serto = true;
      if (/font-size:\s*9pt/.test(c.attribs?.style ?? '')) neu.klein = true;
      if (f === '#0c5252') neu.verweis = true;
      if (ort.sinn && (c.tagName === 'strong' || c.tagName === 'b') && NUMMER.test($(c).text())) {
        NUMMER.lastIndex = 0;
        neu.nummer = true;
      }
      NUMMER.lastIndex = 0;
      if (f === '#062a06' && !ort.sinn) {
        sinn = { deutsch: '', beispiele: [] };
        sinne.push(sinn);
        geh(c, { ...neu, sinn: true });
        continue;
      }
      if (f === '#706d10' && (ort.sinn || sinne.length)) {
        // Beispiele gehören zur Bedeutung davor – auch wenn sie auf der Website hinter deren Block stehen.
        beispiel = { latein: '', syrisch: '', rest: '' };
        (ort.sinn ? sinn : sinne.at(-1)).beispiele.push(beispiel);
        geh(c, { ...neu, sinn: true, beispiel: true });
        continue;
      }
      // Ein Verweis („→ hiw“) steht manchmal mitten im Sinn-Block – dann gehört er nicht zur Bedeutung.
      geh(c, neu);
    }
  }
  geh(p, {});

  return {
    kopf: clean(kopf),
    sinne: sinne
      .map((s) => ({
        deutsch: clean(s.deutsch).replace(/^[,;\s]+|[,;\s]+$/g, ''),
        beispiele: s.beispiele.map((b) => {
          const rest = clean(b.rest);
          // „ deshalb wollten sie nach Berlin ziehen (L.19)“ → Deutsch + Fundstelle
          const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(rest);
          const verweis = m && /^(?:L|Q|G)\.?\s?\d/.test(m[2]) ? m[2].replace(/\s+/g, '') : undefined;
          const deutsch = verweis ? m[1] : rest;
          return { latein: clean(b.latein), syrisch: clean(b.syrisch), deutsch: clean(deutsch), ...(verweis && { verweis }) };
        }),
      }))
      .filter((s) => s.deutsch || s.beispiele.length),
    siehe: clean(siehe.join(' ')),
  };
}

async function surayt() {
  const eintraege = [];
  const vergeben = new Set();
  const kennung = (basis) => {
    let id = basis || 'x';
    for (let n = 2; vergeben.has(id); n++) id = `${basis}-${n}`;
    vergeben.add(id);
    return id;
  };
  let haupt = null;
  for (let nr = 1; nr <= 21; nr++) {
    const { $ } = await load(`${TEIL_SUR}.${nr}`);
    for (const p of $('main#articles section p').toArray()) {
      if (!clean($(p).text())) continue;
      const unter = /margin:\s*0pt 0pt 0pt 8pt/.test($(p).attr('style') ?? '');
      const { kopf, sinne, siehe } = absatzLesen($, p);
      const latein = umschriftAus(kopf);
      if (!latein) continue;
      const verweise = [...kopf.matchAll(FUNDSTELLE)].flatMap((m) => m[0].slice(1, -1).split(';').map((v) => v.replace(/\s+/g, '')));
      const stich = latein.split(/\s*[,;([]/)[0].trim();
      const e = {
        id: kennung(unter && haupt ? `${haupt.id}.${slug(stich)}` : `GL-${slug(stich)}`),
        latein,
        syrisch: schriftAus(kopf),
        ...(verweise.length && { verweise }),
        sinne,
        ...(siehe && { siehe }),
        ...(unter && haupt && { unter: haupt.id }),
      };
      if (!unter) haupt = e;
      eintraege.push(e);
    }
  }
  return eintraege;
}

async function wortliste() {
  const liste = [];
  for (let nr = 1; nr <= 24; nr++) {
    const { $ } = await load(`${TEIL_DE}.${nr}`);
    for (const p of $('main#articles section p').toArray()) {
      const deutsch = clean($(p).find('strong').first().text()).replace(NUMMER, '').trim();
      const latein = $(p)
        .find('span')
        .toArray()
        .filter((s) => farbe(s) === '#066606')
        .map((s) => clean($(s).text()))
        .filter(Boolean);
      if (deutsch && latein.length) liste.push({ deutsch, latein, voll: clean($(p).text()) });
    }
  }
  return liste;
}

export async function extrahiereGrossesGlossar() {
  const eintraege = await surayt();
  const liste = await wortliste();
  const { schreibe } = await import('./lehrbuch.mjs');
  await schreibe(datei(DATEI), { quelle: quelle(TEIL_SUR), eintraege, wortliste: liste });
  const beispiele = eintraege.reduce((n, e) => n + e.sinne.reduce((k, s) => k + s.beispiele.length, 0), 0);
  console.log(
    `Großes Glossar: ${eintraege.filter((e) => !e.unter).length} Einträge, ${eintraege.filter((e) => e.unter).length} Untereinträge, ` +
      `${beispiele} Beispiele; Wortliste Deutsch > Surayt: ${liste.length} Stichwörter`,
  );
}
