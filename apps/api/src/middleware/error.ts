import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { sendError } from "../views/response.view.js";

/** 404 for anything the router did not claim. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  sendError(res, HttpError.notFound("Route not found."));
};

/**
 * Terminal error handler.
 *
 * Only errors we constructed carry a message to the client. Unknown faults are
 * logged server-side and answered with a generic 500, so database errors, file
 * paths and stack traces never become an attacker's reconnaissance tool.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    sendError(res, error);
    return;
  }

  if (error instanceof ZodError) {
    const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
      const key = issue.path.map(String).join(".") || "_";
      (acc[key] ??= []).push(issue.message);
      return acc;
    }, {});

    sendError(res, HttpError.validation(fields));
    return;
  }

  // Malformed JSON from express.json() — a client error, not a server fault.
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    (error as { status?: number }).status === 400
  ) {
    sendError(res, HttpError.badRequest("Malformed JSON body."));
    return;
  }

  console.error("[api] unhandled error:", error);

  sendError(
    res,
    new HttpError(
      500,
      "INTERNAL_ERROR",
      env.isProduction ? "Something went wrong." : String(error),
    ),
  );
};
