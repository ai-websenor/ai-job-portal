# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8.15.1
# Ensure TypeScript is available for package builds
RUN npm install -g typescript@5.3.3

WORKDIR /app

# Copy package files and source code
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./
COPY packages/ ./packages/
COPY apps/user-service/ ./apps/user-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# (Assumes host has built `dist/` via `pnpm -w build`.)
# Production stage
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@8.15.1

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/packages/common/package.json ./packages/common/
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/apps/user-service/package.json ./apps/user-service/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
# Copy built artifacts from build context (host)
COPY apps/user-service/dist ./apps/user-service/dist
COPY --from=builder /app/apps/user-service/proto ./apps/user-service/proto

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3002
EXPOSE 50052

CMD ["node", "apps/user-service/dist/apps/user-service/src/main.js"]
