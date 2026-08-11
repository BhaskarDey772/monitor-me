import { API_ROUTES, type MonitorDto } from '@monitor-me/shared'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { MonitorIcon, ScrollTextIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { AddMonitorDialog } from '@/components/add-monitor-dialog'
import { NtfyQrDialog } from '@/components/ntfy-qr-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item'
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
    <div className="flex flex-col gap-6">
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
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MonitorIcon />
                </EmptyMedia>
                <EmptyTitle>No monitors yet</EmptyTitle>
                <EmptyDescription>
                  Add one to start watching a page.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup>
              {monitors.map((monitor, index) => (
                <div key={monitor.id}>
                  {index > 0 ? <ItemSeparator /> : null}
                  <Item>
                    <ItemContent>
                      {/* Text nodes: React escapes them, so a hostile name or URL
                          cannot become markup. */}
                      <ItemTitle>
                        {monitor.name}
                        <NtfyQrDialog monitor={monitor} />
                      </ItemTitle>

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
                    </ItemContent>

                    <ItemActions>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to="/monitors/$monitorId/log"
                          params={{ monitorId: monitor.id }}
                        >
                          <ScrollTextIcon data-icon="inline-start" />
                          Log
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        aria-label={`Delete ${monitor.name}`}
                        onClick={() => void handleDelete(monitor)}
                      >
                        <Trash2Icon />
                      </Button>
                    </ItemActions>
                  </Item>
                </div>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
