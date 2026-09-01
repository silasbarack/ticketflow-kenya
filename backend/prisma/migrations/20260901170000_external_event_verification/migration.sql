-- Verified third-party event listings must keep their source and send buyers
-- to the authorised seller instead of entering TicketFlow checkout.
CREATE TYPE "EventBookingMode" AS ENUM ('INTERNAL', 'EXTERNAL');
CREATE TYPE "TicketAvailabilityStatus" AS ENUM ('AVAILABLE', 'SOLD_OUT', 'CLOSED', 'NOT_YET_ON_SALE');

ALTER TABLE "events"
  ADD COLUMN "organizerName" TEXT,
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  ADD COLUMN "bookingMode" "EventBookingMode" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN "bookingUrl" TEXT,
  ADD COLUMN "verificationSource" TEXT,
  ADD COLUMN "verificationSourceUrl" TEXT,
  ADD COLUMN "secondaryVerificationSourceUrl" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "posterSourceUrl" TEXT;

ALTER TABLE "ticket_types"
  ADD COLUMN "availabilityStatus" "TicketAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE';
