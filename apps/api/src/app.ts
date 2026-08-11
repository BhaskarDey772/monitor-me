import { AUTH_BASE_PATH } from "@monitor-me/shared";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { env } from "./config/env.js";
import { auth } from "./lib/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import {
  SENSITIVE_AUTH_PATHS,
  authLimiter,
  corsMiddleware,
  globalLimiter,
  securityHeaders,
} from "./middleware/security.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  // Trust exactly one reverse proxy so `req.ip` and `req.secure` are accurate
  // without letting a client forge X-Forwarded-For to defeat rate limiting.
  app.set("trust proxy", 1);
  // Don't advertise the framework.
  app.disable("x-powered-by");

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(globalLimiter);

  // Tight limiter in front of the credential endpoints.
  app.use(SENSITIVE_AUTH_PATHS as unknown as string[], authLimiter);

  // Better Auth mounts BEFORE express.json(): its handler needs the raw request
  // stream, and a body parser here would consume it. Express 5 requires the
  // `*splat` named wildcard.
  app.all(`${AUTH_BASE_PATH}/*splat`, toNodeHandler(auth));

  // Body parsing applies to application routes only. The small limit caps
  // memory-exhaustion attempts from oversized payloads.
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));

  app.use(apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const port = env.PORT;
