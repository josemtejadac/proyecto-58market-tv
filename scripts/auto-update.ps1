# Revisa si hay cambios nuevos en GitHub y, si los hay, actualiza el backend y el panel.
# Pensado para correr cada 15 min via Programador de tareas de Windows.

$ErrorActionPreference = "Continue"
$repoDir = Split-Path -Parent $PSScriptRoot
$logFile = Join-Path $repoDir "scripts\auto-update.log"

function Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp  $msg" | Out-File -FilePath $logFile -Append -Encoding utf8
}

try {
    Set-Location $repoDir

    git fetch origin main --quiet 2>$null
    $local = git rev-parse HEAD
    $remote = git rev-parse origin/main

    if ($local -eq $remote) {
        # Sin cambios, no hacer nada (no llenamos el log en cada corrida silenciosa).
        exit 0
    }

    Log "Cambios detectados ($($local.Substring(0,7)) -> $($remote.Substring(0,7))). Actualizando..."

    git pull origin main --quiet 2>$null
    if ($LASTEXITCODE -ne 0) { throw "git pull fallo (codigo $LASTEXITCODE)" }

    Log "Reconstruyendo backend..."
    docker-compose up --build -d 2>$null
    if ($LASTEXITCODE -ne 0) { throw "docker-compose fallo (codigo $LASTEXITCODE)" }

    Log "Reconstruyendo panel web..."
    Push-Location (Join-Path $repoDir "panel-web")
    npm install --silent 2>$null
    npm run build 2>$null
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        throw "build del panel fallo (codigo $LASTEXITCODE)"
    }
    Pop-Location

    # Si el panel (vite preview) no esta corriendo, lo levantamos.
    $panelRunning = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
    if (-not $panelRunning) {
        Log "Panel no estaba corriendo, iniciandolo..."
        Start-Process -WindowStyle Hidden powershell -ArgumentList "-NoProfile -Command `"cd '$repoDir\panel-web'; npm run preview`""
    }

    Log "Actualizacion completa ($($remote.Substring(0,7)))."
} catch {
    Log "ERROR: $($_.Exception.Message)"
}
