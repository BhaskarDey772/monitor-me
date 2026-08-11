import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/auth-client'

/**
 * `/` is not a page of its own: signed-out visitors get the login screen, signed-in
 * ones go straight to the dashboard.
 *
 * A redirect rather than a second copy of the login form, so there is exactly one
 * login URL for the auth guard, browsers and password managers to agree on.
 */
export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data } = await getSession({ query: { disableCookieCache: true } })
    throw redirect({ to: data ? '/dashboard' : '/login' })
  },
})
