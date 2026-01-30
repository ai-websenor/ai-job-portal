# AI Job Portal - Multi-stage Dockerfile for NestJS Microservices
# Usage: docker build --build-arg SERVICE=api-gateway -t api-gateway .

ARG NODE_VERSION=20-alpine

# ============================================
# Stage 1: Base - Install dependencies
# ============================================
FROM node:${NODE_VERSION} AS base

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./

# Copy all package.json files for dependency resolution
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY apps/auth-service/package.json ./apps/auth-service/
COPY apps/user-service/package.json ./apps/user-service/
COPY apps/job-service/package.json ./apps/job-service/
COPY apps/application-service/package.json ./apps/application-service/
COPY apps/notification-service/package.json ./apps/notification-service/
COPY apps/payment-service/package.json ./apps/payment-service/
COPY apps/admin-service/package.json ./apps/admin-service/
COPY apps/messaging-service/package.json ./apps/messaging-service/
COPY apps/recommendation-service/package.json ./apps/recommendation-service/
COPY packages/common/package.json ./packages/common/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/aws/package.json ./packages/aws/
COPY packages/logger/package.json ./packages/logger/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder - Build the service
# ============================================
FROM base AS builder

ARG SERVICE

# Copy source code
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.json ./

# Build shared packages first (ignore errors for packages that don't exist)
RUN pnpm --filter=@ai-job-portal/types build || true
RUN pnpm --filter=@ai-job-portal/common build || true
RUN pnpm --filter=@ai-job-portal/database build || true
RUN pnpm --filter=@ai-job-portal/aws build || true
RUN pnpm --filter=@ai-job-portal/logger build || true

# Build the target service
RUN pnpm --filter=${SERVICE} build

# Create marker files for packages that have dist folders
RUN mkdir -p /app/.markers && \
    ([ -d /app/packages/common/dist ] && touch /app/.markers/common || true) && \
    ([ -d /app/packages/database/dist ] && touch /app/.markers/database || true) && \
    ([ -d /app/packages/types/dist ] && touch /app/.markers/types || true) && \
    ([ -d /app/packages/aws/dist ] && touch /app/.markers/aws || true) && \
    ([ -d /app/packages/logger/dist ] && touch /app/.markers/logger || true)

# ============================================
# Stage 3: Production - Minimal runtime image
# ============================================
FROM node:${NODE_VERSION} AS production

ARG SERVICE
ENV NODE_ENV=production
ENV SERVICE_NAME=${SERVICE}

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/${SERVICE}/package.json ./apps/${SERVICE}/
COPY --from=builder /app/packages/common/package.json ./packages/common/
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/aws/package.json ./packages/aws/
COPY --from=builder /app/packages/logger/package.json ./packages/logger/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built service
COPY --from=builder /app/apps/${SERVICE}/dist ./apps/${SERVICE}/dist

# Copy shared packages dist folders
COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/aws/dist ./packages/aws/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist

# Copy public folder for static assets (health dashboard)
COPY public ./public

# Set ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

# Default command - will be overridden in docker-compose
WORKDIR /app/apps/${SERVICE}
CMD ["node", "dist/main.js"]
