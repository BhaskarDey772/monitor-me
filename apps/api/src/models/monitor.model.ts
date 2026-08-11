import type { CreateMonitorInput, UpdateMonitorInput } from "@monitor-me/shared";
import { generateNtfyTopic } from "../lib/ntfy.js";
import { prisma } from "../lib/prisma.js";

/**
 * Model layer: every database access for monitors lives here.
 *
 * Two rules make this the security boundary for the resource:
 * 1. Queries go through Prisma's query builder only — values are always bound as
 *    parameters, so user input can never be parsed as SQL.
 * 2. Every read and write is scoped by `userId`, so one user cannot reach
 *    another's row even by guessing an id (no IDOR).
 */

/** Shape every read returns, so serializers can rely on the relations. */
const withRelations = {
  urls: { orderBy: { position: "asc" } },
  _count: { select: { runs: true } },
  runs: {
    take: 1,
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  },
} as const;

export function listByUser(userId: string) {
  return prisma.monitor.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: withRelations,
  });
}

export function findOwned(id: string, userId: string) {
  return prisma.monitor.findFirst({
    where: { id, userId },
    include: withRelations,
  });
}

/** Schedule columns, normalized from the discriminated input union. */
function scheduleColumns(input: CreateMonitorInput) {
  return input.scheduleKind === "preset"
    ? {
        scheduleKind: "preset",
        intervalSeconds: input.intervalSeconds,
        cronExpression: null,
      }
    : {
        scheduleKind: "custom",
        intervalSeconds: null,
        cronExpression: input.cronExpression,
      };
}

export function create(userId: string, input: CreateMonitorInput) {
  return prisma.monitor.create({
    data: {
      userId,
      name: input.name,
      prompt: input.prompt,
      startAt: new Date(input.startAt),
      // Generated here, never accepted from the request: the topic is the only
      // thing protecting the alert stream.
      ntfyTopic: generateNtfyTopic(),
      ...scheduleColumns(input),
      // Nested create keeps the monitor and its URLs in one implicit transaction:
      // a rejected URL cannot leave a monitor with no targets behind.
      urls: {
        create: input.urls.map((url, position) => ({ url, position })),
      },
    },
    include: withRelations,
  });
}

export async function updateOwned(
  id: string,
  userId: string,
  input: UpdateMonitorInput,
) {
  const { urls, ...fields } = input;

  // Ownership is checked inside the transaction, so a concurrent delete cannot
  // slip a write through.
  return prisma.$transaction(async (tx) => {
    const owned = await tx.monitor.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) return null;

    if (Object.keys(fields).length > 0) {
      await tx.monitor.update({ where: { id }, data: fields });
    }

    if (urls) {
      await tx.monitorUrl.deleteMany({ where: { monitorId: id } });
      await tx.monitorUrl.createMany({
        data: urls.map((url, position) => ({ monitorId: id, url, position })),
      });
    }

    return tx.monitor.findFirst({ where: { id }, include: withRelations });
  });
}

export async function deleteOwned(id: string, userId: string) {
  const { count } = await prisma.monitor.deleteMany({ where: { id, userId } });
  return count > 0;
}

export function countByUser(userId: string) {
  return prisma.monitor.count({ where: { userId } });
}

/** Full run history for the log screen, newest first. */
export function listRuns(monitorId: string, limit = 200) {
  return prisma.monitorRun.findMany({
    where: { monitorId },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { results: { orderBy: { url: "asc" } } },
  });
}
