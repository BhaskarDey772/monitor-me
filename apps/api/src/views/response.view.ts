import type { ApiFailure, ApiResponse, ApiSuccess } from "@monitor-me/shared";
import type { Response } from "express";
import type { HttpError } from "../utils/http-error.js";

/**
 * View layer: the only place that shapes an HTTP body. Controllers hand it
 * already-serialized DTOs, so no Prisma row ever reaches the wire untouched.
 */

export function sendOk<T>(res: Response, data: T, status = 200) {
  const body: ApiSuccess<T> = { ok: true, data };
  return res.status(status).json(body satisfies ApiResponse<T>);
}

export function sendError(res: Response, error: HttpError) {
  const body: ApiFailure = {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
    },
  };
  return res.status(error.status).json(body);
}
