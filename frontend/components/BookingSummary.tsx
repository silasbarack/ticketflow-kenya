'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { SERVICE_FEE_PERCENT, serviceFeeFor, totalWithServiceFee } from '@/lib/fees';
import Button from '@/components/ui/Button';

export default function BookingSummary({
  subtotal,
  totalSelected,
  onAddToCart,
  cartCount,
}: {
  subtotal: number;
  totalSelected: number;
  onAddToCart: () => void;
  cartCount: number;
}) {
  return (
    <div>
      <div className="space-y-1.5 border-t border-line pt-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Service fee ({SERVICE_FEE_PERCENT}%)</span>
          <span>{formatCurrency(serviceFeeFor(subtotal))}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          The service fee covers secure M-Pesa processing and instant QR ticket delivery.
        </p>
        <div className="flex items-center justify-between border-t border-line pt-2.5">
          <span className="text-sm font-medium text-navy-700">You pay</span>
          <span className="text-xl font-bold text-navy-900">{formatCurrency(totalWithServiceFee(subtotal))}</span>
        </div>
      </div>

      <Button variant="primary" size="lg" fullWidth className="mt-4" onClick={onAddToCart} disabled={totalSelected <= 0}>
        {totalSelected > 0 ? `Add ${totalSelected} ticket${totalSelected !== 1 ? 's' : ''} to Cart` : 'Select tickets'}
      </Button>

      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-muted">
        <Image src="/mpesa-logo.svg" alt="" width={512} height={273} unoptimized className="h-4 w-auto" aria-hidden="true" />
        Pay securely with M-Pesa at checkout
      </p>

      {cartCount > 0 && (
        <Link
          href="/cart"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-btn border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          View Cart ({cartCount} ticket{cartCount !== 1 ? 's' : ''})
        </Link>
      )}
    </div>
  );
}
