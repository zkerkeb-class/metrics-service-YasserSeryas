const { metrics } = require('../config/metrics');
const { loggers } = require('../utils/logger');
const logger = loggers.main;

class ApplicationMetricsCollector {
  constructor() {
    this.requestStartTimes = new Map();
    this.activeConnections = {
      http: 0,
      websocket: 0,
      database: 0
    };
  }

  // Middleware pour collecter les métriques HTTP
  createHttpMetricsMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      const requestId = `${req.method}-${req.url}-${start}`;
      
      // Stocker le temps de début
      this.requestStartTimes.set(requestId, start);
      
      // Incrémenter les connexions actives
      this.activeConnections.http++;
      metrics.activeConnections.labels('metrics-service', 'http').set(this.activeConnections.http);
      
      // Métriques de taille de requête
      const requestSize = parseInt(req.get('content-length') || '0');
      if (requestSize > 0) {
        metrics.httpRequestSize
          .labels(req.method, req.route?.path || req.path, 'metrics-service')
          .observe(requestSize);
      }

      // Handler pour la fin de la réponse
      res.on('finish', () => {
        try {
          const duration = (Date.now() - start) / 1000;
          const route = req.route?.path || req.path;
          const statusCode = res.statusCode.toString();
          
          // Métriques de base
          metrics.httpRequests
            .labels(req.method, route, statusCode, 'metrics-service')
            .inc();
          
          metrics.httpRequestDuration
            .labels(req.method, route, statusCode, 'metrics-service')
            .observe(duration);
          
          // Métriques de taille de réponse
          const responseSize = parseInt(res.get('content-length') || '0');
          if (responseSize > 0) {
            metrics.httpResponseSize
              .labels(req.method, route, statusCode, 'metrics-service')
              .observe(responseSize);
          }
          
          // Métriques d'erreur si statut >= 400
          if (res.statusCode >= 400) {
            metrics.httpErrors
              .labels(statusCode, req.method, route, 'metrics-service')
              .inc();
              
            metrics.applicationErrors
              .labels('http_error', 'metrics-service', this.getErrorSeverity(res.statusCode))
              .inc();
          }
          
          // Nettoyer et décrémenter les connexions actives
          this.requestStartTimes.delete(requestId);
          this.activeConnections.http--;
          metrics.activeConnections.labels('metrics-service', 'http').set(this.activeConnections.http);
          
        } catch (error) {
          logger.error('Error recording HTTP metrics:', error);
        }
      });

      next();
    };
  }

  // Métriques pour les connexions WebSocket
  handleWebSocketConnection(socket) {
    this.activeConnections.websocket++;
    metrics.activeConnections.labels('metrics-service', 'websocket').set(this.activeConnections.websocket);
    
    socket.on('disconnect', () => {
      this.activeConnections.websocket--;
      metrics.activeConnections.labels('metrics-service', 'websocket').set(this.activeConnections.websocket);
    });
  }

  // Métriques pour les connexions base de données
  recordDatabaseConnection(action) {
    if (action === 'connect') {
      this.activeConnections.database++;
    } else if (action === 'disconnect') {
      this.activeConnections.database--;
    }
    metrics.activeConnections.labels('metrics-service', 'database').set(this.activeConnections.database);
  }

  // Enregistrer une erreur d'application
  recordApplicationError(errorType, service = 'metrics-service', error = null) {
    const severity = this.getErrorSeverityFromError(error);
    metrics.applicationErrors.labels(errorType, service, severity).inc();
    
    if (error) {
      logger.error(`Application error recorded: ${errorType}`, error);
    }
  }

  // Enregistrer une erreur de base de données
  recordDatabaseError(database, operation, errorType) {
    metrics.databaseErrors.labels(database, operation, errorType).inc();
    logger.error(`Database error recorded: ${database}.${operation} - ${errorType}`);
  }

  // Métriques de cache
  recordCacheOperation(cacheType, hit = true) {
    const currentHitRate = metrics.cacheHitRate.labels(cacheType, 'metrics-service');
    // Ici vous pourriez implémenter une logique plus sophistiquée pour calculer le hit rate
    // Pour l'exemple, on suppose un calcul simple
    if (hit) {
      logger.debug(`Cache hit for ${cacheType}`);
    } else {
      logger.debug(`Cache miss for ${cacheType}`);
    }
  }

  // Métriques de pool de connexions
  updateConnectionPool(database, active, idle, total) {
    metrics.dbConnectionPool.labels(database, 'active').set(active);
    metrics.dbConnectionPool.labels(database, 'idle').set(idle);
    metrics.dbConnectionPool.labels(database, 'total').set(total);
  }

  // Métriques de file d'attente
  updateQueueSize(queueName, size, priority = 'normal') {
    metrics.queueSize.labels(queueName, priority).set(size);
  }

  // Métriques business personnalisées
  recordReservation(status, eventType, paymentMethod) {
    metrics.reservations.labels(status, eventType, paymentMethod).inc();
  }

  recordRevenue(amount, currency, eventType, paymentMethod) {
    metrics.revenue.labels(currency, eventType, paymentMethod).inc(amount);
  }

  updateActiveUsers(count, timeframe) {
    metrics.activeUsers.labels(timeframe).set(count);
  }

  recordTicketSale(eventId, ticketType, venue) {
    metrics.ticketsSold.labels(eventId, ticketType, venue).inc();
  }

  updateConversionRate(funnelStep, eventType, rate) {
    metrics.conversionRate.labels(funnelStep, eventType).set(rate);
  }

  // Méthodes utilitaires
  getErrorSeverity(statusCode) {
    if (statusCode >= 500) return 'critical';
    if (statusCode >= 400) return 'warning';
    return 'info';
  }

  getErrorSeverityFromError(error) {
    if (!error) return 'info';
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return 'critical';
    }
    
    if (error.statusCode >= 500 || error.status >= 500) {
      return 'critical';
    }
    
    if (error.statusCode >= 400 || error.status >= 400) {
      return 'warning';
    }
    
    return 'info';
  }

  // Obtenir un résumé des métriques d'application
  getApplicationSummary() {
    return {
      activeConnections: { ...this.activeConnections },
      pendingRequests: this.requestStartTimes.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }

  // Nettoyer les métriques anciennes (à appeler périodiquement)
  cleanup() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    for (const [requestId, startTime] of this.requestStartTimes.entries()) {
      if (now - startTime > maxAge) {
        this.requestStartTimes.delete(requestId);
        logger.warn(`Cleaned up stale request metric: ${requestId}`);
      }
    }
  }
}

module.exports = ApplicationMetricsCollector;
