import {
  Link,
  Outlet,
  createRootRoute,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { signOut, useSession } from '@/lib/auth-client'

function RootLayout() {
  const { data: session } = useSession()
  const router = useRouter()

  /**
   * Chrome is decided by the matched route, not by `useSession()`.
   *
   * The session hook is a client-side cache and can lag behind reality — when a
   * session is revoked or expires, it still reports a user, which previously drew
   * the signed-in header on top of the login page and suppressed its centred
   * layout. Route matches cannot lie: `_authed` only matches after its guard has
   * confirmed a session server-side.
   */
  const inAuthedArea = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId.startsWith('/_authed')),
  })

  const handleSignOut = async () => {
    await signOut()
    // Drop every cached loader result so no signed-in data survives sign-out.
    await router.invalidate()
    await router.navigate({ to: '/login' })
  }

  if (!inAuthedArea) {
    return (
      <div className="bg-background text-foreground min-h-svh">
        {/* No nav: on the login screen it would only show the brand and a link
            to the current page. The card sits dead centre. */}
        <main className="flex min-h-svh items-center justify-center px-4 py-8">
          <Outlet />
        </main>
        <Toaster />
        {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground min-h-svh">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="font-semibold">
            monitor&#8209;me
          </Link>

          <Link to="/dashboard" className="text-sm [&.active]:font-semibold">
            Dashboard
          </Link>
          <Link to="/settings" className="text-sm [&.active]:font-semibold">
            Settings
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {/* Rendered as text by React — never innerHTML — so a hostile
                display name cannot execute. */}
            <span className="text-muted-foreground text-sm">
              {session?.user.email}
            </span>
            <Button size="sm" variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>

      <Toaster />
      {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
    </div>
  )
}

export const Route = createRootRoute({ component: RootLayout })
