$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Test-PortListening([int]$Port) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $conn
}

Write-Host "=== INICIANDO PLATAFORMA EMPRESARIAL VITANEXO (LOCAL) ===" -ForegroundColor Cyan

if (-not (Test-PortListening 5678)) {
  Write-Host "-> Iniciando n8n local en http://127.0.0.1:5678 ..." -ForegroundColor Yellow
  Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$ProjectRoot\n8n\scripts\start-n8n.ps1`"" -WorkingDirectory $ProjectRoot
} else {
  Write-Host "-> n8n local ya se encuentra activo en http://127.0.0.1:5678" -ForegroundColor Green
}

if (-not (Test-PortListening 3000)) {
  Write-Host "-> Iniciando Backend VitaNexo en http://127.0.0.1:3000 ..." -ForegroundColor Yellow
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -WorkingDirectory $ProjectRoot
} else {
  Write-Host "-> Backend VitaNexo ya se encuentra activo en http://127.0.0.1:3000" -ForegroundColor Green
}

if (-not (Test-PortListening 5173)) {
  Write-Host "-> Iniciando Frontend React+Vite en http://127.0.0.1:5173 ..." -ForegroundColor Yellow
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory (Join-Path $ProjectRoot "frontend")
} else {
  Write-Host "-> Frontend VitaNexo ya se encuentra activo en http://127.0.0.1:5173" -ForegroundColor Green
}

Write-Host "`n[LISTO] Acceso Frontend: http://127.0.0.1:5173 | API Backend: http://127.0.0.1:3000 | n8n Local: http://127.0.0.1:5678" -ForegroundColor Cyan

