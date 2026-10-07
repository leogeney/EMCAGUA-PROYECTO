@echo off
rem Doble clic aqui: instala lo que falte (Java 21, Maven y PostgreSQL), crea la base de datos y arranca la API.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\instalar-y-correr.ps1"
echo.
pause
