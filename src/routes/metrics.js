const express = require('express');
const { createCustomMetric } = require('../config/metrics');
const metricsCollector = require('../services/metricsCollector');
const { asyncErrorHandler, ValidationError } = require('../middleware/errorHandler');
const Joi = require('joi');
const { loggers } = require('../utils/logger');
const logger = loggers.main;

const router = express.Router();

// Schémas de validation
const customMetricSchema = Joi.object({
  type: Joi.string().valid('counter', 'gauge', 'histogram', 'timer').required(),
  category: Joi.string().valid('business', 'application', 'system').required(),
  data: Joi.object().required()
});

const businessMetricSchema = Joi.object({
  eventType: Joi.string().required(),
  data: Joi.object().required()
});

// POST /api/metrics/custom - Enregistrer des métriques personnalisées
router.post('/custom', asyncErrorHandler(async (req, res) => {
  // Validation des données
  const { error, value } = customMetricSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid metric data', error.details);
  }

  const { type, category, data } = value;

  try {
    // Enregistrer la métrique via le collecteur
    await metricsCollector.recordCustomMetric({ type, category, data });

    logger.logMetric('custom_metric_recorded', 1, { type, category }, {
      source: 'api',
      endpoint: '/custom'
    });

    res.status(201).json({
      success: true,
      message: 'Custom metric recorded successfully',
      metric: {
        type,
        category,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.logError('Error recording custom metric', error, { type, category, data });
    throw error;
  }
}));

// POST /api/metrics/business - Enregistrer des métriques business
router.post('/business', asyncErrorHandler(async (req, res) => {
  const { error, value } = businessMetricSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid business metric data', error.details);
  }

  const { eventType, data } = value;

  try {
    // Traiter selon le type d'événement business
    switch (eventType) {
      case 'reservation':
        await metricsCollector.recordCustomMetric({
          type: 'business',
          category: 'business',
          data: { type: 'reservation', ...data }
        });
        break;

      case 'payment':
        await metricsCollector.recordCustomMetric({
          type: 'business',
          category: 'business',
          data: { type: 'revenue', ...data }
        });
        break;

      case 'user_activity':
        await metricsCollector.recordCustomMetric({
          type: 'business',
          category: 'business',
          data: { type: 'user_activity', ...data }
        });
        break;

      default:
        await metricsCollector.recordCustomMetric({
          type: 'business',
          category: 'business',
          data: { type: eventType, ...data }
        });
    }

    logger.logBusinessEvent(eventType, data, {
      source: 'api',
      endpoint: '/business'
    });

    res.status(201).json({
      success: true,
      message: 'Business metric recorded successfully',
      eventType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error recording business metric', error, { eventType, data });
    throw error;
  }
}));

// POST /api/metrics/batch - Enregistrer plusieurs métriques en lot
router.post('/batch', asyncErrorHandler(async (req, res) => {
  const batchSchema = Joi.object({
    metrics: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('counter', 'gauge', 'histogram', 'timer').required(),
        category: Joi.string().valid('business', 'application', 'system').required(),
        data: Joi.object().required()
      })
    ).min(1).max(100).required() // Maximum 100 métriques par batch
  });

  const { error, value } = batchSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid batch metrics data', error.details);
  }

  const { metrics } = value;
  const results = [];
  const errors = [];

  // Traiter chaque métrique
  for (let i = 0; i < metrics.length; i++) {
    try {
      await metricsCollector.recordCustomMetric(metrics[i]);
      results.push({
        index: i,
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (metricError) {
      errors.push({
        index: i,
        error: metricError.message,
        metric: metrics[i]
      });
    }
  }

  logger.info(`Batch metrics processed: ${results.length} successful, ${errors.length} errors`);

  res.status(200).json({
    success: errors.length === 0,
    processed: results.length,
    errors: errors.length,
    results,
    ...(errors.length > 0 && { errors })
  });
}));

// GET /api/metrics/summary - Obtenir un résumé des métriques
router.get('/summary', asyncErrorHandler(async (req, res) => {
  try {
    const summary = await metricsCollector.getCompleteSummary();

    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting metrics summary', error);
    throw error;
  }
}));

// GET /api/metrics/system - Obtenir les métriques système
router.get('/system', asyncErrorHandler(async (req, res) => {
  try {
    const systemSummary = await metricsCollector.getSystemSummary();

    res.json({
      success: true,
      system: systemSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting system metrics', error);
    throw error;
  }
}));

// GET /api/metrics/application - Obtenir les métriques d'application
router.get('/application', asyncErrorHandler(async (req, res) => {
  try {
    const applicationSummary = metricsCollector.getApplicationSummary();

    res.json({
      success: true,
      application: applicationSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting application metrics', error);
    throw error;
  }
}));

// GET /api/metrics/business - Obtenir les métriques business
router.get('/business', asyncErrorHandler(async (req, res) => {
  try {
    const businessSummary = metricsCollector.getBusinessSummary();

    res.json({
      success: true,
      business: businessSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting business metrics', error);
    throw error;
  }
}));

// POST /api/metrics/webhook - Recevoir des métriques via webhook
router.post('/webhook', asyncErrorHandler(async (req, res) => {
  const webhookSchema = Joi.object({
    source: Joi.string().required(),
    eventType: Joi.string().required(),
    data: Joi.object().required(),
    timestamp: Joi.string().isoDate().optional()
  });

  const { error, value } = webhookSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid webhook data', error.details);
  }

  try {
    await metricsCollector.handleWebhook(value);

    logger.info(`Webhook processed from ${value.source}: ${value.eventType}`);

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error processing webhook', error, value);
    throw error;
  }
}));

// GET /api/metrics/status - Obtenir le statut du service de métriques
router.get('/status', asyncErrorHandler(async (req, res) => {
  try {
    const status = metricsCollector.getStatus();

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting metrics status', error);
    throw error;
  }
}));

// POST /api/metrics/restart - Redémarrer le service de collecte
router.post('/restart', asyncErrorHandler(async (req, res) => {
  try {
    await metricsCollector.restart();

    logger.info('Metrics collection service restarted via API');

    res.json({
      success: true,
      message: 'Metrics collection service restarted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error restarting metrics service', error);
    throw error;
  }
}));

module.exports = router;
