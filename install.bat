@echo off
title AI Mail App Setup
color 0A

echo =============================================
echo  AI-Powered Mail Application - Setup
echo =============================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js not found!
    echo Please download from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node --version
echo.

echo Installing Server Dependencies...
cd server
call npm install --silent
if errorlevel 1 (
    color 0C
    echo [ERROR] Server dependencies failed
    pause
    exit /b 1
)
echo [OK] Server dependencies installed
echo.

echo Installing Client Dependencies...
cd ../client
call npm install --silent
if errorlevel 1 (
    color 0C
    echo [ERROR] Client dependencies failed
    pause
    exit /b 1
)
echo [OK] Client dependencies installed
echo.

cd ..
color 0A
echo =============================================
echo  Setup Complete!
echo =============================================
echo.
echo To start the application:
echo.
echo 1. Open TWO Command Prompt windows
echo.
echo 2. In window 1:
echo    cd server
echo    npm run dev
echo.
echo 3. In window 2:
echo    cd client
echo    npm start
echo.
echo 4. Open browser: http://localhost:3000
echo.
pause