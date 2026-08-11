import { prisma } from "../lib/prisma.js";

/**
 * Read-only user access. Writes (sign-up, password changes, verification) belong
 * to Better Auth — duplicating them here would bypass its hashing and hooks.
 *
 * `select` is explicit so the password hash on the account relation can never be
 * pulled into application code by accident.
 */
const publicSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  mustChangePassword: true,
} as const;

export function findById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: publicSelect });
}

export function findByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: publicSelect,
  });
}

/**
 * The one user write this app owns. Better Auth cannot clear the flag itself —
 * it does not know about it — so the password controller calls this after a
 * successful change. Not reachable from a request body (`input: false`).
 */
export function setMustChangePassword(id: string, value: boolean) {
  return prisma.user.update({
    where: { id },
    data: { mustChangePassword: value },
    select: publicSelect,
  });
}
