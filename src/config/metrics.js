const promClient = require('prom-client');
const { loggers } = require('../utils/logger');
const logger = loggers.main;

// Registre pour toutes les métriques
const register = new promClient.Registry();

// Métriques par défaut (CPU, mémoire, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: process.env.METRICS_PREFIX ? `${process.env.METRICS_PREFIX}_` : 'reservation_service_'
});

// === MÉTRIQUES SYSTÈME ===

// CPU Usage
const cpuUsage = new promClient.Gauge({
  name: 'system_cpu_usage_percent',
  help: 'Current CPU usage percentage',
  labelNames: ['core']
});

// Memory Usage
const memoryUsage = new promClient.Gauge({
  name: 'system_memory_usage_bytes',
  help: 'Current memory usage in bytes',
  labelNames: ['type'] // 'used', 'free', 'total'
});

// Disk Usage
const diskUsage = new promClient.Gauge({
  name: 'system_disk_usage_bytes',
  help: 'Current disk usage in bytes',
  labelNames: ['mountpoint', 'type'] // 'used', 'free', 'total'
});

// Network Traffic
const networkTraffic = new promClient.Counter({
  name: 'system_network_bytes_total',
  help: 'Total network traffic in bytes',
  labelNames: ['interface', 'direction'] // 'rx', 'tx'
});

// === MÉTRIQUES APPLICATIVES ===

// HTTP Requests
const httpRequests = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service']
});

// HTTP Request Duration
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
});

// HTTP Request Size
const httpRequestSize = new promClient.Histogram({
  name: 'http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'route', 'service'],
  buckets: [100, 1000, 10000, 100000, 1000000]
});

// HTTP Response Size
const httpResponseSize = new promClient.Histogram({
  name: 'http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [100, 1000, 10000, 100000, 1000000]
});

// Active Connections
const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['service', 'type'] // 'http', 'websocket', 'database'
});

// === MÉTRIQUES BUSINESS ===

// Réservations
const reservations = new promClient.Counter({
  name: 'reservations_total',
  help: 'Total number of reservations',
  labelNames: ['status', 'event_type', 'payment_method']
});

// Revenus
const revenue = new promClient.Counter({
  name: 'revenue_total',
  help: 'Total revenue generated',
  labelNames: ['currency', 'event_type', 'payment_method']
});

// Utilisateurs actifs
const activeUsers = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users',
  labelNames: ['timeframe'] // '1m', '5m', '15m', '1h', '24h'
});

// Tickets vendus
const ticketsSold = new promClient.Counter({
  name: 'tickets_sold_total',
  help: 'Total number of tickets sold',
  labelNames: ['event_id', 'ticket_type', 'venue']
});

// Taux de conversion
const conversionRate = new promClient.Gauge({
  name: 'conversion_rate',
  help: 'Conversion rate percentage',
  labelNames: ['funnel_step', 'event_type']
});

// === MÉTRIQUES DE SANTÉ DES SERVICES ===

// Service Health
const serviceHealth = new promClient.Gauge({
  name: 'service_up',
  help: 'Service health status (1 = up, 0 = down)',
  labelNames: ['service_name', 'instance']
});

// Service Response Time
const serviceResponseTime = new promClient.Histogram({
  name: 'service_response_time_seconds',
  help: 'Service response time in seconds',
  labelNames: ['service_name', 'endpoint'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
});

// Database Connection Pool
const dbConnectionPool = new promClient.Gauge({
  name: 'database_connection_pool',
  help: 'Database connection pool metrics',
  labelNames: ['database', 'status'] // 'active', 'idle', 'total'
});

// Cache Hit Rate
const cacheHitRate = new promClient.Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type', 'service']
});

// Queue Size
const queueSize = new promClient.Gauge({
  name: 'queue_size',
  help: 'Number of items in queue',
  labelNames: ['queue_name', 'priority']
});

// === MÉTRIQUES D'ERREURS ===

// Application Errors
const applicationErrors = new promClient.Counter({
  name: 'application_errors_total',
  help: 'Total application errors',
  labelNames: ['error_type', 'service', 'severity']
});

// HTTP Errors
const httpErrors = new promClient.Counter({
  name: 'http_errors_total',
  help: 'Total HTTP errors',
  labelNames: ['status_code', 'method', 'route', 'service']
});

// Database Errors
const databaseErrors = new promClient.Counter({
  name: 'database_errors_total',
  help: 'Total database errors',
  labelNames: ['database', 'operation', 'error_type']
});

// === ENREGISTREMENT DES MÉTRIQUES ===

const metrics = {
  // Système
  cpuUsage,
  memoryUsage,
  diskUsage,
  networkTraffic,
  
  // Application
  httpRequests,
  httpRequestDuration,
  httpRequestSize,
  httpResponseSize,
  activeConnections,
  
  // Business
  reservations,
  revenue,
  activeUsers,
  ticketsSold,
  conversionRate,
  
  // Santé des services
  serviceHealth,
  serviceResponseTime,
  dbConnectionPool,
  cacheHitRate,
  queueSize,
  
  // Erreurs
  applicationErrors,
  httpErrors,
  databaseErrors
};

// Enregistrer toutes les métriques
Object.values(metrics).forEach(metric => {
  register.registerMetric(metric);
});

// Fonction d'initialisation
function initializeMetrics() {
  logger.info('Initializing Prometheus metrics...');
  
  // Métriques de démarrage
  serviceHealth.labels('metrics-service', process.env.HOSTNAME || 'localhost').set(1);
  
  logger.info(`Registered ${register.getMetricsAsArray().length} metrics`);
}

// Fonction pour obtenir les métriques au format Prometheus
async function getMetrics() {
  return await register.metrics();
}

// Fonction pour obtenir une métrique spécifique
function getMetric(name) {
  return register.getSingleMetric(name);
}

// Fonction pour créer une métrique personnalisée
function createCustomMetric(type, name, help, labelNames = []) {
  let metric;
  
  switch (type.toLowerCase()) {
    case 'counter':
      metric = new promClient.Counter({ name, help, labelNames });
      break;
    case 'gauge':
      metric = new promClient.Gauge({ name, help, labelNames });
      break;
    case 'histogram':
      metric = new promClient.Histogram({ name, help, labelNames });
      break;
    case 'summary':
      metric = new promClient.Summary({ name, help, labelNames });
      break;
    default:
      throw new Error(`Unsupported metric type: ${type}`);
  }
  
  register.registerMetric(metric);
  return metric;
}

module.exports = {
  register,
  metrics,
  initializeMetrics,
  getMetrics,
  getMetric,
  createCustomMetric
};
