# Metrics Service - Microservice de Métriques et Monitoring

## 📊 Vue d'ensemble

Ce microservice fournit une solution complète de collecte, analyse et monitoring de métriques pour une architecture de microservices de gestion de réservation et billetterie en ligne. Il intègre Prometheus, OpenTelemetry, Grafana et offre des capacités d'alerting en temps réel.

## 🏗️ Architecture

### Technologies Utilisées

- **Node.js** avec Express.js
- **Prometheus** pour la collecte de métriques
- **OpenTelemetry** pour le tracing distribué
- **Grafana** pour la visualisation
- **MongoDB** pour la persistance des données historiques
- **Redis** pour le cache et les données temporaires
- **WebSocket** pour le streaming temps réel
- **Docker & Docker Compose** pour l'orchestration

### Structure du Projet

```
metrics-service/
├── src/
│   ├── app.js                          # Point d'entrée principal
│   ├── config/
│   │   ├── metrics.js                  # Configuration Prometheus
│   │   └── tracing.js                  # Configuration OpenTelemetry
│   ├── collectors/
│   │   ├── systemCollector.js          # Métriques système
│   │   ├── applicationCollector.js     # Métriques applicatives
│   │   └── businessCollector.js        # Métriques business
│   ├── services/
│   │   ├── metricsCollector.js         # Service principal de collecte
│   │   ├── healthChecker.js            # Service de health checking
│   │   └── alertingService.js          # Service d'alerting
│   ├── models/
│   │   ├── MetricModel.js              # Modèle de métriques
│   │   ├── AlertModel.js               # Modèle d'alertes
│   │   ├── HealthCheckModel.js         # Modèle de health checks
│   │   └── AlertRuleModel.js           # Modèle de règles d'alerting
│   ├── routes/
│   │   ├── index.js                    # Routes principales
│   │   ├── metrics.js                  # API métriques
│   │   ├── health.js                   # API santé
│   │   ├── alerts.js                   # API alertes
│   │   └── dashboard.js                # API dashboard
│   ├── middleware/
│   │   ├── rateLimiter.js              # Rate limiting
│   │   └── errorHandler.js             # Gestion d'erreurs
│   ├── utils/
│   │   └── logger.js                   # Système de logging
│   └── websockets/
│       └── metricsSocket.js            # WebSocket temps réel
├── config/
│   ├── prometheus.yml                  # Configuration Prometheus
│   ├── prometheus-rules.yml            # Règles d'alerting
│   ├── alertmanager.yml               # Configuration AlertManager
│   └── grafana/                        # Configuration Grafana
├── dashboards/
│   ├── system-metrics.json             # Dashboard système
│   ├── business-metrics.json           # Dashboard business
│   ├── application-performance.json    # Dashboard performance
│   └── alerts-health.json              # Dashboard alertes
├── docker-compose.yml                  # Orchestration services
├── Dockerfile                          # Image Docker du service
└── package.json                        # Dépendances Node.js
```

## 🚀 Installation et Démarrage

### Prérequis

- Node.js >= 16.x
- Docker et Docker Compose
- MongoDB (optionnel si utilisation Docker)
- Redis (optionnel si utilisation Docker)

### Installation

1. **Cloner le repository**
   ```bash
   git clone <repository-url>
   cd metrics-service
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration des variables d'environnement**
   ```bash
   cp .env.example .env
   # Éditer le fichier .env avec vos configurations
   ```

4. **Démarrage avec Docker Compose (Recommandé)**
   ```bash
   docker-compose up -d
   ```

5. **Démarrage en mode développement**
   ```bash
   npm run dev
   ```

### Variables d'Environnement

```env
# Application
NODE_ENV=development
PORT=3000
SERVICE_NAME=metrics-service

# Base de données
MONGODB_URI=mongodb://localhost:27017/metrics
REDIS_URL=redis://localhost:6379

# Métriques
METRICS_TTL=2592000
ALERTS_TTL=7776000
HEALTH_CHECKS_TTL=2592000

# Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# OpenTelemetry
OTEL_ENABLED=true
OTEL_SERVICE_NAME=metrics-service
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_BROADCAST_INTERVAL=5000

# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-password
```

## 📈 Types de Métriques Collectées

### 1. Métriques Système
- **CPU Usage** : Utilisation processeur par cœur
- **Memory Usage** : Mémoire utilisée/disponible
- **Disk I/O** : Opérations lecture/écriture disque
- **Network I/O** : Trafic réseau entrant/sortant
- **Load Average** : Charge système moyenne

### 2. Métriques Applicatives
- **HTTP Requests** : Nombre, durée, codes de statut
- **Response Times** : Latences P50, P90, P95, P99
- **Error Rates** : Taux d'erreurs 4xx/5xx
- **Active Connections** : Connexions actives
- **Database Queries** : Performance des requêtes

### 3. Métriques Business
- **Bookings** : Réservations créées/complétées/annulées
- **Revenue** : Revenus par service/période
- **Active Users** : Utilisateurs actifs
- **Conversion Funnel** : Entonnoir de conversion
- **Customer Satisfaction** : Scores de satisfaction

### 4. Métriques de Santé
- **Service Health** : État des services externes
- **Response Times** : Temps de réponse des health checks
- **Uptime** : Disponibilité des services
- **Dependencies** : État des dépendances

## 🔔 Système d'Alerting

### Règles d'Alerting Prédéfinies

1. **Haute Utilisation CPU** (> 80%)
2. **Mémoire Faible** (< 10% disponible)
3. **Taux d'Erreur Élevé** (> 5%)
4. **Latence Élevée** (P95 > 1s)
5. **Service Indisponible** (Health check failed)
6. **Espace Disque Faible** (< 10% libre)

### Canaux de Notification

- **Webhook** : Notifications HTTP POST
- **Slack** : Intégration Slack
- **Email** : Notifications par email
- **WebSocket** : Alerts temps réel dans l'interface

## 🌐 API REST

### Endpoints Principaux

#### Métriques
```http
GET    /api/metrics/summary              # Résumé général
GET    /api/metrics/system               # Métriques système
GET    /api/metrics/application          # Métriques applicatives
GET    /api/metrics/business             # Métriques business
POST   /api/metrics/custom               # Ajouter métrique custom
POST   /api/metrics/business             # Ajouter métrique business
POST   /api/metrics/batch                # Ajouter métriques en lot
```

#### Santé
```http
GET    /api/health                       # État global
GET    /api/health/services              # États des services
GET    /api/health/services/:name        # État d'un service
POST   /api/health/check                 # Forcer un check
POST   /api/health/services              # Ajouter un service
DELETE /api/health/services/:name        # Supprimer un service
```

#### Alertes
```http
GET    /api/alerts                       # Liste des alertes
GET    /api/alerts/rules                 # Règles d'alerting
POST   /api/alerts/rules                 # Créer une règle
PUT    /api/alerts/rules/:id             # Modifier une règle
DELETE /api/alerts/rules/:id             # Supprimer une règle
POST   /api/alerts/:id/acknowledge       # Acquitter une alerte
POST   /api/alerts/:id/resolve           # Résoudre une alerte
```

#### Dashboard
```http
GET    /api/dashboard/summary            # Résumé du dashboard
GET    /api/dashboard/realtime           # Données temps réel
GET    /api/dashboard/charts/:type       # Données pour graphiques
```

#### Prometheus
```http
GET    /metrics                          # Endpoint Prometheus
```

### Exemples d'Utilisation

#### Ajouter une Métrique Custom
```bash
curl -X POST http://localhost:3000/api/metrics/custom \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom_counter",
    "type": "counter",
    "value": 1,
    "labels": {"service": "booking", "endpoint": "/api/bookings"}
  }'
```

#### Créer une Règle d'Alerting
```bash
curl -X POST http://localhost:3000/api/alerts/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Error Rate",
    "metricName": "http_requests_total",
    "condition": ">",
    "threshold": 0.05,
    "severity": "high",
    "notificationChannels": [
      {
        "type": "slack",
        "destination": "#alerts"
      }
    ]
  }'
```

## 📊 Dashboards Grafana

### 1. System Metrics Dashboard
- Utilisation CPU, mémoire, disque
- Load average et I/O
- Métriques réseau

### 2. Business Metrics Dashboard
- Réservations et revenus
- Utilisateurs actifs
- Entonnoir de conversion
- Sources de trafic

### 3. Application Performance Dashboard
- Temps de réponse (percentiles)
- Codes de statut HTTP
- Performance base de données
- Taux de hit cache

### 4. Alerts & Health Dashboard
- Alertes actives
- État des services
- Chronologie des alertes
- Métriques de santé

## 🔌 WebSocket Temps Réel

### Connexion WebSocket
```javascript
const socket = io('http://localhost:3000');

// S'abonner aux métriques système
socket.emit('subscribe', { type: 'system' });

// Écouter les mises à jour
socket.on('metrics', (data) => {
  console.log('Nouvelles métriques:', data);
});

// Écouter les alertes
socket.on('alert', (alert) => {
  console.log('Nouvelle alerte:', alert);
});
```

### Événements Disponibles
- `metrics` : Métriques mises à jour
- `alert` : Nouvelle alerte
- `health` : Changement d'état de santé
- `system` : Métriques système
- `business` : Métriques business

## 🧪 Tests

### Lancer les Tests
```bash
# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration

# Tests de performance
npm run test:performance

# Coverage
npm run test:coverage
```

### Tests Disponibles
- Tests unitaires des collecteurs
- Tests d'intégration API
- Tests de performance WebSocket
- Tests de charge

## 🔧 Configuration Avancée

### Personnalisation des Collecteurs

```javascript
// src/collectors/customCollector.js
const { register, Counter, Gauge } = require('prom-client');

const customMetric = new Counter({
  name: 'custom_business_metric',
  help: 'Custom business metric',
  labelNames: ['service', 'action']
});

register.registerMetric(customMetric);

module.exports = { customMetric };
```

### Ajout de Nouveaux Health Checks

```javascript
// Dans src/services/healthChecker.js
this.addService({
  name: 'custom-service',
  url: 'http://custom-service:8080/health',
  interval: 30000,
  timeout: 5000,
  retries: 3
});
```

### Règles d'Alerting Personnalisées

```yaml
# config/custom-rules.yml
groups:
  - name: custom.rules
    rules:
      - alert: CustomHighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
```

## 🚀 Déploiement

### Production avec Docker

```bash
# Build de l'image
docker build -t metrics-service:latest .

# Déploiement
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: metrics-service
  template:
    metadata:
      labels:
        app: metrics-service
    spec:
      containers:
      - name: metrics-service
        image: metrics-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
```

## 📝 Logs et Debugging

### Niveaux de Log
- `error` : Erreurs critiques
- `warn` : Avertissements
- `info` : Informations générales
- `debug` : Informations de debug

### Logs Structurés
```json
{
  "timestamp": "2023-12-01T10:00:00.000Z",
  "level": "info",
  "message": "Metric collected",
  "service": "metrics-service",
  "metricName": "http_requests_total",
  "value": 1,
  "labels": {"method": "GET", "status": "200"}
}
```

## 🔒 Sécurité

### Authentification
- JWT tokens pour l'API
- Rate limiting par IP
- CORS configuré

### Chiffrement
- HTTPS en production
- Chiffrement des données sensibles
- Secrets gérés via variables d'environnement

## 🤝 Contribution

### Guidelines
1. Fork le repository
2. Créer une branch feature
3. Implementer les changements
4. Ajouter des tests
5. Créer une Pull Request

### Code Style
- ESLint configuré
- Prettier pour le formatage
- JSDoc pour la documentation

## 📚 Documentation API

La documentation complète de l'API est disponible via Swagger UI à l'adresse :
```
http://localhost:3000/api-docs
```

## 🆘 Support et FAQ

### Questions Fréquentes

**Q: Comment ajouter une nouvelle métrique ?**
R: Utilisez l'endpoint `POST /api/metrics/custom` ou ajoutez-la directement dans les collecteurs.

**Q: Comment configurer Slack pour les alertes ?**
R: Définissez `SLACK_WEBHOOK_URL` dans vos variables d'environnement.

**Q: Comment personnaliser les dashboards Grafana ?**
R: Modifiez les fichiers JSON dans le dossier `dashboards/` ou créez-les via l'interface Grafana.

### Troubleshooting

1. **Service ne démarre pas** : Vérifiez les variables d'environnement et les connexions MongoDB/Redis
2. **Métriques manquantes** : Vérifiez les logs et la configuration Prometheus
3. **Alertes non envoyées** : Vérifiez la configuration des canaux de notification

## 📞 Contact

Pour toute question ou support :
- Email: support@metrics-service.com
- Documentation: https://docs.metrics-service.com
- Issues: https://github.com/your-org/metrics-service/issues

---

**Version:** 1.0.0  
**Dernière mise à jour:** Décembre 2023
