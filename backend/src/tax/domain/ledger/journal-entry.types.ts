import { LedgerAccountCode } from "./accounts";

export interface JournalLineInput {
  accountCode: LedgerAccountCode;
  debitMinor?: bigint;
  creditMinor?: bigint;
  organizerId?: string | null;
  memo?: string;
}

export interface PostJournalEntryInput {
  correlationId: string;
  description: string;
  sourceType: string;
  sourceId: string;
  postedBy?: string;
  reversalOfId?: string;
  lines: JournalLineInput[];
}

export class UnbalancedJournalEntryError extends Error {
  constructor(imbalanceMinor: bigint) {
    super(
      `Journal entry does not balance: debit - credit = ${imbalanceMinor.toString()} minor units`,
    );
    this.name = "UnbalancedJournalEntryError";
  }
}
