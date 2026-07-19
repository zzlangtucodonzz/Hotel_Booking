@echo off
echo Stopping Hotel Booking Project services...

echo Stopping MySQL (XAMPP)...
taskkill /F /IM mysqld.exe /T > nul 2>&1

echo Stopping Backend Server (Node.js)...
taskkill /F /IM node.exe /T > nul 2>&1

echo All project services have been successfully shut down.
timeout /t 5
