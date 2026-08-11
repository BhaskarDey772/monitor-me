import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "../config/env.js";

/**
 * Authenticated symmetric encryption for secrets this app must store and later
 * use in cleartext — currently a user's own OpenRouter API key.
 *
 * AES-256-GCM, so the ciphertext is tamper-evident: a modified record fails
 * authentication on decrypt instead of silently producing garbage that gets sent
 * to a third party as a bearer token.
 *
 * A hash would be wrong here. The key has to be replayed to OpenRouter verbatim,
 * so it must be reversible — which is exactly why it lives encrypted at rest,
 * under a key held outside the database (ENCRYPTION_KEY), and is never returned
 * to any client.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard
const VERSION = "v1";

const key = Buffer.from(env.ENCRYPTION_KEY, "base64");

/** `v1:<iv>:<authTag>:<ciphertext>`, all base64. Versioned for future rotation. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/** Returns null for anything that is not intact and authentic. */
export function decryptSecret(payload: string): string | null {
  const [version, iv, authTag, ciphertext] = payload.split(":");

  if (version !== VERSION || !iv || !authTag || !ciphertext) return null;

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key, or tampered ciphertext.
    return null;
  }
}

/** Constant-time compare, for secrets that are checked rather than decrypted. */
export function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
