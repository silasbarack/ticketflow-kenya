export interface TaxAuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string | null;
  correlationId: string;
  requestId?: string | null;
  beforeHash?: string | null;
  afterHash?: string | null;
  metadata: Record<string, unknown>;
  occurredAt: Date;
}

/**
 * Fields that must never appear in TaxAuditEvent.metadata, even truncated.
 * Enforced by TaxAuditService.log() via `redactSecrets`.
 */
export const NEVER_LOG_KEYS = [
  "password",
  "kraPassword",
  "kraPin",
  "fullKraPin",
  "bankAccountNumber",
  "bankCredentials",
  "privateKey",
  "accessToken",
  "refreshToken",
  "encryptionKey",
  "prn",
  "cardNumber",
  "cvv",
  "mpesaPin",
];
