import type { ReactNode } from 'react';

/** Surayt-Text. `lang="tru"` (Turoyo) sagt Screenreadern und Browsern, dass das kein Deutsch ist. */
export function Surayt({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span lang="tru" translate="no" className={className}>
      {children}
    </span>
  );
}
