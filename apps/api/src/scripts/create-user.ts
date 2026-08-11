import { parseInput, signUpSchema } from "@monitor-me/shared";
import { betterAuth } from "better-auth";
import { authOptions } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { setMustChangePassword } from "../models/user.model.js";

/**
 * Provisions an account from the command line, since public sign-up is disabled.
 *
 *   pnpm --filter api user:create -- --email you@example.com --name "You" [--password '...']
 *
 * It reuses the server's own auth options with sign-up re-enabled for this
 * process only, so the password is hashed exactly as the login endpoint expects.
 * Writing the user row and password hash by hand would be the easy way to create
 * an account nobody can actually log into.
 */

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function generatePassword(): string {
  // 24 url-safe chars from the CSPRNG — satisfies the shared password policy.
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const base = btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, "");
  return `Aa1${base}`.slice(0, 24);
}

async function main() {
  const generated = !readFlag("password");
  const password = readFlag("password") ?? generatePassword();

  const parsed = parseInput(signUpSchema, {
    name: readFlag("name") ?? readFlag("email")?.split("@")[0] ?? "",
    email: readFlag("email") ?? "",
    password,
  });

  if (!parsed.success) {
    console.error("Invalid input:");
    for (const [field, messages] of Object.entries(parsed.fields)) {
      console.error(`  - ${field}: ${messages.join(", ")}`);
    }
    console.error(
      '\nUsage: pnpm --filter api user:create -- --email you@example.com --name "You"',
    );
    process.exitCode = 1;
    return;
  }

  // Same config as the live server, with sign-up open for this invocation only.
  // `autoSignIn: false` keeps provisioning from minting a session for a browser
  // that does not exist — a stray, never-used session row is just a live
  // credential nobody is watching.
  const provisioner = betterAuth({
    ...authOptions,
    emailAndPassword: {
      ...authOptions.emailAndPassword,
      disableSignUp: false,
      autoSignIn: false,
    },
  });

  const result = await provisioner.api.signUpEmail({
    body: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    },
  });

  // A password this script generated has been printed to a terminal and will
  // likely be pasted into a chat or an email. Force a rotation on first sign-in;
  // until then the API allows nothing but the password change itself.
  if (generated) {
    await setMustChangePassword(result.user.id, true);
  }

  console.log(`Created user ${result.user.email} (${result.user.id})`);
  if (generated) {
    console.log(`Generated password: ${parsed.data.password}`);
    console.log("Store it now — it is not recoverable.");
    console.log("The user must set a new password at first sign-in.");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
