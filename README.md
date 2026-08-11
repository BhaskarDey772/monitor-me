# monitor-me

Turborepo monorepo: a Vite/React client, an Express API in MVC layout, and a
shared package both consume. SQLite via Prisma, sessions via Better Auth, one
`.env` at the root for everything.

## Stack

| Workspace          | Contents                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| `apps/web`         | Vite 8, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Router |
| `apps/api`         | Node, Express 5, TypeScript, Prisma 7 + SQLite, Better Auth               |
| `packages/shared`  | Zod schemas, DTO types, route constants, shared validation helpers        |

## Setup

```bash
pnpm install
cp .env.example .env            # then edit it (see below)
npx auth@latest secret          # paste the result into BETTER_AUTH_SECRET
pnpm db:migrate                 # creates apps/api/prisma/dev.db
pnpm dev                        # api on :4000, web on :5173
```

Create the first account — there is **no public sign-up** (see below):

```bash
pnpm --filter api user:create -- --email you@example.com --name "You"
# prints a generated password; pass --password '...' to choose your own
```

Then open http://localhost:5173 and sign in. If the password was generated, the
first sign-in lands on `/change-password` and nothing else works until it is
rotated (see [Forced password rotation](#forced-password-rotation)).

### Shared environment

One file, `.env` at the repo root, is the only place configuration lives.

- The API loads it with `dotenv` in `apps/api/src/config/env.ts`, where a Zod
  schema validates it and the process **refuses to boot** on anything missing,
  short, or malformed.
- The client loads it via Vite's `envDir`, pointed at the repo root. Vite exposes
  only `VITE_`-prefixed variables to the browser, so secrets in the same file
  never reach the bundle.
- The Prisma CLI loads it through `apps/api/prisma.config.ts`.

`DATABASE_URL` is written relative to the repo root and resolved to an absolute
path at runtime, so the CLI and the server always open the same SQLite file
regardless of the working directory.

## Commands

| Command                             | Effect                                            |
| ----------------------------------- | ------------------------------------------------- |
| `pnpm dev`                          | All workspaces in watch mode                      |
| `pnpm build`                        | Build everything (shared → apps)                  |
| `pnpm check-types`                  | Typecheck every workspace                         |
| `pnpm lint`                         | oxlint on the client                              |
| `pnpm db:migrate`                   | Create/apply a migration                          |
| `pnpm db:generate`                  | Regenerate the Prisma client                      |
| `pnpm auth:generate`                | Regenerate Better Auth's Prisma models            |
| `pnpm user:create`                  | Provision an account                              |
| `pnpm db:studio`                    | Prisma Studio                                     |

Graph tasks (`build`, `dev`, `lint`, `check-types`, `db:generate`) run through
turbo. The interactive one-offs — `db:migrate`, `auth:generate`, `db:studio`,
`user:create` — delegate straight to the `api` workspace with `pnpm --filter`
instead. Turbo refuses to run a task marked `interactive` unless its terminal UI
is enabled, and it would otherwise fan the task out to `web` and `shared`, which
have no such script.

`pnpm auth:generate` **overwrites** `prisma/schema.prisma`. App models live below
the `--- application models ---` marker; re-add them after regenerating if the CLI
drops them.

## Server layout (MVC)

```
apps/api/src
├── config/         env validation, path resolution
├── lib/            prisma client, better-auth instance
├── models/         all database access, scoped by user
├── views/          serializers — the only code that shapes a response body
├── controllers/    request → model → view
├── routes/         URL → controller bindings
├── middleware/     security headers, CORS, rate limits, auth, validation, errors
└── scripts/        account provisioning
```

Layer rules: controllers never write SQL, models never touch `req`/`res`, and
views never read the database. A Prisma row never reaches the client — every
response goes through an explicit allowlist serializer, so adding a column cannot
leak it.

## Monitors

A monitor is a name, one or more http(s) URLs, a schedule, a start time, and a
prompt describing what to look for. Added through a modal on the dashboard:

- **URLs** — repeatable rows, up to 20, duplicates rejected. Stored in a
  `monitor_url` child table rather than a delimited string.
- **Cycle** — every minute / 30 minutes / hour / 6 hours / 12 hours / 24 hours, or
  **Custom…**, which reveals a field for a 5-field cron expression.
- **Start time** — a `datetime-local` value marking when the schedule becomes
  active.
- **Prompt** — free text, shown on the list and the log screen.

`createMonitorSchema` is a Zod discriminated union on `scheduleKind`, so a preset
cycle can never arrive alongside a cron expression, and cron strings are validated
by the same `isValidCronExpression` on both sides.

Each list row has a **Log** button and a red delete icon. The log screen
(`/monitors/$monitorId/log`) shows the monitor's prompt and every recorded run,
newest first, with per-URL status, HTTP code and duration.

### Alerts (ntfy)

Every monitor gets its own ntfy topic, generated server-side. A small QR icon sits
next to the monitor name; it opens a dialog with a QR code that subscribes a phone
to that topic, plus the raw topic and copyable links.

#### Why the QR is a two-hop link

Scanning has to end up at `ntfy://<host>/<topic>`, but a QR cannot carry that
directly, and cannot carry an https ntfy URL either. Both halves are dead ends:

- **A camera won't launch `ntfy://`.** Phone camera apps only follow a small
  allowlist of schemes — http, https, tel, mailto, geo, wifi. An unknown scheme is
  surfaced as plain text, which is exactly the "it just copies the text and
  doesn't redirect" symptom.
- **An https ntfy link won't reach the app.** ntfy's docs: *"Android deep linking
  of http/https links is very brittle and limited, which is why something like
  `https://<host>/<topic>/subscribe` is not possible."* The maintainer did try
  App Links and then removed them — *"Android is not allowing me to register
  reg-ex patterns of URLs and the wildcard stuff seems incredibly buggy"*
  ([ntfy#20](https://github.com/binwiederhier/ntfy/issues/20)).

Navigating to a custom scheme **from inside a browser** does hand off to the OS. So:

```
QR  →  https://<app>/subscribe/<topic>?display=<name>     camera opens this
        └─ immediately redirects to → ntfy://<host>/<topic>?display=<name>
```

`/subscribe/$topic` redirects straight through — no buttons, no choices. Scanning
the code means "open the app", so the page only changes scheme. It is public and
stateless (the scanning phone is not signed in) and reveals nothing the topic
holder does not already have.

Two browser policies constrain that page, neither of them fixable from inside it:

- **An automatic scheme launch can be refused.** Chrome answers a scripted
  navigation to `ntfy://` with *"Not allowed to launch … because a user gesture is
  required"*. After a tap the same navigation is permitted (it then reports only
  *"the scheme does not have a registered handler"* when the app is absent). So
  the page's one line of text is itself the link — if the automatic hop was
  blocked, the first tap completes it.
- **The tab cannot close itself.** `window.close()` is attempted, but browsers
  allow it only for script-opened windows: a tab the camera app opened refuses with
  *"Scripts may close only the windows that were opened by them"*. Expect the tab
  to remain in the background after ntfy takes focus.

Links come from `buildNtfyLinks` in `packages/shared` (adding `secure=false`
automatically when `NTFY_SERVER` is plain http), so the server and the QR never
disagree. Set the instance with `NTFY_SERVER` in the root `.env`; it defaults to
`https://ntfy.sh`.

> **The QR must point at an address the phone can reach.** The first entry of
> `CLIENT_URL` is baked into the QR, and `localhost` resolves to the phone itself.
> For device testing, put your LAN IP first —
> `CLIENT_URL=http://192.168.1.20:5173,http://localhost:5173` — and note the web
> dev server runs with `vite --host` so it listens on the LAN.

Two caveats worth knowing:

- **Deep links are documented for the Android app.** On iOS, subscribe by pasting
  the topic — the dialog exposes it with a copy button.
- **The topic is the password.** ntfy's docs: *"Since there is no sign-up, the
  topic is essentially a password, so pick something that's not easily
  guessable."* Anyone who learns a topic can read its alerts and publish fake
  ones, so topics are 24 characters from the CSPRNG (~143 bits), never derived
  from the monitor id, name or user id, and never accepted from a request body.
  For anything real, self-host ntfy with auth.

> **No scheduler yet.** Nothing executes monitors, so `monitor_run` is empty and
> start time and cycle have no runtime effect. The log screen falls back to
> client-side placeholder rows (`apps/web/src/lib/dummy-runs.ts`) marked
> **Sample data**, so the layout is reviewable. Nothing fake is ever written to the
> database. Delete that file and the fallback in the log route when a runner lands.

## Auth

Better Auth with email + password, sessions in the database, cookies signed with
`BETTER_AUTH_SECRET`.

**Login only — public sign-up is disabled** (`disableSignUp: true`). Accounts are
provisioned with `pnpm --filter api user:create`, which reuses the server's own
auth config with sign-up temporarily re-enabled so passwords are hashed exactly
as the login endpoint expects. That closes the whole registration-abuse surface,
and the client exports no `signUp` at all.

There is no default password. Pass `--password` to choose one, or omit it and the
script generates 24 random characters from the CSPRNG and prints them once — only
the hash is stored, so a lost password means a new account.

### Forced password rotation

A generated password gets printed to a terminal and usually pasted into a chat or
an email, so it should buy nothing beyond the ability to replace itself.

`user:create` therefore sets `user.mustChangePassword` (a column on the Prisma
`user` model, declared via Better Auth's `additionalFields` and **not**
client-writable) whenever it generated the password. While the flag is set:

- `POST /api/password` and `GET /api/me` are the only endpoints that work;
  everything else answers `403 PASSWORD_CHANGE_REQUIRED`, enforced by
  `requirePasswordChanged` middleware — not by the UI.
- The client's `_authed` guard redirects to `/change-password`, and navigating
  anywhere else bounces straight back.

`POST /api/password` re-validates with the shared `changePasswordSchema`, delegates
the hashing and current-password check to Better Auth, passes
`revokeOtherSessions: true` so anyone else who used the leaked password is signed
out, forwards Better Auth's rotated session cookie (skip that and the user who
just succeeded is logged out), then clears the flag.

Passing `--password` explicitly does not set the flag — an admin-chosen password
was never printed by us. The same page doubles as the ordinary "change password"
screen for anyone already rotated.

## Security

| Threat                | Mitigation                                                                                                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CORS**              | Strict origin allowlist from `CLIENT_URL` with `credentials: true`; never `*`, never a reflected `Origin`. Unlisted origins get 403. In dev the client calls itself and Vite proxies `/api`, so requests are same-origin and first-party. |
| **CSRF**              | Better Auth `trustedOrigins` rejects state-changing auth requests from other origins; session cookies are `SameSite=Lax`.                                                                                                                |
| **XSS**               | React renders all values as text (no `innerHTML`/`dangerouslySetInnerHTML`); a locked-down CSP (`default-src 'none'`) plus `nosniff` on API responses; session cookies are `httpOnly`, so injected JS cannot read them; URL inputs restricted to `http(s)`, blocking `javascript:`/`data:`. |
| **SQL injection**     | All access goes through Prisma's query builder, which always sends bound parameters. No raw SQL anywhere; if it becomes necessary, use `$queryRaw` tagged templates, never `$queryRawUnsafe`.                                             |
| **Session hijacking** | `httpOnly` + `SameSite=Lax` + `Secure` in production; signed tokens; rolling rotation; API routes validate against the database (`disableCookieCache`) so revocation is immediate; a session replayed from a different User-Agent is **revoked**, not merely rejected; HTTPS required in production. |
| **Brute force**       | `express-rate-limit` globally, tighter on credential paths, plus Better Auth's per-route rules (5 sign-ins/min).                                                                                                                          |
| **Leaked initial password** | Generated passwords are single-use by construction: the account can do nothing but rotate the password, and rotating it revokes every other session.                                                                                |
| **Mass assignment**   | Zod object schemas strip unknown keys before anything reaches Prisma.                                                                                                                                                                    |
| **IDOR**              | Every monitor query is scoped by the session user's id; another user's row answers 404.                                                                                                                                                  |
| **Open redirect**     | `?redirect=` after login accepts only same-origin relative paths.                                                                                                                                                                        |
| **Info disclosure**   | `x-powered-by` off; unknown errors return a generic 500 with no stack trace; login failures never reveal whether an email exists.                                                                                                        |
| **Payload size**      | Body parsers capped at 100 kb.                                                                                                                                                                                                          |

Validation runs on both sides from the *same* Zod schemas in
`packages/shared`, so the client cannot enforce rules the server doesn't, and a
tampered request cannot widen what the API accepts.

### Before deploying

1. Set `NODE_ENV=production`, a fresh 32+ char `BETTER_AUTH_SECRET`, and https
   URLs for `SERVER_URL` / `BETTER_AUTH_URL` / `CLIENT_URL`.
2. Terminate TLS in front of the API (cookies become `Secure`, HSTS turns on, and
   `trust proxy` is set to exactly one hop).
3. Serve the client and API from one origin, or add the client's origin to
   `CLIENT_URL` and expect `SameSite=Lax` cross-site caveats.
4. Swap the in-memory rate-limit stores for a shared one (Redis) if you run more
   than one instance.
5. Wire an email sender and set `requireEmailVerification: true`.
6. Use `pnpm --filter api db:deploy` for migrations, not `db:migrate`.
