import { randomBytes } from "node:crypto";
import { buildNtfyLinks, type NtfyLinks } from "@monitor-me/shared";
import { env } from "../config/env.js";

/**
 * ntfy has no per-topic access control on ntfy.sh: the docs state plainly that
 * "the topic is essentially a password, so pick something that's not easily
 * guessable". Anyone who learns a topic can both read the alerts and publish
 * fake ones.
 *
 * So topics are generated here from the CSPRNG and never derived from anything
 * guessable — not the monitor id (which appears in URLs), not the name, not the
 * user id. 24 characters of base62 is ~143 bits.
 */

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TOPIC_LENGTH = 24;

export function generateNtfyTopic(): string {
  // Rejection-free mapping: 62 does not divide 256, so draw extra bytes and take
  // only values below the largest clean multiple to avoid modulo bias.
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let topic = "";

  while (topic.length < TOPIC_LENGTH) {
    for (const byte of randomBytes(TOPIC_LENGTH)) {
      if (byte >= limit) continue;
      topic += ALPHABET[byte % ALPHABET.length];
      if (topic.length === TOPIC_LENGTH) break;
    }
  }

  return `monitor-${topic}`;
}

/** Links for a topic, against the configured ntfy server. */
export function ntfyLinksFor(topic: string, displayName?: string): NtfyLinks {
  return buildNtfyLinks({
    serverUrl: env.NTFY_SERVER,
    topic,
    // First allowed client origin is the canonical public one. It must be an
    // address the *phone* can reach — `localhost` resolves to the phone itself,
    // so use a LAN IP or a real hostname when scanning from a device.
    appOrigin: env.CLIENT_URL[0]!,
    ...(displayName ? { displayName } : {}),
  });
}
