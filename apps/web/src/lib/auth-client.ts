import { AUTH_BASE_PATH, USER_ADDITIONAL_FIELDS } from '@monitor-me/shared'
import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

/**
 * Browser auth client.
 *
 * `baseURL` is left as the current origin by default: in dev, Vite proxies
 * `/api` to the API, and in production the app should sit behind one origin too.
 * That keeps the session cookie first-party (SameSite=Lax survives), which is the
 * simplest defence against CSRF and third-party cookie blocking.
 *
 * Set VITE_SERVER_URL only for a genuinely cross-origin deployment; then
 * `credentials: 'include'` is what allows the cookie to travel.
 */
const serverUrl = import.meta.env.VITE_SERVER_URL?.trim()

export const authClient = createAuthClient({
  ...(serverUrl ? { baseURL: serverUrl } : {}),
  basePath: AUTH_BASE_PATH,
  fetchOptions: {
    credentials: 'include',
  },
  // Types the server's extra user columns (mustChangePassword) on the session,
  // from the same declaration the server uses.
  plugins: [inferAdditionalFields({ user: USER_ADDITIONAL_FIELDS })],
})

// No `signUp` export on purpose: the server rejects public registration, so a
// sign-up call from the UI could only ever fail.
export const { signIn, signOut, useSession, getSession } = authClient

export type Session = typeof authClient.$Infer.Session
