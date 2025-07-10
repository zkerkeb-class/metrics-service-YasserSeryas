const express = require('express');
const AlertingService = require('../services/alertingService');
const { asyncErrorHandler, ValidationError } = require('../middleware/errorHandler');
const Joi = require('joi');
const { loggers } = require('../utils/logger');
const logger = loggers.main;

const router = express.Router();
const alertingService = new AlertingService();

// Schémas de validation
const alertRuleSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  metric: Joi.string().required(),
  condition: Joi.object({
    operator: Joi.string().valid('>', '<', '>=', '<=', '==', '!=').required(),
    threshold: Joi.number().required(),
    duration: Joi.number().min(1).default(60) // en secondes
  }).required(),
  severity: Joi.string().valid('info', 'warning', 'critical').default('warning'),
  enabled: Joi.boolean().default(true),
  notifications: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('webhook', 'email', 'slack').required(),
      config: Joi.object().required()
    })
  ).default([])
});

const manualAlertSchema = Joi.object({
  title: Joi.string().required(),
  message: Joi.string().required(),
  severity: Joi.string().valid('info', 'warning', 'critical').required(),
  source: Joi.string().default('manual'),
  data: Joi.object().optional()
});

// GET /api/alerts - Obtenir toutes les alertes
router.get('/', asyncErrorHandler(async (req, res) => {
  const { status, severity, limit = 50, offset = 0 } = req.query;

  try {
    const filters = {};
    if (status) filters.status = status;
    if (severity) filters.severity = severity;

    const alerts = await alertingService.getAlerts(filters, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      alerts,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: alerts.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting alerts', error);
    throw error;
  }
}));

// GET /api/alerts/active - Obtenir les alertes actives
router.get('/active', asyncErrorHandler(async (req, res) => {
  try {
    const activeAlerts = await alertingService.getActiveAlerts();

    res.json({
      success: true,
      alerts: activeAlerts,
      count: activeAlerts.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting active alerts', error);
    throw error;
  }
}));

// GET /api/alerts/rules - Obtenir toutes les règles d'alerte
router.get('/rules', asyncErrorHandler(async (req, res) => {
  try {
    const rules = await alertingService.getAlertRules();

    res.json({
      success: true,
      rules,
      count: rules.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting alert rules', error);
    throw error;
  }
}));

// POST /api/alerts/rules - Créer une nouvelle règle d'alerte
router.post('/rules', asyncErrorHandler(async (req, res) => {
  const { error, value } = alertRuleSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid alert rule data', error.details);
  }

  try {
    const rule = await alertingService.createAlertRule(value);

    logger.info(`Alert rule created: ${rule.name}`, {
      ruleId: rule.id,
      metric: rule.metric,
      severity: rule.severity
    });

    res.status(201).json({
      success: true,
      message: 'Alert rule created successfully',
      rule,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error creating alert rule', error, value);
    throw error;
  }
}));

// PUT /api/alerts/rules/:ruleId - Mettre à jour une règle d'alerte
router.put('/rules/:ruleId', asyncErrorHandler(async (req, res) => {
  const { ruleId } = req.params;
  const { error, value } = alertRuleSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid alert rule data', error.details);
  }

  try {
    const rule = await alertingService.updateAlertRule(ruleId, value);

    logger.info(`Alert rule updated: ${rule.name}`, {
      ruleId: rule.id,
      metric: rule.metric
    });

    res.json({
      success: true,
      message: 'Alert rule updated successfully',
      rule,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error updating alert rule', error, { ruleId, data: value });
    throw error;
  }
}));

// DELETE /api/alerts/rules/:ruleId - Supprimer une règle d'alerte
router.delete('/rules/:ruleId', asyncErrorHandler(async (req, res) => {
  const { ruleId } = req.params;

  try {
    await alertingService.deleteAlertRule(ruleId);

    logger.info(`Alert rule deleted: ${ruleId}`);

    res.json({
      success: true,
      message: 'Alert rule deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error deleting alert rule', error, { ruleId });
    throw error;
  }
}));

// POST /api/alerts/rules/:ruleId/toggle - Activer/désactiver une règle
router.post('/rules/:ruleId/toggle', asyncErrorHandler(async (req, res) => {
  const { ruleId } = req.params;

  try {
    const rule = await alertingService.toggleAlertRule(ruleId);

    logger.info(`Alert rule toggled: ${rule.name} - ${rule.enabled ? 'enabled' : 'disabled'}`);

    res.json({
      success: true,
      message: `Alert rule ${rule.enabled ? 'enabled' : 'disabled'}`,
      rule,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error toggling alert rule', error, { ruleId });
    throw error;
  }
}));

// POST /api/alerts/manual - Créer une alerte manuelle
router.post('/manual', asyncErrorHandler(async (req, res) => {
  const { error, value } = manualAlertSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid manual alert data', error.details);
  }

  try {
    const alert = await alertingService.createManualAlert(value);

    logger.logAlert(alert.title, alert.severity, alert.data, {
      type: 'manual',
      alertId: alert.id
    });

    res.status(201).json({
      success: true,
      message: 'Manual alert created successfully',
      alert,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error creating manual alert', error, value);
    throw error;
  }
}));

// POST /api/alerts/:alertId/acknowledge - Acquitter une alerte
router.post('/:alertId/acknowledge', asyncErrorHandler(async (req, res) => {
  const { alertId } = req.params;
  const { acknowledgedBy, comment } = req.body;

  try {
    const alert = await alertingService.acknowledgeAlert(alertId, {
      acknowledgedBy: acknowledgedBy || 'unknown',
      comment
    });

    logger.info(`Alert acknowledged: ${alert.title}`, {
      alertId,
      acknowledgedBy,
      comment
    });

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      alert,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error acknowledging alert', error, { alertId, acknowledgedBy });
    throw error;
  }
}));

// POST /api/alerts/:alertId/resolve - Résoudre une alerte
router.post('/:alertId/resolve', asyncErrorHandler(async (req, res) => {
  const { alertId } = req.params;
  const { resolvedBy, comment } = req.body;

  try {
    const alert = await alertingService.resolveAlert(alertId, {
      resolvedBy: resolvedBy || 'unknown',
      comment
    });

    logger.info(`Alert resolved: ${alert.title}`, {
      alertId,
      resolvedBy,
      comment
    });

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      alert,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error resolving alert', error, { alertId, resolvedBy });
    throw error;
  }
}));

// GET /api/alerts/stats - Statistiques des alertes
router.get('/stats', asyncErrorHandler(async (req, res) => {
  const { period = '24h' } = req.query;

  try {
    const stats = await alertingService.getAlertStatistics(period);

    res.json({
      success: true,
      period,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting alert statistics', error);
    throw error;
  }
}));

// POST /api/alerts/test - Tester les notifications d'alerte
router.post('/test', asyncErrorHandler(async (req, res) => {
  const { type = 'webhook', config } = req.body;

  try {
    const testAlert = {
      title: 'Test Alert',
      message: 'This is a test alert from the metrics service',
      severity: 'info',
      source: 'test',
      timestamp: new Date().toISOString()
    };

    const result = await alertingService.testNotification(type, config, testAlert);

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error sending test notification', error, { type, config });
    throw error;
  }
}));

// GET /api/alerts/webhooks - Obtenir la configuration des webhooks
router.get('/webhooks', asyncErrorHandler(async (req, res) => {
  try {
    const webhooks = await alertingService.getWebhookConfigurations();

    res.json({
      success: true,
      webhooks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting webhook configurations', error);
    throw error;
  }
}));

// POST /api/alerts/webhooks - Ajouter une configuration webhook
router.post('/webhooks', asyncErrorHandler(async (req, res) => {
  const webhookSchema = Joi.object({
    name: Joi.string().required(),
    url: Joi.string().uri().required(),
    headers: Joi.object().optional(),
    method: Joi.string().valid('POST', 'PUT').default('POST'),
    enabled: Joi.boolean().default(true)
  });

  const { error, value } = webhookSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid webhook configuration', error.details);
  }

  try {
    const webhook = await alertingService.addWebhookConfiguration(value);

    logger.info(`Webhook configuration added: ${webhook.name}`);

    res.status(201).json({
      success: true,
      message: 'Webhook configuration added successfully',
      webhook,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error adding webhook configuration', error, value);
    throw error;
  }
}));

module.exports = router;
