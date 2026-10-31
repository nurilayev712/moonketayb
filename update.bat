@echo off
chcp 65001 > nul
echo ==============================================
echo  MoonKeyType — Saytni GitHub'ga yangilash
echo ==============================================
echo.

git add .
git commit -m "Yangilanish: %date% %time%"
git push origin main

echo.
echo ==============================================
echo  ✅ Muvaffaqiyatli yuklandi! 
echo  GitHub Pages 30 soniyada jonli yangilanadi.
echo ==============================================
timeout /t 3 > nul
