'use client';

import { useEffect, useRef } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  active: boolean;
}

export default function QrScanner({ onScan, active }: QrScannerProps) {
  const containerId = 'qr-scanner-region';
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!active) return;
    let stopped = false;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (stopped) return;
      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;
      html5QrCode
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText: string) => onScan(decodedText),
          () => {
            /* ignore per-frame scan errors */
          },
        )
        .catch(() => {
          /* camera not available — manual entry remains usable */
        });
    });

    return () => {
      stopped = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [active, onScan]);

  if (!active) return null;

  return <div id={containerId} className="w-full overflow-hidden rounded-xl" />;
}
