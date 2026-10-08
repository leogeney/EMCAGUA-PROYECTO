@echo off
rem Abre todo el proyecto (backend y frontend) en Visual Studio Code
set "CARPETA=%~dp0.."
where code >nul 2>&1 && (start "" code "%CARPETA%" & exit /b)
if exist "%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe" (start "" "%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe" "%CARPETA%" & exit /b)
if exist "%ProgramFiles%\Microsoft VS Code\Code.exe" (start "" "%ProgramFiles%\Microsoft VS Code\Code.exe" "%CARPETA%" & exit /b)
echo No encontre Visual Studio Code instalado.
pause
