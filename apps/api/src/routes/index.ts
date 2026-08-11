import { API_ROUTES, changePasswordSchema } from "@monitor-me/shared";
import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";
import { changePassword } from "../controllers/password.controller.js";
import { getMe } from "../controllers/session.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requirePasswordChanged } from "../middleware/require-password-change.js";
import { validateBody } from "../middleware/validate.js";
import { monitorRouter } from "./monitor.routes.js";

/** Single place where URLs are bound to controllers. */
export const apiRouter = Router();

apiRouter.get(API_ROUTES.health, getHealth);

// Reachable while a password change is pending — the client needs it to know
// where to send the user.
apiRouter.get(API_ROUTES.me, requireAuth, getMe);

// The one write allowed while a password change is pending.
apiRouter.post(
  API_ROUTES.password,
  requireAuth,
  validateBody(changePasswordSchema),
  changePassword,
);

// Everything below is gated on the password having been rotated.
apiRouter.use(API_ROUTES.monitors, requireAuth, requirePasswordChanged, monitorRouter);
