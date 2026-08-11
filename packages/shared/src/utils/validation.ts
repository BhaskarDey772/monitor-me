import { z, type ZodError, type ZodType } from "zod";
import type { ApiFieldErrors } from "../types/api.js";

/**
 * One error shape for both apps: the client renders these under form inputs and
 * the server returns them as `error.fields`, so a rejection looks the same
 * whichever side caught it.
 */
export function toFieldErrors(error: ZodError): ApiFieldErrors {
  const flat = z.flattenError(error);
  const fields: ApiFieldErrors = { ...flat.fieldErrors };

  if (flat.formErrors.length > 0) fields["_"] = flat.formErrors;

  return fields;
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; fields: ApiFieldErrors };

/** safeParse with the field-error mapping already applied. */
export function parseInput<T extends ZodType>(
  schema: T,
  input: unknown,
): ParseResult<z.output<T>> {
  const result = schema.safeParse(input);

  return result.success
    ? { success: true, data: result.data }
    : { success: false, fields: toFieldErrors(result.error) };
}
