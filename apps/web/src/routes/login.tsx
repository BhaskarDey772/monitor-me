import { parseInput, signInSchema } from '@monitor-me/shared'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldError, isInvalid } from '@/components/field-error'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { signIn } from '@/lib/auth-client'
import { safeRedirect } from '@/lib/redirect'

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
  const [rememberMe, setRememberMe] = useState(false)
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const form = new FormData(event.currentTarget)
    // Same schema the server validates with — no divergent client rules.
    const parsed = parseInput(signInSchema, {
      email: form.get('email'),
      password: form.get('password'),
      rememberMe,
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
        <CardContent>
          <FieldGroup>
            <Field data-invalid={isInvalid(errors.email) || undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                aria-invalid={isInvalid(errors.email) || undefined}
                required
              />
              <FieldError messages={errors.email} />
            </Field>

            <Field data-invalid={isInvalid(errors.password) || undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                aria-invalid={isInvalid(errors.password) || undefined}
                required
              />
              <FieldError messages={errors.password} />
            </Field>

            <Field orientation="horizontal">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <FieldLabel htmlFor="rememberMe">Remember me</FieldLabel>
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter className="mt-4 flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
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
