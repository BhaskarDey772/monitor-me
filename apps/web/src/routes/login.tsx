import { parseInput, signInSchema } from '@monitor-me/shared'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/lib/auth-client'
import { safeRedirect } from '@/lib/redirect'
import { FieldError } from '@/components/field-error'

export const Route = createFileRoute('/login')({
  // Search params are untrusted input: normalize before they reach the component.
  // Kept optional so links to /login don't have to pass one.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: search.redirect === undefined ? undefined : safeRedirect(search.redirect),
  }),
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const { redirect } = Route.useSearch()
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const form = new FormData(event.currentTarget)
    // Same schema the server validates with — no divergent client rules.
    const parsed = parseInput(signInSchema, {
      email: form.get('email'),
      password: form.get('password'),
      rememberMe: form.get('rememberMe') === 'on',
    })

    if (!parsed.success) {
      setErrors(parsed.fields)
      return
    }

    setPending(true)
    const { error } = await signIn.email(parsed.data)
    setPending(false)

    if (error) {
      // Deliberately generic: never reveal whether the email exists.
      toast.error(error.message ?? 'Invalid email or password.')
      return
    }

    await router.invalidate()
    await router.navigate({ to: safeRedirect(redirect) })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <FieldError messages={errors.email} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <FieldError messages={errors.password} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="rememberMe" className="size-4" />
            Remember me
          </label>
        </CardContent>

        <CardFooter className="mt-4 flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            Accounts are issued by an administrator.
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
