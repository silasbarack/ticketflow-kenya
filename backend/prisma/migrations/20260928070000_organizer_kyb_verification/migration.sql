CREATE TYPE "OrganizerVerificationStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','CHANGES_REQUIRED','VERIFIED','REJECTED');

ALTER TABLE "organizer_profiles"
  ADD COLUMN "verificationStatus" "OrganizerVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "legalBusinessName" TEXT,
  ADD COLUMN "registrationNumber" TEXT,
  ADD COLUMN "businessAddress" TEXT,
  ADD COLUMN "companyEmail" TEXT,
  ADD COLUMN "companyPhone" TEXT,
  ADD COLUMN "certificateOfIncorporationUrl" TEXT,
  ADD COLUMN "officialSearchUrl" TEXT,
  ADD COLUMN "kraPinCertificateUrl" TEXT,
  ADD COLUMN "representativeFullName" TEXT,
  ADD COLUMN "representativeRole" TEXT,
  ADD COLUMN "representativeIdLast4" TEXT,
  ADD COLUMN "representativeIdDocumentUrl" TEXT,
  ADD COLUMN "authorizationLetterUrl" TEXT,
  ADD COLUMN "payoutMethod" TEXT,
  ADD COLUMN "payoutAccountName" TEXT,
  ADD COLUMN "payoutReference" TEXT,
  ADD COLUMN "payoutProofUrl" TEXT,
  ADD COLUMN "verificationSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "verificationReviewedAt" TIMESTAMP(3),
  ADD COLUMN "verificationReviewedBy" TEXT,
  ADD COLUMN "verificationReviewNote" TEXT;

UPDATE "organizer_profiles"
SET "verificationStatus" = 'VERIFIED',
    "verificationReviewedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)
WHERE "isVerified" = true;

CREATE INDEX "organizer_profiles_verificationStatus_idx"
ON "organizer_profiles"("verificationStatus");
