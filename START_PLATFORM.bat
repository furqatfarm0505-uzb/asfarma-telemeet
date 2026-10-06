@echo off
title TeleMeet Platform
chcp 65001 > nul
set "PATH=D:\Программы\nodejs;%PATH%"

echo ========================================================
echo    🚀 TeleMeet видеоконференция платформаси
echo    (Админ ҳуқуқлари ТАЛАБ ҚИЛИНМАЙДИ)
echo ========================================================
echo.
echo Сервер ишга тушмоқда...
cd /d "D:\Программы\videoconf-platform\server"

timeout /t 2 /nobreak > nul
start http://localhost:5000

"D:\Программы\nodejs\node.exe" src/index.js
pause
