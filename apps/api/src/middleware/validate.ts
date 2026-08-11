import { parseInput } from "@monitor-me/shared";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../utils/http-error.js";

/**
 * Schema-first request validation using the schemas shared with the client.
 *
 * The parsed (and coerced/normalized) result replaces the raw input, so
 * controllers only ever see values that satisfied the contract — the main defence
 * against injection and stored-XSS payloads reaching the database. Unknown keys
 * are stripped by Zod objects, so extra fields cannot smuggle themselves into a
 * Prisma write (no mass assignment).
 */

type Source = "body" | "query" | "params";

export function validate(source: Source, schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = parseInput(schema, req[source]);

    if (!result.success) {
      next(HttpError.validation(result.fields));
      return;
    }

    // `req.query` is a getter in Express 5, so assign through defineProperty.
    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });

    next();
  };
}

export const validateBody = (schema: ZodType) => validate("body", schema);
export const validateParams = (schema: ZodType) => validate("params", schema);
export const validateQuery = (schema: ZodType) => validate("query", schema);
