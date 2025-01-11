FROM registry.docker.ir/node:20-alpine AS base

# Install dependencies only when needed
FROM registry.docker.ir/node:20-alpine AS deps
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
RUN npm config set registry https://registry.npmmirror.com/

# Install dependencies with retry mechanism
RUN for i in 1 2 3; do \
    if [ -f yarn.lock ]; then \
      yarn --frozen-lockfile || continue; \
    elif [ -f package-lock.json ]; then \
      npm ci || continue; \
    elif [ -f pnpm-lock.yaml ]; then \
      yarn global add pnpm && pnpm i --frozen-lockfile || continue; \
    else \
      echo "Lockfile not found." && exit 1; \
    fi && break; \
    done

# Generate Prisma Client with retries and specific engine download
RUN mkdir -p node_modules/.prisma/client && \
    for i in 1 2 3; do \
      npx prisma generate --schema=./prisma/schema.prisma && break || \
      (echo "Retrying Prisma generate... Attempt $i" && sleep 5); \
    done

# Rebuild the source code only when needed
FROM registry.docker.ir/node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects anonymous telemetry data about general usage.
ENV NEXT_TELEMETRY_DISABLED 1

# Install and build dependencies
RUN npm install next
RUN npm run build

# Production image, copy all the files and run next
FROM registry.docker.ir/node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Switch to non-root user
USER nextjs

# Set host and port
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["npm", "start"]
