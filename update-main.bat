@echo off
echo ========================================
echo  Drawing Checker - Update from Main
echo ========================================
echo.

:: Move to the directory of this batch file (project root)
cd /d "%~dp0"

:: Verify we are inside a git repository
if not exist ".git" (
    echo [ERROR] .git folder not found in: %CD%
    echo Make sure this file is in the Drawing-checker project root folder.
    echo The project root must contain: .git, package.json, app, components
    echo.
    echo If you downloaded a zip instead of using git clone, run setup-and-run.bat first.
    pause
    exit /b 1
)

echo Project folder: %CD%
echo.

echo [1/5] Switching to main branch...
git checkout main
if %errorlevel% neq 0 (
    echo [ERROR] Failed to switch branch. Commit or stash your local changes first.
    pause
    exit /b 1
)

echo.
echo [2/5] Pulling latest code from origin/main...
git pull origin main
if %errorlevel% neq 0 (
    echo [ERROR] Pull failed. Check your internet connection.
    pause
    exit /b 1
)

echo.
echo [3/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed. Make sure Node.js is installed.
    pause
    exit /b 1
)

echo.
echo [4/5] Build check...
call npm run build
if %errorlevel% neq 0 (
    echo [WARNING] Build reported errors. Starting dev server anyway...
    pause
)

echo.
echo [5/5] Starting development server...
echo.
echo ========================================
echo  Open http://localhost:3000
echo  Press Ctrl+C to stop the server
echo ========================================
echo.
call npm run dev
