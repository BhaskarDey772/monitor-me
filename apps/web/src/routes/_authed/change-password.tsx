import {
  API_ROUTES,
  PASSWORD_POLICY,
  changePasswordSchema,
  parseInput,
  type SessionInfo,
} from '@monitor-me/shared'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldError } from '@/components/field-error'
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
import { ApiError, api } from '@/lib/api'

export const Route = createFileRoute('/_authed/change-password')({
  component: ChangePasswordPage,
})

function ChangePasswordPage() {
  const { session } = Route.useRouteContext()
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [pending, setPending] = useState(false)

  const forced = Boolean(session.user.mustChangePassword)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const form = new FormData(event.currentTarget)
    const parsed = parseInput(changePasswordSchema, {
      currentPassword: form.get('currentPassword'),
      newPassword: form.get('newPassword'),
      confirmPassword: form.get('confirmPassword'),
    })

    if (!parsed.success) {
      setErrors(parsed.fields)
      return
    }

    setPending(true)
    try {
      // The server clears `mustChangePassword` and revokes other sessions.
      await api.post<SessionInfo>(API_ROUTES.password, parsed.data)
      toast.success('Password updated.')
      await router.invalidate()
      await router.navigate({ to: '/dashboard' })
    } catch (error) {
      if (error instanceof ApiError && error.fields) setErrors(error.fields)
      toast.error(
        error instanceof Error ? error.message : 'Could not change the password.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{forced ? 'Set a new password' : 'Change password'}</CardTitle>
        <CardDescription>
          {forced
            ? 'This account was created with a generated password. Choose your own before continuing.'
            : `At least ${PASSWORD_POLICY.minLength} characters, with upper and lower case and a number.`}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              {forced ? 'Generated password' : 'Current password'}
            </Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
            <FieldError messages={errors.currentPassword} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            <FieldError messages={errors.newPassword} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            <FieldError messages={errors.confirmPassword} />
          </div>

          <FieldError messages={errors._} />
        </CardContent>

        <CardFooter className="mt-4 flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Update password'}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            Other sessions are signed out when the password changes.
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
