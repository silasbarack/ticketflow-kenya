import { LedgerRepository } from "../../src/tax/infrastructure/repositories/ledger.repository";
import { UnbalancedJournalEntryError } from "../../src/tax/domain/ledger/journal-entry.types";
import { LEDGER_ACCOUNTS } from "../../src/tax/domain/ledger/accounts";
import { TicketSaleLedgerPostingService } from "../../src/tax/application/post-ticket-sale-ledger-entries.service";
import {
  calculateTicketSaleTax,
  TicketSaleTaxRates,
} from "../../src/tax/domain/calculation/calculate-ticket-sale-tax.logic";
import { money } from "../../src/tax/domain/money/money";
import { CalculateTicketSaleTaxInput } from "../../src/tax/domain/calculation/ticket-sale-tax.types";

/** Minimal fake Prisma transaction client — just enough surface for LedgerRepository.postEntry. */
function makeFakeTx() {
  const createdEntries: any[] = [];
  const tx: any = {
    journalEntry: {
      create: jest.fn(async ({ data }: any) => {
        const entry = {
          id: `entry-${createdEntries.length + 1}`,
          ...data,
          lines: data.lines.create.map((l: any, i: number) => ({
            id: `line-${i}`,
            ...l,
          })),
        };
        createdEntries.push(entry);
        return entry;
      }),
    },
  };
  return { tx, createdEntries };
}

describe("LedgerRepository.postEntry — #31 every journal entry balances", () => {
  it("rejects an unbalanced entry before it ever reaches the database", async () => {
    const repo = new LedgerRepository({} as any);
    const { tx } = makeFakeTx();
    await expect(
      repo.postEntry(tx, {
        correlationId: "c1",
        description: "bad entry",
        sourceType: "Test",
        sourceId: "t1",
        lines: [
          { accountCode: LEDGER_ACCOUNTS.BANK, debitMinor: 100n },
          { accountCode: LEDGER_ACCOUNTS.TAX_PAYABLE, creditMinor: 99n },
        ],
      }),
    ).rejects.toBeInstanceOf(UnbalancedJournalEntryError);
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects negative debit/credit amounts", async () => {
    const repo = new LedgerRepository({} as any);
    const { tx } = makeFakeTx();
    await expect(
      repo.postEntry(tx, {
        correlationId: "c1",
        description: "negative amount",
        sourceType: "Test",
        sourceId: "t1",
        lines: [
          { accountCode: LEDGER_ACCOUNTS.BANK, debitMinor: -100n },
          { accountCode: LEDGER_ACCOUNTS.TAX_PAYABLE, creditMinor: -100n },
        ],
      }),
    ).rejects.toThrow();
  });

  it("accepts a balanced entry", async () => {
    const repo = new LedgerRepository({} as any);
    const { tx, createdEntries } = makeFakeTx();
    const entry = await repo.postEntry(tx, {
      correlationId: "c1",
      description: "balanced entry",
      sourceType: "Test",
      sourceId: "t1",
      lines: [
        { accountCode: LEDGER_ACCOUNTS.BANK, debitMinor: 100n },
        { accountCode: LEDGER_ACCOUNTS.TAX_PAYABLE, creditMinor: 100n },
      ],
    });
    expect(entry.id).toBeDefined();
    expect(createdEntries).toHaveLength(1);
  });
});

describe("TicketSaleLedgerPostingService — postings for the KES 1,600 demo sale", () => {
  const RATES: TicketSaleTaxRates = {
    ticketFlowVatRateBps: 1600,
    ticketFlowRuleId: "rule-tf",
    ticketFlowRoundingMode: "HALF_UP",
    organizerVatRateBps: 1600,
    organizerRuleId: "rule-org",
    organizerRoundingMode: "HALF_UP",
  };

  function demoInput(): CalculateTicketSaleTaxInput {
    return {
      transactionId: "txn-1",
      orderId: "order-1",
      eventId: "event-1",
      organizerId: "organizer-1",
      transactionDate: "2026-03-01T00:00:00.000Z",
      currency: "KES",
      agencyModel: "DISCLOSED_AGENT",
      ticketLines: [
        {
          ticketTypeId: "regular",
          quantity: 1,
          unitTicketPrice: money(150000n),
          ticketPricingMode: "VAT_INCLUSIVE",
          eventSupplyTreatment: "STANDARD_RATED",
        },
      ],
      customerBookingFee: {
        calculation: { kind: "FIXED", amount: money(10000n) },
        pricingMode: "VAT_INCLUSIVE",
      },
      organizerCommission: {
        calculation: { kind: "PERCENTAGE", rateBps: 500 },
        pricingMode: "VAT_INCLUSIVE",
      },
      processorCharge: money(4000n),
      processorChargeBearer: "TICKETFLOW",
      ticketFlowVatRegistrationStatus: "REGISTERED",
      organizerVatRegistrationStatus: "REGISTERED",
    };
  }

  it("produces exactly the three entries described in the spec, each individually balanced", async () => {
    const calculation = calculateTicketSaleTax(
      demoInput(),
      RATES,
      () => "calc-1",
    );
    const ledgerRepo = new LedgerRepository({} as any);
    const service = new TicketSaleLedgerPostingService(ledgerRepo);
    const { tx, createdEntries } = makeFakeTx();

    const entries = await service.postTicketSale(tx, {
      calculation,
      orderId: "order-1",
      organizerId: "organizer-1",
      clearingAccount: LEDGER_ACCOUNTS.CASH_MPESA_CLEARING,
      processorChargeBearer: "TICKETFLOW",
    });

    expect(entries).toHaveLength(3);
    expect(createdEntries).toHaveLength(3);

    for (const entry of createdEntries) {
      const debit = entry.lines.reduce(
        (s: bigint, l: any) => s + (l.debitMinor ?? 0n),
        0n,
      );
      const credit = entry.lines.reduce(
        (s: bigint, l: any) => s + (l.creditMinor ?? 0n),
        0n,
      );
      expect(debit).toBe(credit);
    }

    const [entry1, entry2, entry3] = createdEntries;
    expect(
      entry1.lines.find(
        (l: any) => l.accountCode === LEDGER_ACCOUNTS.CASH_MPESA_CLEARING,
      ).debitMinor,
    ).toBe(160000n);
    expect(
      entry1.lines.find(
        (l: any) => l.accountCode === LEDGER_ACCOUNTS.ORGANIZER_PAYABLE,
      ).creditMinor,
    ).toBe(150000n);
    expect(
      entry1.lines.find(
        (l: any) => l.accountCode === LEDGER_ACCOUNTS.BOOKING_FEE_REVENUE,
      ).creditMinor,
    ).toBe(8621n);
    expect(
      entry1.lines.find(
        (l: any) => l.accountCode === LEDGER_ACCOUNTS.TICKETFLOW_VAT_PAYABLE,
      ).creditMinor,
    ).toBe(1379n);

    expect(
      entry2.lines.find(
        (l: any) => l.accountCode === LEDGER_ACCOUNTS.ORGANIZER_PAYABLE,
      ).debitMinor,
    ).toBe(7500n);
    expect(
      entry2.lines.find(
        (l: any) => l.accountCode === LEDGER_ACCOUNTS.COMMISSION_REVENUE,
      ).creditMinor,
    ).toBe(6466n);

    expect(
      entry3.lines.find(
        (l: any) =>
          l.accountCode === LEDGER_ACCOUNTS.PAYMENT_PROCESSING_EXPENSE,
      ).debitMinor,
    ).toBe(4000n);
    expect(
      entry3.lines.find(
        (l: any) =>
          l.accountCode === LEDGER_ACCOUNTS.PROCESSOR_PAYABLE_CLEARING,
      ).creditMinor,
    ).toBe(4000n);
  });
});
