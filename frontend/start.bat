@echo off
echo 🚀 Démarrage du Metrics Dashboard Frontend...

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/
    pause
    exit /b 1
)

REM Vérifier si npm est installé
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm n'est pas installé. Veuillez l'installer avec Node.js
    pause
    exit /b 1
)

REM Aller dans le dossier du script
cd /d "%~dp0"

REM Installer les dépendances si nécessaire
if not exist "node_modules" (
    echo 📦 Installation des dépendances...
    npm install
)

REM Créer le fichier .env s'il n'existe pas
if not exist ".env" (
    echo ⚙️ Création du fichier .env...
    copy env.example .env
)

REM Démarrer l'application
echo 🎯 Démarrage de l'application React...
echo 📱 L'application sera accessible sur http://localhost:3001
echo 🔗 Assurez-vous que le service backend est démarré sur http://localhost:3000
echo.
npm start

pause
