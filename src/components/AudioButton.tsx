import { spiele, stopp, useAudioStatus } from '../lib/audio';
import { IconTon } from './Icons';

interface Props {
  url?: string;
  /** Was vorgelesen wird – für Screenreader. */
  label: string;
  gross?: boolean;
  /** Kleiner Knopf, z. B. in Tabellen der Grammatik. */
  klein?: boolean;
}

/** Lautsprecher-Knopf: tippen spielt die Aufnahme, nochmal tippen stoppt sie. */
export function AudioButton({ url, label, gross = false, klein = false }: Props) {
  const status = useAudioStatus();
  if (!url) return null;
  const aktiv = status.url === url && (status.zustand === 'spielt' || status.zustand === 'laedt');
  return (
    <button
      type="button"
      className={`ton${gross ? ' ton--gross' : ''}${klein ? ' ton--klein' : ''}${aktiv ? ' ton--aktiv' : ''}`}
      aria-label={aktiv ? 'Stopp' : `Anhören: ${label}`}
      onClick={(ereignis) => {
        ereignis.stopPropagation();
        if (aktiv) stopp();
        else void spiele(url);
      }}
    >
      <IconTon size={gross ? 44 : klein ? 17 : 22} />
    </button>
  );
}
