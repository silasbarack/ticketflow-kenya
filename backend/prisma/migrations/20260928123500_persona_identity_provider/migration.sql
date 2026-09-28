ALTER TABLE "organizer_profiles"
  ADD COLUMN IF NOT EXISTS "identityProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "representativeIdentityVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "personaInquiryId" TEXT,
  ADD COLUMN IF NOT EXISTS "personaInquiryStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "personaIdentityVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "personaIdentityFailureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "personaLastEventAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "organizer_profiles_personaInquiryId_key"
ON "organizer_profiles"("personaInquiryId");

CREATE TABLE IF NOT EXISTS "persona_webhook_events" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "inquiryId" TEXT,
  "organizerId" TEXT,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "persona_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_webhook_events_eventId_key"
ON "persona_webhook_events"("eventId");

CREATE INDEX IF NOT EXISTS "persona_webhook_events_inquiryId_idx"
ON "persona_webhook_events"("inquiryId");

CREATE INDEX IF NOT EXISTS "persona_webhook_events_organizerId_idx"
ON "persona_webhook_events"("organizerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'persona_webhook_events_organizerId_fkey'
  ) THEN
    ALTER TABLE "persona_webhook_events"
    ADD CONSTRAINT "persona_webhook_events_organizerId_fkey"
    FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
