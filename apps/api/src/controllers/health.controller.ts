import type { Request, Response } from "express";
import { sendOk } from "../views/response.view.js";

/** Liveness probe. Intentionally leaks no version or environment detail. */
export function getHealth(_req: Request, res: Response) {
  return sendOk(res, { status: "ok" as const, uptime: Math.floor(process.uptime()) });
}
