# Quick Restart (No Cache Clear)
# Use this for quick restarts when you just need to reload code changes

Write-Host "⚡ Quick restart..." -ForegroundColor Cyan

# Kill all node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Restart
pnpm run dev
