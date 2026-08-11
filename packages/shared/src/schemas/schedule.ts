import { z } from "zod";

/**
 * Monitor scheduling: a short list of common cycles, plus an escape hatch for a
 * raw cron expression.
 */

export const SCHEDULE_PRESETS = [
  { value: 60, label: "Every minute" },
  { value: 1800, label: "Every 30 minutes" },
  { value: 3600, label: "Every hour" },
  { value: 21600, label: "Every 6 hours" },
  { value: 43200, label: "Every 12 hours" },
  { value: 86400, label: "Every 24 hours" },
] as const;

export const PRESET_INTERVALS = SCHEDULE_PRESETS.map((preset) => preset.value) as
  unknown as [number, ...number[]];

export const SCHEDULE_KINDS = ["preset", "custom"] as const;
export type ScheduleKind = (typeof SCHEDULE_KINDS)[number];

/** Label for a preset interval, falling back to a plain seconds count. */
export function presetLabel(intervalSeconds: number): string {
  return (
    SCHEDULE_PRESETS.find((preset) => preset.value === intervalSeconds)?.label ??
    `Every ${intervalSeconds}s`
  );
}

/**
 * Validates a standard 5-field cron expression (minute hour day-of-month month
 * day-of-week), including `*`, steps, ranges and lists.
 *
 * Hand-rolled rather than pulled from a library because this runs in the browser
 * too, and both sides must agree on what is acceptable. The server re-checks with
 * the same function, so this is a real gate, not a UI hint.
 */
const FIELD_RANGES: [min: number, max: number][] = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 7], // day of week (7 == Sunday)
];

function isValidCronField(field: string, [min, max]: [number, number]): boolean {
  return field.split(",").every((part) => {
    if (part.length === 0) return false;

    const [range, step, ...rest] = part.split("/");
    if (rest.length > 0 || range === undefined) return false;

    if (step !== undefined) {
      if (!/^\d+$/.test(step) || Number(step) === 0) return false;
    }

    if (range === "*") return true;

    const bounds = range.split("-");
    if (bounds.length > 2) return false;

    const numbers = bounds.map((bound) =>
      /^\d+$/.test(bound) ? Number(bound) : Number.NaN,
    );
    if (numbers.some((value) => Number.isNaN(value) || value < min || value > max)) {
      return false;
    }

    const [start, end] = numbers;
    return end === undefined || (start !== undefined && start <= end);
  });
}

export function isValidCronExpression(value: string): boolean {
  const fields = value.trim().split(/\s+/);
  if (fields.length !== FIELD_RANGES.length) return false;

  return fields.every((field, index) => isValidCronField(field, FIELD_RANGES[index]!));
}

export const cronExpressionSchema = z
  .string()
  .trim()
  .max(120, { error: "Cron expression is too long." })
  .refine(isValidCronExpression, {
    error: "Enter a 5-field cron expression, e.g. */15 * * * *",
  });
