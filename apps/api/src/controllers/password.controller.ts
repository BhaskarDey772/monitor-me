import type { ChangePasswordInput, SessionInfo } from "@monitor-me/shared";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";
import { auth } from "../lib/auth.js";
import { currentUser } from "../middleware/require-auth.js";
import * as users from "../models/user.model.js";
import { HttpError } from "../utils/http-error.js";
import { sendOk } from "../views/response.view.js";
import { toPublicUser } from "../views/user.view.js";

/**
 * Changes the signed-in user's password and clears `mustChangePassword`.
 *
 * Better Auth owns the hashing and the current-password check; this controller
 * only adds the flag bookkeeping, which Better Auth has no knowledge of.
 *
 * `revokeOtherSessions: true` matters here: if the generated password leaked,
 * whoever used it is signed out the moment the real owner rotates it.
 *
 * Called with `asResponse` so the rotated session cookie can be forwarded.
 * Better Auth issues a fresh session token as part of the change; drop it and the
 * caller's own cookie is dead too, logging out the person who just succeeded.
 */
export async function changePassword(req: Request, res: Response) {
  const user = currentUser(req);
  const input = req.body as ChangePasswordInput;

  const authResponse = await auth.api.changePassword({
    body: {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      revokeOtherSessions: true,
    },
    headers: fromNodeHeaders(req.headers),
    asResponse: true,
  });

  if (!authResponse.ok) {
    // A wrong current password is the expected failure. Pass the message
    // through, but nothing else about the internals.
    const body = (await authResponse.json().catch(() => null)) as {
      message?: string;
    } | null;

    throw HttpError.badRequest(body?.message ?? "Could not change the password.");
  }

  // Hand the rotated session cookie to the browser.
  for (const cookie of authResponse.headers.getSetCookie()) {
    res.append("Set-Cookie", cookie);
  }

  const updated = await users.setMustChangePassword(user.id, false);

  const payload: SessionInfo = {
    user: toPublicUser(updated),
    expiresAt: new Date(req.auth!.session.expiresAt).toISOString(),
  };

  return sendOk(res, payload);
}
