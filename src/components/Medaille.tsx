import type { Abzeichen, AbzeichenArt } from '../lib/abzeichen';
import {
  IconFlamme,
  IconHaken,
  IconHaus,
  IconKarten,
  IconMikro,
  IconOhr,
  IconPokal,
  IconRolle,
  IconStern,
  IconWiederholen,
} from './Icons';

const ICONS: Record<AbzeichenArt, (p: { size?: number }) => React.JSX.Element> = {
  start: IconStern,
  fehlerfrei: IconHaken,
  serie: IconFlamme,
  xp: IconStern,
  woerter: IconKarten,
  wiederholen: IconWiederholen,
  hoeren: IconOhr,
  sprechen: IconMikro,
  rolle: IconRolle,
  familie: IconHaus,
  lektion: IconPokal,
};

/** Rundes Abzeichen; noch nicht erreichte sind grau. */
export function Medaille({ abzeichen, erreicht = true, groesse = 64 }: { abzeichen: Abzeichen; erreicht?: boolean; groesse?: number }) {
  const Icon = ICONS[abzeichen.art];
  return (
    <span
      className={`medaille medaille--${abzeichen.art}${erreicht ? '' : ' medaille--zu'}`}
      style={{ width: groesse, height: groesse }}
      aria-hidden="true"
    >
      <Icon size={Math.round(groesse * 0.42)} />
      {abzeichen.marke && <span className="medaille__marke">{abzeichen.marke}</span>}
    </span>
  );
}
