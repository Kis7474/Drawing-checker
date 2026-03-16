@echo off
echo ========================================
echo  Drawing Checker - First-Time Setup
echo ========================================
echo.

set REPO_URL=https://github.com/Kis7474/Drawing-checker.git
set FOLDER_NAME=Drawing-checker

:: If we are already inside the cloned repo, just update and run
if exist ".git" (
    echo Git repository found. Updating from main...
    git checkout main
    git pull origin main
    goto :install
)

:: If the folder exists but has no .git, warn user
if exist "%FOLDER_NAME%" (
    if not exist "%FOLDER_NAME%\.git" (
        echo [WARNING] Folder "%FOLDER_NAME%" exists but is not a git repo.
        echo It may be a manually downloaded zip. Renaming it to "%FOLDER_NAME%-backup"...
        rename "%FOLDER_NAME%" "%FOLDER_NAME%-backup"
        echo Renamed. Proceeding with fresh clone...
    ) else (
        echo Folder "%FOLDER_NAME%" already cloned. Updating...
        cd /d "%FOLDER_NAME%"
        git checkout main
        git pull origin main
        goto :install
    )
)

echo Cloning repository from GitHub...
git clone %REPO_URL%
if %errorlevel% neq 0 (
    echo [ERROR] Clone failed! Check:
    echo   1. Internet connection
    echo   2. Git is installed (https://git-scm.com)
    pause
    exit /b 1
)

cd /d "%FOLDER_NAME%"

:install
echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed!
    echo Make sure Node.js is installed: https://nodejs.org
    pause
    exit /b 1
)

echo.
echo Starting development server...
echo.
echo ========================================
echo  Open http://localhost:3000
echo  Press Ctrl+C to stop the server
echo ========================================
echo.
call npm run dev
