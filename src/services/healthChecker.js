const axios = require('axios');
const { metrics } = require('../config/metrics');
const { loggers } = require('../utils/logger');
const logger = loggers.main;

class HealthCheckerService {
  constructor() {
    this.services = [
      {
        name: 'reservation-service',
        url: process.env.RESERVATION_SERVICE_URL|| 'http://localhost:3000',
        healthEndpoint: '/health',
        timeout: parseInt(process.env.SERVICE_TIMEOUT) || 5000
      },
      {
        name: 'user-service',
        url: process.env.USER_SERVICE_URL|| 'http://localhost:3002',
        healthEndpoint: '/health',
        timeout: parseInt(process.env.SERVICE_TIMEOUT) || 5000
      },
      {
        name: 'payment-service',
        url: process.env.PAYMENT_SERVICE_URL|| 'http://localhost:3003',
        healthEndpoint: '/health',
        timeout: parseInt(process.env.SERVICE_TIMEOUT) || 5000
      },
      {
        name: 'notification-service',
        url: process.env.NOTIFICATION_SERVICE_URL|| 'http://localhost:3004',
        healthEndpoint: '/health',
        timeout: parseInt(process.env.SERVICE_TIMEOUT) || 5000
      },
            {
        name: 'ia-service',
        url: process.env.IA_SERVICE_URL|| 'http://localhost:5003',
        healthEndpoint: '/health',
        timeout: parseInt(process.env.SERVICE_TIMEOUT) || 5000
      }
    ];

    this.checkInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000;
    this.intervalId = null;
    this.isRunning = false;
    this.lastCheckResults = new Map();
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Health checker is already running');
      return;
    }

    try {
      logger.info('Starting health checker service...');

      // Vérification immédiate
      await this.checkAllServices();

      // Vérification périodique
      this.intervalId = setInterval(async () => {
        try {
          await this.checkAllServices();
        } catch (error) {
          logger.error('Error during periodic health check:', error);
        }
      }, this.checkInterval);

      this.isRunning = true;
      logger.info(`Health checker started with ${this.checkInterval}ms interval`);

    } catch (error) {
      logger.error('Failed to start health checker:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn('Health checker is not running');
      return;
    }

    try {
      logger.info('Stopping health checker service...');

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      this.isRunning = false;
      logger.info('Health checker stopped successfully');

    } catch (error) {
      logger.error('Error stopping health checker:', error);
      throw error;
    }
  }

  async checkAllServices() {
    const checkPromises = this.services.map(service => this.checkService(service));
    const results = await Promise.allSettled(checkPromises);

    const summary = {
      timestamp: new Date().toISOString(),
      totalServices: this.services.length,
      healthyServices: 0,
      unhealthyServices: 0,
      services: {}
    };

    results.forEach((result, index) => {
      const service = this.services[index];
      let serviceStatus;

      if (result.status === 'fulfilled') {
        serviceStatus = result.value;
        if (serviceStatus.healthy) {
          summary.healthyServices++;
        } else {
          summary.unhealthyServices++;
        }
      } else {
        serviceStatus = {
          name: service.name,
          healthy: false,
          error: result.reason.message,
          responseTime: null,
          timestamp: new Date().toISOString()
        };
        summary.unhealthyServices++;
      }

      summary.services[service.name] = serviceStatus;
      this.lastCheckResults.set(service.name, serviceStatus);
    });

    logger.info(`Health check completed: ${summary.healthyServices}/${summary.totalServices} services healthy`);
    
    return summary;
  }

  async checkService(service) {
    logger.error(`Checking health of service: ${service.url}`);
    const startTime = Date.now();
    
    try {
      if (!service.url) {
        throw new Error(`No URL configured for service: ${service.name}`);
      }

      const response = await axios.get(
        `${service.url}${service.healthEndpoint}`,
        {
          timeout: service.timeout,
          headers: {
            'User-Agent': 'metrics-service-health-checker',
            'X-Service-Name': 'metrics-service'
          },
          validateStatus: (status) => status < 500 // Accepter les codes < 500
        }
      );

      const responseTime = Date.now() - startTime;
      const isHealthy = response.status >= 200 && response.status < 400;

      // Mettre à jour les métriques Prometheus
      metrics.serviceHealth
        .labels(service.name, service.url)
        .set(isHealthy ? 1 : 0);

      metrics.serviceResponseTime
        .labels(service.name, service.healthEndpoint)
        .observe(responseTime / 1000);

      const result = {
        name: service.name,
        healthy: isHealthy,
        responseTime,
        statusCode: response.status,
        timestamp: new Date().toISOString(),
        url: service.url,
        details: response.data || null
      };

      if (isHealthy) {
        logger.debug(`Service ${service.name} is healthy (${responseTime}ms)`);
      } else {
        logger.warn(`Service ${service.name} returned status ${response.status}`);
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Mettre à jour les métriques Prometheus
      metrics.serviceHealth
        .labels(service.name, service.url || 'unknown')
        .set(0);

      // Enregistrer l'erreur selon le type
      let errorType = 'unknown';
      if (error.code === 'ECONNREFUSED') {
        errorType = 'connection_refused';
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        errorType = 'timeout';
      } else if (error.response) {
        errorType = 'http_error';
      }

      logger.error(`Service ${service.name} health check failed:`, {
        error: error.message,
        code: error.code,
        responseTime,
        url: service.url
      });

      const result = {
        name: service.name,
        healthy: false,
        responseTime,
        error: error.message,
        errorType,
        statusCode: error.response?.status || null,
        timestamp: new Date().toISOString(),
        url: service.url
      };

      return result;
    }
  }

  // Vérifier un service spécifique
  async checkSpecificService(serviceName) {
    const service = this.services.find(s => s.name === serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    return await this.checkService(service);
  }

  // Obtenir le dernier résultat de health check
  getLastCheckResult(serviceName) {
    if (serviceName) {
      return this.lastCheckResults.get(serviceName) || null;
    }
    
    // Retourner tous les résultats
    const results = {};
    for (const [name, result] of this.lastCheckResults.entries()) {
      results[name] = result;
    }
    return results;
  }

  // Obtenir le statut global du système
  getSystemHealth() {
    const allResults = this.getLastCheckResult();
    const services = Object.values(allResults);
    
    const totalServices = services.length;
    const healthyServices = services.filter(s => s.healthy).length;
    const unhealthyServices = totalServices - healthyServices;

    let overallStatus = 'healthy';
    if (unhealthyServices === totalServices) {
      overallStatus = 'critical';
    } else if (unhealthyServices > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      totalServices,
      healthyServices,
      unhealthyServices,
      healthPercentage: totalServices > 0 ? (healthyServices / totalServices) * 100 : 0,
      timestamp: new Date().toISOString(),
      services: allResults
    };
  }

  // Ajouter un nouveau service à surveiller
  addService(serviceConfig) {
    const { name, url, healthEndpoint = '/health', timeout = 5000 } = serviceConfig;
    
    if (!name || !url) {
      throw new Error('Service name and URL are required');
    }

    const existingIndex = this.services.findIndex(s => s.name === name);
    if (existingIndex >= 0) {
      // Mettre à jour le service existant
      this.services[existingIndex] = { name, url, healthEndpoint, timeout };
      logger.info(`Updated service configuration: ${name}`);
    } else {
      // Ajouter un nouveau service
      this.services.push({ name, url, healthEndpoint, timeout });
      logger.info(`Added new service to health checks: ${name}`);
    }
  }

  // Supprimer un service de la surveillance
  removeService(serviceName) {
    const index = this.services.findIndex(s => s.name === serviceName);
    if (index >= 0) {
      this.services.splice(index, 1);
      this.lastCheckResults.delete(serviceName);
      
      // Remettre la métrique à 0
      metrics.serviceHealth.labels(serviceName, 'removed').set(0);
      
      logger.info(`Removed service from health checks: ${serviceName}`);
      return true;
    }
    return false;
  }

  // Obtenir la configuration des services
  getServicesConfiguration() {
    return {
      services: this.services,
      checkInterval: this.checkInterval,
      isRunning: this.isRunning,
      totalServices: this.services.length
    };
  }

  // Obtenir des statistiques de santé
  getHealthStatistics() {
    const results = Array.from(this.lastCheckResults.values());
    
    if (results.length === 0) {
      return {
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        successRate: 0,
        totalChecks: 0
      };
    }

    const healthyResults = results.filter(r => r.healthy && r.responseTime);
    const responseTimes = healthyResults.map(r => r.responseTime).filter(rt => rt !== null);

    return {
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      successRate: (healthyResults.length / results.length) * 100,
      totalChecks: results.length,
      lastCheckTime: results.length > 0 ? results[0].timestamp : null
    };
  }
}

// Singleton instance
const healthCheckerService = new HealthCheckerService();

module.exports = healthCheckerService;
