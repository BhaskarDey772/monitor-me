import {
  API_ROUTES,
  openRouterApiKeySchema,
  parseInput,
  type OpenRouterModelOption,
  type SettingsDto,
} from '@monitor-me/shared'
import { Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FieldError, isInvalid } from '@/components/field-error'
import { PasswordInput } from '@/components/password-input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Field,
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
import { Spinner } from '@/components/ui/spinner'
import { ApiError, api } from '@/lib/api'

/**
 * OpenRouter credentials and model choice.
 *
 * The key is write-only by design. The server never returns it — not even to its
 * owner — so this card can only ever show whether one is stored and its last four
 * characters. A field that can re-display a secret is a field an XSS payload can
 * read; showing it back adds risk without adding capability, since the key is only
 * ever used server-side.
 */
export function SettingsOpenRouterCard({
  settings,
  onSaved,
}: {
  settings: SettingsDto
  onSaved: () => Promise<void>
}) {
  const [models, setModels] = useState<OpenRouterModelOption[]>([])
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [savingKey, setSavingKey] = useState(false)

  useEffect(() => {
    // Best-effort: the picker still accepts a typed id if OpenRouter is down.
    api
      .get<OpenRouterModelOption[]>(API_ROUTES.openRouterModels)
      .then(setModels)
      .catch(() => setModels([]))
  }, [])

  const patch = async (body: Record<string, unknown>) => {
    await api.patch<SettingsDto>(API_ROUTES.settings, body)
    await onSaved()
  }

  const saveModel = async (model: string) => {
    setErrors({})
    try {
      await patch({ openRouterModel: model })
      toast.success('Model updated.')
    } catch (error) {
      if (error instanceof ApiError && error.fields) setErrors(error.fields)
      toast.error(error instanceof Error ? error.message : 'Could not save.')
    }
  }

  const handleKeySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const form = event.currentTarget
    const raw = String(new FormData(form).get('openRouterApiKey') ?? '')

    const parsed = parseInput(openRouterApiKeySchema, raw)
    if (!parsed.success) {
      setErrors({ openRouterApiKey: parsed.fields._ ?? ['Invalid key.'] })
      return
    }

    setSavingKey(true)
    try {
      // The server checks the key against OpenRouter before storing it.
      await patch({ openRouterApiKey: parsed.data })
      form.reset()
      toast.success('API key saved.')
    } catch (error) {
      if (error instanceof ApiError && error.fields) setErrors(error.fields)
      toast.error(error instanceof Error ? error.message : 'Could not save the key.')
    } finally {
      setSavingKey(false)
    }
  }

  const removeKey = async () => {
    setSavingKey(true)
    try {
      await patch({ openRouterApiKey: null })
      // The card re-renders into its input state because `hasCustomKey` is now
      // false — no local flag to keep in sync with the server.
      toast.success('API key deleted.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the key.')
    } finally {
      setSavingKey(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">OpenRouter</CardTitle>
        <CardDescription>Used to evaluate each monitor's prompt.</CardDescription>
      </CardHeader>

      <CardContent>
        <FieldGroup>
          <Field data-invalid={isInvalid(errors.openRouterModel) || undefined}>
            <FieldLabel htmlFor="openRouterModel">Model</FieldLabel>
            {/* Searchable over 400+ ids. `key` remounts it when a save returns a
                different value, so the field reflects what is stored. */}
            <Combobox
              key={settings.openRouter.model}
              items={models.map((model) => model.id)}
              defaultValue={settings.openRouter.model}
              onValueChange={(value) => {
                if (typeof value === 'string' && value !== settings.openRouter.model) {
                  void saveModel(value)
                }
              }}
            >
              <ComboboxInput id="openRouterModel" placeholder="Search models" />
              <ComboboxContent>
                <ComboboxEmpty>No matching model.</ComboboxEmpty>
                <ComboboxList>
                  {(item: string) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldError messages={errors.openRouterModel} />
          </Field>

          <FieldSeparator />

          <Field data-invalid={isInvalid(errors.openRouterApiKey) || undefined}>
            <FieldLabel htmlFor="openRouterApiKey">API key</FieldLabel>

            {settings.openRouter.hasCustomKey ? (
              // Saved state: a masked, read-only rendering of `customKeyHint` —
              // the only fragment of the key the client ever receives.
              <InputGroup>
                <InputGroupInput
                  id="openRouterApiKey"
                  value={`sk-or-${'•'.repeat(12)}${settings.openRouter.customKeyHint}`}
                  readOnly
                  className="font-mono"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    variant="destructive"
                    aria-label="Delete saved API key"
                    title="Delete saved API key"
                    onClick={() => void removeKey()}
                    disabled={savingKey}
                  >
                    {savingKey ? <Spinner /> : <Trash2Icon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            ) : (
              <form onSubmit={handleKeySubmit} noValidate>
                <PasswordInput
                  id="openRouterApiKey"
                  name="openRouterApiKey"
                  placeholder="sk-or-…"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={isInvalid(errors.openRouterApiKey) || undefined}
                  // Submit sits inside the group, mirroring the delete button in
                  // the saved state.
                  endActions={
                    <InputGroupButton
                      type="submit"
                      variant="outline"
                      disabled={savingKey}
                    >
                      {savingKey ? <Spinner /> : null}
                      Save
                    </InputGroupButton>
                  }
                />
              </form>
            )}

            <FieldError messages={errors.openRouterApiKey} />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
