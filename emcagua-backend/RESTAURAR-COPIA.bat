@echo off
rem Doble clic aqui para volver a una copia de seguridad (reemplaza los datos actuales).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restaurar-copia.ps1"
echo.
pause
