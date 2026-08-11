/**
 * Escapes the five XML/HTML significant characters.
 *
 * Defence in depth only: React escapes text nodes already, and the server never
 * renders HTML. Use this when a value must be embedded into markup or an
 * attribute by hand (emails, logs, CSV exports).
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips C0/C1 control characters and trims — applied to every free-text field. */
export function normalizeText(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F-\u009F]/gu, "").trim();
}
