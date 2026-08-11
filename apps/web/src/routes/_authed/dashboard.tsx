import { API_ROUTES, type MonitorDto } from '@monitor-me/shared'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { ScrollText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AddMonitorDialog } from '@/components/add-monitor-dialog'
import { NtfyQrDialog } from '@/components/ntfy-qr-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export const Route = createFileRoute('/_authed/dashboard')({
  loader: () => api.get<MonitorDto[]>(API_ROUTES.monitors),
  component: DashboardPage,
})

function DashboardPage() {
  const monitors = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const router = useRouter()

  // Re-run the loader so the list reflects the server, not local guesses.
  const refresh = () => router.invalidate()

  const handleDelete = async (monitor: MonitorDto) => {
    try {
      await api.delete(API_ROUTES.monitor(monitor.id))
      await refresh()
      toast.success(`Deleted “${monitor.name}”.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Request failed.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as {session.user.name}
          </p>
        </div>
        <AddMonitorDialog onCreated={refresh} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your monitors ({monitors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {monitors.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No monitors yet. Add one to get started.
            </p>
          ) : (
            <ul className="divide-y">
              {monitors.map((monitor) => (
                <li
                  key={monitor.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  {/* Title on its own line, everything else as tags below — the
                      prompt, start time and full URL list live on the log screen.
                      Text nodes: React escapes them, so a hostile name or URL
                      cannot become markup. */}
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-medium">{monitor.name}</p>
                      <NtfyQrDialog monitor={monitor} />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{monitor.schedule.label}</Badge>

                      <Badge variant="outline" title={monitor.urls.join('\n')}>
                        {monitor.urls.length}{' '}
                        {monitor.urls.length === 1 ? 'URL' : 'URLs'}
                      </Badge>

                      <Badge variant="outline">
                        {monitor.runCount}{' '}
                        {monitor.runCount === 1 ? 'run' : 'runs'}
                      </Badge>

                      {monitor.isActive ? null : <Badge>Paused</Badge>}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to="/monitors/$monitorId/log"
                        params={{ monitorId: monitor.id }}
                      >
                        <ScrollText className="size-4" />
                        Log
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      aria-label={`Delete ${monitor.name}`}
                      onClick={() => void handleDelete(monitor)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
