@echo off
echo ========================================
echo    HONEYPOT SECURITY DASHBOARD
echo    Starting Frontend + Backend
echo ========================================
echo.

REM Start Backend in a new window
echo [1/2] Starting Backend (Flask)...
start "Honeypot Backend" cmd /k "cd backend && python app.py"

REM Wait for backend to initialize
timeout /t 3 /nobreak > nul

REM Start Frontend
echo [2/2] Starting Frontend (Vite)...
echo.
echo ========================================
echo   Dashboard: http://localhost:3000
echo   Backend:   http://localhost:5000
echo   Sign up on first run to create an admin account.
echo ========================================
echo.

npm run dev
