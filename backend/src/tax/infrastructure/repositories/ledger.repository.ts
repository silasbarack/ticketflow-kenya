import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  PostJournalEntryInput,
  UnbalancedJournalEntryError,
} from "../../domain/ledger/journal-entry.types";

type TxClient = Prisma.TransactionClient | PrismaService;

/**
 * Double-entry ledger. Every posting MUST run inside the caller's Prisma
 * transaction (`tx`) so the journal entry commits atomically with whatever
 * business event produced it (a paid order, a refund, a tax payment...).
 *
 * Posted entries are immutable: the database rejects UPDATE/DELETE on
 * `tax_journal_entries`/`tax_journal_lines` (see the tax module migration
 * trigger `tax_journal_immutable`), and a deferred constraint trigger
 * (`tax_journal_lines_balance_check`) rejects any entry whose lines don't
 * sum to zero at COMMIT. `postEntry` also validates the balance up front
 * so callers get a fast, readable error instead of relying solely on the
 * database trigger.
 */
@Injectable()
export class LedgerRepository {
  constructor(private prisma: PrismaService) {}

  async postEntry(tx: TxClient, input: PostJournalEntryInput) {
    const imbalance = input.lines.reduce(
      (acc, line) => acc + (line.debitMinor ?? 0n) - (line.creditMinor ?? 0n),
      0n,
    );
    if (imbalance !== 0n) {
      throw new UnbalancedJournalEntryError(imbalance);
    }
    if (
      input.lines.some(
        (l) => (l.debitMinor ?? 0n) < 0n || (l.creditMinor ?? 0n) < 0n,
      )
    ) {
      throw new Error(
        "Journal lines cannot carry negative debit/credit amounts — post the offsetting side instead",
      );
    }

    const entry = await tx.journalEntry.create({
      data: {
        correlationId: input.correlationId,
        description: input.description,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        postedBy: input.postedBy,
        reversalOfId: input.reversalOfId,
        lines: {
          create: input.lines.map((line) => ({
            accountCode: line.accountCode,
            debitMinor: line.debitMinor ?? 0n,
            creditMinor: line.creditMinor ?? 0n,
            organizerId: line.organizerId ?? undefined,
            memo: line.memo,
          })),
        },
      },
      include: { lines: true },
    });
    return entry;
  }

  /**
   * Posts a reversing entry for `originalEntryId` (flips every line's
   * debit/credit). This is the ONLY supported way to correct a posted
   * entry — the originals are never updated or deleted.
   */
  async postReversal(
    tx: TxClient,
    originalEntryId: string,
    input: Omit<PostJournalEntryInput, "lines" | "reversalOfId">,
  ) {
    const original = await tx.journalEntry.findUniqueOrThrow({
      where: { id: originalEntryId },
      include: { lines: true },
    });
    return this.postEntry(tx, {
      ...input,
      reversalOfId: originalEntryId,
      lines: original.lines.map((line) => ({
        accountCode: line.accountCode as any,
        debitMinor: line.creditMinor,
        creditMinor: line.debitMinor,
        organizerId: line.organizerId,
        memo: `Reversal of ${originalEntryId}: ${line.memo ?? ""}`.trim(),
      })),
    });
  }

  async isReversed(tx: TxClient, entryId: string): Promise<boolean> {
    const reversal = await tx.journalEntry.findFirst({
      where: { reversalOfId: entryId },
    });
    return !!reversal;
  }

  async findBySource(sourceType: string, sourceId: string) {
    return this.prisma.journalEntry.findMany({
      where: { sourceType, sourceId },
      include: { lines: true },
      orderBy: { postedAt: "asc" },
    });
  }

  async accountBalance(accountCode: string, asOf?: Date): Promise<bigint> {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountCode,
        journalEntry: asOf ? { postedAt: { lte: asOf } } : undefined,
      },
      select: { debitMinor: true, creditMinor: true },
    });
    return lines.reduce((acc, l) => acc + l.debitMinor - l.creditMinor, 0n);
  }

  /** Sanity check used by reconciliation: every posted entry, summed, must net to zero. */
  async unbalancedEntryIds(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT je.id
      FROM tax_journal_entries je
      JOIN tax_journal_lines jl ON jl."journalEntryId" = je.id
      GROUP BY je.id
      HAVING SUM(jl."debitMinor") <> SUM(jl."creditMinor")
    `;
    return rows.map((r) => r.id);
  }
}
