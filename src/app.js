require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import des modules
const { loggers } = require('./utils/logger');
const logger = loggers.main;
const { initializeMetrics } = require('./config/metrics');
const { initializeTracing } = require('./config/tracing');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const websocketHandler = require('./websockets/metricsSocket');
const healthChecker = require('./services/healthChecker');
const metricsCollector = require('./services/metricsCollector');

class MetricsService {
  constructor() {
    this.app = express();
    this.server = null;
    this.io = null;
    this.port = process.env.PORT || 3000;
  }

  async initialize() {
    try {
      // Initialiser le tracing OpenTelemetry
      await initializeTracing();
      
      // Initialiser les métriques Prometheus
      initializeMetrics();
      
      // Configuration des middlewares
      this.setupMiddlewares();
      
      // Configuration des routes
      this.setupRoutes();
      
      // Configuration des WebSockets
      this.setupWebSockets();
      
      // Configuration de la gestion d'erreurs
      this.setupErrorHandling();
      
      logger.info('Metrics service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize metrics service:', error);
      throw error;
    }
  }

  setupMiddlewares() {
    // Sécurité
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true
    }));
    
    // Compression
    this.app.use(compression());
    
    // Logging
    this.app.use(morgan('combined', {
      stream: { write: message => logger.info(message.trim()) }
    }));
    
    // Rate limiting
    this.app.use(rateLimiter);
    
    // Parse JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version
      });
    });

    // API routes
    this.app.use('/api', routes);
    
    // Metrics endpoint pour Prometheus
    this.app.use('/metrics', require('./routes/prometheus'));
  }

  setupWebSockets() {
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST']
      }
    });

    websocketHandler(this.io);
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    // Error handler
    this.app.use(errorHandler);

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception thrown:', error);
      process.exit(1);
    });
  }

  async start() {
    try {
      await this.initialize();
      
      this.server.listen(this.port, () => {
        logger.info(`Metrics service running on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
        logger.info(`Prometheus metrics available at: http://localhost:${this.port}/metrics`);
        logger.info(`Health check available at: http://localhost:${this.port}/health`);
      });

      // Démarrer la collecte de métriques
      await metricsCollector.start();
      
      // Démarrer les health checks
      await healthChecker.start();
      
    } catch (error) {
      logger.error('Failed to start metrics service:', error);
      process.exit(1);
    }
  }

  async stop() {
    try {
      logger.info('Shutting down metrics service...');
      
      // Arrêter la collecte de métriques
      await metricsCollector.stop();
      
      // Arrêter les health checks
      await healthChecker.stop();
      
      // Fermer le serveur
      if (this.server) {
        this.server.close();
      }
      
      logger.info('Metrics service stopped successfully');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

// Gestion gracieuse de l'arrêt
const metricsService = new MetricsService();

process.on('SIGTERM', () => metricsService.stop());
process.on('SIGINT', () => metricsService.stop());

// Démarrer le service
if (require.main === module) {
  metricsService.start();
}

module.exports = metricsService;
