@echo off
echo =========================================
echo Fund For Her - Build and Start Script
echo =========================================

echo.
echo [1/3] Building the Next.js project...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo Build failed! Aborting start.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Starting Services cleanly side-by-side in this terminal...
npx -y concurrently "npx -y inngest-cli@latest dev" "npm run start" --names "inngest,nextjs" -c "bgBlue.bold,bgMagenta.bold"
