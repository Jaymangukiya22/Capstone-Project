# Requires: PowerShell 7+, Docker Desktop, Prometheus port published
param(
  [string]$PrometheusUrl = "http://localhost:9090",
  [string]$ServiceName = "matchserver",
  [int]$MaxMatchesPerInstance = 3,
  [int]$MinReplicas = 1,
  [int]$MaxReplicas = 50,
  [int]$StabilizationWindowSec = 120
)

function Get-MetricValue {
  param([string]$Query)
  $url = "$PrometheusUrl/api/v1/query?query=" + [System.Web.HttpUtility]::UrlEncode($Query)
  try {
    $resp = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 10
    if ($resp.status -ne 'success') { return $null }
    if ($resp.data.result.Count -eq 0) { return 0 }
    # If multiple series, sum the latest values
    $sum = 0
    foreach ($r in $resp.data.result) { $sum += [double]$r.value[1] }
    return [double]::Parse($sum)
  } catch {
    Write-Host "[autoscaler] Failed to query Prometheus: $_" -ForegroundColor Yellow
    return $null
  }
}

function Get-DesiredReplicas {
  param([double]$TotalActive)
  if ($TotalActive -lt 0) { $TotalActive = 0 }
  $desired = [math]::Ceiling($TotalActive / $MaxMatchesPerInstance)
  if ($desired -lt $MinReplicas) { $desired = $MinReplicas }
  if ($desired -gt $MaxReplicas) { $desired = $MaxReplicas }
  return [int]$desired
}

function Get-CurrentReplicas {
  param([string]$ServiceName)
  try {
    $ps = docker compose ls --format json | ConvertFrom-Json
  } catch { }
  try {
    $svc = docker compose ps $ServiceName --format json | ConvertFrom-Json
    if ($null -eq $svc) { return $MinReplicas }
    if ($svc -is [System.Array]) { return $svc.Count }
    return 1
  } catch {
    return $MinReplicas
  }
}

$lastScaleTime = (Get-Date).AddSeconds(-$StabilizationWindowSec)

while ($true) {
  $totalActive = Get-MetricValue -Query 'sum(matchserver_active_matches_total)'
  if ($null -eq $totalActive) { Start-Sleep -Seconds 15; continue }

  $desired = Get-DesiredReplicas -TotalActive $totalActive
  $current = Get-CurrentReplicas -ServiceName $ServiceName

  Write-Host ("[autoscaler] totalActive={0} current={1} desired={2}" -f $totalActive, $current, $desired)

  $now = Get-Date
  if ($desired -ne $current -and ($now -gt $lastScaleTime.AddSeconds($StabilizationWindowSec))) {
    Write-Host "[autoscaler] Scaling $ServiceName to $desired replicas..." -ForegroundColor Cyan
    try {
      docker compose up -d --scale "$ServiceName=$desired" | Out-Null
      $lastScaleTime = $now
    } catch {
      Write-Host "[autoscaler] Scale command failed: $_" -ForegroundColor Red
    }
  }

  Start-Sleep -Seconds 20
}
