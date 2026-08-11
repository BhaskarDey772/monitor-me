import { AUTH_BASE_PATH } from "@monitor-me/shared";
import cors, { type CorsOptions } from "cors";
import type { RequestHandler } from "express";
import rateLimit, { type Options as RateLimitOptions } from "express-rate-limit";
import helmet from "helmet";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { sendError } from "../views/response.view.js";

/**
 * Cross-cutting HTTP hardening, applied in `app.ts` before any route.
 */

/**
 * CORS: strict origin allowlist, credentials enabled.
 *
 * `credentials: true` means the browser will attach the session cookie, so the
 * allowlist must never be `*` or reflect an arbitrary Origin header — that would
 * let any site read authenticated responses. Requests with no Origin (curl,
 * server-to-server, same-origin navigations) are allowed through; the browser is
 * the only party CORS protects.
 */
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || env.CLIENT_URL.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new HttpError(403, "FORBIDDEN", `Origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  // Cache preflights for 10 minutes.
  maxAge: 600,
};

export const corsMiddleware = cors(corsOptions);

/**
 * Security headers. This is a JSON API, so the CSP is maximally restrictive: no
 * scripts, no frames, no embedding — an injected `<script>` in any response the
 * browser mistakenly renders cannot execute (XSS defence in depth).
 *
 * The client's own CSP belongs in whatever serves its HTML, not here.
 */
export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      "default-src": ["'none'"],
      "frame-ancestors": ["'none'"],
      "base-uri": ["'none'"],
      "form-action": ["'none'"],
    },
  },
  // Deny embedding, sniffing, and referrer leakage.
  frameguard: { action: "deny" },
  noSniff: true,
  referrerPolicy: { policy: "no-referrer" },
  crossOriginResourcePolicy: { policy: "same-site" },
  // HSTS only makes sense once TLS terminates in front of the API.
  hsts: env.isProduction
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
    : false,
});

const rateLimitHandler: RateLimitOptions["handler"] = (_req, res) => {
  sendError(res, new HttpError(429, "RATE_LIMITED", "Too many requests. Slow down."));
};

const baseLimiter = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler,
} satisfies Partial<RateLimitOptions>;

/** Broad limiter for the whole API — blunts scraping and brute force. */
export const globalLimiter = rateLimit({
  ...baseLimiter,
  windowMs: 60_000,
  limit: env.isProduction ? 120 : 1000,
});

/**
 * Tight limiter for credential endpoints. Keyed by IP (the default generator,
 * which groups IPv6 by /56 so a single host cannot rotate addresses for free).
 * It runs before the body is parsed — the auth handler needs the raw stream — so
 * keying by email is not an option here; Better Auth's own per-route
 * `customRules` provide the per-account limits instead.
 */
export const authLimiter = rateLimit({
  ...baseLimiter,
  windowMs: 15 * 60_000,
  limit: env.isProduction ? 20 : 200,
  skip: (req) => req.method === "GET" || req.method === "OPTIONS",
});

/**
 * Writes to settings are limited harder than ordinary requests.
 *
 * A settings write can carry an OpenRouter key, which the server verifies against
 * OpenRouter. Without a limit, this endpoint would be a free oracle for testing
 * stolen keys at our IP's expense.
 */
export const settingsWriteLimiter = rateLimit({
  ...baseLimiter,
  windowMs: 5 * 60_000,
  limit: env.isProduction ? 10 : 100,
  skip: (req) => req.method === "GET" || req.method === "OPTIONS",
});

/**
 * Authenticated API responses must not be stored by browsers or proxies. Applied
 * to every API route so a shared cache can never hand one user's data — or the
 * masked shape of their credentials — to the next person on the connection.
 */
export const noStore: RequestHandler = (_req, res, next) => {
  res.set("Cache-Control", "no-store, private");
  res.set("Pragma", "no-cache");
  next();
};

/** Paths the tight limiter guards, relative to the auth base path. */
export const SENSITIVE_AUTH_PATHS = [
  `${AUTH_BASE_PATH}/sign-in`,
  `${AUTH_BASE_PATH}/sign-up`,
  `${AUTH_BASE_PATH}/forget-password`,
  `${AUTH_BASE_PATH}/reset-password`,
] as const;
