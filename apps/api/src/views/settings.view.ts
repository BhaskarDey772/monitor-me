import type { SettingsDto, NtfyMode } from "@monitor-me/shared";
import type { UserSettings } from "../generated/prisma/client.js";
import { ntfyLinksFor } from "../lib/ntfy.js";
import { keyHint, resolveOpenRouter } from "../lib/openrouter.js";

/**
 * Allowlist serializer for settings.
 *
 * The stored OpenRouter key is never serialized — only whether one exists and its
 * last four characters. The environment default is not described at all beyond
 * "a key is configured", so a client cannot learn anything about it.
 */
export function toSettingsDto(settings: UserSettings): SettingsDto {
  const resolved = resolveOpenRouter(settings);

  return {
    ntfyMode: (settings.ntfyMode === "shared" ? "shared" : "per_monitor") satisfies NtfyMode,
    sharedNtfy: ntfyLinksFor(settings.ntfySharedTopic, "monitor-me alerts"),
    openRouter: {
      model: resolved.model,
      modelIsDefault: resolved.modelIsDefault,
      hasCustomKey: resolved.keySource === "user",
      customKeyHint: keyHint(settings.openRouterApiKey),
      keyConfigured: resolved.keySource !== "none",
    },
  };
}
