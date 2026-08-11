/** Transport contract for every non-auth endpoint, consumed by the client fetcher. */

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFieldErrors = Record<string, string[]>;

export type ApiFailure = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    /** Present for validation failures, keyed by field path. */
    fields?: ApiFieldErrors;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "PASSWORD_CHANGE_REQUIRED",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Serialized monitor — the "view" layer output, never the raw Prisma row. */
export type MonitorDto = {
  id: string;
  name: string;
  prompt: string;
  urls: string[];
  schedule:
    | { kind: "preset"; intervalSeconds: number; label: string }
    | { kind: "custom"; cronExpression: string; label: string };
  startAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Counts for the list row; the full log lives behind its own endpoint. */
  runCount: number;
  lastRunAt: string | null;
};

export const RUN_STATUSES = ["pending", "success", "failure", "error"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export type MonitorRunResultDto = {
  id: string;
  url: string;
  status: RunStatus;
  statusCode: number | null;
  durationMs: number | null;
  error: string | null;
};

export type MonitorRunDto = {
  id: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  summary: string | null;
  results: MonitorRunResultDto[];
};

/** Payload of the per-monitor log screen. */
export type MonitorLogDto = {
  monitor: MonitorDto;
  runs: MonitorRunDto[];
};
