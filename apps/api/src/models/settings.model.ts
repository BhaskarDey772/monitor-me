import type { UpdateSettingsInput } from "@monitor-me/shared";
import { encryptSecret } from "../lib/crypto.js";
import { generateNtfyTopic } from "../lib/ntfy.js";
import { prisma } from "../lib/prisma.js";

/**
 * Settings are created lazily on first read, so a user provisioned before this
 * feature existed still gets a row (and a shared ntfy topic) without a backfill.
 */
export function findOrCreateForUser(userId: string) {
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId, ntfySharedTopic: generateNtfyTopic() },
  });
}

/**
 * Applies a partial update.
 *
 * `null` means "clear and fall back to the server default"; an absent key means
 * "leave alone". The API key is encrypted here so no caller can accidentally
 * write it in cleartext.
 */
export async function updateForUser(userId: string, input: UpdateSettingsInput) {
  await findOrCreateForUser(userId);

  const data: {
    ntfyMode?: string;
    openRouterModel?: string | null;
    openRouterApiKey?: string | null;
  } = {};

  if (input.ntfyMode !== undefined) data.ntfyMode = input.ntfyMode;
  if (input.openRouterModel !== undefined) {
    data.openRouterModel = input.openRouterModel;
  }
  if (input.openRouterApiKey !== undefined) {
    data.openRouterApiKey =
      input.openRouterApiKey === null
        ? null
        : encryptSecret(input.openRouterApiKey);
  }

  return prisma.userSettings.update({ where: { userId }, data });
}
