import {
  API_ROUTES,
  NTFY_MODES,
  NTFY_MODE_LABELS,
  type NtfyMode,
  type SettingsDto,
} from '@monitor-me/shared'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api } from '@/lib/api'

/**
 * Alert channel choice.
 *
 * In shared mode every monitor reports the one shared topic, so a phone
 * subscribes once. Switching back to per-monitor restores each monitor's own
 * topic — both are kept in the database, so nothing is regenerated and no
 * existing subscription breaks.
 */
export function SettingsAlertsCard({
  settings,
  onSaved,
}: {
  settings: SettingsDto
  onSaved: () => Promise<void>
}) {
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)

  const save = async (ntfyMode: NtfyMode) => {
    setPending(true)
    try {
      await api.patch<SettingsDto>(API_ROUTES.settings, { ntfyMode })
      await onSaved()
      toast.success('Alert channel updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save.')
    } finally {
      setPending(false)
    }
  }

  const copyTopic = async () => {
    await navigator.clipboard.writeText(settings.sharedNtfy.topic)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alerts</CardTitle>
        <CardDescription>
          How ntfy notifications are grouped across your monitors.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="ntfyMode">Channels</FieldLabel>
            <ToggleGroup
              id="ntfyMode"
              type="single"
              variant="outline"
              className="w-full"
              value={settings.ntfyMode}
              onValueChange={(value) => {
                // Radix clears the value when the active item is pressed again;
                // ignore that so a mode is always selected.
                if (value) void save(value as NtfyMode)
              }}
              disabled={pending}
            >
              {NTFY_MODES.map((mode) => (
                <ToggleGroupItem key={mode} value={mode} className="flex-1">
                  {NTFY_MODE_LABELS[mode]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          {settings.ntfyMode === 'shared' ? (
            <>
              <FieldSeparator />
              <Field>
                <FieldLabel htmlFor="sharedTopic">Shared topic</FieldLabel>
                <div className="flex flex-col items-center gap-4">
                  {/* White plate regardless of theme, so scanners cope. */}
                  <div className="rounded-lg bg-white p-4">
                    <QRCodeSVG
                      value={settings.sharedNtfy.subscribeLink}
                      size={176}
                      level="M"
                      marginSize={0}
                      title="ntfy subscribe link for all monitors"
                    />
                  </div>
                </div>
                <InputGroup>
                  <InputGroupInput
                    id="sharedTopic"
                    value={settings.sharedNtfy.topic}
                    readOnly
                    className="font-mono"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      aria-label="Copy shared topic"
                      onClick={() => void copyTopic()}
                    >
                      {copied ? <CheckIcon /> : <CopyIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription>
                  Scan once to receive every monitor's alerts.
                </FieldDescription>
              </Field>
            </>
          ) : (
            <FieldDescription>
              Use the QR button on a monitor row to subscribe to it.
            </FieldDescription>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
