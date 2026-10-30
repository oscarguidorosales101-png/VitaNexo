$ErrorActionPreference = "SilentlyContinue"
Write-Host "=== DETENIENDO SERVICIOS LOCALES DE VITANEXO (5173, 3000, 5678) ===" -ForegroundColor Yellow

foreach ($port in @(5173, 3000, 5678)) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen
  foreach ($c in $conns) {
    if ($c.OwningProcess -gt 4) {
      Write-Host "-> Deteniendo proceso PID $($c.OwningProcess) en puerto $port..."
      Stop-Process -Id $c.OwningProcess -Force
    }
  }
}

Write-Host "[COMPLETADO] Servicios locales detenidos (MySQL 8.0 en puerto 3306 permanece intacto)." -ForegroundColor Green

