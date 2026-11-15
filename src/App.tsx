import { useEffect } from 'react';
import { AudioHinweis } from './components/AudioHinweis';
import { stopp } from './lib/audio';
import { parse, useHash } from './lib/router';
import { InfoScreen } from './screens/Info';
import { LektionScreen } from './screens/Lektion';
import { RundeScreen } from './screens/Runde';
import { StartScreen } from './screens/Start';

export function App() {
  const hash = useHash();
  const route = parse(hash);

  // Beim Verlassen eines Bildschirms verstummt laufendes Audio.
  useEffect(() => stopp, [hash]);

  const ziel = route.name === 'lektion' || route.name === 'runde' ? `${route.name}-${route.nr}` : route.name;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ziel]);

  return (
    <>
      {route.name === 'start' && <StartScreen />}
      {route.name === 'info' && <InfoScreen />}
      {route.name === 'lektion' && <LektionScreen nr={route.nr} tab={route.tab} />}
      {route.name === 'runde' && <RundeScreen key={hash} nr={route.nr} art={route.art} />}
      <AudioHinweis />
    </>
  );
}
