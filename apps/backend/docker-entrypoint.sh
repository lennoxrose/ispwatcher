#!/bin/sh
set -e

echo "Applying database migrations (prisma migrate deploy)..."
node_modules/.bin/prisma migrate deploy

echo "Starting server..."
exec node dist/server.js
