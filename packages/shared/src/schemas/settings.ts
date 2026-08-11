import { z } from "zod";
import type { NtfyLinks } from "../utils/ntfy.js";

/**
 * User settings contracts.
 *
 * Note what the read shape deliberately does NOT contain: the OpenRouter API key.
 * A stored key is only ever described (present or not, last four characters, which
 * source is in use), never returned — and the server default from the environment
 * is not exposed even as a hint.
 */

export const NTFY_MODES = ["per_monitor", "shared"] as const;
export type NtfyMode = (typeof NTFY_MODES)[number];

export const NTFY_MODE_LABELS: Record<NtfyMode, string> = {
  per_monitor: "A separate channel for each monitor",
  shared: "One shared channel for all monitors",
};

/** OpenRouter model ids look like `vendor/model[:variant]`. */
export const openRouterModelSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9._-]+\/[a-z0-9._:-]+$/i, {
    error: "Model must look like vendor/model, e.g. openai/gpt-4o-mini.",
  });

/** OpenRouter keys are `sk-or-...`; length is not fixed, so only the prefix is checked. */
export const openRouterApiKeySchema = z
  .string()
  .trim()
  .min(20, { error: "That key looks too short." })
  .max(200, { error: "That key looks too long." })
  .startsWith("sk-or-", { error: "OpenRouter keys start with sk-or-." });

/**
 * Every field optional: the form submits only what changed.
 *
 * `null` is meaningful and distinct from absent — it clears the stored value and
 * falls back to the server default. `openRouterApiKey` is write-only.
 */
export const updateSettingsSchema = z
  .object({
    ntfyMode: z.enum(NTFY_MODES).optional(),
    openRouterModel: openRouterModelSchema.nullable().optional(),
    openRouterApiKey: openRouterApiKeySchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: "Provide at least one setting to update.",
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export type SettingsDto = {
  ntfyMode: NtfyMode;
  /** Subscribe links for the shared channel, used when ntfyMode is "shared". */
  sharedNtfy: NtfyLinks;
  openRouter: {
    /** The model that will actually be used, custom or default. */
    model: string;
    /** True when `model` came from the environment rather than this user. */
    modelIsDefault: boolean;
    /** True when the user stored their own key. */
    hasCustomKey: boolean;
    /** Last four characters of the user's own key. Never the server default. */
    customKeyHint: string | null;
    /** False when no key is configured anywhere — nothing would work. */
    keyConfigured: boolean;
  };
};

export type OpenRouterModelOption = {
  id: string;
  name: string;
  contextLength: number | null;
};
