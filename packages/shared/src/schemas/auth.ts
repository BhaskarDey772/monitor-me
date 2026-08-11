import { z } from "zod";
import { PASSWORD_POLICY } from "../constants.js";
import { normalizeText } from "../utils/sanitize.js";

/**
 * Auth input contracts. The client validates forms with these before hitting the
 * network; the server re-validates the same schemas before touching the database,
 * so a tampered request can never widen what the API accepts.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, { error: "Email is too long." })
  .pipe(z.email({ error: "Enter a valid email address." }));

export const passwordSchema = z
  .string()
  .min(PASSWORD_POLICY.minLength, {
    error: `Password must be at least ${PASSWORD_POLICY.minLength} characters.`,
  })
  .max(PASSWORD_POLICY.maxLength, {
    error: `Password must be at most ${PASSWORD_POLICY.maxLength} characters.`,
  })
  .refine((value) => /[a-z]/.test(value), {
    error: "Password must contain a lowercase letter.",
  })
  .refine((value) => /[A-Z]/.test(value), {
    error: "Password must contain an uppercase letter.",
  })
  .refine((value) => /\d/.test(value), {
    error: "Password must contain a number.",
  });

export const nameSchema = z
  .string()
  .transform(normalizeText)
  .pipe(
    z
      .string()
      .min(1, { error: "Name is required." })
      .max(80, { error: "Name must be at most 80 characters." }),
  );

/**
 * Public sign-up is disabled. This schema is kept for the server-side account
 * provisioning script (`pnpm --filter api user:create`), which validates the
 * same way the login form does.
 */
export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Password is required." }),
  rememberMe: z.boolean().optional(),
});

/**
 * Password change, used by the forced-reset flow after an account is provisioned
 * with a machine-generated password.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Current password is required." }),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, { error: "Confirm your new password." }),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    error: "Choose a password you have not used before.",
    path: ["newPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
