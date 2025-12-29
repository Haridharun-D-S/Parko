@echo off
echo ======================================
echo HARD RESET: Killing all running services
echo ======================================

REM -------- KILL BY PORT --------
for %%p in (7089 4200 4300 8001) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p') do (
    taskkill /PID %%a /F >nul 2>&1
  )
)

REM -------- KILL COMMON DEV PROCESSES --------
taskkill /IM dotnet.exe /F >nul 2>&1
taskkill /IM ParkingLotAPI.exe /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM uvicorn.exe /F >nul 2>&1
taskkill /IM python.exe /F >nul 2>&1

echo All old processes killed.
timeout /t 2 >nul

echo ======================================
echo Starting all services fresh
echo ======================================

REM -------- START SERVICES --------
start "API" cmd /k dotnet run --project "ParkingLotAPI\ParkingLotAPI\ParkingLotAPI.csproj"
start "Frontend" cmd /k "cd parking-lot-ui && ng serve --open"
start "Mock IoT" cmd /k "cd parking-iot-mock && ng serve --port 4300"
start "OCR" cmd /k "cd ocr-service && uvicorn main:app --reload --port 8001"

REM -------- WAIT FOR BOOT --------
echo Waiting for services to boot...
timeout /t 12 >nul

REM -------- OPEN ALL WEB APPS --------
start http://localhost:7089/swagger
start http://localhost:4200
start http://localhost:4300
start http://localhost:8001/docs

echo ======================================
echo SYSTEM READY ??
echo ======================================
