# ==========================================
# STAGE 1: Build Stage
# ==========================================
# Use Node.js 18 Alpine image for smaller size
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm
# Ensure TypeScript is available for package builds
RUN npm install -g typescript@5.3.3

# Copy root package files for workspace setup
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.json tsconfig.base.json ./

# Copy workspace source code and package.json files first
COPY packages ./packages
COPY apps/notification-service ./apps/notification-service
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Build the application
RUN pnpm run build --filter=@ai-job-portal/notification-service

# ==========================================
# STAGE 2: Production Stage
# ==========================================
# Use minimal Node.js 18 Alpine image for production
FROM node:18-alpine AS production

# Add labels for better container management
LABEL maintainer="AI Job Portal Team"
LABEL service="notification-service"
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
COPY --from=builder --chown=nestjs:nodejs /app/apps/notification-service/package.json ./apps/notification-service/
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json ./

# Copy workspace package.json files
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/apps/notification-service/dist ./apps/notification-service/dist

# Copy root TypeScript config (might be needed for workspace resolution)
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json ./

# Switch to non-root user
USER nestjs

# Expose the application port (default 3005, configurable via env)
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
# Note: Build output structure is dist/main.js
CMD ["node", "apps/notification-service/dist/main.js"]
