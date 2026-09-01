-- Listing metadata + the sales guard for events.
--
-- Written by hand rather than generated: `prisma migrate dev` diffs the schema
-- against the database and always proposes dropping `tax_rules.effective_range`
-- (a tsrange column with an exclusion constraint that Prisma cannot model, added
-- by raw SQL in 20260724155153_add_tax_module_relations). Regenerating this file
-- would silently destroy that column and its constraint.

ALTER TABLE "events" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "events" ADD COLUMN "posterAlt" TEXT;
ALTER TABLE "events" ADD COLUMN "county" TEXT;

-- Defaults to true so every existing event keeps selling exactly as before.
ALTER TABLE "events" ADD COLUMN "salesEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "events" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
