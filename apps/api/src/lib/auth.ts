import {
  AUTH_BASE_PATH,
  PASSWORD_POLICY,
  SESSION,
  USER_ADDITIONAL_FIELDS,
} from "@monitor-me/shared";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";

/**
 * Better Auth server instance — the single source of truth for auth.
 *
 * Security posture:
 * - `trustedOrigins` is the CSRF defence: state-changing auth requests from any
 *   other origin are rejected, and callback/redirect targets are restricted to
 *   this allowlist. Never widen it to "*".
 * - Session cookies are httpOnly (no JS access, so XSS cannot read them),
 *   SameSite=Lax (not sent on cross-site POSTs) and Secure in production.
 * - Sessions are signed with BETTER_AUTH_SECRET and rotate every `updateAge`,
 *   which shrinks the window a stolen cookie stays useful.
 * - Auth endpoints are rate limited per-route, with the credential endpoints far
 *   tighter than the rest to blunt password spraying and enumeration.
 * - Public sign-up is disabled: accounts are provisioned with
 *   `pnpm --filter api user:create`. That closes the whole
 *   registration-abuse surface (spam accounts, enumeration via sign-up errors).
 *
 * Exported as options so the provisioning script can reuse this exact config
 * with sign-up temporarily re-enabled, instead of writing rows by hand and
 * risking a password hashed differently from what login expects.
 */
export const authOptions = {
  appName: "monitor-me",
  baseURL: env.BETTER_AUTH_URL,
  basePath: AUTH_BASE_PATH,
  secret: env.BETTER_AUTH_SECRET,

  // Browser origins allowed to drive auth. CLIENT_URL is the app; SERVER_URL
  // covers same-origin calls behind a reverse proxy.
  trustedOrigins: [...env.CLIENT_URL, env.SERVER_URL],

  database: prismaAdapter(prisma, { provider: "sqlite" }),

  user: {
    // Adds `mustChangePassword` to the user table. Not client-writable.
    additionalFields: USER_ADDITIONAL_FIELDS,
  },

  emailAndPassword: {
    enabled: true,
    // Login only: the public /sign-up/email endpoint is rejected.
    disableSignUp: true,
    // Mirrors the shared zod policy so client, server and Better Auth agree.
    minPasswordLength: PASSWORD_POLICY.minLength,
    maxPasswordLength: PASSWORD_POLICY.maxLength,
    autoSignIn: true,
    // Flip on once an email sender is wired up.
    requireEmailVerification: false,
  },

  session: {
    expiresIn: SESSION.expiresIn,
    updateAge: SESSION.updateAge,
    cookieCache: {
      // Signed short-lived cache, used only by Better Auth's own endpoints (the
      // client polls get-session often). Application routes bypass it via
      // `disableCookieCache`, so authorization always reflects the database.
      enabled: true,
      maxAge: 60,
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/forget-password": { window: 60 * 60, max: 3 },
      "/reset-password": { window: 60 * 60, max: 5 },
    },
  },

  advanced: {
    cookiePrefix: "monitor-me",
    useSecureCookies: env.isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProduction,
      path: "/",
    },
    // Trust only the proxy header we actually terminate TLS behind.
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
      disableIpTracking: false,
    },
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth(authOptions);

export type Auth = typeof auth;
export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
