import {
  API_ROUTES,
  type MonitorLogDto,
  type RunStatus,
} from '@monitor-me/shared'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { formatDateTime, formatDuration } from '@/lib/datetime'
import { dummyRuns } from '@/lib/dummy-runs'

export const Route = createFileRoute('/_authed/monitors/$monitorId/log')({
  loader: ({ params }) =>
    api.get<MonitorLogDto>(API_ROUTES.monitorRuns(params.monitorId)),
  component: MonitorLogPage,
})

const STATUS_VARIANT: Record<RunStatus, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    success: 'default',
    failure: 'destructive',
    error: 'destructive',
    pending: 'secondary',
  }

function StatusBadge({ status }: { status: RunStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
}

function MonitorLogPage() {
  const { monitor, runs: recorded } = Route.useLoaderData()

  // Nothing executes monitors yet, so fall back to client-side sample rows to
  // show the layout. Remove with `dummy-runs.ts` once a runner exists.
  const isSample = recorded.length === 0
  const runs = isSample ? dummyRuns(monitor) : recorded

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild size="sm" variant="ghost" className="-ml-2">
          <Link to="/dashboard">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold">{monitor.name}</h1>
          <p className="text-muted-foreground text-sm">
            {monitor.schedule.label} · starts {formatDateTime(monitor.startAt)} ·{' '}
            {monitor.urls.length} {monitor.urls.length === 1 ? 'URL' : 'URLs'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">
            {monitor.prompt}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Run history ({runs.length})
            {isSample ? <Badge variant="outline">Sample data</Badge> : null}
          </CardTitle>
          <CardDescription>
            {isSample
              ? 'Placeholder rows — no scheduler is running yet, so no runs have been recorded.'
              : 'Every run recorded for this monitor, newest first.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No runs recorded yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {runs.map((run) => (
                <li key={run.id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusBadge status={run.status} />
                    <span className="text-sm font-medium">
                      {formatDateTime(run.startedAt)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {run.finishedAt
                        ? `finished ${formatDateTime(run.finishedAt)}`
                        : 'still running'}
                    </span>
                  </div>

                  {run.summary ? (
                    <p className="text-muted-foreground mt-2 text-sm">{run.summary}</p>
                  ) : null}

                  {run.results.length > 0 ? (
                    <>
                      <Separator className="my-3" />
                      <ul className="space-y-2">
                        {run.results.map((result) => (
                          <li
                            key={result.id}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                          >
                            <StatusBadge status={result.status} />
                            <span className="min-w-0 flex-1 truncate">{result.url}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {result.statusCode ?? '—'}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              {formatDuration(result.durationMs)}
                            </span>
                            {result.error ? (
                              <span className="text-destructive w-full text-xs">
                                {result.error}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
