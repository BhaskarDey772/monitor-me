import type { ApiErrorCode, ApiFieldErrors } from "@monitor-me/shared";

/**
 * The only error type controllers should throw. Anything else reaching the error
 * middleware is treated as an unexpected fault and reported as INTERNAL_ERROR
 * with no details, so stack traces and SQL never leak to a client.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields?: ApiFieldErrors;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: ApiFieldErrors,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  static badRequest(message = "Bad request.") {
    return new HttpError(400, "BAD_REQUEST", message);
  }

  static validation(fields: ApiFieldErrors, message = "Validation failed.") {
    return new HttpError(422, "VALIDATION_ERROR", message, fields);
  }

  static unauthorized(message = "Authentication required.") {
    return new HttpError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Not allowed.") {
    return new HttpError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Not found.") {
    return new HttpError(404, "NOT_FOUND", message);
  }

  static conflict(message = "Already exists.") {
    return new HttpError(409, "CONFLICT", message);
  }
}
