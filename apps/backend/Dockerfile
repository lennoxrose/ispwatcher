# syntax=docker/dockerfile:1.7
#
# Build context is the REPO ROOT, not apps/backend this is a pnpm workspace,
# so pnpm-lock.yaml/pnpm-workspace.yaml at the root are required to install
# correctly. See .github/workflows/build-and-push.yml for the invocation.

FROM node:24-slim AS base
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
# `prisma generate` (run in the build stage below) probes the system's real
# libssl to pick the right query-engine binary. Without it, Prisma falls back
# to a guessed default instead of detecting the actual version  install it
# here so it's present in every stage derived from `base` (install, build).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# Prisma's CLI phones home to checkpoint.prisma.io to check for updates on
# every invocation (`generate`, `migrate deploy`, ...). That call has no
# reliable timeout in some Docker network configs and can hang the build
# indefinitely instead of failing  disable it outright, we don't want a
# build depending on that endpoint being reachable anyway.
ENV CHECKPOINT_DISABLE=1
WORKDIR /app

# install: full deps (incl. dev), cached separately from source
FROM base AS install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
RUN pnpm install --frozen-lockfile

# generate: Prisma client generation only needs prisma/ + prisma.config.ts.
# Kept as its own stage, gated only on those files (not COPY apps/backend
# apps/backend), because this step downloads the schema-engine binary from
# binaries.prisma.sh  depending on the Docker host's network path to that
# CDN this can be slow, so we don't want an unrelated source edit to bust
# this layer's cache and repeat the download on every build.
FROM install AS generate
WORKDIR /app/apps/backend
COPY apps/backend/prisma ./prisma
COPY apps/backend/prisma.config.ts ./prisma.config.ts
# `prisma generate` doesn't connect to a database, but prisma.config.ts loads
# eagerly and throws if DATABASE_URL is unset entirely  this placeholder is
# never used for a real connection, just satisfies that check at build time.
ENV DATABASE_URL="mysql://build:build@localhost:3306/build"
RUN pnpm run prisma:generate

# build: compile TS against the already-generated client
FROM generate AS build
COPY apps/backend/src ./src
COPY apps/backend/tsconfig.json ./tsconfig.json
RUN pnpm run build

# prod-deps: same lockfile, production packages only (keeps `prisma` CLI
# for migrate deploy, drops tsx/typescript/@types/node/pino-pretty)
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
RUN pnpm install --frozen-lockfile --prod

# runtime: slim image, only what's needed to run
FROM node:24-slim AS runtime
# Prisma's schema-engine binary (used by `prisma migrate deploy`) is
# dynamically linked against OpenSSL  not present by default on -slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Same telemetry hang risk applies here: `docker-entrypoint.sh` runs
# `prisma migrate deploy` on every container start.
ENV CHECKPOINT_DISABLE=1
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/backend/node_modules ./apps/backend/node_modules
# `prod-deps` never ran `prisma generate`, so its node_modules is missing the
# schema-engine binary `prisma migrate deploy` needs at startup. Reuse the
# copy the `generate` stage already downloaded instead of fetching it again
# on every container start that download goes to binaries.prisma.sh, which
# can be slow depending on the network path, and a production pod restart
# shouldn't depend on that CDN being fast (or reachable) to come up.
COPY --from=generate /app/node_modules/.pnpm/@prisma+engines@7.10.0/node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x /app/node_modules/.pnpm/@prisma+engines@7.10.0/node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/src/generated ./apps/backend/src/generated
COPY apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts
COPY apps/backend/docker-entrypoint.sh ./apps/backend/docker-entrypoint.sh

WORKDIR /app/apps/backend
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
