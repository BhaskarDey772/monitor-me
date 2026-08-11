import {
  API_ROUTES,
  MAX_URLS_PER_MONITOR,
  SCHEDULE_PRESETS,
  createMonitorSchema,
  parseInput,
  type MonitorDto,
} from '@monitor-me/shared'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldError } from '@/components/field-error'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
          <Plus className="size-4" />
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

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Pricing page" required />
            <FieldError messages={errors.name} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>URLs</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={addUrlRow}
                disabled={urls.length >= MAX_URLS_PER_MONITOR}
              >
                <Plus className="size-4" />
                Add URL
              </Button>
            </div>

            {urls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={url}
                  onChange={(event) => updateUrl(index, event.target.value)}
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com"
                  aria-label={`URL ${index + 1}`}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeUrlRow(index)}
                  disabled={urls.length === 1}
                  aria-label={`Remove URL ${index + 1}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <FieldError messages={errors.urls} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cycle">Cycle</Label>
              <Select value={cycle} onValueChange={setCycle}>
                <SelectTrigger id="cycle" className="w-full">
                  <SelectValue placeholder="Choose a cycle" />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={String(preset.value)}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>Custom…</SelectItem>
                </SelectContent>
              </Select>
              <FieldError messages={errors.intervalSeconds} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startAt">Start time</Label>
              <Input
                id="startAt"
                name="startAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(new Date())}
                required
              />
              <FieldError messages={errors.startAt} />
            </div>
          </div>

          {/* Revealed only for a custom cycle, so the two schedule kinds cannot
              be filled in at the same time. */}
          {isCustom ? (
            <div className="space-y-2">
              <Label htmlFor="cronExpression">Cron expression</Label>
              <Input
                id="cronExpression"
                name="cronExpression"
                placeholder="*/15 * * * *"
                autoComplete="off"
                spellCheck={false}
                required
              />
              <p className="text-muted-foreground text-xs">
                Five fields: minute hour day-of-month month day-of-week.
              </p>
              <FieldError messages={errors.cronExpression} />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              name="prompt"
              rows={4}
              placeholder="Tell me if the starting price changes or the page stops mentioning a free tier."
              required
            />
            <FieldError messages={errors.prompt} />
          </div>

          <FieldError messages={errors._} />

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Adding…' : 'Add monitor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
