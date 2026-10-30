$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# Desde la auditoría de octubre 2026 los workflows de VitaNexo NO leen variables de entorno ($env)
# dentro de nodos Code. La autenticación del webhook usa la credencial cifrada de n8n
# "VitaNexo Webhook Local Auth" (httpHeaderAuth), sincronizada por n8n/scripts/import-workflows.js.
# Por eso n8n funciona igual si se inicia con este script o con un simple "n8n start".

$env:N8N_HOST = "127.0.0.1"
$env:N8N_LISTEN_ADDRESS = "127.0.0.1"
$env:N8N_PORT = "5678"
$env:N8N_PROTOCOL = "http"
$env:WEBHOOK_URL = "http://127.0.0.1:5678/"
$env:GENERIC_TIMEZONE = "America/Costa_Rica"
$env:N8N_SECURE_COOKIE = "false"
# Se mantiene el valor seguro por defecto de n8n 2.x (acceso a variables de entorno bloqueado en nodos).
$env:N8N_BLOCK_ENV_ACCESS_IN_NODE = "true"
$env:N8N_DIAGNOSTICS_ENABLED = "false"
$env:N8N_PERSONALIZATION_ENABLED = "false"

Write-Host "[VitaNexo n8n] Iniciando n8n local exclusivamente en http://127.0.0.1:5678 ..." -ForegroundColor Cyan
Set-Location $ProjectRoot
n8n start
