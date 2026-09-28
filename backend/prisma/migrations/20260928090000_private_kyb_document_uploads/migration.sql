CREATE TYPE "OrganizerVerificationDocumentKind" AS ENUM (
  'INCORPORATION_CERTIFICATE',
  'OFFICIAL_SEARCH',
  'KRA_PIN_CERTIFICATE',
  'REPRESENTATIVE_ID',
  'AUTHORIZATION_LETTER',
  'PAYOUT_PROOF'
);

CREATE TABLE "organizer_verification_documents" (
  "id" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "kind" "OrganizerVerificationDocumentKind" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organizer_verification_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizer_verification_documents_organizerId_kind_key"
ON "organizer_verification_documents"("organizerId","kind");

CREATE INDEX "organizer_verification_documents_organizerId_idx"
ON "organizer_verification_documents"("organizerId");

ALTER TABLE "organizer_verification_documents"
ADD CONSTRAINT "organizer_verification_documents_organizerId_fkey"
FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
