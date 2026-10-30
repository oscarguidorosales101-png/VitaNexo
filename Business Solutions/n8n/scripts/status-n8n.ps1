$ErrorActionPreference = "SilentlyContinue"
try {
  $res = Invoke-RestMethod -Uri "http://127.0.0.1:5678/healthz" -Method Get -TimeoutSec 3
  Write-Host "[VitaNexo n8n] ACTIVO en http://127.0.0.1:5678 -> $($res | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
  Write-Host "[VitaNexo n8n] DETENIDO o no accesible en http://127.0.0.1:5678" -ForegroundColor Yellow
}

