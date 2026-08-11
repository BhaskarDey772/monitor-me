import type { MonitorDto } from '@monitor-me/shared'
import { CheckIcon, CopyIcon, QrCodeIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'

/**
 * QR code that subscribes a phone to this monitor's ntfy topic.
 *
 * The QR encodes an https URL to this app's /subscribe page, which immediately
 * redirects to the `ntfy://` deep link. Two hops, because neither end works
 * alone:
 *
 * - Phone cameras only launch http/https (plus tel, mailto, geo, wifi). An
 *   `ntfy://` payload is surfaced as inert text — the scan appears to "just copy
 *   the text".
 * - An https ntfy URL cannot reach the app either: ntfy's docs call http/https
 *   deep linking "very brittle and limited", and the maintainer removed the
 *   Android App Links attempt because URL pattern registration was too buggy.
 *
 * Navigating to a custom scheme from inside a browser *does* hand off to the OS.
 */
export function NtfyQrDialog({ monitor }: { monitor: MonitorDto }) {
  const [copied, setCopied] = useState(false)

  const copyTopic = async () => {
    await navigator.clipboard.writeText(monitor.ntfy.topic)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Subscribe to alerts for ${monitor.name}`}
          title="Show ntfy subscribe QR code"
        >
          <QrCodeIcon />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Subscribe to alerts</DialogTitle>
          {/* `break-words` because a monitor name can be one long unbroken
              string, which would otherwise push the dialog wider than its box. */}
          <DialogDescription className="break-words">
            Scan to open ntfy and subscribe to “{monitor.name}”.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* White quiet zone regardless of theme — a dark surround behind a QR
              is the other classic reason scanners fail. */}
          <div className="rounded-lg bg-white p-4">
            <QRCodeSVG
              value={monitor.ntfy.subscribeLink}
              size={176}
              level="M"
              marginSize={0}
              title={`ntfy subscribe link for ${monitor.name}`}
            />
          </div>

          <Field>
            <FieldLabel htmlFor={`topic-${monitor.id}`}>Topic</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={`topic-${monitor.id}`}
                value={monitor.ntfy.topic}
                readOnly
                className="font-mono"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Copy topic"
                  onClick={() => void copyTopic()}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              Server {monitor.ntfy.host} · on iOS, add this topic manually.
            </FieldDescription>
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  )
}
