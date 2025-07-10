const express = require('express');
const metricsRoutes = require('./metrics');
const healthRoutes = require('./health');
const alertsRoutes = require('./alerts');
const dashboardRoutes = require('./dashboard');

const router = express.Router();

// Middleware pour ajouter des headers communs à l'API
router.use((req, res, next) => {
  res.set({
    'X-API-Version': '1.0',
    'X-Service': 'metrics-service',
    'X-Request-ID': req.headers['x-request-id'] || require('crypto').randomUUID()
  });
  next();
});

// Routes principales
router.use('/metrics', metricsRoutes);
router.use('/health', healthRoutes);
router.use('/alerts', alertsRoutes);
router.use('/dashboard', dashboardRoutes);

// Route racine de l'API
router.get('/', (req, res) => {
  res.json({
    service: 'metrics-service',
    version: '1.0.0',
    description: 'Microservice de métriques et monitoring pour système de réservation',
    endpoints: {
      metrics: '/api/metrics',
      health: '/api/health',
      alerts: '/api/alerts',
      dashboard: '/api/dashboard',
      prometheus: '/metrics'
    },
    documentation: '/api/docs',
    timestamp: new Date().toISOString()
  });
});

// Route pour la documentation de l'API
router.get('/docs', (req, res) => {
  res.json({
    title: 'Metrics Service API Documentation',
    version: '1.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: [
      {
        path: '/metrics/custom',
        method: 'POST',
        description: 'Enregistrer des métriques personnalisées',
        parameters: {
          type: 'string (counter, gauge, histogram, timer)',
          category: 'string (business, application, system)',
          data: 'object (données de la métrique)'
        }
      },
      {
        path: '/metrics/business',
        method: 'POST',
        description: 'Enregistrer des métriques business',
        parameters: {
          eventType: 'string',
          data: 'object'
        }
      },
      {
        path: '/health',
        method: 'GET',
        description: 'Obtenir le statut de santé de tous les services'
      },
      {
        path: '/health/{serviceName}',
        method: 'GET',
        description: 'Obtenir le statut de santé d\'un service spécifique'
      },
      {
        path: '/dashboard/summary',
        method: 'GET',
        description: 'Obtenir un résumé des métriques pour le dashboard'
      },
      {
        path: '/dashboard/realtime',
        method: 'GET',
        description: 'Obtenir les métriques en temps réel'
      },
      {
        path: '/alerts',
        method: 'GET',
        description: 'Obtenir la liste des alertes'
      },
      {
        path: '/alerts',
        method: 'POST',
        description: 'Créer une nouvelle alerte'
      }
    ],
    websockets: {
      endpoint: '/socket.io',
      events: ['metrics:update', 'health:change', 'alert:triggered']
    }
  });
});

module.exports = router;
