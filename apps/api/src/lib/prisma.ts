import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

/**
 * Prisma 7 talks to SQLite through a driver adapter.
 *
 * All access goes through the query builder, which sends parameterized
 * statements — the reason this codebase has no SQL-injection surface. If raw SQL
 * is ever unavoidable, use `$queryRaw` with tagged-template placeholders
 * (never `$queryRawUnsafe` with interpolated input).
 */

const adapter = new PrismaBetterSqlite3({ url: env.DATABASE_URL });

const createPrismaClient = () =>
  new PrismaClient({
    adapter,
    log: env.isDevelopment ? ["warn", "error"] : ["error"],
  });

// Reuse the client across `tsx watch` reloads so SQLite isn't opened repeatedly.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!env.isProduction) globalForPrisma.prisma = prisma;
