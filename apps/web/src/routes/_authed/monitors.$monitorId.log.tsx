import {
  API_ROUTES,
  type MonitorLogDto,
  type RunStatus,
} from '@monitor-me/shared'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeftIcon, HistoryIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Item, ItemContent, ItemGroup, ItemTitle } from '@/components/ui/item'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatDateTime, formatDuration } from '@/lib/datetime'
import { dummyRuns } from '@/lib/dummy-runs'

export const Route = createFileRoute('/_authed/monitors/$monitorId/log')({
  loader: ({ params }) =>
    api.get<MonitorLogDto>(API_ROUTES.monitorRuns(params.monitorId)),
  component: MonitorLogPage,
})

const STATUS_VARIANT: Record<
  RunStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild size="sm" variant="ghost" className="-ml-2 self-start">
          <Link to="/dashboard">
            <ArrowLeftIcon data-icon="inline-start" />
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
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HistoryIcon />
                </EmptyMedia>
                <EmptyTitle>No runs yet</EmptyTitle>
                <EmptyDescription>
                  Runs will appear here once this monitor executes.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup className="gap-4">
              {runs.map((run) => (
                <Item key={run.id} variant="outline" className="flex-col items-stretch">
                  <ItemContent>
                    <ItemTitle className="flex-wrap gap-x-3">
                      <StatusBadge status={run.status} />
                      <span>{formatDateTime(run.startedAt)}</span>
                      <span className="text-muted-foreground text-xs font-normal">
                        {run.finishedAt
                          ? `finished ${formatDateTime(run.finishedAt)}`
                          : 'still running'}
                      </span>
                    </ItemTitle>
                    {run.summary ? (
                      <p className="text-muted-foreground text-sm">{run.summary}</p>
                    ) : null}
                  </ItemContent>

                  {run.results.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>URL</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                          <TableHead className="w-20 text-right">Code</TableHead>
                          <TableHead className="w-24 text-right">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {run.results.map((result) => (
                          <TableRow key={result.id}>
                            <TableCell className="max-w-0">
                              <span className="block truncate">{result.url}</span>
                              {result.error ? (
                                <span className="text-destructive text-xs">
                                  {result.error}
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={result.status} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {result.statusCode ?? '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatDuration(result.durationMs)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : null}
                </Item>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
