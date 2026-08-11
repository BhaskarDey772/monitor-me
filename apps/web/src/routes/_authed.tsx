import { CHANGE_PASSWORD_PATH } from '@monitor-me/shared'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/auth-client'

/**
 * Pathless layout route guarding everything nested under it.
 *
 * The checks are convenience, not the security boundary: they ask the server for
 * the session (the cookie is httpOnly, so the client cannot inspect it locally)
 * and route the user somewhere sensible. Authorization — including the
 * password-rotation gate — is enforced again on every API call, so a user who
 * edits their JS state gains nothing.
 */
export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    // `disableCookieCache` skips Better Auth's signed session-cache cookie, which
    // would otherwise still report the pre-change user right after a password
    // rotation and bounce the user back here forever.
    const { data } = await getSession({ query: { disableCookieCache: true } })

    if (!data) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }

    // Accounts provisioned with a generated password must rotate it first.
    if (data.user.mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
      throw redirect({ to: CHANGE_PASSWORD_PATH })
    }

    return { session: data }
  },
  component: () => <Outlet />,
})
