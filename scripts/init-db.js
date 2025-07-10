const mongoose = require('mongoose');
const { MetricModel, AlertModel, HealthCheckModel, AlertRuleModel } = require('../src/models');
const logger = require('../src/utils/logger');

/**
 * Script d'initialisation de la base de données MongoDB
 * Crée les index et insère des données de test si nécessaire
 */

async function initializeDatabase() {
  try {
    logger.info('🚀 Initialisation de la base de données...');

    // Connexion à MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/metrics';
    await mongoose.connect(mongoUri);
    logger.info('✅ Connexion MongoDB établie');

    // Création des index
    await createIndexes();

    // Insertion des données de base
    await insertBaseData();

    logger.info('✅ Initialisation de la base de données terminée');
  } catch (error) {
    logger.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
}

async function createIndexes() {
  logger.info('📊 Création des index...');

  try {
    // Index pour les métriques
    await MetricModel.collection.createIndex({ category: 1, name: 1, timestamp: -1 });
    await MetricModel.collection.createIndex({ service: 1, timestamp: -1 });
    await MetricModel.collection.createIndex({ environment: 1, timestamp: -1 });
    await MetricModel.collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: parseInt(process.env.METRICS_TTL) || 2592000 });

    // Index pour les alertes
    await AlertModel.collection.createIndex({ status: 1, severity: 1, startsAt: -1 });
    await AlertModel.collection.createIndex({ service: 1, status: 1, startsAt: -1 });
    await AlertModel.collection.createIndex({ ruleName: 1, status: 1, startsAt: -1 });
    await AlertModel.collection.createIndex({ metricName: 1, startsAt: -1 });
    await AlertModel.collection.createIndex({ fingerprint: 1 }, { unique: true });
    await AlertModel.collection.createIndex({ startsAt: 1 }, { expireAfterSeconds: parseInt(process.env.ALERTS_TTL) || 7776000 });

    // Index pour les health checks
    await HealthCheckModel.collection.createIndex({ serviceName: 1, checkedAt: -1 });
    await HealthCheckModel.collection.createIndex({ status: 1, checkedAt: -1 });
    await HealthCheckModel.collection.createIndex({ serviceName: 1, status: 1, checkedAt: -1 });
    await HealthCheckModel.collection.createIndex({ checkedAt: 1 }, { expireAfterSeconds: parseInt(process.env.HEALTH_CHECKS_TTL) || 2592000 });

    // Index pour les règles d'alerting
    await AlertRuleModel.collection.createIndex({ enabled: 1, metricName: 1 });
    await AlertRuleModel.collection.createIndex({ service: 1, enabled: 1 });
    await AlertRuleModel.collection.createIndex({ severity: 1, enabled: 1 });

    logger.info('✅ Index créés avec succès');
  } catch (error) {
    logger.error('❌ Erreur lors de la création des index:', error);
    throw error;
  }
}

async function insertBaseData() {
  logger.info('📝 Insertion des données de base...');

  try {
    // Règles d'alerting par défaut
    const defaultAlertRules = [
      {
        id: 'cpu-high-usage',
        name: 'High CPU Usage',
        description: 'Alert when CPU usage exceeds 80%',
        enabled: true,
        metricName: 'cpu_usage_percent',
        condition: '>',
        threshold: 80,
        severity: 'high',
        evaluationInterval: 60,
        evaluationWindow: 300,
        labels: new Map([['type', 'system']]),
        annotations: new Map([
          ['summary', 'High CPU usage detected'],
          ['description', 'CPU usage has been above 80% for more than 5 minutes']
        ]),
        notificationChannels: [
          {
            type: 'webhook',
            destination: '/api/alerts/webhook',
            enabled: true,
            config: new Map()
          }
        ],
        silencePeriod: 900, // 15 minutes
        maxOccurrences: 0,
        environment: process.env.NODE_ENV || 'development',
        service: 'metrics-service',
        createdBy: 'system'
      },
      {
        id: 'memory-low',
        name: 'Low Memory Available',
        description: 'Alert when available memory is below 10%',
        enabled: true,
        metricName: 'memory_available_percent',
        condition: '<',
        threshold: 10,
        severity: 'critical',
        evaluationInterval: 60,
        evaluationWindow: 180,
        labels: new Map([['type', 'system']]),
        annotations: new Map([
          ['summary', 'Low memory available'],
          ['description', 'Available memory has been below 10% for more than 3 minutes']
        ]),
        notificationChannels: [
          {
            type: 'webhook',
            destination: '/api/alerts/webhook',
            enabled: true,
            config: new Map()
          }
        ],
        silencePeriod: 600, // 10 minutes
        maxOccurrences: 0,
        environment: process.env.NODE_ENV || 'development',
        service: 'metrics-service',
        createdBy: 'system'
      },
      {
        id: 'http-error-rate-high',
        name: 'High HTTP Error Rate',
        description: 'Alert when HTTP error rate exceeds 5%',
        enabled: true,
        metricName: 'http_error_rate',
        condition: '>',
        threshold: 0.05,
        severity: 'high',
        evaluationInterval: 60,
        evaluationWindow: 300,
        labels: new Map([['type', 'application']]),
        annotations: new Map([
          ['summary', 'High HTTP error rate detected'],
          ['description', 'HTTP error rate has been above 5% for more than 5 minutes']
        ]),
        notificationChannels: [
          {
            type: 'webhook',
            destination: '/api/alerts/webhook',
            enabled: true,
            config: new Map()
          }
        ],
        silencePeriod: 600, // 10 minutes
        maxOccurrences: 0,
        environment: process.env.NODE_ENV || 'development',
        service: 'metrics-service',
        createdBy: 'system'
      },
      {
        id: 'response-time-high',
        name: 'High Response Time',
        description: 'Alert when P95 response time exceeds 1 second',
        enabled: true,
        metricName: 'http_request_duration_p95',
        condition: '>',
        threshold: 1.0,
        severity: 'medium',
        evaluationInterval: 60,
        evaluationWindow: 600,
        labels: new Map([['type', 'performance']]),
        annotations: new Map([
          ['summary', 'High response time detected'],
          ['description', 'P95 response time has been above 1 second for more than 10 minutes']
        ]),
        notificationChannels: [
          {
            type: 'webhook',
            destination: '/api/alerts/webhook',
            enabled: true,
            config: new Map()
          }
        ],
        silencePeriod: 900, // 15 minutes
        maxOccurrences: 0,
        environment: process.env.NODE_ENV || 'development',
        service: 'metrics-service',
        createdBy: 'system'
      },
      {
        id: 'disk-space-low',
        name: 'Low Disk Space',
        description: 'Alert when disk space is below 10%',
        enabled: true,
        metricName: 'disk_free_percent',
        condition: '<',
        threshold: 10,
        severity: 'high',
        evaluationInterval: 300,
        evaluationWindow: 900,
        labels: new Map([['type', 'system']]),
        annotations: new Map([
          ['summary', 'Low disk space detected'],
          ['description', 'Free disk space has been below 10% for more than 15 minutes']
        ]),
        notificationChannels: [
          {
            type: 'webhook',
            destination: '/api/alerts/webhook',
            enabled: true,
            config: new Map()
          }
        ],
        silencePeriod: 1800, // 30 minutes
        maxOccurrences: 0,
        environment: process.env.NODE_ENV || 'development',
        service: 'metrics-service',
        createdBy: 'system'
      }
    ];

    // Insérer les règles d'alerting si elles n'existent pas
    for (const rule of defaultAlertRules) {
      const existingRule = await AlertRuleModel.findOne({ id: rule.id });
      if (!existingRule) {
        await AlertRuleModel.create(rule);
        logger.info(`✅ Règle d'alerting créée: ${rule.name}`);
      } else {
        logger.info(`⚡ Règle d'alerting existe déjà: ${rule.name}`);
      }
    }

    // Services de base pour les health checks
    const defaultServices = [
      {
        serviceName: 'metrics-service',
        serviceUrl: 'http://localhost:3000/api/health',
        status: 'healthy',
        responseTime: 50,
        statusCode: 200,
        checkType: 'http',
        metadata: new Map([
          ['version', '1.0.0'],
          ['description', 'Metrics and monitoring service']
        ]),
        environment: process.env.NODE_ENV || 'development'
      }
    ];

    // Insérer les services de base
    for (const service of defaultServices) {
      const existingService = await HealthCheckModel.findOne({ 
        serviceName: service.serviceName,
        environment: service.environment
      });
      if (!existingService) {
        await HealthCheckModel.create(service);
        logger.info(`✅ Service de santé créé: ${service.serviceName}`);
      }
    }

    logger.info('✅ Données de base insérées avec succès');
  } catch (error) {
    logger.error('❌ Erreur lors de l\'insertion des données de base:', error);
    throw error;
  }
}

async function cleanupOldData() {
  logger.info('🧹 Nettoyage des anciennes données...');

  try {
    const now = new Date();
    const metricsRetention = parseInt(process.env.METRICS_TTL) || 2592000; // 30 jours
    const alertsRetention = parseInt(process.env.ALERTS_TTL) || 7776000; // 90 jours
    const healthRetention = parseInt(process.env.HEALTH_CHECKS_TTL) || 2592000; // 30 jours

    // Supprimer les métriques anciennes
    const metricsDate = new Date(now.getTime() - (metricsRetention * 1000));
    const deletedMetrics = await MetricModel.deleteMany({ timestamp: { $lt: metricsDate } });
    logger.info(`🗑️ ${deletedMetrics.deletedCount} métriques anciennes supprimées`);

    // Supprimer les alertes anciennes résolues
    const alertsDate = new Date(now.getTime() - (alertsRetention * 1000));
    const deletedAlerts = await AlertModel.deleteMany({ 
      status: 'resolved',
      resolvedAt: { $lt: alertsDate }
    });
    logger.info(`🗑️ ${deletedAlerts.deletedCount} alertes anciennes supprimées`);

    // Supprimer les health checks anciens
    const healthDate = new Date(now.getTime() - (healthRetention * 1000));
    const deletedHealthChecks = await HealthCheckModel.deleteMany({ checkedAt: { $lt: healthDate } });
    logger.info(`🗑️ ${deletedHealthChecks.deletedCount} health checks anciens supprimés`);

    logger.info('✅ Nettoyage terminé');
  } catch (error) {
    logger.error('❌ Erreur lors du nettoyage:', error);
    throw error;
  }
}

// Exécution du script si appelé directement
if (require.main === module) {
  require('dotenv').config();
  
  initializeDatabase()
    .then(() => {
      logger.info('🎉 Initialisation terminée avec succès');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Erreur lors de l\'initialisation:', error);
      process.exit(1);
    });
}

module.exports = {
  initializeDatabase,
  createIndexes,
  insertBaseData,
  cleanupOldData
};
