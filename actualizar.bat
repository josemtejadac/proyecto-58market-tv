@echo off
echo ============================================
echo   58 Market TV - Actualizando el sistema
echo ============================================
cd /d "%~dp0"

echo.
echo [1/3] Descargando los ultimos cambios...
git pull

echo.
echo [2/3] Reconstruyendo el backend (esto puede tardar unos minutos)...
docker-compose up --build -d

echo.
echo [3/3] Listo. El backend quedo actualizado y corriendo.
echo Si tambien cambio el panel web, corre build-panel.bat despues de esto.
echo.
pause
