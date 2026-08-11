import {
  API_ROUTES,
  MAX_URLS_PER_MONITOR,
  SCHEDULE_PRESETS,
  createMonitorSchema,
  parseInput,
  type MonitorDto,
} from '@monitor-me/shared'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldError, isInvalid } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, api } from '@/lib/api'
import { toDateTimeLocalValue } from '@/lib/datetime'

const CUSTOM = 'custom'

/** One blank row to start; the user adds more as needed. */
const initialUrls = ['']

export function AddMonitorDialog({ onCreated }: { onCreated: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [urls, setUrls] = useState<string[]>(initialUrls)
  const [cycle, setCycle] = useState<string>(String(SCHEDULE_PRESETS[2].value))
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [pending, setPending] = useState(false)

  const isCustom = cycle === CUSTOM

  const reset = () => {
    setUrls(initialUrls)
    setCycle(String(SCHEDULE_PRESETS[2].value))
    setErrors({})
  }

  const updateUrl = (index: number, value: string) => {
    setUrls((current) => current.map((url, at) => (at === index ? value : url)))
  }

  const addUrlRow = () => {
    setUrls((current) =>
      current.length >= MAX_URLS_PER_MONITOR ? current : [...current, ''],
    )
  }

  const removeUrlRow = (index: number) => {
    setUrls((current) =>
      current.length === 1 ? current : current.filter((_, at) => at !== index),
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const form = new FormData(event.currentTarget)

    // Same schema the server validates with — the discriminated union means a
    // preset cycle and a cron expression can never both be submitted.
    const parsed = parseInput(
      createMonitorSchema,
      isCustom
        ? {
            scheduleKind: 'custom',
            name: form.get('name'),
            urls,
            prompt: form.get('prompt'),
            startAt: form.get('startAt'),
            cronExpression: form.get('cronExpression'),
          }
        : {
            scheduleKind: 'preset',
            name: form.get('name'),
            urls,
            prompt: form.get('prompt'),
            startAt: form.get('startAt'),
            intervalSeconds: Number(cycle),
          },
    )

    if (!parsed.success) {
      setErrors(parsed.fields)
      return
    }

    setPending(true)
    try {
      await api.post<MonitorDto>(API_ROUTES.monitors, parsed.data)
      await onCreated()
      toast.success('Monitor added.')
      setOpen(false)
      reset()
    } catch (error) {
      if (error instanceof ApiError && error.fields) setErrors(error.fields)
      toast.error(error instanceof Error ? error.message : 'Request failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Add monitor
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add monitor</DialogTitle>
          <DialogDescription>
            Watch one or more URLs on a schedule and describe what to look for.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={isInvalid(errors.name) || undefined}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                placeholder="Pricing page"
                aria-invalid={isInvalid(errors.name) || undefined}
                required
              />
              <FieldError messages={errors.name} />
            </Field>

            <Field data-invalid={isInvalid(errors.urls) || undefined}>
              <FieldLabel>URLs</FieldLabel>

              {urls.map((url, index) => (
                <InputGroup key={index}>
                  <InputGroupInput
                    value={url}
                    onChange={(event) => updateUrl(index, event.target.value)}
                    type="url"
                    inputMode="url"
                    placeholder="https://example.com"
                    aria-label={`URL ${index + 1}`}
                    aria-invalid={isInvalid(errors.urls) || undefined}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      onClick={() => removeUrlRow(index)}
                      disabled={urls.length === 1}
                      aria-label={`Remove URL ${index + 1}`}
                    >
                      <Trash2Icon />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              ))}

              <FieldError messages={errors.urls} />

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="self-start"
                onClick={addUrlRow}
                disabled={urls.length >= MAX_URLS_PER_MONITOR}
              >
                <PlusIcon data-icon="inline-start" />
                Add URL
              </Button>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={isInvalid(errors.intervalSeconds) || undefined}>
                <FieldLabel htmlFor="cycle">Cycle</FieldLabel>
                <Select value={cycle} onValueChange={setCycle}>
                  <SelectTrigger id="cycle" className="w-full">
                    <SelectValue placeholder="Choose a cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {SCHEDULE_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={String(preset.value)}>
                          {preset.label}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM}>Custom…</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError messages={errors.intervalSeconds} />
              </Field>

              <Field data-invalid={isInvalid(errors.startAt) || undefined}>
                <FieldLabel htmlFor="startAt">Start time</FieldLabel>
                <Input
                  id="startAt"
                  name="startAt"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(new Date())}
                  aria-invalid={isInvalid(errors.startAt) || undefined}
                  required
                />
                <FieldError messages={errors.startAt} />
              </Field>
            </div>

            {/* Revealed only for a custom cycle, so the two schedule kinds cannot
                be filled in at the same time. */}
            {isCustom ? (
              <Field data-invalid={isInvalid(errors.cronExpression) || undefined}>
                <FieldLabel htmlFor="cronExpression">Cron expression</FieldLabel>
                <Input
                  id="cronExpression"
                  name="cronExpression"
                  placeholder="*/15 * * * *"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={isInvalid(errors.cronExpression) || undefined}
                  required
                />
                <FieldDescription>
                  Five fields: minute hour day-of-month month day-of-week.
                </FieldDescription>
                <FieldError messages={errors.cronExpression} />
              </Field>
            ) : null}

            <Field data-invalid={isInvalid(errors.prompt) || undefined}>
              <FieldLabel htmlFor="prompt">Prompt</FieldLabel>
              <Textarea
                id="prompt"
                name="prompt"
                rows={4}
                placeholder="Tell me if the starting price changes or the page stops mentioning a free tier."
                aria-invalid={isInvalid(errors.prompt) || undefined}
                required
              />
              <FieldError messages={errors.prompt} />
            </Field>

            <FieldError messages={errors._} />
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? 'Adding…' : 'Add monitor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
