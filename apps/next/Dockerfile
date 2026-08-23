# Multi stage Dockerfile for the "next" app 

FROM node:24-alpine AS base
RUN corepack enable
# corepack enables pnpm without installing it manually (Node 24 ships it)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
# pnpm's global install dir isn't on PATH by default in a fresh image —
# needed for "pnpm add -g turbo" below to work non-interactively

# --- pruner: computes the real subset of the monorepo "next" depends on ---
FROM base AS pruner
WORKDIR /repo
COPY . .
RUN pnpm add -g turbo
RUN turbo prune next --docker

# --- deps: installs only the dependencies of the pruned subset ---
FROM base AS deps
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile

# --- builder: the actual build, via Turborepo ---
FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=pruner /repo/out/full/ .
RUN pnpm exec turbo run build --filter=next

# --- runner: final image, only what's strictly needed at runtime ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
# Docker auto-sets $HOSTNAME to the container id; the standalone server
# binds to it as-is, which means it only listens on the container's
# internal IP instead of all interfaces — override it explicitly
COPY --from=builder /repo/apps/next/public ./public
COPY --from=builder /repo/apps/next/.next/standalone ./
COPY --from=builder /repo/apps/next/.next/static ./apps/next/.next/static
EXPOSE 3000
CMD ["node", "apps/next/server.js"]
