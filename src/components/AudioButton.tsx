import { spiele, stopp, useAudioStatus } from '../lib/audio';
import { IconTon } from './Icons';

interface Props {
  url?: string;
  /** Was vorgelesen wird – für Screenreader. */
  label: string;
  gross?: boolean;
}

/** Lautsprecher-Knopf: tippen spielt die Aufnahme, nochmal tippen stoppt sie. */
export function AudioButton({ url, label, gross = false }: Props) {
  const status = useAudioStatus();
  if (!url) return null;
  const aktiv = status.url === url && (status.zustand === 'spielt' || status.zustand === 'laedt');
  return (
    <button
      type="button"
      className={`ton${gross ? ' ton--gross' : ''}${aktiv ? ' ton--aktiv' : ''}`}
      aria-label={aktiv ? 'Stopp' : `Anhören: ${label}`}
      onClick={(ereignis) => {
        ereignis.stopPropagation();
        if (aktiv) stopp();
        else void spiele(url);
      }}
    >
      <IconTon size={gross ? 44 : 22} />
    </button>
  );
}
