/**
 * useBarcodeScanner – ZXing v0.2 Edition mit Callback-Ref
 *
 * Wichtigster Unterschied zur vorherigen Version: das <video>-Element wird über
 * einen Callback-Ref angebunden. Damit kann der Scanner-Start NIE auf einen
 * ungemounteten Ref treffen. Plus: ausführliche Console-Logs für Debugging.
 *
 * Installation:
 *   npm install @zxing/browser @zxing/library
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser/esm/common/IScannerControls';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

const LOG = (...args: unknown[]) => console.log('[BarcodeScanner]', ...args);
const ERR = (...args: unknown[]) => console.error('[BarcodeScanner]', ...args);

const SCAN_HINTS = new Map<DecodeHintType, unknown>();
SCAN_HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
]);
SCAN_HINTS.set(DecodeHintType.TRY_HARDER, true);

interface UseBarcodeScannerOptions {
  active: boolean;
  onDetected: (code: string) => void;
}

interface TorchConstraints extends MediaTrackConstraintSet {
  torch?: boolean;
}

export function useBarcodeScanner({ active, onDetected }: UseBarcodeScannerOptions) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const foundRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [ready, setReady] = useState(false);

  // Stabile Callback-Referenz für onDetected
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  // Callback-Ref: feuert erst wenn das DOM-Element tatsächlich angebunden ist.
  // Damit kann der Hook-Effect nie auf einen null-Ref treffen.
  const videoRef = useCallback((el: HTMLVideoElement | null) => {
    LOG('videoRef callback:', el ? 'attached' : 'detached');
    setVideoEl(el);
  }, []);

  useEffect(() => {
    if (!active) {
      LOG('inactive');
      return;
    }
    if (!videoEl) {
      LOG('warten auf Video-Element …');
      return;
    }

    let cancelled = false;
    foundRef.current = false;
    setError(null);
    setReady(false);

    LOG('starte Scanner …');

    const start = async () => {
      try {
        if (typeof window === 'undefined') return;

        // Klare Diagnose-Reihenfolge mit sichtbaren Fehlern statt stillem Exit
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Kamera-API nicht verfügbar. Browser unterstützt getUserMedia nicht – HTTPS oder localhost erforderlich.'
          );
        }

        if (!window.isSecureContext) {
          throw new Error(
            'Unsicherer Kontext (kein HTTPS/localhost). Browser blockiert Kamera-Zugriff. Bitte über HTTPS oder localhost öffnen.'
          );
        }

        LOG('decodeFromConstraints aufrufen …');
        const reader = new BrowserMultiFormatReader(SCAN_HINTS);

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          videoEl,
          (result) => {
            if (cancelled || foundRef.current) return;
            if (result) {
              foundRef.current = true;
              const code = result.getText();
              LOG('Treffer:', code);
              try {
                navigator.vibrate?.(60);
              } catch {
                /* iOS Safari hat vibrate nicht – egal */
              }
              onDetectedRef.current(code);
            }
          }
        );

        LOG('Scanner läuft');

        if (cancelled) {
          LOG('cancelled vor Setup – stop()');
          controls.stop();
          return;
        }

        controlsRef.current = controls;

        // Torch-Capability prüfen
        const stream = videoEl.srcObject as MediaStream | null;
        const track = stream?.getVideoTracks()?.[0];
        if (track) {
          trackRef.current = track;
          try {
            const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
              torch?: boolean;
            };
            setTorchSupported(Boolean(caps.torch));
            LOG('Torch-Support:', Boolean(caps.torch));
          } catch {
            setTorchSupported(false);
          }
        }

        setReady(true);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { name?: string; message?: string };
        ERR('Scanner-Fehler:', err.name, '/', err.message);
        let userMsg: string;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          userMsg =
            'Kamera-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben und Seite neu laden.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          userMsg = 'Keine Kamera gefunden.';
        } else if (err.name === 'NotReadableError') {
          userMsg = 'Kamera ist von einer anderen App belegt.';
        } else if (err.name === 'OverconstrainedError') {
          userMsg = 'Kamera-Constraints konnten nicht erfüllt werden.';
        } else if (err.name === 'SecurityError') {
          userMsg = 'Kamera-Zugriff blockiert (Security Error). HTTPS erforderlich.';
        } else {
          userMsg = err.message || 'Kamera konnte nicht gestartet werden.';
        }
        setError(userMsg);
      }
    };

    start();

    return () => {
      LOG('cleanup');
      cancelled = true;
      try {
        controlsRef.current?.stop();
      } catch (e) {
        ERR('stop() warf:', e);
      }
      controlsRef.current = null;
      trackRef.current = null;
      setTorchOn(false);
      setTorchSupported(false);
      setReady(false);
    };
  }, [active, videoEl]);

  const toggleTorch = useCallback(async () => {
    const track = trackRef.current;
    if (!track || !torchSupported) {
      LOG('toggleTorch nicht möglich (track:', !!track, 'supported:', torchSupported, ')');
      return;
    }
    try {
      const next = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: next } as TorchConstraints],
      });
      setTorchOn(next);
      LOG('Torch:', next ? 'an' : 'aus');
    } catch (e) {
      ERR('Torch toggle failed', e);
    }
  }, [torchOn, torchSupported]);

  return { videoRef, error, torchOn, torchSupported, toggleTorch, ready };
}
