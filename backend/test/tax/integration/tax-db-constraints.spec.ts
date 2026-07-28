import { prisma, testTag } from "./test-helpers";

describe("database-level tax constraints (integration, real Postgres)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("tax_rules — no overlapping enabled effective-dated rules (#GiST exclusion constraint)", () => {
    const createdIds: string[] = [];

    afterEach(async () => {
      if (createdIds.length) {
        await prisma.taxRule.deleteMany({ where: { id: { in: createdIds } } });
        createdIds.length = 0;
      }
    });

    it("allows two non-overlapping rules for the same code", async () => {
      const a = await prisma.taxRule.create({
        data: {
          code: "OTHER",
          rateBps: 100,
          effectiveFrom: new Date("2020-01-01"),
          effectiveTo: new Date("2020-06-01"),
          createdBy: "test",
        },
      });
      const b = await prisma.taxRule.create({
        data: {
          code: "OTHER",
          rateBps: 200,
          effectiveFrom: new Date("2020-06-01"),
          effectiveTo: null,
          createdBy: "test",
        },
      });
      createdIds.push(a.id, b.id);
      expect(a.id).toBeDefined();
      expect(b.id).toBeDefined();
    });

    it("rejects an overlapping enabled rule for the same code+jurisdiction at the database level", async () => {
      const a = await prisma.taxRule.create({
        data: {
          code: "OTHER",
          rateBps: 100,
          effectiveFrom: new Date("2021-01-01"),
          effectiveTo: new Date("2021-12-31"),
          createdBy: "test",
        },
      });
      createdIds.push(a.id);

      await expect(
        prisma.taxRule.create({
          data: {
            code: "OTHER",
            rateBps: 300,
            effectiveFrom: new Date("2021-06-01"),
            effectiveTo: null,
            createdBy: "test",
          },
        }),
      ).rejects.toThrow();
    });

    it("allows an overlapping DISABLED rule (the exclusion constraint only applies WHERE enabled)", async () => {
      const a = await prisma.taxRule.create({
        data: {
          code: "OTHER",
          rateBps: 100,
          effectiveFrom: new Date("2022-01-01"),
          effectiveTo: null,
          createdBy: "test",
        },
      });
      const b = await prisma.taxRule.create({
        data: {
          code: "OTHER",
          rateBps: 999,
          effectiveFrom: new Date("2022-01-01"),
          effectiveTo: null,
          enabled: false,
          createdBy: "test",
        },
      });
      createdIds.push(a.id, b.id);
      expect(b.enabled).toBe(false);
    });

    it("the application-level TaxRuleRepository surfaces this as a friendly OverlappingTaxRuleError", async () => {
      const { TaxRuleRepository } =
        await import("../../../src/tax/infrastructure/repositories/tax-rule.repository");
      const { OverlappingTaxRuleError } =
        await import("../../../src/tax/domain/tax-rule/tax-rule.types");
      const repo = new TaxRuleRepository(prisma as any);

      const a = await repo.create({
        code: "OTHER",
        rateBps: 100,
        effectiveFrom: new Date("2023-01-01"),
        effectiveTo: null,
        createdBy: "test",
      });
      createdIds.push(a.id);

      await expect(
        repo.create({
          code: "OTHER",
          rateBps: 500,
          effectiveFrom: new Date("2023-06-01"),
          createdBy: "test",
        }),
      ).rejects.toBeInstanceOf(OverlappingTaxRuleError);
    });
  });

  describe("tax_journal_entries / tax_journal_lines — append-only immutability trigger", () => {
    let entryId: string;

    afterAll(async () => {
      // Cleanup requires a raw statement since the app-level trigger blocks
      // normal DELETE too — that's the point of the test, so clean up via
      // a session-local trigger bypass is deliberately NOT provided. These
      // rows are harmless, tagged test fixtures; leaving them is the
      // correct behaviour of an append-only ledger.
      void entryId;
    });

    it("accepts a balanced posted entry", async () => {
      const entry = await prisma.journalEntry.create({
        data: {
          correlationId: testTag(),
          description: "immutability test fixture",
          sourceType: "Test",
          sourceId: testTag(),
          lines: {
            create: [
              { accountCode: "BANK", debitMinor: 100n },
              { accountCode: "TAX_PAYABLE", creditMinor: 100n },
            ],
          },
        },
        include: { lines: true },
      });
      entryId = entry.id;
      expect(entry.lines).toHaveLength(2);
    });

    it("rejects UPDATE on a posted journal entry", async () => {
      await expect(
        prisma.journalEntry.update({
          where: { id: entryId },
          data: { description: "tampered" },
        }),
      ).rejects.toThrow();
    });

    it("rejects DELETE on a posted journal entry", async () => {
      await expect(
        prisma.journalEntry.delete({ where: { id: entryId } }),
      ).rejects.toThrow();
    });

    it("rejects UPDATE on a posted journal line", async () => {
      const line = await prisma.journalLine.findFirstOrThrow({
        where: { journalEntryId: entryId },
      });
      await expect(
        prisma.journalLine.update({
          where: { id: line.id },
          data: { debitMinor: 999n },
        }),
      ).rejects.toThrow();
    });

    it("an unbalanced multi-row insert is rejected at COMMIT by the deferred balance trigger", async () => {
      await expect(
        prisma
          .$transaction([
            prisma.journalEntry.create({
              data: {
                correlationId: testTag(),
                description: "unbalanced",
                sourceType: "Test",
                sourceId: testTag(),
              },
            }),
          ])
          .then(async ([entry]) => {
            await prisma.$transaction([
              prisma.journalLine.create({
                data: {
                  journalEntryId: entry.id,
                  accountCode: "BANK",
                  debitMinor: 500n,
                },
              }),
              prisma.journalLine.create({
                data: {
                  journalEntryId: entry.id,
                  accountCode: "TAX_PAYABLE",
                  creditMinor: 400n,
                },
              }),
            ]);
          }),
      ).rejects.toThrow();
    });
  });

  describe("tax_remittances — only one PAID remittance per liability (partial unique index)", () => {
    let liabilityId: string;

    beforeAll(async () => {
      const liability = await prisma.taxLiability.create({
        data: {
          taxHead: "VAT",
          owner: "TICKETFLOW",
          amountMinor: 100000n,
          status: "PAID",
          idempotencyKey: testTag(),
          preparedBy: "test",
        },
      });
      liabilityId = liability.id;
    });

    afterAll(async () => {
      await prisma.taxRemittance.deleteMany({ where: { liabilityId } });
      await prisma.taxLiability.delete({ where: { id: liabilityId } });
    });

    it("allows the first PAID remittance", async () => {
      const remittance = await prisma.taxRemittance.create({
        data: {
          liabilityId,
          adapter: "MOCK",
          status: "PAID",
          amountMinor: 100000n,
          idempotencyKey: testTag(),
          initiatedBy: "test",
        },
      });
      expect(remittance.id).toBeDefined();
    });

    it("rejects a second PAID remittance for the same liability", async () => {
      await expect(
        prisma.taxRemittance.create({
          data: {
            liabilityId,
            adapter: "MOCK",
            status: "PAID",
            amountMinor: 100000n,
            idempotencyKey: testTag(),
            initiatedBy: "test",
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe("non-negative money CHECK constraints", () => {
    it("rejects a negative liability amount", async () => {
      await expect(
        prisma.taxLiability.create({
          data: {
            taxHead: "VAT",
            owner: "TICKETFLOW",
            amountMinor: -1n,
            status: "DRAFT",
            idempotencyKey: testTag(),
            preparedBy: "test",
          },
        }),
      ).rejects.toThrow();
    });
  });
});
