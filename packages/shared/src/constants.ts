/** Base path the Better Auth handler is mounted on, in both apps. */
export const AUTH_BASE_PATH = "/api/auth";

/** Application (non-auth) API routes, shared so the client never hardcodes strings. */
export const API_ROUTES = {
  health: "/api/health",
  me: "/api/me",
  password: "/api/password",
  monitors: "/api/monitors",
  monitor: (id: string) => `/api/monitors/${id}`,
  monitorRuns: (id: string) => `/api/monitors/${id}/runs`,
} as const;

/**
 * Extra columns on the Better Auth user table, declared once so the server
 * config and the client's `inferAdditionalFields` plugin cannot drift.
 *
 * `input: false` is the important part: the flag is set by the provisioning
 * script and cleared by the server after a successful password change, so a
 * client cannot clear it by sending it in a request body.
 */
export const USER_ADDITIONAL_FIELDS = {
  mustChangePassword: {
    type: "boolean",
    defaultValue: false,
    required: false,
    input: false,
  },
} as const;

/** Where the client sends a user who still has a machine-generated password. */
export const CHANGE_PASSWORD_PATH = "/change-password";

/** Password policy enforced identically on client and server. */
export const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
} as const;

/** Session lifetime, kept in sync with the Better Auth server config. */
export const SESSION = {
  /** 7 days, in seconds. */
  expiresIn: 60 * 60 * 24 * 7,
  /** Rolling refresh window: 1 day, in seconds. */
  updateAge: 60 * 60 * 24,
} as const;
