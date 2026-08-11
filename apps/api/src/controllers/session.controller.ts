import type { SessionInfo, UpdateProfileInput } from "@monitor-me/shared";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";
import { auth } from "../lib/auth.js";
import { currentUser } from "../middleware/require-auth.js";
import * as users from "../models/user.model.js";
import { HttpError } from "../utils/http-error.js";
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

/**
 * Updates the signed-in user's own profile.
 *
 * Delegated to Better Auth rather than written straight to the row, so its own
 * caches and hooks stay consistent. Only `name` is accepted: email changes need a
 * verification flow, and `mustChangePassword` is declared `input: false` so it can
 * never be cleared through here.
 */
export async function updateMe(req: Request, res: Response) {
  const user = currentUser(req);
  const input = req.body as UpdateProfileInput;

  const response = await auth.api.updateUser({
    body: { name: input.name },
    headers: fromNodeHeaders(req.headers),
    asResponse: true,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    throw HttpError.badRequest(body?.message ?? "Could not update the profile.");
  }

  // Forward any refreshed session cookie, as the password endpoint does.
  for (const cookie of response.headers.getSetCookie()) {
    res.append("Set-Cookie", cookie);
  }

  const fresh = await users.findById(user.id);
  if (!fresh) throw HttpError.notFound("User not found.");

  const payload: SessionInfo = {
    user: toPublicUser(fresh),
    expiresAt: new Date(req.auth!.session.expiresAt).toISOString(),
  };

  return sendOk(res, payload);
}
