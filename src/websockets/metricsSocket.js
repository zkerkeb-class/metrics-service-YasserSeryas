const { loggers } = require('../utils/logger');
const logger = loggers.main;
const metricsCollector = require('../services/metricsCollector');
const healthChecker = require('../services/healthChecker');
const AlertingService = require('../services/alertingService');

class MetricsWebSocketHandler {
  constructor(io) {
    this.io = io;
    this.alertingService = new AlertingService();
    this.clients = new Map();
    this.broadcastInterval = null;
    this.isRunning = false;
    
    this.setupEventHandlers();
    this.startBroadcasting();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    const clientInfo = {
      id: socket.id,
      connectedAt: new Date(),
      subscriptions: new Set(),
      lastActivity: new Date(),
      userAgent: socket.handshake.headers['user-agent'],
      ip: socket.handshake.address
    };

    this.clients.set(socket.id, clientInfo);
    
    logger.info(`WebSocket client connected: ${socket.id}`, {
      clientsCount: this.clients.size,
      userAgent: clientInfo.userAgent,
      ip: clientInfo.ip
    });

    // Envoyer les données initiales
    this.sendInitialData(socket);

    // Gestion des événements du client
    this.setupClientEventHandlers(socket, clientInfo);

    // Gestion de la déconnexion
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Incrémenter les métriques de connexion WebSocket
    metricsCollector.handleWebSocketConnection(socket);
  }

  setupClientEventHandlers(socket, clientInfo) {
    // Subscription aux différents types de métriques
    socket.on('subscribe', (data) => {
      this.handleSubscription(socket, clientInfo, data);
    });

    // Unsubscription
    socket.on('unsubscribe', (data) => {
      this.handleUnsubscription(socket, clientInfo, data);
    });

    // Demande de données spécifiques
    socket.on('request:metrics', (data) => {
      this.handleMetricsRequest(socket, data);
    });

    socket.on('request:health', (data) => {
      this.handleHealthRequest(socket, data);
    });

    socket.on('request:alerts', (data) => {
      this.handleAlertsRequest(socket, data);
    });

    // Ping/Pong pour maintenir la connexion
    socket.on('ping', () => {
      clientInfo.lastActivity = new Date();
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Demande de status
    socket.on('request:status', () => {
      this.sendStatus(socket);
    });
  }

  async sendInitialData(socket) {
    try {
      const [
        systemSummary,
        businessSummary,
        healthSummary,
        activeAlerts
      ] = await Promise.all([
        metricsCollector.getSystemSummary(),
        metricsCollector.getBusinessSummary(),
        healthChecker.getSystemHealth(),
        this.alertingService.getActiveAlerts()
      ]);

      const initialData = {
        type: 'initial_data',
        timestamp: new Date().toISOString(),
        data: {
          system: systemSummary,
          business: businessSummary,
          health: healthSummary,
          alerts: activeAlerts,
          status: 'connected'
        }
      };

      socket.emit('initial_data', initialData);
      
    } catch (error) {
      logger.error('Error sending initial data to WebSocket client:', error);
      socket.emit('error', {
        type: 'initial_data_error',
        message: 'Failed to load initial data',
        timestamp: new Date().toISOString()
      });
    }
  }

  handleSubscription(socket, clientInfo, data) {
    const { subscriptionType, filters = {} } = data;
    
    if (!subscriptionType) {
      socket.emit('error', {
        type: 'subscription_error',
        message: 'Subscription type is required'
      });
      return;
    }

    clientInfo.subscriptions.add(subscriptionType);
    clientInfo.lastActivity = new Date();

    logger.debug(`Client ${socket.id} subscribed to ${subscriptionType}`, filters);

    socket.emit('subscription_confirmed', {
      subscriptionType,
      filters,
      timestamp: new Date().toISOString()
    });
  }

  handleUnsubscription(socket, clientInfo, data) {
    const { subscriptionType } = data;
    
    if (subscriptionType) {
      clientInfo.subscriptions.delete(subscriptionType);
    } else {
      clientInfo.subscriptions.clear();
    }

    clientInfo.lastActivity = new Date();

    logger.debug(`Client ${socket.id} unsubscribed from ${subscriptionType || 'all'}`);

    socket.emit('unsubscription_confirmed', {
      subscriptionType,
      timestamp: new Date().toISOString()
    });
  }

  async handleMetricsRequest(socket, data) {
    const { metricType = 'all', period = '5m' } = data;

    try {
      let metricsData;

      switch (metricType) {
        case 'system':
          metricsData = await metricsCollector.getSystemSummary();
          break;
        case 'business':
          metricsData = metricsCollector.getBusinessSummary();
          break;
        case 'application':
          metricsData = metricsCollector.getApplicationSummary();
          break;
        case 'all':
        default:
          metricsData = await metricsCollector.getCompleteSummary();
          break;
      }

      socket.emit('metrics_response', {
        type: 'metrics_data',
        metricType,
        data: metricsData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling metrics request:', error);
      socket.emit('error', {
        type: 'metrics_request_error',
        message: 'Failed to retrieve metrics data'
      });
    }
  }

  async handleHealthRequest(socket, data) {
    const { serviceName } = data;

    try {
      let healthData;

      if (serviceName) {
        healthData = await healthChecker.checkSpecificService(serviceName);
      } else {
        healthData = healthChecker.getSystemHealth();
      }

      socket.emit('health_response', {
        type: 'health_data',
        serviceName,
        data: healthData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling health request:', error);
      socket.emit('error', {
        type: 'health_request_error',
        message: 'Failed to retrieve health data'
      });
    }
  }

  async handleAlertsRequest(socket, data) {
    const { filters = {} } = data;

    try {
      const alerts = await this.alertingService.getAlerts(filters);

      socket.emit('alerts_response', {
        type: 'alerts_data',
        data: alerts,
        filters,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling alerts request:', error);
      socket.emit('error', {
        type: 'alerts_request_error',
        message: 'Failed to retrieve alerts data'
      });
    }
  }

  sendStatus(socket) {
    const clientInfo = this.clients.get(socket.id);
    
    const status = {
      type: 'status',
      clientId: socket.id,
      connectedAt: clientInfo?.connectedAt,
      subscriptions: Array.from(clientInfo?.subscriptions || []),
      connectedClients: this.clients.size,
      serverUptime: process.uptime(),
      isStreaming: this.isRunning,
      timestamp: new Date().toISOString()
    };

    socket.emit('status', status);
  }

  handleDisconnection(socket, reason) {
    const clientInfo = this.clients.get(socket.id);
    
    if (clientInfo) {
      const connectionDuration = new Date() - clientInfo.connectedAt;
      
      logger.info(`WebSocket client disconnected: ${socket.id}`, {
        reason,
        connectionDuration,
        subscriptions: Array.from(clientInfo.subscriptions),
        remainingClients: this.clients.size - 1
      });
    }

    this.clients.delete(socket.id);
  }

  // === BROADCASTING ===

  startBroadcasting() {
    if (this.isRunning) {
      logger.warn('WebSocket broadcasting is already running');
      return;
    }

    this.isRunning = true;
    
    // Broadcast toutes les 5 secondes
    this.broadcastInterval = setInterval(async () => {
      try {
        await this.broadcastMetricsUpdate();
      } catch (error) {
        logger.error('Error broadcasting metrics update:', error);
      }
    }, 5000);

    // Broadcast des alertes toutes les 10 secondes
    setInterval(async () => {
      try {
        await this.broadcastAlertsUpdate();
      } catch (error) {
        logger.error('Error broadcasting alerts update:', error);
      }
    }, 10000);

    // Broadcast de santé toutes les 30 secondes
    setInterval(async () => {
      try {
        await this.broadcastHealthUpdate();
      } catch (error) {
        logger.error('Error broadcasting health update:', error);
      }
    }, 30000);

    logger.info('WebSocket broadcasting started');
  }

  stopBroadcasting() {
    if (!this.isRunning) {
      return;
    }

    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.isRunning = false;
    logger.info('WebSocket broadcasting stopped');
  }

  async broadcastMetricsUpdate() {
    if (this.clients.size === 0) return;

    try {
      const subscribedClients = this.getClientsSubscribedTo('metrics');
      if (subscribedClients.length === 0) return;

      const [systemSummary, businessSummary] = await Promise.all([
        metricsCollector.getSystemSummary(),
        metricsCollector.getBusinessSummary()
      ]);

      const metricsUpdate = {
        type: 'metrics_update',
        data: {
          system: systemSummary,
          business: businessSummary
        },
        timestamp: new Date().toISOString()
      };

      subscribedClients.forEach(clientId => {
        const socket = this.io.sockets.sockets.get(clientId);
        if (socket) {
          socket.emit('metrics_update', metricsUpdate);
        }
      });

    } catch (error) {
      logger.error('Error in broadcastMetricsUpdate:', error);
    }
  }

  async broadcastHealthUpdate() {
    if (this.clients.size === 0) return;

    try {
      const subscribedClients = this.getClientsSubscribedTo('health');
      if (subscribedClients.length === 0) return;

      const healthSummary = healthChecker.getSystemHealth();

      const healthUpdate = {
        type: 'health_update',
        data: healthSummary,
        timestamp: new Date().toISOString()
      };

      subscribedClients.forEach(clientId => {
        const socket = this.io.sockets.sockets.get(clientId);
        if (socket) {
          socket.emit('health_update', healthUpdate);
        }
      });

    } catch (error) {
      logger.error('Error in broadcastHealthUpdate:', error);
    }
  }

  async broadcastAlertsUpdate() {
    if (this.clients.size === 0) return;

    try {
      const subscribedClients = this.getClientsSubscribedTo('alerts');
      if (subscribedClients.length === 0) return;

      const activeAlerts = await this.alertingService.getActiveAlerts();

      const alertsUpdate = {
        type: 'alerts_update',
        data: {
          active: activeAlerts,
          count: activeAlerts.length,
          critical: activeAlerts.filter(a => a.severity === 'critical').length
        },
        timestamp: new Date().toISOString()
      };

      subscribedClients.forEach(clientId => {
        const socket = this.io.sockets.sockets.get(clientId);
        if (socket) {
          socket.emit('alerts_update', alertsUpdate);
        }
      });

    } catch (error) {
      logger.error('Error in broadcastAlertsUpdate:', error);
    }
  }

  // === MÉTHODES PUBLIQUES POUR TRIGGERS EXTERNES ===

  broadcastAlert(alert) {
    const subscribedClients = this.getClientsSubscribedTo('alerts');
    
    const alertNotification = {
      type: 'new_alert',
      data: alert,
      timestamp: new Date().toISOString()
    };

    subscribedClients.forEach(clientId => {
      const socket = this.io.sockets.sockets.get(clientId);
      if (socket) {
        socket.emit('new_alert', alertNotification);
      }
    });

    logger.info(`Alert broadcasted to ${subscribedClients.length} clients`, {
      alertId: alert.id,
      severity: alert.severity
    });
  }

  broadcastServiceHealthChange(serviceName, isHealthy) {
    const subscribedClients = this.getClientsSubscribedTo('health');
    
    const healthChange = {
      type: 'service_health_change',
      data: {
        serviceName,
        isHealthy,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    subscribedClients.forEach(clientId => {
      const socket = this.io.sockets.sockets.get(clientId);
      if (socket) {
        socket.emit('service_health_change', healthChange);
      }
    });
  }

  // === UTILITAIRES ===

  getClientsSubscribedTo(subscriptionType) {
    const subscribedClients = [];
    
    for (const [clientId, clientInfo] of this.clients.entries()) {
      if (clientInfo.subscriptions.has(subscriptionType) || clientInfo.subscriptions.has('all')) {
        subscribedClients.push(clientId);
      }
    }
    
    return subscribedClients;
  }

  getConnectedClientsStats() {
    const stats = {
      totalClients: this.clients.size,
      subscriptions: {},
      oldestConnection: null,
      newestConnection: null
    };

    if (this.clients.size > 0) {
      const connections = Array.from(this.clients.values());
      
      // Calculer les stats de connexion
      const connectedTimes = connections.map(c => c.connectedAt);
      stats.oldestConnection = new Date(Math.min(...connectedTimes));
      stats.newestConnection = new Date(Math.max(...connectedTimes));

      // Compter les subscriptions
      connections.forEach(client => {
        client.subscriptions.forEach(sub => {
          stats.subscriptions[sub] = (stats.subscriptions[sub] || 0) + 1;
        });
      });
    }

    return stats;
  }

  // Nettoyage des connexions inactives
  cleanupInactiveConnections() {
    const now = new Date();
    const inactivityThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [clientId, clientInfo] of this.clients.entries()) {
      if (now - clientInfo.lastActivity > inactivityThreshold) {
        const socket = this.io.sockets.sockets.get(clientId);
        if (socket) {
          socket.disconnect(true);
          logger.info(`Disconnected inactive client: ${clientId}`);
        }
      }
    }
  }
}

// Factory function pour initialiser le WebSocket handler
function initializeMetricsWebSocket(io) {
  const handler = new MetricsWebSocketHandler(io);
  
  // Nettoyage périodique des connexions inactives
  setInterval(() => {
    handler.cleanupInactiveConnections();
  }, 2 * 60 * 1000); // Toutes les 2 minutes

  return handler;
}

module.exports = initializeMetricsWebSocket;
