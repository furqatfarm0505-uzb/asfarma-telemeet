@echo off
title Push Asfarma TeleMeet to GitHub
chcp 65001 > nul
set "PATH=C:\Users\User\AppData\Local\Programs\Git\cmd;C:\Program Files\Git\cmd;D:\Программы\nodejs;%PATH%"

echo ========================================================
echo   🚀 Asfarma TeleMeet - GitHub'га Юклаш Ёрдамчиси
echo ========================================================
echo.

git --version >nul 2>&1
if errorlevel 1 (
    echo [ХАТОЛИК] Компьютерда Git топилмади!
    echo Илтимос, Git ўрнатилганини текширинг.
    pause
    exit /b 1
)

echo 1. Git статус текширилмоқда...
cd /d "D:\Программы\videoconf-platform"

git branch -M main

echo.
echo 2. Лойиҳадаги барча файллар тайёрланмоқда...
git add .

git status --porcelain | findstr "^" >nul
if not errorlevel 1 (
    git commit -m "Asfarma Video Conference & Presentation Platform (Full Release 2026)"
    echo [OK] Файллар коммит қилинди.
) else (
    echo [OK] Барча файллар аллақачон коммит қилинган.
)

echo.
echo ========================================================
echo 3. GitHub Репозиторий манзилини киритинг:
echo    (Масалан: https://github.com/username/asfarma-zoom.git)
echo ========================================================
echo.
set /p REPO_URL="GitHub Repository URL: "

if "%REPO_URL%"=="" (
    echo.
    echo [ОГОҲЛАНТИРИШ] Манзил киритилмади!
    pause
    exit /b 1
)

echo.
echo 4. Репозиторий уланмоқда: %REPO_URL%

git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo 5. GitHub'га юкланмоқда (git push -u origin main)...
echo.

git push -u origin main

if errorlevel 1 (
    echo.
    echo --------------------------------------------------------
    echo [ЭСЛАТМА] Агар GitHub пароль ёки Токен сўраса,
    echo браузерда чиққан "Sign in with your browser" ойнаси
    echo орқали тасдиқланг.
    echo --------------------------------------------------------
) else (
    echo.
    echo ========================================================
    echo ✅ МУВАФФАҚИЯТЛИ ЮКЛАНДИ!
    echo Лойиҳа GitHub саҳифангизда тайёр бўлди.
    echo ========================================================
)

echo.
pause
