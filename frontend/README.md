# Metrics Dashboard Frontend

Interface React moderne pour le service de métriques et monitoring.

## 🚀 Fonctionnalités

### 📊 Dashboard principal
- Vue d'ensemble des métriques en temps réel
- Graphiques interactifs avec Recharts
- Cartes de métriques avec indicateurs de tendance
- État des services et alertes récentes

### 📈 Métriques personnalisées
- Création de nouvelles métriques (counter, gauge, histogram, timer)
- Visualisation des tendances par catégorie (business, application, système)
- Gestion des métriques custom via API REST

### 🔧 Métriques système
- Monitoring CPU, mémoire, disque, réseau
- Graphiques historiques sur différentes périodes
- Informations détaillées sur les ressources

### ❤️ État de santé
- Surveillance des services et composants
- Indicateurs de statut en temps réel
- Historique des incidents et maintenance
- Contrôles système automatisés

### ⚠️ Gestion des alertes
- Configuration des règles d'alerte
- Seuils et conditions personnalisables
- Notifications en temps réel via WebSocket
- Activation/désactivation des alertes

## 🛠️ Technologies utilisées

- **React 18** - Framework frontend moderne
- **React Router** - Navigation SPA
- **Tailwind CSS** - Framework CSS utility-first
- **Recharts** - Bibliothèque de graphiques React
- **Socket.IO Client** - Communication WebSocket temps réel
- **Axios** - Client HTTP pour API REST
- **React Hot Toast** - Notifications élégantes
- **Lucide React** - Icônes modernes et cohérentes

## 📁 Structure du projet

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/          # Composants réutilisables
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   ├── MetricCard.js
│   │   ├── MetricChart.js
│   │   ├── StatusIndicator.js
│   │   └── LoadingStates.js
│   ├── hooks/               # Hooks personnalisés
│   │   ├── useMetrics.js
│   │   ├── useHealth.js
│   │   ├── useAlerts.js
│   │   └── useDashboard.js
│   ├── pages/               # Pages de l'application
│   │   ├── Dashboard.js
│   │   ├── MetricsPage.js
│   │   ├── SystemPage.js
│   │   ├── HealthPage.js
│   │   └── AlertsPage.js
│   ├── services/            # Services API et WebSocket
│   │   ├── api.js
│   │   └── websocket.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## ⚙️ Installation et démarrage

### Prérequis
- Node.js 16+ 
- npm ou yarn
- Service backend démarré sur http://localhost:3000

### Installation
```bash
cd frontend
npm install
```

### Démarrage en développement
```bash
npm start
```

L'application sera accessible sur http://localhost:3001

### Build de production
```bash
npm run build
```

## 🔌 API et WebSocket

### Configuration API
Le frontend communique avec le backend via :
- **API REST** : `http://localhost:3000/api/*`
- **WebSocket** : `http://localhost:3000` (Socket.IO)
- **Prometheus** : `http://localhost:3000/metrics`

### Variables d'environnement
Créez un fichier `.env` dans le dossier frontend :
```
REACT_APP_API_URL=http://localhost:3000
```

## 📊 Fonctionnalités des pages

### Dashboard (`/`)
- Vue d'ensemble avec KPIs principaux
- Graphiques de requêtes et temps de réponse
- État des services en temps réel
- Alertes récentes

### Métriques (`/metrics`)
- Liste des métriques personnalisées
- Formulaire de création de nouvelles métriques
- Graphiques de tendances par type
- Support des types : counter, gauge, histogram, timer

### Système (`/system`)
- Monitoring des ressources système
- CPU, mémoire, disque, réseau
- Graphiques historiques avec sélection de période
- Informations détaillées des processus

### Santé (`/health`)
- État de tous les services
- Indicateurs de disponibilité
- Contrôles système automatisés
- Historique des incidents

### Alertes (`/alerts`)
- Configuration des règles d'alerte
- Gestion des seuils et conditions
- Activation/désactivation
- Notifications temps réel

## 🎨 Design et UX

- **Design moderne** avec Tailwind CSS
- **Interface responsive** pour tous les écrans
- **Thème cohérent** avec palette de couleurs personnalisée
- **Animations fluides** et transitions
- **Indicateurs de statut** colorés et intuitifs
- **Notifications toast** pour les actions utilisateur

## 🔄 Temps réel

- **WebSocket** pour les mises à jour en temps réel
- **Refresh automatique** des métriques
- **Notifications** des nouvelles alertes
- **Indicateurs de connexion** et statut

## 🚀 Déploiement

### Avec Docker
```bash
# Build de l'image
docker build -t metrics-dashboard-frontend .

# Démarrage du conteneur
docker run -p 3001:3000 metrics-dashboard-frontend
```

### Avec nginx
Après `npm run build`, servez le dossier `build/` avec nginx ou votre serveur web préféré.

## 🔧 Développement

### Ajout d'une nouvelle page
1. Créer le composant dans `src/pages/`
2. Ajouter la route dans `App.js`
3. Mettre à jour la navigation dans `Sidebar.js`
4. Créer les hooks si nécessaire dans `src/hooks/`

### Ajout d'une nouvelle métrique
1. Étendre les services API dans `src/services/api.js`
2. Créer/modifier les hooks dans `src/hooks/`
3. Ajouter les composants de visualisation

## 📝 License

MIT License - voir le fichier LICENSE du projet principal.
