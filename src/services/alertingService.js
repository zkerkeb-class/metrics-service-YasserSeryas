const axios = require('axios');
const { metrics } = require('../config/metrics');
const { loggers } = require('../utils/logger');
const logger = loggers.main;

class AlertingService {
  constructor() {
    this.alertRules = new Map();
    this.alerts = new Map();
    this.webhookConfigurations = new Map();
    this.notificationChannels = new Map();
    this.metricValues = new Map();
    this.evaluationInterval = 30000; // 30 secondes
    this.evaluationTimer = null;
    this.isRunning = false;
    
    this.initializeDefaultRules();
    this.initializeDefaultWebhooks();
  }

  // === INITIALISATION ===

  initializeDefaultRules() {
    // Règles d'alerte par défaut
    const defaultRules = [
      {
        id: 'cpu_high',
        name: 'CPU Usage High',
        description: 'CPU usage is above 80%',
        metric: 'system_cpu_usage_percent',
        condition: {
          operator: '>',
          threshold: 80,
          duration: 300 // 5 minutes
        },
        severity: 'warning',
        enabled: true,
        notifications: [{ type: 'webhook', config: { webhookId: 'default' } }]
      },
      {
        id: 'memory_critical',
        name: 'Memory Usage Critical',
        description: 'Memory usage is above 90%',
        metric: 'system_memory_usage_percent',
        condition: {
          operator: '>',
          threshold: 90,
          duration: 180 // 3 minutes
        },
        severity: 'critical',
        enabled: true,
        notifications: [{ type: 'webhook', config: { webhookId: 'default' } }]
      },
      {
        id: 'service_down',
        name: 'Service Down',
        description: 'A monitored service is down',
        metric: 'service_up',
        condition: {
          operator: '==',
          threshold: 0,
          duration: 60 // 1 minute
        },
        severity: 'critical',
        enabled: true,
        notifications: [{ type: 'webhook', config: { webhookId: 'default' } }]
      },
      {
        id: 'http_errors_high',
        name: 'HTTP Errors High',
        description: 'HTTP error rate is above 5%',
        metric: 'http_error_rate',
        condition: {
          operator: '>',
          threshold: 5,
          duration: 300 // 5 minutes
        },
        severity: 'warning',
        enabled: true,
        notifications: [{ type: 'webhook', config: { webhookId: 'default' } }]
      },
      {
        id: 'response_time_slow',
        name: 'Response Time Slow',
        description: 'Average response time is above 1 second',
        metric: 'http_request_duration_seconds',
        condition: {
          operator: '>',
          threshold: 1,
          duration: 600 // 10 minutes
        },
        severity: 'warning',
        enabled: true,
        notifications: [{ type: 'webhook', config: { webhookId: 'default' } }]
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, {
        ...rule,
        createdAt: new Date().toISOString(),
        lastEvaluated: null,
        triggeredCount: 0
      });
    });
  }

  initializeDefaultWebhooks() {
    if (process.env.WEBHOOK_URL) {
      this.webhookConfigurations.set('default', {
        id: 'default',
        name: 'Default Webhook',
        url: process.env.WEBHOOK_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'metrics-service'
        },
        enabled: true,
        createdAt: new Date().toISOString()
      });
    }

    if (process.env.SLACK_WEBHOOK_URL) {
      this.webhookConfigurations.set('slack', {
        id: 'slack',
        name: 'Slack Notifications',
        url: process.env.SLACK_WEBHOOK_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        enabled: true,
        createdAt: new Date().toISOString()
      });
    }
  }

  // === GESTION DES RÈGLES D'ALERTE ===

  async createAlertRule(ruleData) {
    const id = this.generateId();
    const rule = {
      id,
      ...ruleData,
      createdAt: new Date().toISOString(),
      lastEvaluated: null,
      triggeredCount: 0
    };

    this.alertRules.set(id, rule);
    logger.info(`Alert rule created: ${rule.name} (${id})`);
    
    return rule;
  }

  async updateAlertRule(ruleId, updateData) {
    const existingRule = this.alertRules.get(ruleId);
    if (!existingRule) {
      throw new Error(`Alert rule not found: ${ruleId}`);
    }

    const updatedRule = {
      ...existingRule,
      ...updateData,
      id: ruleId, // Préserver l'ID
      updatedAt: new Date().toISOString()
    };

    this.alertRules.set(ruleId, updatedRule);
    logger.info(`Alert rule updated: ${updatedRule.name} (${ruleId})`);
    
    return updatedRule;
  }

  async deleteAlertRule(ruleId) {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`Alert rule not found: ${ruleId}`);
    }

    this.alertRules.delete(ruleId);
    logger.info(`Alert rule deleted: ${rule.name} (${ruleId})`);
    
    return true;
  }

  async toggleAlertRule(ruleId) {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`Alert rule not found: ${ruleId}`);
    }

    rule.enabled = !rule.enabled;
    rule.updatedAt = new Date().toISOString();
    
    logger.info(`Alert rule ${rule.enabled ? 'enabled' : 'disabled'}: ${rule.name} (${ruleId})`);
    
    return rule;
  }

  async getAlertRules() {
    return Array.from(this.alertRules.values());
  }

  // === GESTION DES ALERTES ===

  async createAlert(alertData) {
    const id = this.generateId();
    const alert = {
      id,
      ...alertData,
      status: 'active',
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      acknowledgedBy: null,
      resolvedBy: null
    };

    this.alerts.set(id, alert);
    
    // Envoyer les notifications
    await this.sendNotifications(alert);
    
    // Incrémenter les métriques
    metrics.applicationErrors.labels('alert_triggered', 'metrics-service', alert.severity).inc();
    
    logger.logAlert(alert.title, alert.severity, alert.data, { alertId: id });
    
    return alert;
  }

  async createManualAlert(alertData) {
    return await this.createAlert({
      ...alertData,
      source: 'manual',
      ruleId: null
    });
  }

  async acknowledgeAlert(alertId, ackData) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = ackData.acknowledgedBy;
    alert.acknowledgeComment = ackData.comment;

    logger.info(`Alert acknowledged: ${alert.title} by ${ackData.acknowledgedBy}`);
    
    return alert;
  }

  async resolveAlert(alertId, resolveData) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = resolveData.resolvedBy;
    alert.resolveComment = resolveData.comment;

    logger.info(`Alert resolved: ${alert.title} by ${resolveData.resolvedBy}`);
    
    return alert;
  }

  async getAlerts(filters = {}, options = {}) {
    let alerts = Array.from(this.alerts.values());

    // Appliquer les filtres
    if (filters.status) {
      alerts = alerts.filter(alert => alert.status === filters.status);
    }
    if (filters.severity) {
      alerts = alerts.filter(alert => alert.severity === filters.severity);
    }

    // Trier par date de création (plus récent en premier)
    alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Appliquer la pagination
    const { limit = 50, offset = 0 } = options;
    alerts = alerts.slice(offset, offset + limit);

    return alerts;
  }

  async getActiveAlerts() {
    return this.getAlerts({ status: 'active' });
  }

  // === ÉVALUATION DES RÈGLES ===

  start() {
    if (this.isRunning) {
      logger.warn('Alerting service is already running');
      return;
    }

    logger.info('Starting alerting service...');
    this.isRunning = true;
    
    this.evaluationTimer = setInterval(() => {
      this.evaluateAllRules().catch(error => {
        logger.error('Error during rule evaluation:', error);
      });
    }, this.evaluationInterval);

    logger.info(`Alerting service started with ${this.evaluationInterval}ms interval`);
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Alerting service is not running');
      return;
    }

    logger.info('Stopping alerting service...');
    
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }

    this.isRunning = false;
    logger.info('Alerting service stopped');
  }

  async evaluateAllRules() {
    const rules = Array.from(this.alertRules.values()).filter(rule => rule.enabled);
    
    for (const rule of rules) {
      try {
        await this.evaluateRule(rule);
      } catch (error) {
        logger.error(`Error evaluating rule ${rule.name}:`, error);
      }
    }
  }

  async evaluateRule(rule) {
    rule.lastEvaluated = new Date().toISOString();

    try {
      // Obtenir la valeur actuelle de la métrique
      const currentValue = await this.getMetricValue(rule.metric);
      
      if (currentValue === null || currentValue === undefined) {
        logger.debug(`No value available for metric ${rule.metric}`);
        return;
      }

      // Évaluer la condition
      const conditionMet = this.evaluateCondition(currentValue, rule.condition);
      
      if (conditionMet) {
        // Vérifier si l'alerte existe déjà
        const existingAlert = this.findActiveAlertForRule(rule.id);
        
        if (!existingAlert) {
          // Créer une nouvelle alerte
          await this.createAlert({
            title: rule.name,
            message: `${rule.description || rule.name}. Current value: ${currentValue}`,
            severity: rule.severity,
            source: 'rule',
            ruleId: rule.id,
            data: {
              metric: rule.metric,
              currentValue,
              threshold: rule.condition.threshold,
              condition: rule.condition
            }
          });

          rule.triggeredCount++;
        }
      } else {
        // Auto-résoudre les alertes si la condition n'est plus remplie
        const existingAlert = this.findActiveAlertForRule(rule.id);
        if (existingAlert) {
          await this.resolveAlert(existingAlert.id, {
            resolvedBy: 'system',
            comment: 'Condition no longer met'
          });
        }
      }

    } catch (error) {
      logger.error(`Error evaluating rule ${rule.name}:`, error);
    }
  }

  evaluateCondition(value, condition) {
    const { operator, threshold } = condition;
    
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: 
        logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  findActiveAlertForRule(ruleId) {
    return Array.from(this.alerts.values()).find(
      alert => alert.ruleId === ruleId && alert.status === 'active'
    );
  }

  // === GESTION DES MÉTRIQUES ===

  async getMetricValue(metricName) {
    // Ici vous pourriez interroger votre registre Prometheus ou votre base de données
    // Pour la démo, on simule quelques valeurs
    const mockValues = {
      'system_cpu_usage_percent': Math.random() * 100,
      'system_memory_usage_percent': Math.random() * 100,
      'service_up': Math.random() > 0.1 ? 1 : 0, // 90% uptime
      'http_error_rate': Math.random() * 10,
      'http_request_duration_seconds': Math.random() * 2
    };

    return mockValues[metricName] || null;
  }

  // === NOTIFICATIONS ===

  async sendNotifications(alert) {
    // Obtenir la règle associée pour les configurations de notification
    const rule = alert.ruleId ? this.alertRules.get(alert.ruleId) : null;
    const notifications = rule?.notifications || [];

    for (const notification of notifications) {
      try {
        await this.sendNotification(notification, alert);
      } catch (error) {
        logger.error('Error sending notification:', error, { notification, alert: alert.id });
      }
    }
  }

  async sendNotification(notificationConfig, alert) {
    const { type, config } = notificationConfig;

    switch (type) {
      case 'webhook':
        await this.sendWebhookNotification(config, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(config, alert);
        break;
      case 'email':
        await this.sendEmailNotification(config, alert);
        break;
      default:
        logger.warn(`Unknown notification type: ${type}`);
    }
  }

  async sendWebhookNotification(config, alert) {
    const webhookId = config.webhookId || 'default';
    const webhook = this.webhookConfigurations.get(webhookId);

    if (!webhook || !webhook.enabled) {
      logger.warn(`Webhook not found or disabled: ${webhookId}`);
      return;
    }

    const payload = {
      alert: {
        id: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        status: alert.status,
        source: alert.source,
        createdAt: alert.createdAt,
        data: alert.data
      },
      service: 'metrics-service',
      timestamp: new Date().toISOString()
    };

    try {
      const response = await axios({
        method: webhook.method,
        url: webhook.url,
        headers: webhook.headers,
        data: payload,
        timeout: 10000
      });

      logger.info(`Webhook notification sent for alert ${alert.id}`, {
        webhook: webhookId,
        statusCode: response.status
      });

    } catch (error) {
      logger.error('Failed to send webhook notification:', error, {
        webhook: webhookId,
        alert: alert.id
      });
      throw error;
    }
  }

  async sendSlackNotification(config, alert) {
    const webhookUrl = config.webhookUrl || this.webhookConfigurations.get('slack')?.url;
    
    if (!webhookUrl) {
      logger.warn('Slack webhook URL not configured');
      return;
    }

    const color = {
      'critical': '#ff0000',
      'warning': '#ffaa00',
      'info': '#0066cc'
    }[alert.severity] || '#666666';

    const payload = {
      text: `Alert: ${alert.title}`,
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Status', value: alert.status, short: true },
          { title: 'Source', value: alert.source, short: true },
          { title: 'Time', value: alert.createdAt, short: true }
        ],
        footer: 'Metrics Service',
        ts: Math.floor(new Date(alert.createdAt).getTime() / 1000)
      }]
    };

    try {
      await axios.post(webhookUrl, payload, { timeout: 10000 });
      logger.info(`Slack notification sent for alert ${alert.id}`);
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
      throw error;
    }
  }

  async sendEmailNotification(config, alert) {
    // Implémentation de l'email (nécessite un service email comme SendGrid, SES, etc.)
    logger.info(`Email notification would be sent for alert ${alert.id}`, { config });
  }

  // === WEBHOOKS ===

  async addWebhookConfiguration(webhookData) {
    const id = this.generateId();
    const webhook = {
      id,
      ...webhookData,
      createdAt: new Date().toISOString()
    };

    this.webhookConfigurations.set(id, webhook);
    return webhook;
  }

  async getWebhookConfigurations() {
    return Array.from(this.webhookConfigurations.values());
  }

  async testNotification(type, config, testAlert) {
    const notification = { type, config };
    await this.sendNotification(notification, testAlert);
    return { success: true, type, timestamp: new Date().toISOString() };
  }

  // === STATISTIQUES ===

  async getAlertStatistics(period = '24h') {
    const now = new Date();
    const periodMs = this.parsePeriod(period);
    const startTime = new Date(now.getTime() - periodMs);

    const alerts = Array.from(this.alerts.values())
      .filter(alert => new Date(alert.createdAt) >= startTime);

    const stats = {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length
      },
      bySource: {}
    };

    // Compter par source
    alerts.forEach(alert => {
      stats.bySource[alert.source] = (stats.bySource[alert.source] || 0) + 1;
    });

    return stats;
  }

  // === UTILITAIRES ===

  generateId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  parsePeriod(period) {
    const match = period.match(/^(\d+)([hmwd])$/);
    if (!match) return 24 * 60 * 60 * 1000; // 24h par défaut

    const [, value, unit] = match;
    const multipliers = {
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };

    return parseInt(value) * multipliers[unit];
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      totalRules: this.alertRules.size,
      activeRules: Array.from(this.alertRules.values()).filter(r => r.enabled).length,
      totalAlerts: this.alerts.size,
      activeAlerts: Array.from(this.alerts.values()).filter(a => a.status === 'active').length,
      webhookConfigurations: this.webhookConfigurations.size,
      evaluationInterval: this.evaluationInterval
    };
  }
}

module.exports = AlertingService;
