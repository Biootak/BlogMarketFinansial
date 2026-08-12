# syntax=docker/dockerfile:1
# 2026-08-07: node:22-alpine (all stages). package.json engines >=22, and
# jsdom 30 (pulled by isomorphic-dompurify) hard-requires >=22.22.2 — Node 20
# crashes the server-side sanitizer (EditorContentHTML) at runtime.
#
# 2026-08-12: پایه تصویر configurable است — پیش‌فرض mirror ایرانی (برای dev
# لوکال) ولی روی VPS خارجی با NODE_IMAGE=node:22-alpine از Docker Hub رسمی
# pull می‌شود (registry.docker.ir از خارج از ایران کند/بلاک است).
ARG NODE_IMAGE=registry.docker.ir/node:22-alpine
FROM ${NODE_IMAGE} AS base

# 2026-08-04: The `# syntax=` directive on line 1 activates BuildKit,
# which enables `--mount=type=cache` (npm + Next cache) below. It must
# remain the very first line of this file — any line before it (even a
# comment) breaks the parser directive.

# Install dependencies only when needed
FROM ${NODE_IMAGE} AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
COPY prisma ./prisma

# Set environment variables for binary downloads
ENV PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"
ENV SHARP_DIST_BASE_URL="https://npmmirror.com/mirrors/sharp"
ENV SHARP_LIBVIPS_BASE_URL="https://npmmirror.com/mirrors/sharp-libvips"
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1

# Use Iranian NPM mirror
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set strict-ssl false

# Install dependencies with retry mechanism.
# 2026-08-04: use `npm ci` when a lockfile exists — it is faster and
# strictly deterministic (installs exactly what package-lock.json
# pins). The fallback to `npm install` remains only for the rare case
# where the lockfile is missing. BuildKit cache mount on /root/.npm
# means subsequent builds reuse the download cache.
RUN --mount=type=cache,target=/root/.npm \
    for i in 1 2 3; do \
    if [ -f yarn.lock ]; then \
      yarn --frozen-lockfile || continue; \
    elif [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund || continue; \
    elif [ -f pnpm-lock.yaml ]; then \
      yarn global add pnpm && pnpm i --frozen-lockfile || continue; \
    else \
      echo "Lockfile not found." && exit 1; \
    fi && break; \
    done || (echo "Dependency install failed after retries" && exit 1)

# Generate Prisma Client with retries and specific engine download
RUN mkdir -p node_modules/.prisma/client && \
    for i in 1 2 3; do \
      npx prisma generate --schema=./prisma/schema.prisma && break || \
      (echo "Retrying Prisma generate... Attempt $i" && sleep 5); \
    done

# Rebuild the source code only when needed
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
# Build-time DB connection: passed via --build-arg so prerendering can
# reach the (already running) database. At runtime the compose env_file
# overrides this with the in-cluster `db` hostname.
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects anonymous telemetry data about general usage.
ENV NEXT_TELEMETRY_DISABLED 1
# 2026-08-04: NODE_ENV=production MUST be set before `next build`.
# next.config.ts gates `useLightningcss` on `NODE_ENV !== 'production'`:
# in production mode Turbopack skips the alpha lightningcss that
# panics on `color-mix(in oklch, ...)`. Without this, the build would
# crash on the modern OKLCH/color-mix tokens in globals.css.
ENV NODE_ENV production

# Build the application. `next` is already installed in the deps
# stage (it's in package.json dependencies), so we DO NOT reinstall it
# here. The previous `RUN npm install next` line broke the lockfile,
# wiped the cache, and could install a different version than the one
# pinned in package-lock.json — silently corrupting the build.
# 2026-08-04: BuildKit cache mounts speed up rebuilds dramatically.
# `NEXT_TELEMETRY_DISABLED` is already set above.
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Production image, copy all the files and run next
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 2026-08-04: merge user creation + dirs into ONE layer to shrink image.
# Each RUN = one layer; collapsing them saves disk and pull time.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p .next public/uploads/posts public/uploads/avatars \
             public/uploads/categories public/uploads/tags \
             public/uploads/ads public/uploads/general && \
    chown -R nextjs:nodejs .next public/uploads

# Copy necessary files
COPY --from=builder /app/public ./public

# 2026-08-04: output:'standalone' bundles a TREE-SHAKEN node_modules
# inside .next/standalone — only the modules the server actually
# imports. Copying the FULL /app/node_modules (previous behavior)
# shipped devDependencies + Prisma engines + all transitive deps,
# bloating the image by hundreds of MB. We copy the standalone tree
# plus the two Prisma directories the standalone bundler does NOT
# trace (native engine binaries + generated client), which are needed
# at runtime but are loaded dynamically.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
# 2026-08-04: sharp native binary. The standalone bundler does not
# trace dynamically-loaded native addons, so we copy the full sharp
# package (build/ + libvips binary) explicitly — without it, next/image
# optimization falls back to the slow WASM/AJAX path at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
# 2026-08-04: Prisma CLI + schema/migrations for `prisma migrate deploy`
# at boot (see docker-compose `command`). The standalone bundler does
# not trace the CLI, so we copy it explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nextjs

# Set host and port
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 2026-08-04: Run the standalone server directly. `output:'standalone'`
# produces .next/standalone/server.js — a self-contained Node server
# that does NOT need the full next package or node_modules. The
# previous `npm start` (= `next start`) would fail without the full
# node_modules tree and is slower to boot.
CMD ["node", "server.js"]
