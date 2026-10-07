# EMCAGUA APC - prepara el computador y arranca la API.
# Se puede correr las veces que quiera: lo que ya esta instalado no se vuelve a instalar.
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$raiz = Split-Path -Parent $PSScriptRoot
$datos = Join-Path $env:USERPROFILE '.emcagua'
New-Item -ItemType Directory -Force -Path $datos | Out-Null
$log = Join-Path $raiz 'arranque.log'
# Si la API ya estaba corriendo (otra ventana), se detiene primero: asi suelta el puerto 8080 y el archivo arranque.log
$previa = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($id in $previa) { Write-Host "Deteniendo la API anterior (proceso $id)..."; Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
if ($previa) { Start-Sleep -Seconds 4 }
"=== $(Get-Date -Format s) Inicio ===" | Out-File $log -Encoding utf8

function Paso($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan; "==> $t" | Out-File $log -Append -Encoding utf8 }
function Ok($t) { Write-Host "    $t" -ForegroundColor Green; "    OK $t" | Out-File $log -Append -Encoding utf8 }
function Falla($t) { Write-Host "    $t" -ForegroundColor Red; "    ERROR $t" | Out-File $log -Append -Encoding utf8; exit 1 }
function RecargarPath { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }

# ---------------------------------------------------------------- 1. Java 21
Paso 'Java 21'
$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdk) {
    Write-Host '    Instalando Java 21 (Windows puede pedir permiso: responde Si)...'
    winget install --id EclipseAdoptium.Temurin.21.JDK -e --silent --accept-package-agreements --accept-source-agreements | Out-File $log -Append -Encoding utf8
    $jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1
}
if (-not $jdk) { Falla 'No se pudo instalar Java 21. Instalalo a mano desde https://adoptium.net y vuelve a correr este archivo.' }
$env:JAVA_HOME = $jdk.FullName
$env:Path = "$($jdk.FullName)\bin;$env:Path"
Ok "Java en $($jdk.FullName)"

# ---------------------------------------------------------------- 2. Maven (portable, sin instalar)
Paso 'Maven'
$mvnVer = '3.9.11'
$mvnDir = Join-Path $datos "apache-maven-$mvnVer"
if (-not (Test-Path "$mvnDir\bin\mvn.cmd")) {
    Write-Host '    Descargando Maven...'
    $zip = Join-Path $datos 'maven.zip'
    Invoke-WebRequest -ErrorAction Stop "https://archive.apache.org/dist/maven/maven-3/$mvnVer/binaries/apache-maven-$mvnVer-bin.zip" -OutFile $zip
    Expand-Archive $zip -DestinationPath $datos -Force -ErrorAction Stop
    Remove-Item $zip
}
$env:Path = "$mvnDir\bin;$env:Path"
Ok "Maven $mvnVer"

# ---------------------------------------------------------------- 3. PostgreSQL 16
Paso 'PostgreSQL 16'
$archivoClave = Join-Path $datos 'clave-postgres.txt'
$pgBin = 'C:\Program Files\PostgreSQL\16\bin'
if (-not (Test-Path "$pgBin\psql.exe")) {
    # Clave generada aqui mismo, solo para la base de datos local de desarrollo. Queda en $archivoClave.
    $clave = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 20 | ForEach-Object { [char]$_ })
    Set-Content -Path $archivoClave -Value $clave -NoNewline
    Write-Host '    Instalando PostgreSQL 16 (tarda unos minutos; Windows puede pedir permiso: responde Si)...'
    winget install --id PostgreSQL.PostgreSQL.16 -e --accept-package-agreements --accept-source-agreements --override "--mode unattended --unattendedmodeui minimal --superpassword $clave --serverport 5432" | Out-File $log -Append -Encoding utf8
    if (-not (Test-Path "$pgBin\psql.exe")) { Falla 'No se pudo instalar PostgreSQL. Instalalo a mano desde https://www.postgresql.org/download/windows/ y vuelve a correr este archivo.' }
}
if (-not (Test-Path $archivoClave)) {
    $seguro = Read-Host '    PostgreSQL ya estaba instalado. Escribe la clave del usuario postgres' -AsSecureString
    $clave = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro))
    Set-Content -Path $archivoClave -Value $clave -NoNewline
}
$clave = Get-Content $archivoClave -Raw
$env:PGPASSWORD = $clave
$servicio = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($servicio -and $servicio.Status -ne 'Running') { Start-Service $servicio.Name }
$existe = & "$pgBin\psql.exe" -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='emcagua'" 2>&1
if ($LASTEXITCODE -ne 0) { Remove-Item $archivoClave; Falla "No pude entrar a PostgreSQL ($existe). Si la clave estaba mal, vuelve a correr este archivo." }
if ("$existe".Trim() -ne '1') { & "$pgBin\createdb.exe" -U postgres -h localhost emcagua; Ok 'Base de datos emcagua creada' } else { Ok 'La base de datos emcagua ya existe' }

# ---------------------------------------------------------------- 4. Compilar y arrancar
Paso 'Compilando y arrancando la API (la primera vez descarga librerias, puede tardar 5 a 10 minutos)'
$env:EMCAGUA_DB_PASSWORD = $clave
Set-Location $raiz
& mvn.cmd -B -ntp spring-boot:run 2>&1 | Tee-Object -FilePath $log -Append
