import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds DEMONSTRATION tax configuration only.
 *
 * These are NOT tax advice and NOT guaranteed to be the current legally
 * correct Kenyan rates. Every seeded row is created with
 * `requiresReview: true` and no `approvedBy` — the tax liability state
 * machine and TaxRuleRepository both treat unapproved/review-flagged rules
 * as usable for calculation (so the app works out of the box) but they
 * must be reviewed and formally approved by a qualified Kenyan tax
 * professional (and finance) before any real filing or payment relies on
 * them. See docs/ticketflow-tax-architecture.md.
 */
async function main() {
  console.log('Seeding tax module demonstration data (REQUIRES REVIEW before production use)...');

  await prisma.companyTaxProfile.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      legalName: 'TicketFlow Kenya Limited',
      vatRegistrationStatus: 'PENDING',
      agencyModel: 'DISCLOSED_AGENT',
      etimsMode: 'DISABLED',
      taxPaymentMode: 'MANUAL_PRN',
      defaultCurrency: 'KES',
    },
  });

  const seedRuleEffectiveFrom = new Date('2024-01-01T00:00:00.000Z');

  const demoRules: Array<{
    code:
      | 'TICKETFLOW_PLATFORM_OUTPUT_VAT'
      | 'ORGANIZER_TICKET_OUTPUT_VAT'
      | 'CORPORATION_TAX_PROVISION'
      | 'SUPPLIER_WITHHOLDING_TAX'
      | 'PAYE'
      | 'AFFORDABLE_HOUSING_LEVY';
    rateBps: number;
    notes: string;
    sourceReference: string;
  }> = [
    {
      code: 'TICKETFLOW_PLATFORM_OUTPUT_VAT',
      rateBps: 1600,
      notes: 'Demonstration standard VAT rate (16%) applied to TicketFlow booking fees / commission. VERIFY against current VAT Act rate and TicketFlow VAT registration status before relying on this.',
      sourceReference: 'DEMO SEED — VAT Act, Cap 476 (standard rate) — confirm current rate with a tax advisor',
    },
    {
      code: 'ORGANIZER_TICKET_OUTPUT_VAT',
      rateBps: 1600,
      notes: 'Demonstration standard VAT rate (16%) for organizer-owned ticket VAT on standard-rated events. Many events may be exempt/zero-rated/out-of-scope — this rate only applies when an OrganizerTaxProfile/line explicitly marks STANDARD_RATED.',
      sourceReference: 'DEMO SEED — VAT Act, Cap 476 (standard rate) — confirm current rate with a tax advisor',
    },
    {
      code: 'CORPORATION_TAX_PROVISION',
      rateBps: 3000,
      notes: 'Demonstration resident corporation tax rate (30%), for internal provisioning/estimation only — not a filed liability calculation.',
      sourceReference: 'DEMO SEED — Income Tax Act — confirm current rate with a tax advisor',
    },
    {
      code: 'SUPPLIER_WITHHOLDING_TAX',
      rateBps: 500,
      notes: 'Demonstration withholding tax rate on qualifying professional/service payments (e.g. commission paid to an organizer under the PRINCIPAL_RESELLER model). Actual rate depends on payee category and residency.',
      sourceReference: 'DEMO SEED — Income Tax Act, Third Schedule — confirm applicability and rate with a tax advisor',
    },
    {
      code: 'PAYE',
      rateBps: 0,
      notes: 'Placeholder only — PAYE is a graduated schedule, not a flat rate. Do not use this rule for payroll; it exists so the TaxRuleCode is representable and reviewable in the admin UI.',
      sourceReference: 'DEMO SEED — Income Tax Act, PAYE — use official KRA PAYE tables, not this rule',
    },
    {
      code: 'AFFORDABLE_HOUSING_LEVY',
      rateBps: 150,
      notes: 'Demonstration Affordable Housing Levy rate (1.5%) as it applies to qualifying employment income — confirm applicability to TicketFlow before use.',
      sourceReference: 'DEMO SEED — Affordable Housing Act — confirm current rate with a tax advisor',
    },
  ];

  for (const rule of demoRules) {
    const existing = await prisma.taxRule.findFirst({
      where: { code: rule.code, jurisdiction: 'KE', enabled: true, effectiveFrom: seedRuleEffectiveFrom },
    });
    if (existing) continue;
    await prisma.taxRule.create({
      data: {
        code: rule.code,
        jurisdiction: 'KE',
        rateBps: rule.rateBps,
        effectiveFrom: seedRuleEffectiveFrom,
        effectiveTo: null,
        roundingMode: 'HALF_UP',
        enabled: true,
        requiresReview: true,
        sourceReference: rule.sourceReference,
        notes: rule.notes,
        createdBy: 'SEED',
        approvedBy: null,
      },
    });
  }

  const ledgerAccounts: Array<{ code: string; name: string; type: string; isOrganizerMemo?: boolean }> = [
    { code: 'CASH_MPESA_CLEARING', name: 'Cash / M-Pesa clearing', type: 'ASSET' },
    { code: 'CARD_PROCESSOR_CLEARING', name: 'Card processor clearing', type: 'ASSET' },
    { code: 'CUSTOMER_REFUND_PAYABLE', name: 'Customer refund payable', type: 'LIABILITY' },
    { code: 'CLIENT_MONEY_ORGANIZER_FUNDS', name: 'Client money — organizer funds', type: 'LIABILITY' },
    { code: 'ORGANIZER_PAYABLE', name: 'Organizer payable', type: 'LIABILITY' },
    { code: 'BOOKING_FEE_REVENUE', name: 'TicketFlow booking-fee revenue', type: 'REVENUE' },
    { code: 'COMMISSION_REVENUE', name: 'TicketFlow commission revenue', type: 'REVENUE' },
    { code: 'TICKETFLOW_VAT_PAYABLE', name: 'TicketFlow output VAT payable', type: 'LIABILITY' },
    { code: 'ORGANIZER_VAT_MEMO', name: 'Organizer-owned VAT memorandum account', type: 'MEMO', isOrganizerMemo: true },
    { code: 'PAYMENT_PROCESSING_EXPENSE', name: 'Payment-processing expense', type: 'EXPENSE' },
    { code: 'CHARGEBACK_EXPENSE', name: 'Chargeback expense', type: 'EXPENSE' },
    { code: 'TAX_PAYABLE', name: 'Tax payable', type: 'LIABILITY' },
    { code: 'TAX_PAYMENT_CLEARING', name: 'Tax payment clearing', type: 'ASSET' },
    { code: 'BANK', name: 'Bank', type: 'ASSET' },
    { code: 'PROCESSOR_PAYABLE_CLEARING', name: 'Processor payable / clearing', type: 'LIABILITY' },
  ];

  for (const account of ledgerAccounts) {
    await prisma.ledgerAccount.upsert({
      where: { code: account.code },
      update: {},
      create: { code: account.code, name: account.name, type: account.type, isOrganizerMemo: account.isOrganizerMemo ?? false },
    });
  }

  console.log('Tax module seed complete. ALL seeded tax rules have requiresReview=true and no approvedBy — a finance/tax reviewer must approve them via PATCH before production filings rely on them.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
