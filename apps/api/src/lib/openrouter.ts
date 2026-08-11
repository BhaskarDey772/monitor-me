import type { OpenRouterModelOption } from "@monitor-me/shared";
import { env } from "../config/env.js";
import { decryptSecret } from "./crypto.js";

/** Thin OpenRouter client: key resolution, key validation, model catalogue. */

const API_BASE = "https://openrouter.ai/api/v1";
const REQUEST_TIMEOUT_MS = 10_000;

export type ResolvedOpenRouter = {
  apiKey: string | null;
  /** Where the key came from, for logging and for the settings response. */
  keySource: "user" | "environment" | "none";
  model: string;
  modelIsDefault: boolean;
};

/**
 * Resolves the credentials a run should use: the user's own key when stored,
 * otherwise the server default from the environment.
 *
 * Decryption failure is treated as "no user key" rather than an error, so a
 * rotated ENCRYPTION_KEY degrades to the default instead of breaking every run.
 */
export function resolveOpenRouter(settings: {
  openRouterApiKey: string | null;
  openRouterModel: string | null;
}): ResolvedOpenRouter {
  const userKey = settings.openRouterApiKey
    ? decryptSecret(settings.openRouterApiKey)
    : null;

  const apiKey = userKey ?? (env.OPENROUTER_API_KEY || null);

  return {
    apiKey,
    keySource: userKey ? "user" : apiKey ? "environment" : "none",
    model: settings.openRouterModel ?? env.OPENROUTER_MODEL,
    modelIsDefault: settings.openRouterModel === null,
  };
}

/** Last four characters of a stored key, for display. Never the env default. */
export function keyHint(encrypted: string | null): string | null {
  if (!encrypted) return null;
  const plain = decryptSecret(encrypted);
  return plain ? plain.slice(-4) : null;
}

/**
 * Verifies a key against OpenRouter before it is stored, so an unusable key fails
 * at the moment the user can still fix it rather than silently at run time.
 */
export async function validateApiKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const response = await fetch(`${API_BASE}/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 401) {
      return { ok: false, reason: "OpenRouter rejected that key." };
    }
    if (!response.ok) {
      return {
        ok: false,
        reason: `OpenRouter returned ${response.status} while checking the key.`,
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: "Could not reach OpenRouter to check the key." };
  }
}

type CachedModels = { fetchedAt: number; models: OpenRouterModelOption[] };
let cache: CachedModels | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Model catalogue, cached in memory for an hour. The endpoint is public and
 * returns 400+ entries, so it is fetched once per process rather than per user.
 */
export async function listModels(): Promise<OpenRouterModelOption[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.models;

  const response = await fetch(`${API_BASE}/models`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    // Serve a stale list rather than breaking the settings page.
    if (cache) return cache.models;
    throw new Error(`OpenRouter model list failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: { id?: unknown; name?: unknown; context_length?: unknown }[];
  };

  const models = (payload.data ?? [])
    .filter((entry): entry is { id: string; name?: string; context_length?: number } =>
      typeof entry.id === "string",
    )
    .map((entry) => ({
      id: entry.id,
      name: typeof entry.name === "string" ? entry.name : entry.id,
      contextLength:
        typeof entry.context_length === "number" ? entry.context_length : null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  cache = { fetchedAt: Date.now(), models };
  return models;
}
