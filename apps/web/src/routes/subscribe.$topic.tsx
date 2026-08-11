import { buildNtfyLinks, isValidNtfyTopic, normalizeText } from '@monitor-me/shared'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Hand-off target for the subscribe QR code: changes scheme and gets out of the
 * way. No buttons, no menu — scanning the code means "open the app".
 *
 * It has to exist because a phone camera will not launch a custom scheme: cameras
 * follow http/https (plus tel, mailto, geo, wifi) and show anything else as inert
 * text. Navigating to `ntfy://` from a browser does hand off to the OS.
 *
 * Public and stateless: the scanning phone is not signed in, and the page reveals
 * nothing the holder of the topic does not already have.
 */
export const Route = createFileRoute('/subscribe/$topic')({
  beforeLoad: ({ params, location }) => {
    if (!isValidNtfyTopic(params.topic)) throw notFound()

    const raw = (location.search as { display?: unknown }).display
    // Untrusted: it arrives in a URL anyone can craft. Normalize and cap it.
    const displayName =
      typeof raw === 'string' ? normalizeText(raw).slice(0, 80) : undefined

    const { appLink } = buildNtfyLinks({
      serverUrl: import.meta.env.VITE_NTFY_SERVER?.trim() || 'https://ntfy.sh',
      topic: params.topic,
      appOrigin: window.location.origin,
      ...(displayName ? { displayName } : {}),
    })

    // `replace`, so the back button returns where the user came from rather than
    // bouncing through this page again.
    window.location.replace(appLink)

    return { appLink }
  },
  component: SubscribeHandoff,
})

function SubscribeHandoff() {
  const { appLink } = Route.useRouteContext()

  useEffect(() => {
    // Close the tab once the hand-off has had a moment to fire. Browsers only
    // allow `window.close()` on windows that script opened, so a tab the camera
    // opened will refuse ("Scripts may close only the windows that were opened by
    // them") and simply stay on this text. Nothing in the page can override that.
    const timer = window.setTimeout(() => window.close(), 1500)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    // The text is the retry: Chrome refuses an automatic external-scheme launch
    // with "a user gesture is required", so when the redirect above is blocked
    // this same link works on first tap. One affordance, not a menu.
    <Button asChild variant="link">
      <a href={appLink}>Opening ntfy… tap if nothing happens</a>
    </Button>
  )
}
