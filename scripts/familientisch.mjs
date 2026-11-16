#!/usr/bin/env node
// Überträgt die Häkchen aus inhalte/familientisch-vorschlag.md in die Daten:
//   - [x] `L03-D-04` …  → Eintrag bekommt die Markierung „familientisch“
//   - [ ] `L03-D-04` …  → Markierung wird entfernt
// Die Markierung übersteht ein erneutes Einlesen der Lektionen.
//
//   npm run familientisch

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { datei, schreibe } from './lehrbuch.mjs';

const MARKE = 'familientisch';
const liste = fileURLToPath(new URL('../inhalte/familientisch-vorschlag.md', import.meta.url));

const wahl = new Map();
for (const zeile of (await readFile(liste, 'utf8')).split('\n')) {
  const treffer = /^- \[( |x|X)\] `([^`]+)`/.exec(zeile);
  if (treffer) wahl.set(treffer[2], treffer[1] !== ' ');
}

const gefunden = new Set();
const ordner = fileURLToPath(new URL('../src/data/', import.meta.url));
for (const name of (await readdir(ordner)).filter((n) => /^lektion-\d+\.json$/.test(n)).sort()) {
  const pfad = datei(name);
  const lektion = JSON.parse(await readFile(pfad, 'utf8'));
  let geaendert = false;
  for (const e of [...lektion.einleitung, ...lektion.text, ...lektion.wortschatz]) {
    if (!wahl.has(e.id)) continue;
    gefunden.add(e.id);
    const soll = wahl.get(e.id);
    if (soll === e.tags.includes(MARKE)) continue;
    e.tags = soll ? [...e.tags, MARKE] : e.tags.filter((t) => t !== MARKE);
    geaendert = true;
  }
  if (geaendert) await schreibe(pfad, lektion);
}

const unbekannt = [...wahl.keys()].filter((id) => !gefunden.has(id));
if (unbekannt.length) console.warn(`! Unbekannte Kennungen in der Liste: ${unbekannt.join(', ')}`);
const angehakt = [...wahl.values()].filter(Boolean).length;
console.log(`Familientisch: ${angehakt} von ${wahl.size} Vorschlägen angehakt und in die Daten übernommen.`);
