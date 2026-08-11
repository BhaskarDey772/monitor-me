import type { PublicUser } from "@monitor-me/shared";

/** Anything with the columns we intend to expose — keeps this view Prisma-agnostic. */
type UserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date | string;
  /** Nullable in the schema (the Better Auth CLI writes it optional). */
  mustChangePassword?: boolean | null;
};

/**
 * Allowlist serializer. Fields are copied explicitly, so a future column
 * (password hash, tokens, internal flags) cannot leak by being added to the model.
 */
export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
    createdAt: new Date(user.createdAt).toISOString(),
    mustChangePassword: user.mustChangePassword ?? false,
  };
}
