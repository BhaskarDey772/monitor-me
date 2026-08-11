import type {
  CreateMonitorInput,
  MonitorLogDto,
  UpdateMonitorInput,
} from "@monitor-me/shared";
import type { Request, Response } from "express";
import { currentUser } from "../middleware/require-auth.js";
import * as monitors from "../models/monitor.model.js";
import { HttpError } from "../utils/http-error.js";
import { sendOk } from "../views/response.view.js";
import {
  toMonitorDto,
  toMonitorDtoList,
  toMonitorRunDtoList,
} from "../views/monitor.view.js";

/**
 * Controller layer: request in, model call, view out. No SQL, no serialization
 * details, and no trust in the request beyond what the validate middleware
 * already parsed. Ownership is enforced by the model, which scopes every query
 * to the session user.
 */

const MAX_MONITORS_PER_USER = 50;

export async function index(req: Request, res: Response) {
  const user = currentUser(req);
  const rows = await monitors.listByUser(user.id);
  return sendOk(res, toMonitorDtoList(rows));
}

export async function show(req: Request, res: Response) {
  const user = currentUser(req);
  const { id } = req.params as { id: string };

  const row = await monitors.findOwned(id, user.id);
  if (!row) throw HttpError.notFound("Monitor not found.");

  return sendOk(res, toMonitorDto(row));
}

export async function store(req: Request, res: Response) {
  const user = currentUser(req);
  const input = req.body as CreateMonitorInput;

  if ((await monitors.countByUser(user.id)) >= MAX_MONITORS_PER_USER) {
    throw HttpError.forbidden(
      `Monitor limit reached (${MAX_MONITORS_PER_USER}).`,
    );
  }

  const row = await monitors.create(user.id, input);
  return sendOk(res, toMonitorDto(row), 201);
}

export async function update(req: Request, res: Response) {
  const user = currentUser(req);
  const { id } = req.params as { id: string };
  const input = req.body as UpdateMonitorInput;

  const row = await monitors.updateOwned(id, user.id, input);
  if (!row) throw HttpError.notFound("Monitor not found.");

  return sendOk(res, toMonitorDto(row));
}

export async function destroy(req: Request, res: Response) {
  const user = currentUser(req);
  const { id } = req.params as { id: string };

  const deleted = await monitors.deleteOwned(id, user.id);
  if (!deleted) throw HttpError.notFound("Monitor not found.");

  return sendOk(res, { id });
}

/**
 * Run history for the log screen.
 *
 * Ownership is resolved before any run is read, so an id belonging to another
 * user answers 404 rather than leaking that the monitor exists.
 */
export async function runs(req: Request, res: Response) {
  const user = currentUser(req);
  const { id } = req.params as { id: string };

  const monitor = await monitors.findOwned(id, user.id);
  if (!monitor) throw HttpError.notFound("Monitor not found.");

  const rows = await monitors.listRuns(monitor.id);

  const payload: MonitorLogDto = {
    monitor: toMonitorDto(monitor),
    runs: toMonitorRunDtoList(rows),
  };

  return sendOk(res, payload);
}
