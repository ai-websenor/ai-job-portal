# Docker Best Practices for AI Job Portal

This guide outlines strategies to prevent common Docker related issues, specifically regarding missing build artifacts and incorrect startup paths.

## 1. Multi-Stage Builds (The "Golden Rule")

**Problem:** Relying on the host machine to build the project (e.g., running `pnpm build` locally) before starting Docker containers is error-prone. It leads to "works on my machine" issues and crashes if local artifacts are missing or stale.

**Solution:** Always perform the build **inside** the Docker container using multi-stage builds.

- **Builder Stage:** Compiles the TypeScript code into JavaScript.
- **Production Stage:** Copies *only* the compiled assets (`dist`) and dependencies from the Builder stage.

**Example Pattern:**

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main.js"]
```

## 2. Verify Entrypoint Paths

**Problem:** The folder structure of your compiled code (`dist/`) depends on your `nest-cli.json`, `tsconfig.json`, and how the build script runs. If this structure changes (e.g., from `dist/main.js` to `dist/apps/service/main.js`), the Docker `CMD` will fail.

**Prevention:**
- After changing any build configuration, verify the output structure locally or by exploring the container:
  ```bash
  # Check structure inside a built image
  docker run --rm --entrypoint sh <image_name> -c "find dist -name main.js"
  ```
- Update the `CMD` instruction in the `Dockerfile` to match the exact path found.

## 3. Use `.dockerignore`

**Problem:** Copying local `node_modules` or `dist` folders into the Docker build context slows down builds and causes conflicts (e.g., wrong platform binaries).

**Prevention:** Ensure your `.dockerignore` file excludes:
```
node_modules
dist
.git
.env
```

## 4. Force Rebuilds When in Doubt

**Problem:** Docker caches layers aggressively. Sometimes it might use an old layer that doesn't include your latest changes if not configured correctly.

**Prevention:** If you suspect the container is not running the latest code, force a rebuild:
```bash
docker compose up -d --build
```
The `--build` flag ensures the image is rebuilt with the latest context.
