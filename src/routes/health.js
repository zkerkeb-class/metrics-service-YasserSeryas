const express = require('express');
const healthChecker = require('../services/healthChecker');
const { asyncErrorHandler, NotFoundError } = require('../middleware/errorHandler');
const { loggers } = require('../utils/logger');
const logger = loggers.main;

const router = express.Router();

// GET /api/health - Health check de tous les services
router.get('/', asyncErrorHandler(async (req, res) => {
  try {
    const healthSummary = await healthChecker.checkAllServices();
    const systemHealth = healthChecker.getSystemHealth();
    const statistics = healthChecker.getHealthStatistics();

    const response = {
      success: true,
      overall: systemHealth,
      summary: healthSummary,
      statistics,
      timestamp: new Date().toISOString()
    };

    // Retourner un statut HTTP basé sur la santé globale
    const statusCode = systemHealth.status === 'healthy' ? 200 : 
                      systemHealth.status === 'degraded' ? 207 : 503;

    res.status(statusCode).json(response);

  } catch (error) {
    logger.logError('Error performing health checks', error);
    throw error;
  }
}));

// GET /api/health/services - Liste des services surveillés
router.get('/services', asyncErrorHandler(async (req, res) => {
  try {
    const configuration = healthChecker.getServicesConfiguration();
    const lastResults = healthChecker.getLastCheckResult();

    res.json({
      success: true,
      configuration,
      lastResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting services configuration', error);
    throw error;
  }
}));

// GET /api/health/:serviceName - Health check d'un service spécifique
router.get('/:serviceName', asyncErrorHandler(async (req, res) => {
  const { serviceName } = req.params;

  try {
    // Vérifier si le service existe
    const configuration = healthChecker.getServicesConfiguration();
    const serviceExists = configuration.services.some(s => s.name === serviceName);

    if (!serviceExists) {
      throw new NotFoundError(`Service '${serviceName}' not found`);
    }

    // Effectuer le health check
    const result = await healthChecker.checkSpecificService(serviceName);
    const lastResult = healthChecker.getLastCheckResult(serviceName);

    const response = {
      success: true,
      service: serviceName,
      currentCheck: result,
      lastCheck: lastResult,
      timestamp: new Date().toISOString()
    };

    // Statut HTTP basé sur la santé du service
    const statusCode = result.healthy ? 200 : 503;

    res.status(statusCode).json(response);

  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.logError(`Error checking health of service ${serviceName}`, error);
    throw error;
  }
}));

// POST /api/health/check - Forcer un health check immédiat
router.post('/check', asyncErrorHandler(async (req, res) => {
  try {
    logger.info('Manual health check triggered via API');
    const healthSummary = await healthChecker.checkAllServices();

    res.json({
      success: true,
      message: 'Health check completed',
      summary: healthSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error during manual health check', error);
    throw error;
  }
}));

// POST /api/health/check/:serviceName - Forcer le health check d'un service
router.post('/check/:serviceName', asyncErrorHandler(async (req, res) => {
  const { serviceName } = req.params;

  try {
    const configuration = healthChecker.getServicesConfiguration();
    const serviceExists = configuration.services.some(s => s.name === serviceName);

    if (!serviceExists) {
      throw new NotFoundError(`Service '${serviceName}' not found`);
    }

    logger.info(`Manual health check triggered for service: ${serviceName}`);
    const result = await healthChecker.checkSpecificService(serviceName);

    const statusCode = result.healthy ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      message: `Health check completed for ${serviceName}`,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.logError(`Error during manual health check for ${serviceName}`, error);
    throw error;
  }
}));

// GET /api/health/statistics - Statistiques de santé
router.get('/stats/summary', asyncErrorHandler(async (req, res) => {
  try {
    const statistics = healthChecker.getHealthStatistics();
    const systemHealth = healthChecker.getSystemHealth();

    res.json({
      success: true,
      statistics,
      overall: {
        status: systemHealth.status,
        healthPercentage: systemHealth.healthPercentage
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting health statistics', error);
    throw error;
  }
}));

// POST /api/health/services - Ajouter un nouveau service à surveiller
router.post('/services', asyncErrorHandler(async (req, res) => {
  const { name, url, healthEndpoint, timeout } = req.body;

  if (!name || !url) {
    throw new ValidationError('Service name and URL are required');
  }

  try {
    healthChecker.addService({ name, url, healthEndpoint, timeout });

    logger.info(`Service added to health monitoring: ${name} (${url})`);

    res.status(201).json({
      success: true,
      message: `Service '${name}' added to health monitoring`,
      service: { name, url, healthEndpoint, timeout },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(`Error adding service ${name} to health monitoring`, error);
    throw error;
  }
}));

// DELETE /api/health/services/:serviceName - Supprimer un service de la surveillance
router.delete('/services/:serviceName', asyncErrorHandler(async (req, res) => {
  const { serviceName } = req.params;

  try {
    const removed = healthChecker.removeService(serviceName);

    if (!removed) {
      throw new NotFoundError(`Service '${serviceName}' not found`);
    }

    logger.info(`Service removed from health monitoring: ${serviceName}`);

    res.json({
      success: true,
      message: `Service '${serviceName}' removed from health monitoring`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.logError(`Error removing service ${serviceName} from health monitoring`, error);
    throw error;
  }
}));

// GET /api/health/history/:serviceName - Historique de santé d'un service
router.get('/history/:serviceName', asyncErrorHandler(async (req, res) => {
  const { serviceName } = req.params;
  const { hours = 24 } = req.query;

  try {
    // Pour l'instant, retourner le dernier résultat
    // En production, vous pourriez stocker l'historique en base de données
    const lastResult = healthChecker.getLastCheckResult(serviceName);

    if (!lastResult) {
      throw new NotFoundError(`No health data found for service '${serviceName}'`);
    }

    res.json({
      success: true,
      service: serviceName,
      period: `${hours} hours`,
      // En production, vous retourneriez un array d'historique
      history: [lastResult],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.logError(`Error getting health history for ${serviceName}`, error);
    throw error;
  }
}));

// GET /api/health/metrics - Métriques de santé au format simple
router.get('/metrics/simple', asyncErrorHandler(async (req, res) => {
  try {
    const systemHealth = healthChecker.getSystemHealth();
    const statistics = healthChecker.getHealthStatistics();

    // Format simple pour les dashboards externes
    const simpleMetrics = {
      health_status: systemHealth.status === 'healthy' ? 1 : 0,
      services_total: systemHealth.totalServices,
      services_healthy: systemHealth.healthyServices,
      services_unhealthy: systemHealth.unhealthyServices,
      health_percentage: systemHealth.healthPercentage,
      average_response_time: statistics.averageResponseTime,
      success_rate: statistics.successRate
    };

    res.json({
      success: true,
      metrics: simpleMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting simple health metrics', error);
    throw error;
  }
}));

module.exports = router;
