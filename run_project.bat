@echo off
title MedIntel - Clinical Intelligence & Twin Platform
color 0B

echo =========================================================================
echo               MedIntel - Healthcare Intelligence Platform
echo =========================================================================
echo [1/4] Checking Environment Configuration...
if not exist "backend\.env" (
    echo [*] Copying backend\.env.example to backend\.env...
    copy "backend\.env.example" "backend\.env" >nul
)

echo [2/4] Verifying Python Dependencies...
pip install -r backend\requirements.txt --quiet

echo [3/4] Verifying Frontend Dependencies...
if not exist "node_modules" (
    echo [*] Installing NPM packages (one-time setup)...
    call npm install
)

echo [4/4] Launching Servers...
echo [*] Starting Flask Backend on Port 5000...
start "MedIntel Backend (Flask)" cmd /k "python backend\app.py"

echo [*] Starting Vite Frontend on Port 5173...
start "MedIntel Frontend (Vite)" cmd /k "npm run dev"

echo.
echo =========================================================================
echo    Both servers have been launched in background windows!
echo    - Frontend UI:  http://localhost:5173
echo    - Backend API:  http://localhost:5000
echo    - API Health:   http://localhost:5000/api/health
echo =========================================================================
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173
