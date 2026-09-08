-- AlterEnum
-- An STK push that was never answered is not the same as one that failed: the
-- buyer is told to request a fresh prompt rather than that their payment failed.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "stkExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lastPolledAt" TIMESTAMP(3),
ADD COLUMN     "isVerifying" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
-- The reconciliation sweep scans for stale PENDING payments.
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");
