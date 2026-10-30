$ErrorActionPreference = "SilentlyContinue"
Write-Host "=== ESTADO EN TIEMPO REAL DE LA PLATAFORMA VITANEXO ===" -ForegroundColor Cyan

$services = @(
  @{ Name = "MySQL 8.0 (VitaBase)"; Port = 3306; Url = $null },
  @{ Name = "n8n Local Automation"; Port = 5678; Url = "http://127.0.0.1:5678/healthz" },
  @{ Name = "VitaNexo Backend API"; Port = 3000; Url = "http://127.0.0.1:3000/api/health" },
  @{ Name = "VitaNexo Frontend UI"; Port = 5173; Url = "http://127.0.0.1:5173" }
)

foreach ($svc in $services) {
  $listening = $null -ne (Get-NetTCPConnection -LocalPort $svc.Port -State Listen)
  if ($listening) {
    Write-Host "[ACTIVO]   $($svc.Name) (127.0.0.1:$($svc.Port))" -ForegroundColor Green
  } else {
    Write-Host "[INACTIVO] $($svc.Name) (127.0.0.1:$($svc.Port))" -ForegroundColor Red
  }
}

