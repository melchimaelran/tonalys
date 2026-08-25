#!/usr/bin/env bash
# Starts the infra services (postgres, redis, rabbitmq, minio) in Docker,
# applies pending Prisma migrations, and (with --seed) reseeds the database.
#
# Daily dev:            ./scripts/dev-up.sh
# After `docker compose down -v` (data wiped): ./scripts/dev-up.sh --seed
#
# Does NOT start next/nest — run those natively for hot reload:
#   pnpm --filter next dev             # :3000
#   PORT=3001 pnpm --filter nest start:dev  # :3001 — nest defaults to
#     3000 (apps/nest/src/main.ts) if PORT isn't set, colliding with next
set -euo pipefail
cd "$(dirname "$0")/.."

seed=false
for arg in "$@"; do
  case "$arg" in
    --seed) seed=true ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--seed]" >&2
      exit 1
      ;;
  esac
done

echo "==> Starting infra (postgres, redis, rabbitmq, minio)..."
docker compose up -d --wait postgres redis rabbitmq minio

echo "==> Applying Prisma migrations..."
pnpm --filter nest exec prisma migrate deploy

if [ "$seed" = true ]; then
  echo "==> Seeding database..."
  pnpm --filter nest exec prisma db seed
fi

cat <<'EOF'

==> Infra ready. Start the apps natively for hot reload:
    pnpm --filter next dev                    # :3000
    PORT=3001 pnpm --filter nest start:dev    # :3001

    # worker (Python) — one-time venv setup:
    #   cd apps/worker && python3 -m venv .venv && source .venv/bin/activate \
    #     && pip install -r requirements.txt
    # then, each time:
    cd apps/worker && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
EOF
