import { prisma, fakeConfigService, fakeAudit, testTag } from "./test-helpers";
import { TaxEncryptionService } from "../../../src/tax/domain/crypto/tax-encryption.service";
import { TaxLiabilityService } from "../../../src/tax/infrastructure/repositories/tax-liability.service";
import { TaxPrnService } from "../../../src/tax/infrastructure/repositories/tax-prn.service";
import { EtimsDocumentService } from "../../../src/tax/application/etims-document.service";
import { EtimsSandboxAdapter } from "../../../src/tax/integrations/etims/etims-sandbox.adapter";
import { EtimsProductionAdapter } from "../../../src/tax/integrations/etims/etims-production.adapter";
import { TaxRemittanceService } from "../../../src/tax/application/tax-remittance.service";
import { MockKraPaymentAdapter } from "../../../src/tax/integrations/kra-payment/mock-kra-payment.adapter";
import { ManualPrnPaymentAdapter } from "../../../src/tax/integrations/kra-payment/prn-based-payment.adapter";
import { ApprovedTreasuryPaymentAdapter } from "../../../src/tax/integrations/treasury/approved-treasury-payment.adapter";
import { TaxPaymentConfigurationError } from "../../../src/tax/integrations/treasury/approved-treasury-payment.adapter";

const encryption = new TaxEncryptionService(fakeConfigService());
encryption.onModuleInit();

async function withCompanyProfile<T>(
  patch: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const before = await prisma.companyTaxProfile.findUnique({
    where: { id: "default" },
  });
  await prisma.companyTaxProfile.upsert({
    where: { id: "default" },
    update: patch as any,
    create: { id: "default", legalName: "Test Co", ...patch } as any,
  });
  try {
    return await fn();
  } finally {
    if (before) {
      await prisma.companyTaxProfile.update({
        where: { id: "default" },
        data: before as any,
      });
    }
  }
}

async function createLiability(
  overrides: Partial<
    Parameters<typeof prisma.taxLiability.create>[0]["data"]
  > = {},
) {
  return prisma.taxLiability.create({
    data: {
      taxHead: "VAT",
      owner: "TICKETFLOW",
      amountMinor: 500000n,
      status: "PRN_REQUIRED",
      idempotencyKey: testTag(),
      preparedBy: "test",
      ...overrides,
    } as any,
  });
}

describe("PRN attach/verify workflow (integration)", () => {
  const liabilities = new TaxLiabilityService(prisma as any, fakeAudit());
  const prn = new TaxPrnService(
    prisma as any,
    encryption,
    liabilities,
    fakeAudit(),
  );
  const createdLiabilityIds: string[] = [];

  afterAll(async () => {
    await prisma.taxPaymentRegistration.deleteMany({
      where: { liabilityId: { in: createdLiabilityIds } },
    });
    await prisma.taxLiability.deleteMany({
      where: { id: { in: createdLiabilityIds } },
    });
    await prisma.$disconnect();
  });

  it("#24 rejects a PRN whose taxpayer PIN does not match the company KRA PIN", async () => {
    await withCompanyProfile(
      { kraPinEncrypted: encryption.encrypt("P000111222A") },
      async () => {
        const liability = await createLiability();
        createdLiabilityIds.push(liability.id);
        await expect(
          prn.attach(
            {
              liabilityId: liability.id,
              prn: `PRN-${testTag()}`,
              taxpayerPin: "P999999999Z", // wrong PIN
              taxHead: "VAT",
              taxPeriod: "2026-03",
              amount: "5000.00",
              currency: "KES",
            },
            "finance-1",
          ),
        ).rejects.toThrow(/does not match/);
      },
    );
  });

  it("#23 rejects a PRN whose amount does not match the approved liability amount", async () => {
    await withCompanyProfile(
      { kraPinEncrypted: encryption.encrypt("P000111222A") },
      async () => {
        const liability = await createLiability();
        createdLiabilityIds.push(liability.id);
        await expect(
          prn.attach(
            {
              liabilityId: liability.id,
              prn: `PRN-${testTag()}`,
              taxpayerPin: "P000111222A",
              taxHead: "VAT",
              taxPeriod: "2026-03",
              amount: "1.00", // wrong amount vs liability's 5000.00
              currency: "KES",
            },
            "finance-1",
          ),
        ).rejects.toThrow(/does not match the approved liability amount/);
      },
    );
  });

  it("accepts a correctly matching PRN and moves it to VERIFIED on the verify step", async () => {
    await withCompanyProfile(
      { kraPinEncrypted: encryption.encrypt("P000111222A") },
      async () => {
        const liability = await createLiability();
        createdLiabilityIds.push(liability.id);
        const registration = await prn.attach(
          {
            liabilityId: liability.id,
            prn: `PRN-${testTag()}`,
            taxpayerPin: "P000111222A",
            taxHead: "VAT",
            taxPeriod: "2026-03",
            amount: "5000.00",
            currency: "KES",
          },
          "finance-1",
        );
        expect(registration.verificationStatus).toBe("PENDING");

        const verified = await prn.verify(registration.id, "finance-2");
        expect(verified.verificationStatus).toBe("VERIFIED");

        const updatedLiability = await prisma.taxLiability.findUniqueOrThrow({
          where: { id: liability.id },
        });
        expect(updatedLiability.status).toBe("PRN_ATTACHED");
      },
    );
  });

  it("the same PRN cannot be attached twice (unique PRN)", async () => {
    await withCompanyProfile(
      { kraPinEncrypted: encryption.encrypt("P000111222A") },
      async () => {
        const liabilityA = await createLiability();
        const liabilityB = await createLiability();
        createdLiabilityIds.push(liabilityA.id, liabilityB.id);
        const reusedPrn = `PRN-${testTag()}`;

        await prn.attach(
          {
            liabilityId: liabilityA.id,
            prn: reusedPrn,
            taxpayerPin: "P000111222A",
            taxHead: "VAT",
            taxPeriod: "2026-03",
            amount: "5000.00",
            currency: "KES",
          },
          "finance-1",
        );

        await expect(
          prn.attach(
            {
              liabilityId: liabilityB.id,
              prn: reusedPrn,
              taxpayerPin: "P000111222A",
              taxHead: "VAT",
              taxPeriod: "2026-03",
              amount: "5000.00",
              currency: "KES",
            },
            "finance-1",
          ),
        ).rejects.toThrow(/already been attached/);
      },
    );
  });
});

describe("eTIMS document idempotency (integration)", () => {
  const sandboxAdapter = new EtimsSandboxAdapter();
  const productionAdapter = new EtimsProductionAdapter(fakeConfigService());
  const etims = new EtimsDocumentService(
    prisma as any,
    sandboxAdapter,
    productionAdapter,
    fakeAudit(),
  );
  const createdDocIds: string[] = [];
  let anyOrderId: string;

  beforeAll(async () => {
    // tax_etims_documents.orderId carries a real FK to orders — reuse any
    // existing order rather than fabricating one through the full
    // event/ticket-type/order fixture chain, since these tests only
    // exercise idempotency, not order content.
    const order = await prisma.order.findFirstOrThrow();
    anyOrderId = order.id;
  });

  afterAll(async () => {
    await prisma.etimsDocument.deleteMany({
      where: { id: { in: createdDocIds } },
    });
    await prisma.$disconnect();
  });

  it("#21 submitting the same sale twice returns the same document, never a duplicate row", async () => {
    await withCompanyProfile({ etimsMode: "SANDBOX" }, async () => {
      const calculationId = testTag();
      const request = {
        sellerLegalName: "TicketFlow Kenya Limited",
        sellerKraPin: "P000111222A",
        invoiceNumber: "TFK-TEST-1",
        invoiceDateTime: new Date().toISOString(),
        currency: "KES" as const,
        lines: [],
        totalTaxableAmountMinor: 1000n,
        totalVatAmountMinor: 160n,
        totalAmountMinor: 1160n,
      };

      const first = await etims.submitInvoice(
        anyOrderId,
        calculationId,
        request,
        "admin-1",
      );
      createdDocIds.push(first.id);
      const second = await etims.submitInvoice(
        anyOrderId,
        calculationId,
        request,
        "admin-1",
      );

      expect(second.id).toBe(first.id);
      expect(first.status).toBe("SANDBOX_SIMULATED");

      const count = await prisma.etimsDocument.count({
        where: { idempotencyKey: `ETIMS-INVOICE:${calculationId}` },
      });
      expect(count).toBe(1);
    });
  });

  it("DISABLED etims mode blocks submission with PENDING_CONFIGURATION and never fabricates SUBMITTED/ACCEPTED", async () => {
    await withCompanyProfile({ etimsMode: "DISABLED" }, async () => {
      const calculationId = testTag();
      const doc = await etims.submitInvoice(
        anyOrderId,
        calculationId,
        {
          sellerLegalName: "TicketFlow Kenya Limited",
          sellerKraPin: "P000111222A",
          invoiceNumber: "TFK-TEST-2",
          invoiceDateTime: new Date().toISOString(),
          currency: "KES",
          lines: [],
          totalTaxableAmountMinor: 1000n,
          totalVatAmountMinor: 160n,
          totalAmountMinor: 1160n,
        },
        "admin-1",
      );
      createdDocIds.push(doc.id);
      expect(doc.status).toBe("PENDING_CONFIGURATION");
    });
  });
});

describe("tax payment adapters (integration)", () => {
  const liabilityService = new TaxLiabilityService(prisma as any, fakeAudit());
  const mockAdapter = new MockKraPaymentAdapter(prisma as any);
  const manualAdapter = new ManualPrnPaymentAdapter(prisma as any, fakeAudit());
  const createdLiabilityIds: string[] = [];

  afterAll(async () => {
    await prisma.taxRemittance.deleteMany({
      where: { liabilityId: { in: createdLiabilityIds } },
    });
    await prisma.taxPaymentRegistration.deleteMany({
      where: { liabilityId: { in: createdLiabilityIds } },
    });
    await prisma.taxLiability.deleteMany({
      where: { id: { in: createdLiabilityIds } },
    });
    await prisma.$disconnect();
  });

  async function approvedLiabilityWithVerifiedPrn() {
    const liability = await createLiability({ status: "PRN_ATTACHED" } as any);
    createdLiabilityIds.push(liability.id);
    const registration = await prisma.taxPaymentRegistration.create({
      data: {
        liabilityId: liability.id,
        taxpayerPinMasked: "******9999",
        taxHead: "VAT",
        taxPeriod: "2026-03",
        prnEncrypted: encryption.encrypt(`PRN-${testTag()}`),
        prnHash: encryption.fingerprint(testTag()),
        amountMinor: liability.amountMinor,
        verificationStatus: "VERIFIED",
        createdBy: "test",
      },
    });
    return { liability, registration };
  }

  it("#28 an unconfigured APPROVED_BANK_INTEGRATION adapter fails closed to REQUIRES_REVIEW rather than faking success", async () => {
    await withCompanyProfile(
      { taxPaymentMode: "APPROVED_BANK_INTEGRATION" },
      async () => {
        const { liability } = await approvedLiabilityWithVerifiedPrn();
        const approvedAdapter = new ApprovedTreasuryPaymentAdapter(
          fakeConfigService({}),
          prisma as any,
          fakeAudit(),
        );
        const remittanceService = new TaxRemittanceService(
          prisma as any,
          liabilityService,
          mockAdapter,
          manualAdapter,
          approvedAdapter,
          fakeAudit(),
          fakeConfigService({ TAX_MAKER_CHECKER_ENABLED: "true" }),
        );

        await expect(
          remittanceService.initiate(liability.id, "finance-1"),
        ).rejects.toBeInstanceOf(TaxPaymentConfigurationError);

        const updatedLiability = await prisma.taxLiability.findUniqueOrThrow({
          where: { id: liability.id },
        });
        expect(updatedLiability.status).toBe("REQUIRES_REVIEW");

        const remittance = await prisma.taxRemittance.findFirstOrThrow({
          where: { liabilityId: liability.id },
        });
        expect(remittance.status).toBe("REQUIRES_REVIEW");
        expect(["PAID", "SANDBOX_SIMULATED", "SUBMITTED"]).not.toContain(
          remittance.status,
        );
      },
    );
  });

  it("#29 retrying an already-PAID liability returns the existing receipt instead of paying again", async () => {
    await withCompanyProfile({ taxPaymentMode: "SANDBOX" }, async () => {
      const { liability } = await approvedLiabilityWithVerifiedPrn();
      const approvedAdapter = new ApprovedTreasuryPaymentAdapter(
        fakeConfigService({}),
        prisma as any,
        fakeAudit(),
      );
      const remittanceService = new TaxRemittanceService(
        prisma as any,
        liabilityService,
        mockAdapter,
        manualAdapter,
        approvedAdapter,
        fakeAudit(),
        fakeConfigService({ TAX_MAKER_CHECKER_ENABLED: "false" }),
      );

      const first = await remittanceService.initiate(liability.id, "finance-1");
      expect(first.status).toBe("SANDBOX_SIMULATED");

      // Force it to PAID to simulate a completed flow, then retry initiate().
      await prisma.taxRemittance.update({
        where: { id: first.id },
        data: { status: "PAID" },
      });
      const second = await remittanceService.initiate(
        liability.id,
        "finance-1",
      );
      expect(second.id).toBe(first.id);

      const count = await prisma.taxRemittance.count({
        where: { liabilityId: liability.id },
      });
      expect(count).toBe(1); // never a second remittance row for the same liability
    });
  });

  it("#22 duplicate payment attempt: initiating twice in a row is idempotent, not two remittances", async () => {
    await withCompanyProfile({ taxPaymentMode: "SANDBOX" }, async () => {
      const { liability } = await approvedLiabilityWithVerifiedPrn();
      const approvedAdapter = new ApprovedTreasuryPaymentAdapter(
        fakeConfigService({}),
        prisma as any,
        fakeAudit(),
      );
      const remittanceService = new TaxRemittanceService(
        prisma as any,
        liabilityService,
        mockAdapter,
        manualAdapter,
        approvedAdapter,
        fakeAudit(),
        fakeConfigService({ TAX_MAKER_CHECKER_ENABLED: "false" }),
      );

      const [a, b] = await Promise.all([
        remittanceService.initiate(liability.id, "finance-1"),
        remittanceService.initiate(liability.id, "finance-1"),
      ]);
      const count = await prisma.taxRemittance.count({
        where: { liabilityId: liability.id },
      });
      expect(count).toBe(1);
      expect(a.id).toBe(b.id);
    });
  });
});
