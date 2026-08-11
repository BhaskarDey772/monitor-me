import type { MonitorDto } from '@monitor-me/shared'
import { Check, Copy, QrCode } from 'lucide-react'
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
          className="text-muted-foreground hover:text-foreground size-6 shrink-0 p-0"
          aria-label={`Subscribe to alerts for ${monitor.name}`}
          title="Show ntfy subscribe QR code"
        >
          <QrCode className="size-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Subscribe to alerts</DialogTitle>
          {/* `break-words` because a monitor name can be one long unbroken
              string, which previously pushed the dialog wider than its box. */}
          <DialogDescription className="break-words">
            Scan to open ntfy and subscribe to “{monitor.name}”.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
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

          <div className="w-full min-w-0 space-y-1">
            <p className="text-muted-foreground text-xs">Topic</p>
            <div className="flex min-w-0 items-center gap-2">
              <code className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1 text-xs">
                {monitor.ntfy.topic}
              </code>
              <Button
                size="icon"
                variant="outline"
                className="size-7 shrink-0"
                aria-label="Copy topic"
                onClick={() => void copyTopic()}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Server {monitor.ntfy.host} · on iOS, add this topic manually.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
