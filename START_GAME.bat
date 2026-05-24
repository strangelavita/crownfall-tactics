@echo off
echo ==========================================
echo   CROWNFALL TACTICS - LAUNCHER
echo ==========================================
echo.
echo Starting local server on port 10000...
echo.

REM Kill any existing Python HTTP servers
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *http.server*" 2>nul

REM Start the server in background
start /B python -m http.server 10000 --directory "/mnt/agents/output/crownfall-tactics"

timeout /t 2 >nul

echo Server started! Opening game in browser...
echo.
echo If browser doesn't open, manually visit:
echo   http://localhost:10000
echo.

start http://localhost:10000

echo.
echo Press any key to stop the server and exit...
pause >nul

REM Kill the server on exit
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *http.server*" 2>nul
