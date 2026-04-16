@echo off
echo ========================================
echo Setting up Trello Clone Project
echo ========================================

echo.
echo [1/4] Installing backend dependencies...
cd /d "c:\Users\KRITIKA\OneDrive\Desktop\scaler\backend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend npm install failed!
    pause
    exit /b 1
)
echo Backend dependencies installed!

echo.
echo [2/4] Creating Next.js frontend...
cd /d "c:\Users\KRITIKA\OneDrive\Desktop\scaler"
call npx create-next-app@latest frontend --js --tailwind --no-eslint --app --no-src-dir --use-npm --yes
if %errorlevel% neq 0 (
    echo ERROR: create-next-app failed!
    pause
    exit /b 1
)
echo Next.js frontend created!

echo.
echo [3/4] Installing frontend dependencies...
cd /d "c:\Users\KRITIKA\OneDrive\Desktop\scaler\frontend"
call npm install @hello-pangea/dnd axios date-fns lucide-react
if %errorlevel% neq 0 (
    echo ERROR: Frontend npm install failed!
    pause
    exit /b 1
)
echo Frontend dependencies installed!

echo.
echo ========================================
echo Setup complete! 
echo ========================================
echo Backend: cd backend ^&^& npm run dev  (port 5000)
echo Frontend: cd frontend ^&^& npm run dev (port 3000)
echo ========================================
pause
