import type { ReactNode } from 'react';

interface Props {
  /** 0 bis 1 */
  anteil: number;
  groesse: number;
  dicke?: number;
  children?: ReactNode;
}

export function ProgressRing({ anteil, groesse, dicke = 6, children }: Props) {
  const r = (groesse - dicke) / 2;
  const umfang = 2 * Math.PI * r;
  return (
    <span className="ring" style={{ width: groesse, height: groesse }}>
      <svg width={groesse} height={groesse} aria-hidden="true">
        <circle className="ring__bahn" cx={groesse / 2} cy={groesse / 2} r={r} strokeWidth={dicke} />
        <circle
          className="ring__wert"
          cx={groesse / 2}
          cy={groesse / 2}
          r={r}
          strokeWidth={dicke}
          strokeDasharray={umfang}
          strokeDashoffset={umfang * (1 - Math.min(1, Math.max(0, anteil)))}
          transform={`rotate(-90 ${groesse / 2} ${groesse / 2})`}
        />
      </svg>
      <span className="ring__inhalt">{children}</span>
    </span>
  );
}
