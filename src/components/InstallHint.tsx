import { useEffect, useState } from 'react';
import { APP_NAME } from '../config';
import { IconSchliessen } from './Icons';

// Android/Chrome meldet per Ereignis, dass die App installierbar ist. iOS kennt
// das nicht – dort hilft nur die Anleitung über „Teilen“.
interface InstallEreignis extends Event {
  prompt(): Promise<void>;
}

const KEY = 'surayt.installhinweis.zu';

const laeuftAlsApp = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const istIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function schonGeschlossen() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function InstallHint() {
  const [ereignis, setEreignis] = useState<InstallEreignis | null>(null);
  const [zu, setZu] = useState(() => laeuftAlsApp() || schonGeschlossen());

  useEffect(() => {
    const merken = (e: Event) => {
      e.preventDefault();
      setEreignis(e as InstallEreignis);
    };
    const installiert = () => setZu(true);
    window.addEventListener('beforeinstallprompt', merken);
    window.addEventListener('appinstalled', installiert);
    return () => {
      window.removeEventListener('beforeinstallprompt', merken);
      window.removeEventListener('appinstalled', installiert);
    };
  }, []);

  if (zu || (!ereignis && !istIos())) return null;

  const schliessen = () => {
    setZu(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // dann erscheint der Hinweis beim nächsten Start eben wieder
    }
  };

  return (
    <aside className="installieren">
      <div>
        <strong>{APP_NAME} auf den Homescreen</strong>
        {ereignis ? (
          <p>Dann startet {APP_NAME} wie eine normale App – auch ohne Internet.</p>
        ) : (
          <p>
            Tippe in Safari auf <b>Teilen</b> und dann auf <b>„Zum Home-Bildschirm“</b>.
          </p>
        )}
        {ereignis && (
          <button type="button" className="knopf knopf--klein" onClick={() => void ereignis.prompt()}>
            Installieren
          </button>
        )}
      </div>
      <button type="button" className="installieren__zu" aria-label="Hinweis schließen" onClick={schliessen}>
        <IconSchliessen size={18} />
      </button>
    </aside>
  );
}
