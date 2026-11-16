// Eigene Aufnahme zum Nachsprechen. Sie bleibt im Arbeitsspeicher des Handys,
// wird nirgends hochgeladen und verschwindet, sobald die Aufgabe vorbei ist.

/** Höchstens so lange wird aufgenommen, dann stoppt die Aufnahme von selbst. */
const HOECHSTENS_MS = 12_000;

export const kannAufnehmen = () =>
  typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export interface LaufendeAufnahme {
  /** Beendet die Aufnahme. */
  stoppe: () => void;
  /** Liefert die Adresse der fertigen Aufnahme (zum Abspielen), oder `null`, wenn nichts aufgenommen wurde. */
  fertig: Promise<string | null>;
}

/** Fragt beim ersten Mal nach dem Mikrofon. Schlägt fehl, wenn es nicht erlaubt wird. */
export async function nimmAuf(): Promise<LaufendeAufnahme> {
  const strom = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Safari nimmt mp4 auf, Chrome und Firefox webm.
  const typ = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t));
  const rekorder = new MediaRecorder(strom, typ ? { mimeType: typ } : undefined);
  const stuecke: Blob[] = [];
  rekorder.addEventListener('dataavailable', (e) => {
    if (e.data.size > 0) stuecke.push(e.data);
  });

  const fertig = new Promise<string | null>((resolve) => {
    rekorder.addEventListener('stop', () => {
      // Mikrofon sofort freigeben, damit das Aufnahme-Zeichen des Handys verschwindet.
      strom.getTracks().forEach((spur) => spur.stop());
      resolve(stuecke.length ? URL.createObjectURL(new Blob(stuecke, { type: rekorder.mimeType || typ })) : null);
    });
  });

  const stoppe = () => {
    clearTimeout(uhr);
    if (rekorder.state !== 'inactive') rekorder.stop();
  };
  const uhr = setTimeout(stoppe, HOECHSTENS_MS);
  rekorder.start();
  return { stoppe, fertig };
}
