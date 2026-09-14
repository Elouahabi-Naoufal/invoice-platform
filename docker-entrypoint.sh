#!/bin/sh
set -e
echo ">> Invoice Platform starting..."

mkdir -p /app/data /app/public/uploads/logos
chown -R nextjs:nodejs /app/data /app/public/uploads 2>/dev/null || true
chmod -R 775 /app/data /app/public/uploads 2>/dev/null || true

run_as_nextjs() {
  if [ "$(id -u)" = "0" ]; then su-exec nextjs:nodejs "$@"; else "$@"; fi
}

echo ">> Running prisma migrate deploy..."
run_as_nextjs ./node_modules/.bin/prisma migrate deploy \
  || run_as_nextjs ./node_modules/.bin/prisma db push \
  || echo ">> WARNING: migration failed, continuing startup."

chown -R nextjs:nodejs /app/data /app/public/uploads 2>/dev/null || true

echo ">> Starting server..."
if [ "$(id -u)" = "0" ]; then
  exec su-exec nextjs:nodejs "$@"
else
  exec "$@"
fi
