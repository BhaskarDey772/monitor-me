import { z } from "zod";
import { normalizeText } from "../utils/sanitize.js";
import {
  PRESET_INTERVALS,
  cronExpressionSchema,
} from "./schedule.js";

/**
 * Monitor input contracts, shared by the add-monitor form and the API. One
 * definition means the modal cannot accept something the server rejects, and a
 * request crafted outside the UI cannot widen what gets stored.
 */

export const MAX_URLS_PER_MONITOR = 20;

export const monitorNameSchema = z
  .string()
  .transform(normalizeText)
  .pipe(
    z
      .string()
      .min(1, { error: "Name is required." })
      .max(80, { error: "Name must be at most 80 characters." }),
  );

/** Only http(s) is allowed — blocks `javascript:` and `data:` URL injection. */
export const monitorUrlSchema = z
  .string()
  .trim()
  .max(2048, { error: "URL is too long." })
  .pipe(z.url({ protocol: /^https?$/, error: "Enter a valid http(s) URL." }));

export const monitorPromptSchema = z
  .string()
  .transform(normalizeText)
  .pipe(
    z
      .string()
      .min(1, { error: "Prompt is required." })
      .max(2000, { error: "Prompt must be at most 2000 characters." }),
  );

/** Blank rows from the form are dropped before validation. */
export const monitorUrlsSchema = z
  .array(z.string())
  .transform((urls) => urls.map((url) => url.trim()).filter(Boolean))
  .pipe(
    z
      .array(monitorUrlSchema)
      .min(1, { error: "Add at least one URL." })
      .max(MAX_URLS_PER_MONITOR, {
        error: `At most ${MAX_URLS_PER_MONITOR} URLs per monitor.`,
      }),
  )
  .refine((urls) => new Set(urls).size === urls.length, {
    error: "Remove duplicate URLs.",
  });

/**
 * Accepts an ISO string or a `datetime-local` value from the form. Anything the
 * browser cannot round-trip is rejected rather than silently coerced.
 */
export const startAtSchema = z
  .string()
  .trim()
  .min(1, { error: "Start time is required." })
  .transform((value, ctx) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid start time." });
      return z.NEVER;
    }

    return date.toISOString();
  });

const baseMonitorFields = {
  name: monitorNameSchema,
  urls: monitorUrlsSchema,
  prompt: monitorPromptSchema,
  startAt: startAtSchema,
};

/**
 * Discriminated on `scheduleKind` so a preset cannot smuggle a cron expression
 * and a custom schedule cannot fall back to an interval.
 */
export const createMonitorSchema = z.discriminatedUnion("scheduleKind", [
  z.object({
    ...baseMonitorFields,
    scheduleKind: z.literal("preset"),
    intervalSeconds: z.literal(PRESET_INTERVALS, {
      error: "Choose a supported cycle.",
    }),
  }),
  z.object({
    ...baseMonitorFields,
    scheduleKind: z.literal("custom"),
    cronExpression: cronExpressionSchema,
  }),
]);

export const updateMonitorSchema = z
  .object({
    name: monitorNameSchema.optional(),
    prompt: monitorPromptSchema.optional(),
    urls: monitorUrlsSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: "Provide at least one field to update.",
  });

export const monitorIdParamSchema = z.object({
  id: z.cuid2({ error: "Invalid monitor id." }),
});

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;
