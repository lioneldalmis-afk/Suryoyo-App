// Schlichte Linien-Icons als SVG – keine Icon-Bibliothek nötig.
import type { ReactNode } from 'react';

function Icon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type P = { size?: number };

export const IconTon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor" stroke="none" />
    <path d="M15.5 9a4 4 0 0 1 0 6" />
    <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
  </Icon>
);

export const IconPlay = ({ size }: P) => (
  <Icon size={size}>
    <path d="M8 5.5v13l10.5-6.5L8 5.5z" fill="currentColor" />
  </Icon>
);

export const IconStopp = ({ size }: P) => (
  <Icon size={size}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" />
  </Icon>
);

export const IconZurueck = ({ size }: P) => (
  <Icon size={size}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Icon>
);

export const IconSchliessen = ({ size }: P) => (
  <Icon size={size}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const IconHaken = ({ size }: P) => (
  <Icon size={size}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const IconSchloss = ({ size }: P) => (
  <Icon size={size}>
    <rect x="5.5" y="10.5" width="13" height="9" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Icon>
);

export const IconPfeil = ({ size }: P) => (
  <Icon size={size}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Icon>
);

export const IconKarten = ({ size }: P) => (
  <Icon size={size}>
    <rect x="3.5" y="7" width="13" height="12" rx="2.5" />
    <path d="M7.5 4.5h10.5a2.5 2.5 0 0 1 2.5 2.5v9" />
  </Icon>
);

export const IconWahl = ({ size }: P) => (
  <Icon size={size}>
    <path d="M9.5 6.5H20M9.5 12H20M9.5 17.5H20" />
    <circle cx="5" cy="6.5" r="1.4" fill="currentColor" />
    <circle cx="5" cy="12" r="1.4" />
    <circle cx="5" cy="17.5" r="1.4" />
  </Icon>
);

export const IconOhr = ({ size }: P) => (
  <Icon size={size}>
    <path d="M7 10a5.5 5.5 0 0 1 11 0c0 3.5-3 4-3 7a3 3 0 0 1-5.5 1.6" />
    <path d="M10 10.5a2.5 2.5 0 0 1 5 0c0 1.2-.8 1.8-1.5 2.5" />
  </Icon>
);
