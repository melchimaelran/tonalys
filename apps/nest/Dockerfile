FROM node:24-alpine AS base
RUN corepack enable
# corepack enables pnpm without installing it manually (Node 24 ships it)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
# pnpm's global install dir isn't on PATH by default in a fresh image —
# needed for "pnpm add -g turbo" below to work non-interactively

FROM base AS pruner
WORKDIR /repo
COPY . .
RUN pnpm add -g turbo
RUN turbo prune nest --docker
# same principle as next: pruned manifests (nest + shared-types) and
# pruned source, nothing from apps/next pulled in

FROM base AS deps
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile
# full install (incl. devDependencies) — needed to run the Nest build

FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=pruner /repo/out/full/ .
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
# generate only needs DATABASE_URL to be present/parseable, never connects — real
# value comes from docker-compose's environment: block at container runtime
RUN pnpm --filter nest exec prisma generate
# generates apps/nest/src/generated/prisma — src imports from it, build fails without this
RUN pnpm exec turbo run build --filter=nest
# produces apps/nest/dist (plain compiled JS)

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --prod --frozen-lockfile
# reinstalls from the pruned manifests, production deps only — smaller
# and cleaner than reusing builder's node_modules (which has devDeps)
COPY --from=builder /repo/apps/nest/dist ./apps/nest/dist
COPY --from=pruner /repo/out/full/apps/nest/prisma ./apps/nest/prisma
COPY --from=pruner /repo/out/full/apps/nest/prisma.config.ts ./apps/nest/prisma.config.ts
# schema + migrations + config, needed to run "prisma migrate deploy"
# inside this container (docker compose exec) — no host Node/prisma needed
EXPOSE 3001
CMD ["node", "apps/nest/dist/main.js"]