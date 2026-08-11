import {
  presetLabel,
  type MonitorDto,
  type MonitorRunDto,
  type MonitorRunResultDto,
  type RunStatus,
} from "@monitor-me/shared";
import type {
  Monitor,
  MonitorRun,
  MonitorRunResult,
  MonitorUrl,
} from "../generated/prisma/client.js";

/**
 * Allowlist serializers. `userId` and the join-table ids stay server-side, and
 * the loosely-typed status columns (SQLite has no enums) are narrowed here so the
 * client never sees an unexpected value.
 */

type MonitorRow = Monitor & {
  urls: Pick<MonitorUrl, "url">[];
  _count: { runs: number };
  runs: Pick<MonitorRun, "startedAt">[];
};

function toStatus(value: string): RunStatus {
  return value === "success" || value === "failure" || value === "error"
    ? value
    : "pending";
}

function toSchedule(monitor: Monitor): MonitorDto["schedule"] {
  if (monitor.scheduleKind === "custom" && monitor.cronExpression) {
    return {
      kind: "custom",
      cronExpression: monitor.cronExpression,
      label: `Cron: ${monitor.cronExpression}`,
    };
  }

  const intervalSeconds = monitor.intervalSeconds ?? 3600;
  return {
    kind: "preset",
    intervalSeconds,
    label: presetLabel(intervalSeconds),
  };
}

export function toMonitorDto(monitor: MonitorRow): MonitorDto {
  return {
    id: monitor.id,
    name: monitor.name,
    prompt: monitor.prompt,
    urls: monitor.urls.map((entry) => entry.url),
    schedule: toSchedule(monitor),
    startAt: monitor.startAt.toISOString(),
    isActive: monitor.isActive,
    createdAt: monitor.createdAt.toISOString(),
    updatedAt: monitor.updatedAt.toISOString(),
    runCount: monitor._count.runs,
    lastRunAt: monitor.runs[0]?.startedAt.toISOString() ?? null,
  };
}

export const toMonitorDtoList = (monitors: MonitorRow[]): MonitorDto[] =>
  monitors.map(toMonitorDto);

function toRunResultDto(result: MonitorRunResult): MonitorRunResultDto {
  return {
    id: result.id,
    url: result.url,
    status: toStatus(result.status),
    statusCode: result.statusCode,
    durationMs: result.durationMs,
    error: result.error,
  };
}

export function toMonitorRunDto(
  run: MonitorRun & { results: MonitorRunResult[] },
): MonitorRunDto {
  return {
    id: run.id,
    status: toStatus(run.status),
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    summary: run.summary,
    results: run.results.map(toRunResultDto),
  };
}

export const toMonitorRunDtoList = (
  runs: (MonitorRun & { results: MonitorRunResult[] })[],
): MonitorRunDto[] => runs.map(toMonitorRunDto);
