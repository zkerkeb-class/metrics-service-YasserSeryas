#!/bin/bash

# Script de démarrage du frontend React
echo "🚀 Démarrage du Metrics Dashboard Frontend..."

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/"
    exit 1
fi

# Vérifier si npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Veuillez l'installer avec Node.js"
    exit 1
fi

# Aller dans le dossier frontend
cd "$(dirname "$0")"

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Créer le fichier .env s'il n'existe pas
if [ ! -f ".env" ]; then
    echo "⚙️ Création du fichier .env..."
    cp env.example .env
fi

# Démarrer l'application
echo "🎯 Démarrage de l'application React..."
echo "📱 L'application sera accessible sur http://localhost:3001"
echo "🔗 Assurez-vous que le service backend est démarré sur http://localhost:3000"
echo ""
npm start
