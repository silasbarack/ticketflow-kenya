-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "qrSignature" TEXT,
ADD COLUMN     "scannedAt" TIMESTAMP(3);
