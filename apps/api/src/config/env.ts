import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { ENV_FILE, resolveSqliteUrl } from "./paths.js";

/**
 * Loads and validates the single shared root `.env`.
 *
 * Fail-fast on boot: a missing or weak BETTER_AUTH_SECRET, or a bad origin,
 * would otherwise degrade silently into insecure defaults at runtime.
 */

loadEnv({ path: ENV_FILE, quiet: true });

const originSchema = z.url({
  protocol: /^https?$/,
  error: "Must be an absolute http(s) origin, e.g. http://localhost:5173",
});

/** Strips a trailing slash so origin comparisons are exact. */
const toOrigin = (value: string) => new URL(value).origin;

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    DATABASE_URL: z
      .string()
      .min(1, { error: "DATABASE_URL is required." })
      .transform((url) => resolveSqliteUrl(url) ?? url),

    BETTER_AUTH_SECRET: z.string().min(32, {
      error:
        "BETTER_AUTH_SECRET must be at least 32 characters. Generate one with `npx auth@latest secret`.",
    }),
    BETTER_AUTH_URL: originSchema,

    SERVER_URL: originSchema.transform(toOrigin),

    /** Comma-separated browser origin allowlist for CORS + CSRF. */
    CLIENT_URL: z
      .string()
      .default("http://localhost:5173")
      .transform((value) =>
        value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      )
      .pipe(z.array(originSchema).min(1))
      .transform((origins) => origins.map(toOrigin)),
  })
  .transform((env) => ({
    ...env,
    isProduction: env.NODE_ENV === "production",
    isDevelopment: env.NODE_ENV === "development",
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Invalid environment. Copy .env.example to .env at the repo root and fix:\n${issues}`,
  );
}

export const env = parsed.data;
export type Env = typeof env;
