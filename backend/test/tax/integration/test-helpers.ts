import { PrismaClient } from "@prisma/client";
import { ConfigService } from "@nestjs/config";

export const prisma = new PrismaClient();

export function fakeConfigService(
  overrides: Record<string, string> = {},
): ConfigService {
  const values: Record<string, string> = {
    TAX_ENCRYPTION_KEY: process.env.TAX_ENCRYPTION_KEY!,
    ...overrides,
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

export function fakeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn(),
  } as any;
}

/** Unique-enough id fragments so parallel/repeated test runs never collide with real or other test data. */
export function testTag(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
