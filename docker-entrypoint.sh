#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
# Retry a few times so a database that is still starting up doesn't fail boot.
attempt=1
max_attempts=10
# Invoke the CLI at its real path — the .bin/prisma shim is a symlink that
# Docker's COPY flattens into a plain file, which breaks Prisma's sibling
# .wasm lookups.
until node prisma-cli/node_modules/prisma/build/index.js migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[entrypoint] Migrations failed after $max_attempts attempts, exiting."
    exit 1
  fi
  echo "[entrypoint] Migration attempt $attempt failed, retrying in 3s..."
  attempt=$((attempt + 1))
  sleep 3
done

echo "[entrypoint] Migrations complete. Starting server on port ${PORT:-3000}..."
exec node server.js
