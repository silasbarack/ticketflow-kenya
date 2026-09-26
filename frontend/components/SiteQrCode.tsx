'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * A genuine, scannable QR code pointing at this site's event catalogue.
 * The URL comes from the current origin, so it is correct on localhost,
 * Render and any custom domain without configuration.
 */
export default function SiteQrCode({ path = '/events', className }: { path?: string; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(window.location.origin + path, {
      type: 'svg',
      errorCorrectionLevel: 'Q',
      margin: 1,
      color: { dark: '#111111', light: '#ffffff' },
    })
      .then((markup) => { if (!cancelled) setSvg(markup); })
      .catch(() => { if (!cancelled) setSvg(null); });
    return () => { cancelled = true; };
  }, [path]);

  return (
    <span
      className={['tf-site-qr', className].filter(Boolean).join(' ')}
      role="img"
      aria-label="QR code linking to TicketFlow Kenya events"
      // Markup is produced locally by the qrcode library from our own origin.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
