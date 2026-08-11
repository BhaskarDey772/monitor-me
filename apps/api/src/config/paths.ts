import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Path helpers shared by the runtime and the Prisma CLI (prisma.config.ts).
 * Deliberately dependency-free and validation-free so `prisma migrate` works
 * without the auth secrets the server requires.
 */

const here = path.dirname(fileURLToPath(import.meta.url));

/** apps/api — works from both `src/` (tsx) and `dist/` (compiled). */
export const API_ROOT = path.resolve(here, "..", "..");

/** Monorepo root, where the single shared `.env` lives. */
export const REPO_ROOT = path.resolve(API_ROOT, "..", "..");

export const ENV_FILE = path.join(REPO_ROOT, ".env");

/**
 * Turns a SQLite `file:` URL into an absolute one, resolving relative paths
 * against the repo root. Without this, `prisma migrate` (cwd apps/api) and the
 * server (cwd varies) would each open a different database file.
 */
export function resolveSqliteUrl(url: string | undefined): string | undefined {
  if (!url?.startsWith("file:")) return url;

  const filePath = url.slice("file:".length);
  if (path.isAbsolute(filePath)) return url;

  return `file:${path.resolve(REPO_ROOT, filePath)}`;
}
