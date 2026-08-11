import {
  API_ROUTES,
  PASSWORD_POLICY,
  changePasswordSchema,
  parseInput,
  updateProfileSchema,
  type SessionInfo,
  type SettingsDto,
} from '@monitor-me/shared'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldError, isInvalid } from '@/components/field-error'
import { PasswordInput } from '@/components/password-input'
import { SettingsAlertsCard } from '@/components/settings-alerts-card'
import { SettingsOpenRouterCard } from '@/components/settings-openrouter-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
import { Spinner } from '@/components/ui/spinner'
import { ApiError, api } from '@/lib/api'
import { formatDateTime } from '@/lib/datetime'

/**
 * Account settings. Also the destination for a user who still holds the password
 * the provisioning script generated — `/api/me` is one of the two endpoints that
 * stays reachable while that flag is set, so this page can always load.
 */
export const Route = createFileRoute('/_authed/settings')({
  loader: async () => {
    const session = await api.get<SessionInfo>(API_ROUTES.me)

    // Settings sit behind the password gate, so a user who still has to rotate
    // only gets the profile half of the page.
    const settings = session.user.mustChangePassword
      ? null
      : await api.get<SettingsDto>(API_ROUTES.settings)

    return { session, settings }
  },
  component: SettingsPage,
})

function SettingsPage() {
  const { session, settings } = Route.useLoaderData()
  const { user, expiresAt } = session
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [pending, setPending] = useState(false)

  const [nameErrors, setNameErrors] = useState<Record<string, string[]>>({})
  const [savingName, setSavingName] = useState(false)

  const forced = user.mustChangePassword
  const refresh = () => router.invalidate()

  const handleNameSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNameErrors({})

    const data = new FormData(event.currentTarget)
    // Same schema the server re-validates with.
    const parsed = parseInput(updateProfileSchema, { name: data.get('name') })

    if (!parsed.success) {
      setNameErrors(parsed.fields)
      return
    }

    setSavingName(true)
    try {
      await api.patch<SessionInfo>(API_ROUTES.me, parsed.data)
      // Refresh the loader (and the header's session) rather than trusting local
      // state to match what was stored.
      await refresh()
      toast.success('Name updated.')
    } catch (error) {
      if (error instanceof ApiError && error.fields) setNameErrors(error.fields)
      toast.error(error instanceof Error ? error.message : 'Could not save the name.')
    } finally {
      setSavingName(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const form = event.currentTarget
    const data = new FormData(form)
    const parsed = parseInput(changePasswordSchema, {
      currentPassword: data.get('currentPassword'),
      newPassword: data.get('newPassword'),
      confirmPassword: data.get('confirmPassword'),
    })

    if (!parsed.success) {
      setErrors(parsed.fields)
      return
    }

    setPending(true)
    try {
      // The server clears `mustChangePassword` and revokes other sessions.
      await api.post<SessionInfo>(API_ROUTES.password, parsed.data)
      form.reset()
      toast.success('Password updated.')
      await refresh()
      if (forced) await router.navigate({ to: '/dashboard' })
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
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Your account and sign-in details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            Email cannot be changed here — that needs a verification flow.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            <form onSubmit={handleNameSubmit} noValidate>
              <Field data-invalid={isInvalid(nameErrors.name) || undefined}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="name"
                    name="name"
                    autoComplete="name"
                    defaultValue={user.name}
                    // Remount when the loader returns a new name, so the field
                    // reflects a saved value rather than stale local text.
                    key={user.name}
                    disabled={forced}
                    aria-invalid={isInvalid(nameErrors.name) || undefined}
                    required
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="submit"
                      variant="outline"
                      // The API rejects profile edits until the password is
                      // rotated, so don't offer a control that can only fail.
                      disabled={savingName || forced}
                    >
                      {savingName ? <Spinner /> : null}
                      Save
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {forced ? (
                  <FieldDescription>
                    Set a new password below before editing your profile.
                  </FieldDescription>
                ) : null}
                <FieldError messages={nameErrors.name} />
              </Field>
            </form>

            <FieldSeparator />

            <ItemGroup>
              <Item size="sm">
                <ItemContent>
                  <ItemTitle className="text-muted-foreground font-normal">
                    Email
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
                  <span className="truncate text-sm">{user.email}</span>
                  {user.emailVerified ? null : (
                    <Badge variant="outline">Unverified</Badge>
                  )}
                </ItemActions>
              </Item>

              <Item size="sm">
                <ItemContent>
                  <ItemTitle className="text-muted-foreground font-normal">
                    Member since
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
                  <span className="text-sm">{formatDateTime(user.createdAt)}</span>
                </ItemActions>
              </Item>

              <Item size="sm">
                <ItemContent>
                  <ItemTitle className="text-muted-foreground font-normal">
                    Session expires
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
                  <span className="text-sm">{formatDateTime(expiresAt)}</span>
                </ItemActions>
              </Item>
            </ItemGroup>
          </FieldGroup>
        </CardContent>
      </Card>

      {settings ? (
        <>
          <SettingsAlertsCard settings={settings} onSaved={refresh} />
          <SettingsOpenRouterCard settings={settings} onSaved={refresh} />
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {forced ? 'Set a new password' : 'Change password'}
          </CardTitle>
          <CardDescription>
            {forced
              ? 'This account was created with a generated password. Choose your own before continuing.'
              : `At least ${PASSWORD_POLICY.minLength} characters, with upper and lower case and a number.`}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={isInvalid(errors.currentPassword) || undefined}>
                <FieldLabel htmlFor="currentPassword">
                  {forced ? 'Generated password' : 'Current password'}
                </FieldLabel>
                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  autoComplete="current-password"
                  aria-invalid={isInvalid(errors.currentPassword) || undefined}
                  required
                />
                <FieldError messages={errors.currentPassword} />
              </Field>

              <Field data-invalid={isInvalid(errors.newPassword) || undefined}>
                <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  autoComplete="new-password"
                  aria-invalid={isInvalid(errors.newPassword) || undefined}
                  required
                />
                <FieldError messages={errors.newPassword} />
              </Field>

              <Field data-invalid={isInvalid(errors.confirmPassword) || undefined}>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm new password
                </FieldLabel>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  aria-invalid={isInvalid(errors.confirmPassword) || undefined}
                  required
                />
                <FieldError messages={errors.confirmPassword} />
              </Field>

              <FieldError messages={errors._} />
            </FieldGroup>
          </CardContent>

          <CardFooter className="mt-4 flex-col items-stretch gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? 'Saving…' : 'Update password'}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              Other sessions are signed out when the password changes.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
