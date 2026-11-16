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

export const IconFlamme = ({ size }: P) => (
  <Icon size={size}>
    <path
      d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.3 3.9-7.6.5 1.7 1.4 2.7 2.4 3.2C11.7 7.6 12.9 5 15.6 3c-.3 2.8.8 4.6 2 6.4 1 1.5 1.9 3 1.9 5.2C19.5 18.3 16.4 21 12 21z"
      fill="currentColor"
      stroke="none"
    />
  </Icon>
);

export const IconStern = ({ size }: P) => (
  <Icon size={size}>
    <path
      d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"
      fill="currentColor"
      stroke="none"
    />
  </Icon>
);

export const IconMikro = ({ size }: P) => (
  <Icon size={size}>
    <rect x="9" y="3.5" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
    <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3" />
  </Icon>
);

export const IconRolle = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 5.5h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3.5 3v-3H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z" />
    <path d="M18.5 9.5H20a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v2.5L16 18.5h-4" />
  </Icon>
);

export const IconPokal = ({ size }: P) => (
  <Icon size={size}>
    <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4z" />
    <path d="M7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M8.5 20h7M9.5 17h5" />
  </Icon>
);

export const IconHaus = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 11 12 4.5l8 6.5" />
    <path d="M6 9.5V19h12V9.5M10 19v-5h4v5" />
  </Icon>
);

export const IconBausteine = ({ size }: P) => (
  <Icon size={size}>
    <rect x="3" y="5" width="8" height="5" rx="1.6" />
    <rect x="13" y="5" width="8" height="5" rx="1.6" />
    <rect x="7" y="14" width="10" height="5" rx="1.6" />
  </Icon>
);

export const IconWiederholen = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1" />
    <path d="M17.8 3.5v3.7h-3.7M6.2 20.5v-3.7h3.7" />
  </Icon>
);

export const IconZiel = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </Icon>
);
