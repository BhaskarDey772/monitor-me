import type { MonitorDto, MonitorRunDto, RunStatus } from '@monitor-me/shared'

/**
 * Placeholder run history, generated in the browser.
 *
 * TEMPORARY. Nothing executes monitors yet, so the API legitimately returns an
 * empty run list. The log screen falls back to this so the layout can be seen and
 * reviewed — nothing is written to the database. Delete this file, and the
 * fallback in the log route, once a real runner produces runs.
 */

const MINUTE = 60_000

/** Fixed shapes rather than random ones, so the screen looks the same on reload. */
const SHAPES: {
  status: RunStatus
  statusCode: number | null
  durationMs: number | null
  error: string | null
  summary: string
}[] = [
  {
    status: 'success',
    statusCode: 200,
    durationMs: 184,
    error: null,
    summary: 'All URLs responded as expected.',
  },
  {
    status: 'success',
    statusCode: 200,
    durationMs: 231,
    error: null,
    summary: 'All URLs responded as expected.',
  },
  {
    status: 'failure',
    statusCode: 503,
    durationMs: 1402,
    error: null,
    summary: 'One or more URLs returned an unexpected status.',
  },
  {
    status: 'error',
    statusCode: null,
    durationMs: null,
    error: 'Timed out after 10s',
    summary: 'Run could not complete.',
  },
]

export function dummyRuns(monitor: MonitorDto, count = 8): MonitorRunDto[] {
  const intervalMs =
    monitor.schedule.kind === 'preset' ? monitor.schedule.intervalSeconds * 1000 : 30 * MINUTE

  // Walk backwards from the start time so the newest run is first.
  const anchor = Date.parse(monitor.startAt)

  return Array.from({ length: count }, (_, index) => {
    const shape = SHAPES[index % SHAPES.length]!
    const startedAt = new Date(anchor - index * intervalMs)
    const finishedAt = new Date(startedAt.getTime() + (shape.durationMs ?? 10_000))

    return {
      id: `sample-${monitor.id}-${index}`,
      status: shape.status,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      summary: shape.summary,
      results: monitor.urls.map((url, urlIndex) => ({
        id: `sample-${monitor.id}-${index}-${urlIndex}`,
        url,
        status: shape.status,
        statusCode: shape.statusCode,
        durationMs: shape.durationMs === null ? null : shape.durationMs + urlIndex * 37,
        error: shape.error,
      })),
    }
  })
}
