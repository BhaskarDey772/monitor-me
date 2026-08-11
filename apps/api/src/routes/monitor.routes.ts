import {
  createMonitorSchema,
  monitorIdParamSchema,
  updateMonitorSchema,
} from "@monitor-me/shared";
import { Router } from "express";
import * as controller from "../controllers/monitor.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validateBody, validateParams } from "../middleware/validate.js";

export const monitorRouter = Router();

// Every monitor route is authenticated.
monitorRouter.use(requireAuth);

monitorRouter.get("/", controller.index);
monitorRouter.post("/", validateBody(createMonitorSchema), controller.store);

monitorRouter.get("/:id", validateParams(monitorIdParamSchema), controller.show);

monitorRouter.get(
  "/:id/runs",
  validateParams(monitorIdParamSchema),
  controller.runs,
);

monitorRouter.patch(
  "/:id",
  validateParams(monitorIdParamSchema),
  validateBody(updateMonitorSchema),
  controller.update,
);

monitorRouter.delete(
  "/:id",
  validateParams(monitorIdParamSchema),
  controller.destroy,
);
