/**
 * Only same-origin, path-relative redirects are honoured after sign-in.
 *
 * Blocks open-redirect abuse: `?redirect=https://evil.example` or
 * `?redirect=//evil.example` would otherwise bounce a freshly authenticated user
 * to an attacker's page, which is the usual setup for a credential-phishing or
 * token-leaking flow.
 */
export function safeRedirect(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.length === 0) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}
