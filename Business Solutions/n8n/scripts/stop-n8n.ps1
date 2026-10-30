$ErrorActionPreference = "SilentlyContinue"
$connections = Get-NetTCPConnection -LocalPort 5678 -State Listen
if ($connections) {
  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    Write-Host "[VitaNexo n8n] Deteniendo proceso n8n en puerto 5678 (PID: $procId)..." -ForegroundColor Yellow
    Stop-Process -Id $procId -Force
  }
  Write-Host "[VitaNexo n8n] Servicio n8n detenido." -ForegroundColor Green
} else {
  Write-Host "[VitaNexo n8n] No hay ninguna instancia de n8n escuchando en el puerto 5678." -ForegroundColor Gray
}

