import type { UpdateSettingsInput } from "@monitor-me/shared";
import type { Request, Response } from "express";
import { listModels, validateApiKey } from "../lib/openrouter.js";
import { currentUser } from "../middleware/require-auth.js";
import * as settings from "../models/settings.model.js";
import { HttpError } from "../utils/http-error.js";
import { sendOk } from "../views/response.view.js";
import { toSettingsDto } from "../views/settings.view.js";

export async function show(req: Request, res: Response) {
  const user = currentUser(req);
  const row = await settings.findOrCreateForUser(user.id);
  return sendOk(res, toSettingsDto(row));
}

export async function update(req: Request, res: Response) {
  const user = currentUser(req);
  const input = req.body as UpdateSettingsInput;

  // Check a new key with OpenRouter before storing it: an unusable key should
  // fail now, while the user is looking at the field, not later during a run.
  if (typeof input.openRouterApiKey === "string") {
    const result = await validateApiKey(input.openRouterApiKey);
    if (!result.ok) {
      throw HttpError.validation({ openRouterApiKey: [result.reason] });
    }
  }

  const row = await settings.updateForUser(user.id, input);
  return sendOk(res, toSettingsDto(row));
}

/** Model catalogue for the settings picker. Cached in the OpenRouter client. */
export async function models(_req: Request, res: Response) {
  try {
    return sendOk(res, await listModels());
  } catch {
    throw new HttpError(
      502,
      "INTERNAL_ERROR",
      "Could not load the model list from OpenRouter.",
    );
  }
}
