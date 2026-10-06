@echo off
title TeleMeet Online
chcp 65001 > nul
set "PATH=D:\Программы\nodejs;%PATH%"

echo ========================================================
echo    🚀 TeleMeet - ОНЛАЙН ИНТЕРНЕТ КОНФЕРЕНЦИЯ
echo    (Турли жойлардан уланиш учун очиқ ҳавола)
echo ========================================================
echo.
echo 1. Сервер ишга туширилмоқда...
start "TeleMeet Server" /b "D:\Программы\nodejs\node.exe" "D:\Программы\videoconf-platform\server\src\index.js"

timeout /t 2 /nobreak > nul

echo 2. Бутун интернет учун бепул хавфсиз HTTPS туннель ишга тушмоқда...
echo.
echo Қуйида кўрсатилган https://...trycloudflare.com ҳаволасини
echo кўчириб олиб, гуруҳга юборишингиз мумкин:
echo --------------------------------------------------------

"D:\Программы\videoconf-platform\cloudflared.exe" tunnel --url http://localhost:5000
pause
