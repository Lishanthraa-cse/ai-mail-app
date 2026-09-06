@echo off
echo ========================================
echo AI-Powered Mail App - Windows Setup
echo ========================================
echo.

REM Check Node.js
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js is installed
echo.

REM Check MongoDB
echo Checking MongoDB installation...
mongod --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] MongoDB is not installed!
    echo Please install MongoDB from https://www.mongodb.com/try/download/community
    echo Or use MongoDB Atlas (cloud) - https://www.mongodb.com/atlas
    echo.
    pause
)
echo.

echo Installing Server Dependencies...
cd server
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install server dependencies
    pause
    exit /b 1
)
echo [OK] Server dependencies installed
echo.

echo Installing Client Dependencies...
cd ../client
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install client dependencies
    pause
    exit /b 1
)
echo [OK] Client dependencies installed
echo.

cd ..
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the application:
echo 1. Open TWO Command Prompt windows
echo 2. In window 1: cd server && npm run dev
echo 3. In window 2: cd client && npm start
echo 4. Open browser: http://localhost:3000
echo.
pause