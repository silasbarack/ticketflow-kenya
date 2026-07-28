import * as path from "path";
import * as dotenv from "dotenv";

// Plain Jest tests don't go through Nest's ConfigModule (which loads .env
// via dotenv on bootstrap), so integration tests that talk to the real
// PrismaClient need this loaded explicitly to pick up DATABASE_URL.
dotenv.config({ path: path.join(__dirname, "../../../.env") });

// A fixed 32-byte test key so TaxEncryptionService can encrypt/decrypt in
// tests without depending on whatever (if anything) is configured in the
// developer's real .env. NOT used for any real secret.
if (!process.env.TAX_ENCRYPTION_KEY) {
  process.env.TAX_ENCRYPTION_KEY = "0".repeat(64);
}
