// Ein einziger Audio-Player für die ganze App. Die Aufnahmen kommen vorerst
// direkt von textbook.surayt.com und brauchen deshalb eine Internetverbindung.

import { useSyncExternalStore } from 'react';

export type Zustand = 'ruhe' | 'laedt' | 'spielt' | 'fehler';
export type Ausgang = 'ende' | 'abbruch' | 'fehler';

interface Status {
  url: string | null;
  zustand: Zustand;
}

/** Lädt eine Aufnahme länger als das, gilt sie als nicht erreichbar. */
const GEDULD_MS = 12000;

// Kürzeste gültige WAV-Datei: damit „entsperrt“ ein Fingertipp den Player (iOS).
const STILLE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

let status: Status = { url: null, zustand: 'ruhe' };
let element: HTMLAudioElement | null = null;
let fertig: ((ausgang: Ausgang) => void) | null = null;
const zuhoerer = new Set<() => void>();

function setze(neu: Status) {
  status = neu;
  zuhoerer.forEach((f) => f());
}

function beende(ausgang: Ausgang) {
  const melden = fertig;
  fertig = null;
  setze({ url: ausgang === 'fehler' ? status.url : null, zustand: ausgang === 'fehler' ? 'fehler' : 'ruhe' });
  melden?.(ausgang);
}

function player(): HTMLAudioElement {
  if (!element) {
    element = new Audio();
    element.preload = 'auto';
    // Ereignisse zählen nur, wenn sie zur gerade gewünschten Aufnahme gehören.
    const gemeint = () => fertig !== null && element?.src === status.url;
    element.addEventListener('playing', () => {
      if (gemeint()) setze({ url: status.url, zustand: 'spielt' });
    });
    element.addEventListener('ended', () => {
      if (gemeint()) beende('ende');
    });
    element.addEventListener('error', () => {
      if (gemeint()) beende('fehler');
    });
  }
  return element;
}

/** Spielt eine Aufnahme. Das Ergebnis sagt, ob sie zu Ende lief, abgebrochen wurde oder nicht lud. */
export function spiele(url: string): Promise<Ausgang> {
  const audio = player();
  if (fertig) beende('abbruch');
  return new Promise((resolve) => {
    fertig = resolve;
    setze({ url, zustand: 'laedt' });
    audio.src = url;
    setTimeout(() => {
      if (fertig === resolve && status.zustand === 'laedt') {
        audio.pause();
        beende('fehler');
      }
    }, GEDULD_MS);
    audio.play().catch((grund: unknown) => {
      if (fertig !== resolve) return; // inzwischen läuft schon etwas anderes
      // Der Browser hat das automatische Abspielen verweigert: kein Fehler,
      // ein Tipp auf den Lautsprecher startet die Aufnahme.
      const verweigert = grund instanceof DOMException && grund.name === 'NotAllowedError';
      beende(verweigert ? 'abbruch' : 'fehler');
    });
  });
}

export function stopp() {
  if (!element) return;
  element.pause();
  if (fertig) beende('abbruch');
}

/**
 * In einem Klick-Handler aufrufen, bevor Aufnahmen von selbst starten sollen:
 * iOS erlaubt Ton erst, nachdem der Player einmal durch einen Fingertipp lief.
 */
export function entsperren() {
  if (fertig) return;
  const audio = player();
  audio.src = STILLE;
  audio.play().catch(() => {});
}

function abonnieren(f: () => void) {
  zuhoerer.add(f);
  return () => zuhoerer.delete(f);
}

export function useAudioStatus(): Status {
  return useSyncExternalStore(abonnieren, () => status);
}
