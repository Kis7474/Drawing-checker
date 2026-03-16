@echo off
echo ========================================
echo  Drawing Checker - Test Branch
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

:: Accept branch name as argument or prompt
if "%~1"=="" (
    echo Enter the branch name to test.
    echo Example: copilot/fix-zoom-pan
    echo.
    set /p BRANCH_NAME="Branch name: "
) else (
    set BRANCH_NAME=%~1
)

if "%BRANCH_NAME%"=="" (
    echo [ERROR] Branch name is empty!
    pause
    exit /b 1
)

echo.
echo [1/5] Stashing local changes...
git stash

echo.
echo [2/5] Fetching remote branches...
git fetch origin
if %errorlevel% neq 0 (
    echo [ERROR] Fetch failed. Check your internet connection.
    git stash pop
    pause
    exit /b 1
)

echo.
echo [3/5] Checking out branch "%BRANCH_NAME%"...
git checkout %BRANCH_NAME% 2>nul
if %errorlevel% neq 0 (
    echo Branch not found locally. Fetching from remote...
    git checkout -b %BRANCH_NAME% origin/%BRANCH_NAME%
    if %errorlevel% neq 0 (
        echo [ERROR] Branch "%BRANCH_NAME%" not found on remote either.
        echo.
        echo Available remote branches:
        git branch -r
        git stash pop
        pause
        exit /b 1
    )
) else (
    git pull origin %BRANCH_NAME%
)

echo.
echo [4/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo [5/5] Starting development server...
echo.
echo ========================================
echo  Branch: %BRANCH_NAME%
echo  Open http://localhost:3000
echo  Press Ctrl+C to stop the server
echo ========================================
echo.
echo  When done testing, go back to main:
echo    git checkout main
echo    git stash pop
echo ========================================
echo.
call npm run dev
