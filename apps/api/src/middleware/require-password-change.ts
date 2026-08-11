import type { NextFunction, Request, RequestHandler, Response } from "express";
import { HttpError } from "../utils/http-error.js";

/**
 * Blocks an account that is still using the password the provisioning script
 * generated. Applied to application routes, never to the password-change
 * endpoint itself.
 *
 * The gate lives on the server, not in the UI: a generated password has been
 * printed to a terminal (and probably pasted into a chat), so it should buy
 * nothing beyond the ability to replace itself.
 */
export const requirePasswordChanged: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const user = req.auth?.user as { mustChangePassword?: boolean | null } | undefined;

  if (user?.mustChangePassword) {
    next(
      new HttpError(
        403,
        "PASSWORD_CHANGE_REQUIRED",
        "Set a new password before continuing.",
      ),
    );
    return;
  }

  next();
};
