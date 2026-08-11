import type { AuthSession } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      /** Better Auth session + user, populated by `attachSession` / `requireAuth`. */
      auth?: NonNullable<AuthSession>;
    }
  }
}

export {};
