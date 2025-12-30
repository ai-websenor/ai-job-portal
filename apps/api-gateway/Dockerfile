# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8.15.1
# Ensure TypeScript is available for package builds
RUN npm install -g typescript@5.3.3

WORKDIR /app

# Copy package files for workspace install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json tsconfig.json tsconfig.base.json ./

# Copy packages and app source
COPY packages/ ./packages/
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY apps/api-gateway/ ./apps/api-gateway/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
RUN pnpm run build --filter=@ai-job-portal/api-gateway

# Production stage
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@8.15.1

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api-gateway/package.json ./apps/api-gateway/

# Install production deps
RUN pnpm install --frozen-lockfile --prod

# Copy built files
# Copy built artifacts from builder stage
COPY --from=builder /app/apps/api-gateway/dist ./apps/api-gateway/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

WORKDIR /app/apps/api-gateway

CMD ["node", "dist/main.js"]
