#!/bin/sh
set -e
echo ">> Invora starting..."

mkdir -p /app/data /app/public/uploads/logos
chown -R nextjs:nodejs /app/data /app/public/uploads 2>/dev/null || true
chmod -R 775 /app/data /app/public/uploads 2>/dev/null || true

run_as_nextjs() {
  # runuser (util-linux) if available, else run as current user (root in container is fine)
  if [ "$(id -u)" = "0" ] && command -v runuser >/dev/null 2>&1 && id nextjs >/dev/null 2>&1; then
    runuser -u nextjs -- "$@"
  else
    "$@"
  fi
}

echo ">> Running prisma migrate deploy..."
run_as_nextjs ./node_modules/.bin/prisma migrate deploy \
  || run_as_nextjs ./node_modules/.bin/prisma db push \
  || echo ">> WARNING: migration failed, continuing startup."

# Writable XDG dirs for Chromium's crashpad handler (see Dockerfile ENV).
run_as_nextjs mkdir -p "${XDG_CONFIG_HOME:-/tmp/.chromium-config}" "${XDG_CACHE_HOME:-/tmp/.chromium-cache}" \
  || echo ">> WARNING: could not create Chromium XDG dirs."

if [ "${SEED_ON_BOOT}" = "1" ]; then
  echo ">> SEED_ON_BOOT=1: topping up companies/clients (never deletes)..."
  run_as_nextjs node ./scripts/seed-data.mjs \
    || echo ">> WARNING: seed failed, continuing startup."
fi

chown -R nextjs:nodejs /app/data /app/public/uploads 2>/dev/null || true

echo ">> Starting automation worker (recurring invoices + reminders)..."
if [ -n "${CRON_SECRET}" ] && [ "${SCHEDULER_ENABLED}" != "false" ]; then
  run_as_nextjs node ./scripts/worker.mjs &
  echo ">> automation worker started"
else
  echo ">> automation worker disabled (set CRON_SECRET to enable)"
fi

echo ">> Starting server..."
if [ "$(id -u)" = "0" ] && command -v runuser >/dev/null 2>&1 && id nextjs >/dev/null 2>&1; then
  exec runuser -u nextjs -- "$@"
else
  exec "$@"
fi
