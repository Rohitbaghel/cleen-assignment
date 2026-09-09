#!/bin/sh
set -e

echo "Waiting for database..."
npx prisma migrate deploy
npx prisma db seed
echo "Starting API on port ${PORT:-3001}..."
exec node dist/index.js
