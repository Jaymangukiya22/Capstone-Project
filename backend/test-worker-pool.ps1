# Test Worker Pool Architecture (PowerShell)
# This script helps verify the worker pool is functioning correctly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Match Server Worker Pool Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if server is running
Write-Host "[Test 1] Checking if Match Server is running..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get
    Write-Host "✓ Server is running" -ForegroundColor Green
    $health | ConvertTo-Json -Depth 10
} catch {
    Write-Host "✗ Server is not running" -ForegroundColor Red
    Write-Host "Start it with: npm run dev:match:pool"
    exit 1
}
Write-Host ""

# Test 2: Check worker pool stats
Write-Host "[Test 2] Getting worker pool statistics..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "http://localhost:3001/workers/stats" -Method Get
    Write-Host "✓ Worker pool responding" -ForegroundColor Green
    $stats | ConvertTo-Json -Depth 10
    
    Write-Host ""
    Write-Host "Summary:"
    Write-Host "  Total Workers: $($stats.totalWorkers)"
    Write-Host "  Active Workers: $($stats.activeWorkers)"
    Write-Host "  Active Matches: $($stats.totalMatches)"
} catch {
    Write-Host "✗ Could not get worker stats" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Check Prometheus metrics
Write-Host "[Test 3] Checking Prometheus metrics..." -ForegroundColor Yellow
try {
    $metrics = Invoke-WebRequest -Uri "http://localhost:3001/metrics" -Method Get
    $relevantMetrics = $metrics.Content -split "`n" | Where-Object { $_ -match "matchserver_(active_workers|total_workers|active_matches)" }
    Write-Host "✓ Metrics available" -ForegroundColor Green
    $relevantMetrics | ForEach-Object { Write-Host $_ }
} catch {
    Write-Host "✗ Metrics not available" -ForegroundColor Red
}
Write-Host ""

# Test 4: Check match creation endpoint
Write-Host "[Test 4] Testing match by code endpoint..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:3001/matches/code/TEST123" -Method Get -ErrorAction Stop
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✓ Endpoint responding correctly (404 expected for invalid code)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Unexpected response: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Worker Pool Tests Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Start your frontend application"
Write-Host "2. Create multiple matches (4-6)"
Write-Host "3. Watch workers scale with this command:"
Write-Host "   while (1) { cls; Invoke-RestMethod -Uri 'http://localhost:3001/workers/stats' | ConvertTo-Json; Start-Sleep 2 }"
Write-Host "4. Monitor performance with multiple concurrent matches"
Write-Host ""
