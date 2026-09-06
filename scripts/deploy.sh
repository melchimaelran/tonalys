#!/usr/bin/env bash
# Runs ON THE VPS, from /opt/tonalys/scripts. Called over SSH by
# .github/workflows/deploy.yml once new images have been pushed to GHCR.
#
# The workflow drops fresh copies of docker-compose.prod.yml and this
# script into /opt/tonalys before running it, and passes the commit SHA as
# IMAGE_TAG so each deploy pins an immutable image. TLS and routing are
# handled by a separate reverse proxy on the host, not here.
#
# Manual run / rollback (on the VPS):
#   cd /opt/tonalys && IMAGE_TAG=<sha> scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

export IMAGE_TAG="${IMAGE_TAG:-latest}"
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Deploying image tag: ${IMAGE_TAG}"

echo "==> Pulling images from GHCR..."
$COMPOSE pull

echo "==> Starting / updating the stack (migrations run first, as a one-shot)..."
$COMPOSE up -d --wait --remove-orphans

echo "==> Removing dangling images..."
docker image prune -f

echo "==> Current state:"
$COMPOSE ps
