# Invora — production image (Next.js + Prisma + SQLite + Baileys)
# Layering is deliberate: deps/ are cached and reused when only app code changes.
FROM node:22-bookworm-slim AS base
WORKDIR /app
# Container timezone — controls how dates render server-side. Override per deployment.
ENV TZ=Africa/Casablanca
RUN apt-get update && apt-get install -y --no-install-recommends openssl sqlite3 \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
# git is required to fetch the `libsignal` dependency of Baileys.
RUN apt-get update && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
ENV NODE_ENV=development
RUN npm ci --no-audit --no-fund

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p data public/uploads/logos
ENV DATABASE_URL="file:./prisma/dev.db"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev --no-audit --no-fund

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3007
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/app.db"

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data /app/public/uploads/logos \
  && chown -R nextjs:nodejs /app/data /app/public/uploads

VOLUME ["/app/data", "/app/public/uploads"]

EXPOSE 3007
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
