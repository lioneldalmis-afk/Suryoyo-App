import { useEffect } from 'react';
import { AudioHinweis } from './components/AudioHinweis';
import { stopp } from './lib/audio';
import { parse, useHash } from './lib/router';
import { ErfolgeScreen } from './screens/Erfolge';
import { InfoScreen } from './screens/Info';
import { LektionScreen } from './screens/Lektion';
import { RollenspielScreen } from './screens/Rollenspiel';
import { EinheitScreen, RundeScreen, WiederholenScreen } from './screens/Runde';
import { StartScreen } from './screens/Start';

export function App() {
  const hash = useHash();
  const route = parse(hash);

  // Beim Verlassen eines Bildschirms verstummt laufendes Audio.
  useEffect(() => stopp, [hash]);

  // Beim Wechsel des Bildschirms nach oben scrollen – nicht beim Reiterwechsel innerhalb einer Lektion.
  const ziel = route.name === 'lektion' ? `lektion-${route.nr}` : hash;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ziel]);

  return (
    <>
      {route.name === 'start' && <StartScreen />}
      {route.name === 'info' && <InfoScreen />}
      {route.name === 'erfolge' && <ErfolgeScreen />}
      {route.name === 'lektion' && <LektionScreen nr={route.nr} tab={route.tab} anker={route.anker} />}
      {route.name === 'runde' && <RundeScreen key={hash} nr={route.nr} art={route.art} />}
      {route.name === 'einheit' && <EinheitScreen key={hash} nr={route.nr} einheit={route.einheit} />}
      {route.name === 'wiederholen' && <WiederholenScreen key={hash} />}
      {route.name === 'rollenspiel' && <RollenspielScreen key={hash} nr={route.nr} />}
      <AudioHinweis />
    </>
  );
}
