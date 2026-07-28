-- AddForeignKey
ALTER TABLE "organizer_tax_profiles" ADD CONSTRAINT "organizer_tax_profiles_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_tax_calculations" ADD CONSTRAINT "refund_tax_calculations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_etims_documents" ADD CONSTRAINT "tax_etims_documents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- Re-adds objects Prisma's schema-diff engine does not track (generated
-- columns backing a GiST exclusion constraint). These were originally
-- added by hand in the first tax-module migration, but a subsequent
-- `prisma migrate dev` run silently DROPPED them: Prisma's shadow-DB diff
-- only reconciles what schema.prisma declares, and an EXCLUDE constraint
-- (implemented internally as an index) is one of the few raw-SQL
-- additions Prisma's diff DOES actively remove if it isn't declared in
-- schema.prisma (unlike plain CHECK constraints or triggers, which survive
-- untouched — see tax_journal_lines_balance_check, *_amounts_nonneg, and
-- tax_remittances_one_paid_per_liability, all still intact).
--
-- OPERATIONAL WARNING (see docs/ticketflow-tax-architecture.md
-- "Production-readiness checklist"): every time schema.prisma changes and
-- a new migration is generated with `prisma migrate dev`, inspect the
-- generated migration.sql for a stray
--   ALTER TABLE "tax_rules" DROP COLUMN "effective_range";
-- statement before applying it. If present, delete that line (and any
-- accompanying comment) from the generated file before running the
-- migration for real — otherwise this exclusion constraint will silently
-- disappear again and overlapping tax rules will no longer be rejected at
-- the database level.
-- =====================================================================

ALTER TABLE "tax_rules" ADD COLUMN "effective_range" tsrange
  GENERATED ALWAYS AS (tsrange("effectiveFrom", "effectiveTo", '[)')) STORED;

ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_no_overlap"
  EXCLUDE USING gist (
    "code" WITH =,
    "jurisdiction" WITH =,
    "effective_range" WITH &&
  ) WHERE ("enabled");
