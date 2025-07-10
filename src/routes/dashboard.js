const express = require('express');
const metricsCollector = require('../services/metricsCollector');
const healthChecker = require('../services/healthChecker');
const AlertingService = require('../services/alertingService');
const { asyncErrorHandler } = require('../middleware/errorHandler');
const { loggers } = require('../utils/logger');
const logger = loggers.main;

const router = express.Router();
const alertingService = new AlertingService();

// GET /api/dashboard/summary - Résumé complet pour le dashboard
router.get('/summary', asyncErrorHandler(async (req, res) => {
  try {
    const [
      metricsSummary,
      healthSummary,
      alertStats
    ] = await Promise.all([
      metricsCollector.getCompleteSummary(),
      healthChecker.getSystemHealth(),
      alertingService.getAlertStatistics()
    ]);

    const dashboardSummary = {
      overview: {
        status: healthSummary.status,
        servicesUp: healthSummary.healthyServices,
        servicesTotal: healthSummary.totalServices,
        activeAlerts: alertStats.active,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      metrics: metricsSummary,
      health: healthSummary,
      alerts: alertStats
    };

    res.json({
      success: true,
      dashboard: dashboardSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting dashboard summary', error);
    throw error;
  }
}));

// GET /api/dashboard/realtime - Données temps réel pour le dashboard
router.get('/realtime', asyncErrorHandler(async (req, res) => {
  try {
    const [
      systemMetrics,
      applicationMetrics,
      businessMetrics,
      activeAlerts
    ] = await Promise.all([
      metricsCollector.getSystemSummary(),
      Promise.resolve(metricsCollector.getApplicationSummary()),
      Promise.resolve(metricsCollector.getBusinessSummary()),
      alertingService.getActiveAlerts()
    ]);

    const realtimeData = {
      system: {
        cpu: systemMetrics?.cpu || { usage: 0, cores: 0 },
        memory: systemMetrics?.memory || { total: 0, used: 0, free: 0, usagePercent: 0 },
        disk: systemMetrics?.disk || []
      },
      application: {
        activeConnections: applicationMetrics?.activeConnections || {},
        uptime: applicationMetrics?.uptime || 0,
        memoryUsage: applicationMetrics?.memoryUsage || {}
      },
      business: {
        dailyStats: businessMetrics?.dailyStats || {
          reservations: 0,
          revenue: 0,
          activeUsers: 0
        },
        conversionFunnel: businessMetrics?.conversionFunnel || {}
      },
      alerts: {
        active: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length,
        recent: activeAlerts.slice(0, 5)
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: realtimeData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting realtime dashboard data', error);
    throw error;
  }
}));

// GET /api/dashboard/charts/system - Données pour les graphiques système
router.get('/charts/system', asyncErrorHandler(async (req, res) => {
  const { period = '1h', interval = '5m' } = req.query;

  try {
    // Pour une vraie implémentation, vous récupéreriez les données depuis une base de données
    // Ici on simule des données pour la démo
    const timePoints = generateTimePoints(period, interval);
    
    const systemChartData = {
      cpu: {
        labels: timePoints.map(t => t.toISOString()),
        datasets: [{
          label: 'CPU Usage %',
          data: timePoints.map(() => Math.random() * 100),
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          tension: 0.4
        }]
      },
      memory: {
        labels: timePoints.map(t => t.toISOString()),
        datasets: [{
          label: 'Memory Usage %',
          data: timePoints.map(() => Math.random() * 100),
          borderColor: '#4ecdc4',
          backgroundColor: 'rgba(78, 205, 196, 0.1)',
          tension: 0.4
        }]
      },
      network: {
        labels: timePoints.map(t => t.toISOString()),
        datasets: [
          {
            label: 'Network In (MB/s)',
            data: timePoints.map(() => Math.random() * 10),
            borderColor: '#45b7d1',
            backgroundColor: 'rgba(69, 183, 209, 0.1)',
            tension: 0.4
          },
          {
            label: 'Network Out (MB/s)',
            data: timePoints.map(() => Math.random() * 10),
            borderColor: '#f39c12',
            backgroundColor: 'rgba(243, 156, 18, 0.1)',
            tension: 0.4
          }
        ]
      }
    };

    res.json({
      success: true,
      period,
      interval,
      charts: systemChartData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting system chart data', error);
    throw error;
  }
}));

// GET /api/dashboard/charts/business - Données pour les graphiques business
router.get('/charts/business', asyncErrorHandler(async (req, res) => {
  const { period = '24h', interval = '1h' } = req.query;

  try {
    const timePoints = generateTimePoints(period, interval);
    
    const businessChartData = {
      reservations: {
        labels: timePoints.map(t => t.toISOString()),
        datasets: [{
          label: 'Reservations',
          data: timePoints.map(() => Math.floor(Math.random() * 50)),
          borderColor: '#27ae60',
          backgroundColor: 'rgba(39, 174, 96, 0.1)',
          tension: 0.4
        }]
      },
      revenue: {
        labels: timePoints.map(t => t.toISOString()),
        datasets: [{
          label: 'Revenue (€)',
          data: timePoints.map(() => Math.floor(Math.random() * 5000)),
          borderColor: '#8e44ad',
          backgroundColor: 'rgba(142, 68, 173, 0.1)',
          tension: 0.4
        }]
      },
      conversionFunnel: {
        labels: ['Page Views', 'Event Views', 'Cart Adds', 'Checkouts', 'Payments'],
        datasets: [{
          label: 'Conversion Funnel',
          data: [1000, 800, 400, 200, 150],
          backgroundColor: [
            '#3498db',
            '#2ecc71',
            '#f39c12',
            '#e74c3c',
            '#9b59b6'
          ]
        }]
      },
      userActivity: {
        labels: timePoints.map(t => t.toISOString()),
        datasets: [{
          label: 'Active Users',
          data: timePoints.map(() => Math.floor(Math.random() * 1000)),
          borderColor: '#e67e22',
          backgroundColor: 'rgba(230, 126, 34, 0.1)',
          tension: 0.4
        }]
      }
    };

    res.json({
      success: true,
      period,
      interval,
      charts: businessChartData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting business chart data', error);
    throw error;
  }
}));

// GET /api/dashboard/charts/performance - Données pour les graphiques de performance
router.get('/charts/performance', asyncErrorHandler(async (req, res) => {
  const { period = '1h', interval = '5m' } = req.query;

  try {
    const timePoints = generateTimePoints(period, interval);
    
    const performanceChartData = {
      responseTime: {
        labels: timePoints.map(t => t.toISOString()),
        datasets: [
          {
            label: 'Average Response Time (ms)',
            data: timePoints.map(() => Math.random() * 1000),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.4
          },
          {
            label: 'P95 Response Time (ms)',
            data: timePoints.map(() => Math.random() * 2000),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            tension: 0.4
          }
        ]
      },
      throughput: {
        labels: timePoints.map(t => t.toISOString()),
        datasets: [{
          label: 'Requests per Second',
          data: timePoints.map(() => Math.floor(Math.random() * 100)),
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          tension: 0.4
        }]
      },
      errorRate: {
        labels: timePoints.map(t => t.toISOString()),
        datasets: [{
          label: 'Error Rate %',
          data: timePoints.map(() => Math.random() * 5),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          tension: 0.4
        }]
      }
    };

    res.json({
      success: true,
      period,
      interval,
      charts: performanceChartData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting performance chart data', error);
    throw error;
  }
}));

// GET /api/dashboard/widgets - Configuration des widgets du dashboard
router.get('/widgets', asyncErrorHandler(async (req, res) => {
  try {
    const widgets = [
      {
        id: 'system_overview',
        title: 'System Overview',
        type: 'stats',
        size: 'large',
        refreshInterval: 30000,
        endpoint: '/api/dashboard/realtime'
      },
      {
        id: 'health_status',
        title: 'Service Health',
        type: 'health',
        size: 'medium',
        refreshInterval: 30000,
        endpoint: '/api/health'
      },
      {
        id: 'active_alerts',
        title: 'Active Alerts',
        type: 'alerts',
        size: 'medium',
        refreshInterval: 15000,
        endpoint: '/api/alerts/active'
      },
      {
        id: 'cpu_chart',
        title: 'CPU Usage',
        type: 'chart',
        chartType: 'line',
        size: 'large',
        refreshInterval: 60000,
        endpoint: '/api/dashboard/charts/system'
      },
      {
        id: 'memory_chart',
        title: 'Memory Usage',
        type: 'chart',
        chartType: 'line',
        size: 'large',
        refreshInterval: 60000,
        endpoint: '/api/dashboard/charts/system'
      },
      {
        id: 'business_metrics',
        title: 'Business Metrics',
        type: 'business',
        size: 'large',
        refreshInterval: 120000,
        endpoint: '/api/dashboard/charts/business'
      },
      {
        id: 'conversion_funnel',
        title: 'Conversion Funnel',
        type: 'chart',
        chartType: 'funnel',
        size: 'medium',
        refreshInterval: 300000,
        endpoint: '/api/dashboard/charts/business'
      },
      {
        id: 'performance_metrics',
        title: 'Performance',
        type: 'performance',
        size: 'large',
        refreshInterval: 60000,
        endpoint: '/api/dashboard/charts/performance'
      }
    ];

    res.json({
      success: true,
      widgets,
      layout: {
        columns: 12,
        rows: 'auto',
        gap: 16
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError('Error getting dashboard widgets configuration', error);
    throw error;
  }
}));

// GET /api/dashboard/export - Exporter les données du dashboard
router.get('/export', asyncErrorHandler(async (req, res) => {
  const { format = 'json', period = '24h' } = req.query;

  try {
    const exportData = await generateExportData(period);

    if (format === 'csv') {
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="metrics-export-${new Date().toISOString().split('T')[0]}.csv"`
      });
      
      const csv = convertToCSV(exportData);
      res.send(csv);
    } else {
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="metrics-export-${new Date().toISOString().split('T')[0]}.json"`
      });
      
      res.json({
        success: true,
        exportData,
        period,
        generatedAt: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.logError('Error exporting dashboard data', error);
    throw error;
  }
}));

// === FONCTIONS UTILITAIRES ===

function generateTimePoints(period, interval) {
  const now = new Date();
  const periodMs = parsePeriod(period);
  const intervalMs = parsePeriod(interval);
  
  const points = [];
  for (let time = now.getTime() - periodMs; time <= now.getTime(); time += intervalMs) {
    points.push(new Date(time));
  }
  
  return points;
}

function parsePeriod(period) {
  const match = period.match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 60 * 1000; // 1h par défaut

  const [, value, unit] = match;
  const multipliers = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };

  return parseInt(value) * multipliers[unit];
}

async function generateExportData(period) {
  const [
    systemSummary,
    businessSummary,
    healthSummary,
    alertStats
  ] = await Promise.all([
    metricsCollector.getSystemSummary(),
    metricsCollector.getBusinessSummary(),
    healthChecker.getSystemHealth(),
    alertingService.getAlertStatistics(period)
  ]);

  return {
    period,
    system: systemSummary,
    business: businessSummary,
    health: healthSummary,
    alerts: alertStats,
    exportedAt: new Date().toISOString()
  };
}

function convertToCSV(data) {
  // Implémentation simple de conversion JSON vers CSV
  const rows = [];
  
  // Headers
  rows.push('Metric,Value,Timestamp');
  
  // System metrics
  if (data.system) {
    rows.push(`CPU Usage,${data.system.cpu?.usage || 0},${data.exportedAt}`);
    rows.push(`Memory Usage,${data.system.memory?.usagePercent || 0},${data.exportedAt}`);
  }
  
  // Business metrics
  if (data.business?.dailyStats) {
    const stats = data.business.dailyStats;
    rows.push(`Daily Reservations,${stats.reservations || 0},${data.exportedAt}`);
    rows.push(`Daily Revenue,${stats.revenue || 0},${data.exportedAt}`);
    rows.push(`Active Users,${stats.activeUsers || 0},${data.exportedAt}`);
  }
  
  // Health metrics
  if (data.health) {
    rows.push(`Services Healthy,${data.health.healthyServices || 0},${data.exportedAt}`);
    rows.push(`Health Percentage,${data.health.healthPercentage || 0},${data.exportedAt}`);
  }
  
  // Alert metrics
  if (data.alerts) {
    rows.push(`Total Alerts,${data.alerts.total || 0},${data.exportedAt}`);
    rows.push(`Active Alerts,${data.alerts.active || 0},${data.exportedAt}`);
  }
  
  return rows.join('\n');
}

module.exports = router;
