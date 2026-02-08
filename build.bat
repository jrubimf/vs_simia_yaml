@echo off
cd /d "%~dp0"
call npm run compile
if %errorlevel% neq 0 goto :end
call npx vsce package
:end
pause
