import {
  API_ROUTES,
  changePasswordSchema,
  updateProfileSchema,
  updateSettingsSchema,
} from "@monitor-me/shared";
import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";
import { changePassword } from "../controllers/password.controller.js";
import { getMe, updateMe } from "../controllers/session.controller.js";
import * as settings from "../controllers/settings.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requirePasswordChanged } from "../middleware/require-password-change.js";
import { noStore, settingsWriteLimiter } from "../middleware/security.js";
import { validateBody } from "../middleware/validate.js";
import { monitorRouter } from "./monitor.routes.js";

/** Single place where URLs are bound to controllers. */
export const apiRouter = Router();

apiRouter.get(API_ROUTES.health, getHealth);

// Nothing below is cacheable: it is all per-user and authenticated.
apiRouter.use(noStore);

// Reachable while a password change is pending — the client needs it to know
// where to send the user.
apiRouter.get(API_ROUTES.me, requireAuth, getMe);

// Editing the profile is not, though: rotate the password first.
apiRouter.patch(
  API_ROUTES.me,
  requireAuth,
  requirePasswordChanged,
  validateBody(updateProfileSchema),
  updateMe,
);

// The one write allowed while a password change is pending.
apiRouter.post(
  API_ROUTES.password,
  requireAuth,
  validateBody(changePasswordSchema),
  changePassword,
);

apiRouter.get(
  API_ROUTES.settings,
  requireAuth,
  requirePasswordChanged,
  settings.show,
);

apiRouter.patch(
  API_ROUTES.settings,
  requireAuth,
  requirePasswordChanged,
  settingsWriteLimiter,
  validateBody(updateSettingsSchema),
  settings.update,
);

apiRouter.get(
  API_ROUTES.openRouterModels,
  requireAuth,
  requirePasswordChanged,
  settings.models,
);

// Everything below is gated on the password having been rotated.
apiRouter.use(API_ROUTES.monitors, requireAuth, requirePasswordChanged, monitorRouter);
