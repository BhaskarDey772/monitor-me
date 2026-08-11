import type { SessionInfo } from "@monitor-me/shared";
import type { Request, Response } from "express";
import { currentUser } from "../middleware/require-auth.js";
import { sendOk } from "../views/response.view.js";
import { toPublicUser } from "../views/user.view.js";

/**
 * Returns the signed-in user for the current session.
 *
 * Better Auth already exposes `/api/auth/get-session`; this endpoint exists so the
 * app can return its own `SessionInfo` shape (and later, app-specific claims)
 * without the client depending on Better Auth's response format.
 */
export function getMe(req: Request, res: Response) {
  const user = currentUser(req);
  const session = req.auth!.session;

  const payload: SessionInfo = {
    user: toPublicUser({ ...user, emailVerified: Boolean(user.emailVerified) }),
    expiresAt: new Date(session.expiresAt).toISOString(),
  };

  return sendOk(res, payload);
}
