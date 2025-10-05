# ==========================================
# STAGE 1: Build Stage
# ==========================================
# Use Node.js 18 Alpine image for smaller size
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy root package files for workspace setup
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all workspace package.json files first for better caching
COPY apps/auth-service/package.json ./apps/auth-service/
COPY packages/common/package.json ./packages/common/ 2>/dev/null || true
COPY packages/types/package.json ./packages/types/ 2>/dev/null || true
COPY packages/database/package.json ./packages/database/ 2>/dev/null || true

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy workspace source code
COPY apps/auth-service ./apps/auth-service
COPY packages ./packages

# Copy root TypeScript config
COPY tsconfig.json ./

# Build the auth-service and its dependencies
RUN pnpm --filter @ai-job-portal/common build || echo "No common package to build"
RUN pnpm --filter @ai-job-portal/types build || echo "No types package to build"
RUN pnpm --filter @ai-job-portal/database build || echo "No database package to build"
RUN pnpm --filter @ai-job-portal/auth-service build

# ==========================================
# STAGE 2: Production Stage
# ==========================================
# Use minimal Node.js 18 Alpine image for production
FROM node:18-alpine AS production

# Add labels for better container management
LABEL maintainer="AI Job Portal Team"
LABEL service="auth-service"
LABEL version="1.0.0"

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY --from=builder --chown=nestjs:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nestjs:nodejs /app/apps/auth-service/package.json ./apps/auth-service/

# Copy workspace package.json files
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/apps/auth-service/dist ./apps/auth-service/dist

# Copy email templates (needed at runtime)
COPY --from=builder --chown=nestjs:nodejs /app/apps/auth-service/src/email/templates ./apps/auth-service/src/email/templates

# Copy root TypeScript config (might be needed for workspace resolution)
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json ./

# Switch to non-root user
USER nestjs

# Expose the application port (default 3001, configurable via env)
EXPOSE 3001

# Set working directory to auth-service
WORKDIR /app/apps/auth-service

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/main.js"]
