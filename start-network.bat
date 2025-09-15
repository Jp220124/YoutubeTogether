@echo off
echo ========================================
echo WatchTube Network Server
echo ========================================
echo.
echo Starting server with network access enabled...
echo.

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%

echo Your local network IP: %IP%
echo.
echo Share these URLs with others on your network:
echo - http://%IP%:3000
echo - http://localhost:3000 (for you)
echo.
echo ========================================
echo.

REM Start the server
npm run dev

pause