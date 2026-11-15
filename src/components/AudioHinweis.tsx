import { useEffect, useRef, useState } from 'react';
import { useAudioStatus } from '../lib/audio';

const RUHE_MS = 30000;

/** Kurze Meldung, wenn eine Aufnahme nicht geladen werden konnte. */
export function AudioHinweis() {
  const status = useAudioStatus();
  const [sichtbar, setSichtbar] = useState(false);
  const zuletzt = useRef(0);

  useEffect(() => {
    if (status.zustand !== 'fehler') return;
    // Wer offline übt, soll die Meldung nicht bei jeder Aufgabe wieder sehen.
    if (Date.now() - zuletzt.current < RUHE_MS) return;
    zuletzt.current = Date.now();
    setSichtbar(true);
    const uhr = setTimeout(() => setSichtbar(false), 4000);
    return () => clearTimeout(uhr);
  }, [status]);

  if (!sichtbar) return null;
  return (
    <div className="hinweis" role="status">
      Die Aufnahme lädt gerade nicht. Für Audio brauchst du Internet.
    </div>
  );
}
