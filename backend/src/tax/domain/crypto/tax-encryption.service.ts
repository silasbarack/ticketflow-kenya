import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * AES-256-GCM encryption for sensitive tax identifiers (KRA PINs, PRNs).
 *
 * Key comes from TAX_ENCRYPTION_KEY (32 bytes, hex or base64 encoded) — an
 * environment variable / secret manager entry, never hard-coded. Ciphertext
 * is versioned ("v1:") so the key/algorithm can be rotated later without
 * breaking old records (see docs/ticketflow-tax-architecture.md "Key
 * rotation").
 *
 * This service NEVER logs plaintext and its `mask()` helper is the only
 * approved way to surface part of a sensitive value in an API response or
 * audit log.
 */
@Injectable()
export class TaxEncryptionService implements OnModuleInit {
  private readonly logger = new Logger("TaxEncryptionService");
  private key: Buffer | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const raw = this.configService.get<string>("TAX_ENCRYPTION_KEY");
    if (!raw) {
      this.logger.warn(
        "TAX_ENCRYPTION_KEY is not set — encrypt()/decrypt() will throw until it is configured. This is expected in a fresh dev checkout, but must be set before any KRA PIN or PRN is stored.",
      );
      return;
    }
    this.key = this.parseKey(raw);
  }

  private parseKey(raw: string): Buffer {
    // Accept hex (64 chars) or base64.
    const hex = /^[0-9a-fA-F]{64}$/.test(raw)
      ? Buffer.from(raw, "hex")
      : Buffer.from(raw, "base64");
    if (hex.length !== 32) {
      throw new Error(
        "TAX_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256). Generate one with: openssl rand -hex 32",
      );
    }
    return hex;
  }

  private requireKey(): Buffer {
    if (!this.key) {
      throw new Error(
        "TAX_ENCRYPTION_KEY is not configured — cannot encrypt or decrypt sensitive tax identifiers. Set it before storing KRA PINs or PRNs.",
      );
    }
    return this.key;
  }

  encrypt(plaintext: string): string {
    const key = this.requireKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
  }

  decrypt(payload: string): string {
    const key = this.requireKey();
    const parts = payload.split(":");
    if (parts.length !== 4 || parts[0] !== "v1") {
      throw new Error("Unrecognized tax ciphertext format");
    }
    const [, ivB64, tagB64, dataB64] = parts;
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  }

  /** Masks a sensitive identifier for display/audit, keeping only the last `visible` characters. */
  mask(plaintext: string, visible = 4): string {
    if (plaintext.length <= visible) return "*".repeat(plaintext.length);
    return `${"*".repeat(plaintext.length - visible)}${plaintext.slice(-visible)}`;
  }

  /** Deterministic, non-reversible fingerprint used for uniqueness checks (e.g. "this PRN was already used") without storing plaintext in an index. */
  fingerprint(plaintext: string): string {
    return createHash("sha256").update(plaintext).digest("hex");
  }
}
