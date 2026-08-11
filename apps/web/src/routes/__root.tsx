import { Link, Outlet, createRootRoute, useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { signOut, useSession } from '@/lib/auth-client'

function RootLayout() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    // Drop every cached loader result so no signed-in data survives sign-out.
    await router.invalidate()
    await router.navigate({ to: '/login' })
  }

  return (
    <div className="bg-background text-foreground min-h-svh">
      {/* Nav only exists once there is somewhere to navigate to. On the login
          screen it would just show the brand and a link to the current page. */}
      {session ? (
        <header className="border-b">
          <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
            <Link to="/dashboard" className="font-semibold">
              monitor&#8209;me
            </Link>

            <Link to="/dashboard" className="text-sm [&.active]:font-semibold">
              Dashboard
            </Link>
            <Link to="/change-password" className="text-sm [&.active]:font-semibold">
              Password
            </Link>

            <div className="ml-auto flex items-center gap-2">
              {/* Rendered as text by React — never innerHTML — so a hostile
                  display name cannot execute. */}
              <span className="text-muted-foreground text-sm">
                {session.user.email}
              </span>
              <Button size="sm" variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </nav>
        </header>
      ) : null}

      {session ? (
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Outlet />
        </main>
      ) : (
        // No header to offset, so the card sits dead centre of the viewport.
        <main className="flex min-h-svh items-center justify-center px-4 py-8">
          <Outlet />
        </main>
      )}

      <Toaster />
      {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
    </div>
  )
}

export const Route = createRootRoute({ component: RootLayout })
