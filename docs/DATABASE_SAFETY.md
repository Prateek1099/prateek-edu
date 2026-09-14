# Application database safety guard

Vexa's shared application Prisma client refuses unsafe runtime/database pairings before it reuses a cached client or constructs a PostgreSQL pool.

## Required application configuration

Set `VEXA_DATABASE_ENV` only in server environments:

- Local development with a separate development database: `development`
- Vercel Preview with a separate preview (or development) database: `preview`
- Vercel Production with Vexa's pinned production database: `production`

The label is never trusted by itself. The guard also verifies Vercel's system runtime markers and the effective PostgreSQL target. Vercel Production fails closed unless both the runtime and pinned production database identity are positively verified. Local and Preview application runtimes are blocked from the production target.

There is intentionally no persistent bypass flag.

## Current setup required before rollout

Local `.env` files currently target production. Preserve those credentials until they can be moved into an appropriate secret-management workflow, but do not run the application with them. Provision a separate development database, update the local `DATABASE_URL`, and set `VEXA_DATABASE_ENV=development`.

Vercel Preview currently resolves to the production Neon endpoint. Provision a separate Preview database, replace only Preview's `DATABASE_URL`, and set Preview's `VEXA_DATABASE_ENV=preview`. Set Production's `VEXA_DATABASE_ENV=production` without changing its database URL. Perform those environment changes as a separately reviewed deployment step before releasing the guard.

## Prisma CLI and standalone scripts

The application guard is intentionally not imported by `prisma.config.ts`. Controlled release commands such as `prisma migrate status` and `prisma migrate deploy` remain usable, but **Prisma CLI commands are not protected by this application guard**.

Treat all local Prisma commands as production-capable whenever `DATABASE_URL` points to production, especially:

- `prisma migrate deploy`
- `prisma migrate dev`
- `prisma db push`
- `prisma db seed`
- custom seed or administrative scripts

Some legacy scripts create their own Prisma client or PostgreSQL pool and therefore remain outside the shared-client guard. Audit their target explicitly before running them.
