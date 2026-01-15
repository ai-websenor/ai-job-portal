# Check if dev server is already running
$ports = @(3001, 3002, 3003, 3004, 3005)
$inUse = @()

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $inUse += $port
    }
}

if ($inUse.Count -gt 0) {
    Write-Host "⚠️  WARNING: The following ports are already in use: $($inUse -join ', ')" -ForegroundColor Yellow
    Write-Host "Dev server might already be running. Check your terminals." -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Do you want to continue anyway? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "Aborted." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Starting dev server..." -ForegroundColor Green
pnpm run dev
