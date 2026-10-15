@echo off
copy /Y "%~dp0cambios-pendientes\AppLayout.tsx" "%~dp0src\components\layout\AppLayout.tsx"
copy /Y "%~dp0cambios-pendientes\Users.tsx" "%~dp0src\pages\Users.tsx"
copy /Y "%~dp0cambios-pendientes\Logo.tsx" "%~dp0src\components\Logo.tsx"
copy /Y "%~dp0cambios-pendientes\Facturacion.tsx" "%~dp0src\pages\Facturacion.tsx"
echo Listo. & pause
