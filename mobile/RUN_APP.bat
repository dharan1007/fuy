@echo off
REM Kill any existing Expo processes on port 8081
for /f "tokens=5" %%a in ('netstat -aon ^| find "8081"') do taskkill /PID %%a /F 2>nul

REM Wait a moment
timeout /t 2 /nobreak

REM Start Expo with clear cache
echo Starting FUY Mobile App...
echo.
npm start -- --clear

pause
