const winston = require('winston');
const path = require('path');

// Configuration des niveaux de log personnalisés
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    trace: 5
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
    trace: 'gray'
  }
};

winston.addColors(customLevels.colors);

// Format personnalisé pour les logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Ajouter les métadonnées si présentes
    if (Object.keys(metadata).length > 0) {
      logMessage += ` | ${JSON.stringify(metadata)}`;
    }
    
    // Ajouter la stack trace pour les erreurs
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    return logMessage;
  })
);

// Format JSON pour les environnements de production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.json()
);

// Déterminer le format selon l'environnement
const getFormat = () => {
  return process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production'
    ? jsonFormat
    : customFormat;
};

// Configuration des transports
const transports = [];

// Console transport
transports.push(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      getFormat()
    )
  })
);

// File transports en production
if (process.env.NODE_ENV === 'production') {
  // Logs généraux
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'app.log'),
      format: jsonFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      tailable: true
    })
  );

  // Logs d'erreur séparés
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: jsonFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true
    })
  );

  // Logs de métriques séparés
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'metrics.log'),
      format: jsonFormat,
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 20,
      tailable: true,
      // Filtrer pour ne garder que les logs de métriques
      filter: (info) => {
        return info.component === 'metrics' || 
               info.message?.includes('metric') ||
               info.metadata?.component === 'metrics';
      }
    })
  );
}

// Créer le logger principal
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info',
  format: getFormat(),
  transports,
  exitOnError: false,
  
  // Gestion des exceptions non capturées
  handleExceptions: true,
  handleRejections: true,
  
  // Méta-données par défaut
  defaultMeta: {
    service: 'metrics-service',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    hostname: process.env.HOSTNAME || require('os').hostname(),
    pid: process.pid
  }
});

// Logger spécialisé pour les métriques
const metricsLogger = winston.createLogger({
  levels: customLevels.levels,
  level: 'debug',
  format: jsonFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [METRICS] ${message}`;
        })
      )
    })
  ],
  defaultMeta: {
    service: 'metrics-service',
    component: 'metrics',
    environment: process.env.NODE_ENV || 'development'
  }
});

// Logger spécialisé pour les requêtes HTTP
const httpLogger = winston.createLogger({
  levels: customLevels.levels,
  level: 'http',
  format: jsonFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, metadata }) => {
          return `${timestamp} [HTTP] ${message} ${metadata ? JSON.stringify(metadata) : ''}`;
        })
      )
    })
  ],
  defaultMeta: {
    service: 'metrics-service',
    component: 'http',
    environment: process.env.NODE_ENV || 'development'
  }
});

// Fonctions utilitaires pour les logs structurés
const loggers = {
  // Logger principal
  main: logger,
  
  // Logger pour les métriques
  metrics: metricsLogger,
  
  // Logger pour HTTP
  http: httpLogger,

  // Méthodes de convenance avec contexte
  logWithContext: (level, message, context = {}) => {
    logger.log(level, message, context);
  },

  logError: (message, error, context = {}) => {
    logger.error(message, {
      error: {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        name: error?.name
      },
      ...context
    });
  },

  logMetric: (metricName, value, labels = {}, context = {}) => {
    metricsLogger.info(`Metric recorded: ${metricName}`, {
      metricName,
      value,
      labels,
      ...context
    });
  },

  logHttpRequest: (req, res, duration, context = {}) => {
    httpLogger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      ...context
    });
  },

  logBusinessEvent: (eventType, data, context = {}) => {
    logger.info(`Business event: ${eventType}`, {
      eventType,
      data,
      component: 'business',
      ...context
    });
  },

  logSystemEvent: (eventType, data, context = {}) => {
    logger.info(`System event: ${eventType}`, {
      eventType,
      data,
      component: 'system',
      ...context
    });
  },

  logHealthCheck: (serviceName, status, responseTime, context = {}) => {
    const level = status === 'healthy' ? 'info' : 'warn';
    logger[level](`Health check: ${serviceName}`, {
      serviceName,
      status,
      responseTime,
      component: 'health',
      ...context
    });
  },

  logAlert: (alertName, severity, data, context = {}) => {
    const level = severity === 'critical' ? 'error' : 'warn';
    logger[level](`Alert triggered: ${alertName}`, {
      alertName,
      severity,
      data,
      component: 'alerting',
      ...context
    });
  }
};

// Middleware pour les logs de requêtes Express
const requestLoggingMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Log de la requête entrante
  loggers.logHttpRequest(req, { statusCode: 'pending' }, 0, {
    phase: 'request_start'
  });

  // Log de la réponse
  res.on('finish', () => {
    const duration = Date.now() - start;
    loggers.logHttpRequest(req, res, duration, {
      phase: 'request_end'
    });
  });

  next();
};

// Fonction pour créer un logger enfant avec contexte spécifique
const createChildLogger = (context = {}) => {
  return logger.child(context);
};

// Fonction pour configurer le niveau de log dynamiquement
const setLogLevel = (level) => {
  if (customLevels.levels.hasOwnProperty(level)) {
    logger.level = level;
    metricsLogger.level = level;
    httpLogger.level = level;
    logger.info(`Log level changed to: ${level}`);
  } else {
    logger.error(`Invalid log level: ${level}. Valid levels: ${Object.keys(customLevels.levels).join(', ')}`);
  }
};

// Export des méthodes de logging avec aliasing pour compatibilité
module.exports = {
  // Logger principal
  ...logger,
  
  // Loggers spécialisés
  loggers,
  
  // Middleware
  requestLoggingMiddleware,
  
  // Utilitaires
  createChildLogger,
  setLogLevel,
  
  // Méthodes de convenance
  logWithContext: loggers.logWithContext,
  logError: loggers.logError,
  logMetric: loggers.logMetric,
  logHttpRequest: loggers.logHttpRequest,
  logBusinessEvent: loggers.logBusinessEvent,
  logSystemEvent: loggers.logSystemEvent,
  logHealthCheck: loggers.logHealthCheck,
  logAlert: loggers.logAlert
};
