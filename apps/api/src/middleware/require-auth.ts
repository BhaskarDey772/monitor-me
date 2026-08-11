import type { NextFunction, Request, RequestHandler, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

/**
 * Resolves the Better Auth session from the request cookies and attaches it.
 *
 * Session-hijacking defences applied here, on top of the signed httpOnly cookie:
 * - The session is validated server-side on every request; a forged or expired
 *   cookie yields nothing.
 * - The stored User-Agent is compared with the presented one. A stolen cookie
 *   replayed from another client is revoked rather than merely rejected, so the
 *   token is dead even if the attacker fixes their headers afterwards.
 */

/**
 * `disableCookieCache` forces a database lookup instead of trusting the signed
 * session-cache cookie. Without it a revoked session keeps working until the
 * cache expires, which would make the hijack response below cosmetic — the
 * attacker's copy of the cookie would still authenticate for minutes.
 */
async function resolveSession(req: Request) {
  return auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
    query: { disableCookieCache: true },
  });
}

/** Populates `req.auth` when signed in; never rejects. */
export const attachSession: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const session = await resolveSession(req);
  if (session) req.auth = session;
  next();
};

/** Rejects anonymous requests with 401 and enforces client binding. */
export const requireAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const session = req.auth ?? (await resolveSession(req));

  if (!session) {
    next(HttpError.unauthorized());
    return;
  }

  const storedUserAgent = session.session.userAgent;
  const presentedUserAgent = req.headers["user-agent"] ?? null;

  if (storedUserAgent && presentedUserAgent && storedUserAgent !== presentedUserAgent) {
    // Treat as a hijacked token: kill the session, then 401.
    await auth.api.revokeSession({
      body: { token: session.session.token },
      headers: fromNodeHeaders(req.headers),
    });

    next(HttpError.unauthorized("Session revoked: client mismatch."));
    return;
  }

  // Extra assurance in production, where cookies are Secure-only anyway.
  if (env.isProduction && !req.secure && req.get("x-forwarded-proto") !== "https") {
    next(HttpError.forbidden("HTTPS required."));
    return;
  }

  req.auth = session;
  next();
};

/** Non-null session accessor for controllers running behind `requireAuth`. */
export function currentUser(req: Request) {
  if (!req.auth) throw HttpError.unauthorized();
  return req.auth.user;
}
