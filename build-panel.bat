@echo off
echo ============================================
echo   58 Market TV - Reconstruyendo el panel web
echo ============================================
cd /d "%~dp0panel-web"

echo.
echo Instalando dependencias (si hay nuevas)...
call npm install

echo.
echo Compilando el panel...
call npm run build

echo.
echo Listo. Si "npm run preview" ya estaba corriendo, no hace falta
echo reiniciarlo: sirve los archivos actualizados automaticamente.
echo Si no estaba corriendo, se abre ahora.
echo.
call npm run preview
