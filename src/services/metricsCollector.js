const SystemMetricsCollector = require('../collectors/systemCollector');
const ApplicationMetricsCollector = require('../collectors/applicationCollector');
const BusinessMetricsCollector = require('../collectors/businessCollector');
const { loggers } = require('../utils/logger');
const logger = loggers.main;

class MetricsCollectorService {
  constructor() {
    this.systemCollector = new SystemMetricsCollector();
    this.applicationCollector = new ApplicationMetricsCollector();
    this.businessCollector = new BusinessMetricsCollector();
    this.isRunning = false;
    this.cleanupInterval = null;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Metrics collector is already running');
      return;
    }

    try {
      logger.info('Starting metrics collection service...');

      // Démarrer tous les collecteurs
      await this.systemCollector.start();
      this.businessCollector.start();

      // Démarrer le nettoyage périodique
      this.startCleanupInterval();

      this.isRunning = true;
      logger.info('Metrics collection service started successfully');

    } catch (error) {
      logger.error('Failed to start metrics collection service:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn('Metrics collector is not running');
      return;
    }

    try {
      logger.info('Stopping metrics collection service...');

      // Arrêter tous les collecteurs
      this.systemCollector.stop();
      this.businessCollector.stop();

      // Arrêter le nettoyage
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      this.isRunning = false;
      logger.info('Metrics collection service stopped successfully');

    } catch (error) {
      logger.error('Error stopping metrics collection service:', error);
      throw error;
    }
  }

  startCleanupInterval() {
    // Nettoyage toutes les 5 minutes
    this.cleanupInterval = setInterval(() => {
      try {
        this.applicationCollector.cleanup();
        logger.debug('Metrics cleanup completed');
      } catch (error) {
        logger.error('Error during metrics cleanup:', error);
      }
    }, 5 * 60 * 1000);
  }

  // === MÉTHODES PUBLIQUES POUR L'API ===

  // Middleware HTTP
  getHttpMetricsMiddleware() {
    return this.applicationCollector.createHttpMetricsMiddleware();
  }

  // Gestion des WebSockets
  handleWebSocketConnection(socket) {
    this.applicationCollector.handleWebSocketConnection(socket);
  }

  // Enregistrer une métrique personnalisée
  recordCustomMetric(metricData) {
    const { type, category, data } = metricData;

    try {
      switch (category) {
        case 'business':
          this.handleBusinessMetric(type, data);
          break;
        case 'application':
          this.handleApplicationMetric(type, data);
          break;
        case 'system':
          logger.warn('System metrics are collected automatically');
          break;
        default:
          logger.warn(`Unknown metric category: ${category}`);
      }
    } catch (error) {
      logger.error('Error recording custom metric:', error);
      throw error;
    }
  }

  handleBusinessMetric(type, data) {
    switch (type) {
      case 'reservation':
        this.businessCollector.recordReservation(data);
        break;
      case 'revenue':
        this.businessCollector.recordRevenue(data);
        break;
      case 'user_activity':
        this.businessCollector.recordUserActivity(data.userId, data.activityType);
        break;
      case 'event_metrics':
        this.businessCollector.recordEventMetrics(data);
        break;
      case 'external_event':
        this.businessCollector.handleExternalEvent(data.eventType, data.eventData);
        break;
      default:
        logger.warn(`Unknown business metric type: ${type}`);
    }
  }

  handleApplicationMetric(type, data) {
    switch (type) {
      case 'error':
        this.applicationCollector.recordApplicationError(
          data.errorType,
          data.service,
          data.error
        );
        break;
      case 'database_error':
        this.applicationCollector.recordDatabaseError(
          data.database,
          data.operation,
          data.errorType
        );
        break;
      case 'cache_operation':
        this.applicationCollector.recordCacheOperation(data.cacheType, data.hit);
        break;
      case 'connection_pool':
        this.applicationCollector.updateConnectionPool(
          data.database,
          data.active,
          data.idle,
          data.total
        );
        break;
      case 'queue_size':
        this.applicationCollector.updateQueueSize(
          data.queueName,
          data.size,
          data.priority
        );
        break;
      case 'database_connection':
        this.applicationCollector.recordDatabaseConnection(data.action);
        break;
      default:
        logger.warn(`Unknown application metric type: ${type}`);
    }
  }

  // === MÉTHODES POUR OBTENIR DES RÉSUMÉS ===

  async getSystemSummary() {
    try {
      return await this.systemCollector.getSystemSummary();
    } catch (error) {
      logger.error('Error getting system summary:', error);
      return null;
    }
  }

  getApplicationSummary() {
    try {
      return this.applicationCollector.getApplicationSummary();
    } catch (error) {
      logger.error('Error getting application summary:', error);
      return null;
    }
  }

  getBusinessSummary() {
    try {
      return this.businessCollector.getBusinessSummary();
    } catch (error) {
      logger.error('Error getting business summary:', error);
      return null;
    }
  }

  async getCompleteSummary() {
    try {
      const [system, application, business] = await Promise.all([
        this.getSystemSummary(),
        Promise.resolve(this.getApplicationSummary()),
        Promise.resolve(this.getBusinessSummary())
      ]);

      return {
        timestamp: new Date().toISOString(),
        system,
        application,
        business,
        status: this.isRunning ? 'running' : 'stopped'
      };
    } catch (error) {
      logger.error('Error getting complete summary:', error);
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        status: 'error'
      };
    }
  }

  // === MÉTHODES POUR LES WEBHOOKS ===

  async handleWebhook(webhookData) {
    const { source, eventType, data, timestamp } = webhookData;

    try {
      logger.info(`Processing webhook from ${source}: ${eventType}`);

      // Router vers le bon collecteur selon la source
      switch (source) {
        case 'reservation-service':
          this.handleReservationServiceWebhook(eventType, data);
          break;
        case 'payment-service':
          this.handlePaymentServiceWebhook(eventType, data);
          break;
        case 'user-service':
          this.handleUserServiceWebhook(eventType, data);
          break;
        case 'notification-service':
          this.handleNotificationServiceWebhook(eventType, data);
          break;
        default:
          logger.warn(`Unknown webhook source: ${source}`);
      }

    } catch (error) {
      logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  handleReservationServiceWebhook(eventType, data) {
    switch (eventType) {
      case 'reservation.created':
      case 'reservation.updated':
      case 'reservation.cancelled':
        this.businessCollector.recordReservation({
          ...data,
          status: data.status || eventType.split('.')[1]
        });
        break;
      default:
        logger.warn(`Unknown reservation service event: ${eventType}`);
    }
  }

  handlePaymentServiceWebhook(eventType, data) {
    switch (eventType) {
      case 'payment.completed':
        this.businessCollector.recordRevenue({
          amount: data.amount,
          currency: data.currency,
          paymentMethod: data.method,
          eventType: data.eventType
        });
        break;
      case 'payment.refunded':
        this.businessCollector.recordRevenue({
          amount: data.amount,
          currency: data.currency,
          paymentMethod: data.method,
          eventType: data.eventType,
          refund: true
        });
        break;
      default:
        logger.warn(`Unknown payment service event: ${eventType}`);
    }
  }

  handleUserServiceWebhook(eventType, data) {
    switch (eventType) {
      case 'user.activity':
        this.businessCollector.recordUserActivity(data.userId, data.activityType);
        break;
      case 'user.login':
      case 'user.register':
        this.businessCollector.recordUserActivity(data.userId, 'login');
        break;
      default:
        logger.warn(`Unknown user service event: ${eventType}`);
    }
  }

  handleNotificationServiceWebhook(eventType, data) {
    // Les notifications peuvent être utilisées pour des métriques de suivi
    switch (eventType) {
      case 'notification.sent':
        // Potentiellement compter les notifications envoyées
        logger.debug(`Notification sent: ${data.type}`);
        break;
      default:
        logger.warn(`Unknown notification service event: ${eventType}`);
    }
  }

  // === MÉTHODES UTILITAIRES ===

  getStatus() {
    return {
      isRunning: this.isRunning,
      collectors: {
        system: this.systemCollector.interval !== null,
        application: true, // Toujours actif
        business: true // Toujours actif
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  async restart() {
    logger.info('Restarting metrics collection service...');
    await this.stop();
    await this.start();
  }
}

// Singleton instance
const metricsCollectorService = new MetricsCollectorService();

module.exports = metricsCollectorService;
