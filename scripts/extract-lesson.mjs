#!/usr/bin/env node
// Extraktions-Skript: liest Inhalte von textbook.surayt.com (Šlomo Surayt,
// Level A) und schreibt sie als JSON nach src/data/.
//
//   node scripts/extract-lesson.mjs 4          eine Lektion → lektion-04.json
//   node scripts/extract-lesson.mjs 1-16       mehrere Lektionen
//   node scripts/extract-lesson.mjs glossar    Glossar A → glossar-a.json
//   node scripts/extract-lesson.mjs grammatik  Grammatik 3–24, Verb- und Formentabellen → grammatik.json
//   node scripts/extract-lesson.mjs glossar-gross  großes Glossar (Teil 5) → glossar.json
//
// Lektion 1 und 2 (Alphabet und Laute) sind anders aufgebaut als die übrigen
// und werden von scripts/alphabet.mjs gelesen, Lektion 3–16 von scripts/lektion.mjs.
// Von Hand gepflegte `tags` in einer bestehenden Datei bleiben erhalten.
//
// Hinter einem Proxy (z. B. in Claude Code): NODE_USE_ENV_PROXY=1 voranstellen.
// Mit EXTRAKT_CACHE=<Ordner> werden abgerufene Seiten dort zwischengespeichert,
// damit wiederholte Läufe den Server nicht erneut belasten.

import { extrahiereAlphabet } from './alphabet.mjs';
import { extrahiereGlossar } from './glossar.mjs';
import { extrahiereGrossesGlossar } from './glossar-gross.mjs';
import { extrahiereGrammatik } from './grammatik.mjs';
import { inhaltsverzeichnis } from './lehrbuch.mjs';
import { extrahiereLektion } from './lektion.mjs';

const auftraege = process.argv.slice(2).flatMap((arg) => {
  if (arg === 'glossar' || arg === 'grammatik' || arg === 'glossar-gross') return [arg];
  const [von, bis = von] = arg.split('-').map(Number);
  return Array.from({ length: bis - von + 1 }, (_, i) => von + i);
});
if (!auftraege.length || auftraege.some((a) => typeof a !== 'string' && (!Number.isInteger(a) || a < 1))) {
  console.error('Aufruf: node scripts/extract-lesson.mjs <Nr> [<Nr> …] | <von>-<bis> | glossar | grammatik | glossar-gross');
  process.exit(1);
}

const kapitel = await inhaltsverzeichnis();
for (const a of auftraege) {
  if (a === 'glossar') await extrahiereGlossar();
  else if (a === 'glossar-gross') await extrahiereGrossesGlossar();
  else if (a === 'grammatik') await extrahiereGrammatik(kapitel);
  else if (a <= 2) await extrahiereAlphabet(kapitel, a);
  else await extrahiereLektion(kapitel, a);
}
