# Restart Dev Server Script
# Use this when you need to restart after changes to:
# - Dockerfile
# - main.ts
# - .env files
# - turbo.json
# - package.json

Write-Host "🔄 Restarting dev server..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all node processes (dev server)
Write-Host "1️⃣  Stopping all node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Step 2: Clear Turbo cache (optional but recommended for clean restart)
Write-Host "2️⃣  Clearing Turbo cache..." -ForegroundColor Yellow
pnpm exec turbo clean
Start-Sleep -Seconds 1

# Step 3: Start dev server
Write-Host "3️⃣  Starting dev server..." -ForegroundColor Green
Write-Host ""
pnpm run dev
