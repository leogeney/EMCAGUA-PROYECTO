# EMCAGUA APC - restaura una copia de seguridad de la base de datos.
# OJO: reemplaza TODOS los datos actuales por los de la copia elegida.
$ErrorActionPreference = 'Continue'
$pgBin = if ($env:EMCAGUA_PG_BIN) { $env:EMCAGUA_PG_BIN } else { 'C:\Program Files\PostgreSQL\16\bin' }
$carpeta = if ($env:EMCAGUA_RESPALDOS) { $env:EMCAGUA_RESPALDOS } else { Join-Path $env:USERPROFILE 'Documents\EMCAGUA respaldos' }
$archivoClave = Join-Path $env:USERPROFILE '.emcagua\clave-postgres.txt'

Write-Host ''
Write-Host '=== Restaurar una copia de seguridad de EMCAGUA ===' -ForegroundColor Cyan
if (-not (Test-Path "$pgBin\pg_restore.exe")) { Write-Host "No encontre PostgreSQL en $pgBin" -ForegroundColor Red; exit 1 }
if (-not (Test-Path $archivoClave)) { Write-Host 'No encontre la clave de PostgreSQL. Corre primero INSTALAR-Y-CORRER.bat.' -ForegroundColor Red; exit 1 }
$copias = @(Get-ChildItem $carpeta -Filter 'emcagua-*.backup' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
if ($copias.Count -eq 0) { Write-Host "No hay copias en $carpeta" -ForegroundColor Red; exit 1 }

Write-Host "Copias en $carpeta :"
for ($i = 0; $i -lt [Math]::Min(15, $copias.Count); $i++) {
    $c = $copias[$i]
    Write-Host ("  {0,2}) {1}   {2}   {3:N0} KB" -f ($i + 1), $c.Name, $c.LastWriteTime.ToString('dd/MM/yyyy hh:mm tt'), ($c.Length / 1KB))
}
$n = Read-Host 'Escribe el numero de la copia que quieres restaurar (Enter para cancelar)'
if (-not $n) { Write-Host 'Cancelado.'; exit 0 }
$elegida = $copias[[int]$n - 1]
if (-not $elegida) { Write-Host 'Numero invalido.' -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host "Se van a BORRAR todos los datos actuales y se pondran los de $($elegida.Name)." -ForegroundColor Yellow
$ok = Read-Host 'Para continuar escribe SI en mayusculas'
if ($ok -cne 'SI') { Write-Host 'Cancelado.'; exit 0 }

$env:PGPASSWORD = (Get-Content $archivoClave -Raw)

# 1. Detener la API para que nadie escriba mientras se restaura
$api = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($id in $api) { Write-Host "Deteniendo la API (proceso $id)..."; Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
if ($api) { Start-Sleep -Seconds 3 }

# 2. Copia de lo que hay ahora, por si acaso
$antes = Join-Path $carpeta ("antes-de-restaurar-" + (Get-Date -Format 'yyyy-MM-dd_HHmm') + '.backup')
& "$pgBin\pg_dump.exe" -h localhost -U postgres -F c -f $antes emcagua
Write-Host "Se guardo una copia de los datos actuales en $antes" -ForegroundColor Green

# 3. Restaurar
& "$pgBin\pg_restore.exe" -h localhost -U postgres -d emcagua --clean --if-exists --no-owner --single-transaction $elegida.FullName
if ($LASTEXITCODE -ne 0) { Write-Host 'La restauracion fallo; los datos quedaron como estaban (no se aplico nada).' -ForegroundColor Red; exit 1 }
Write-Host ''
Write-Host "Listo: la base de datos quedo como estaba el $($elegida.LastWriteTime.ToString('dd/MM/yyyy hh:mm tt'))." -ForegroundColor Green
Write-Host 'Ahora vuelve a encender el sistema con INSTALAR-Y-CORRER.bat.'
