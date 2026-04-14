#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
npx prisma migrate deploy

echo "==> Running Prisma seed..."
npx prisma db seed || echo "==> Seed skipped (no seed script or already seeded)"

echo "==> Starting application..."
exec "$@"
