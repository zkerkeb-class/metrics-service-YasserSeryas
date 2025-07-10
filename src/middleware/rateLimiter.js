const rateLimit = require('express-rate-limit');
const { loggers } = require('../utils/logger');
const logger = loggers.main;
const { metrics } = require('../config/metrics');

// Configuration du rate limiting
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000, // 15 minutes par défaut
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requêtes par défaut
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(((parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000) / 1000)
    },
    standardHeaders: true, // Retourner les headers `RateLimit-*`
    legacyHeaders: false, // Désactiver les headers `X-RateLimit-*`
    
    // Handler personnalisé pour les requêtes limitées
    handler: (req, res) => {
      // Logger la limitation
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method
      });

      // Incrémenter la métrique d'erreur
      metrics.httpErrors.labels('429', req.method, req.route?.path || req.path, 'metrics-service').inc();
      metrics.applicationErrors.labels('rate_limit', 'metrics-service', 'warning').inc();

      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(((parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000) / 1000),
        limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000
      });
    },

    // Skip certaines requêtes
    skip: (req) => {
      // Ne pas limiter les health checks
      if (req.path === '/health' || req.path === '/metrics') {
        return true;
      }
      
      // Ne pas limiter les requêtes internes (optionnel)
      const userAgent = req.get('User-Agent') || '';
      if (userAgent.includes('metrics-service') || userAgent.includes('prometheus')) {
        return true;
      }

      return false;
    },

    // Store pour persister les compteurs (en production, utiliser Redis)
    store: process.env.REDIS_URL ? createRedisStore() : undefined,

    // Fonction de clé personnalisée
    keyGenerator: (req) => {
      // Utiliser IP + User-Agent pour une identification plus précise
      return `${req.ip}_${req.get('User-Agent') || 'unknown'}`;
    },

    ...options
  };

  return rateLimit(defaultOptions);
};

// Store Redis pour le rate limiting (pour la production)
function createRedisStore() {
  try {
    const redis = require('redis');
    const RedisStore = require('rate-limit-redis');
    
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        lazyConnect: true
      }
    });

    client.on('error', (err) => {
      logger.error('Redis rate limiter error:', err);
    });

    return new RedisStore({
      client,
      prefix: 'rate-limit:',
      sendCommand: (...args) => client.sendCommand(args)
    });

  } catch (error) {
    logger.warn('Redis not available for rate limiting, using memory store:', error.message);
    return undefined;
  }
}

// Rate limiter général
const rateLimiter = createRateLimiter();

// Rate limiter strict pour les endpoints sensibles
const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 20 requêtes max
  message: {
    error: 'Too many requests to sensitive endpoint, please try again later.',
    retryAfter: 900 // 15 minutes
  }
});

// Rate limiter souple pour les métriques
const metricsRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requêtes par minute
  skip: (req) => {
    // Autoriser Prometheus et les outils de monitoring
    const userAgent = req.get('User-Agent') || '';
    return userAgent.includes('prometheus') || 
           userAgent.includes('grafana') || 
           userAgent.includes('metrics-service');
  }
});

// Rate limiter pour les APIs business
const businessApiRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 requêtes par 5 minutes
  message: {
    error: 'Too many business API requests, please try again later.',
    retryAfter: 300 // 5 minutes
  }
});

// Middleware de rate limiting conditionnel
const conditionalRateLimiter = (req, res, next) => {
  const path = req.path;
  
  // Choisir le bon rate limiter selon le endpoint
  if (path.startsWith('/api/metrics/custom') || path.startsWith('/api/metrics/business')) {
    return businessApiRateLimiter(req, res, next);
  } else if (path === '/metrics' || path.startsWith('/api/metrics/dashboard')) {
    return metricsRateLimiter(req, res, next);
  } else if (path.startsWith('/api/alerts') || path.startsWith('/admin')) {
    return strictRateLimiter(req, res, next);
  } else {
    return rateLimiter(req, res, next);
  }
};

// Middleware pour bypass du rate limiting en développement
const developmentBypass = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    // En développement, logger mais ne pas bloquer
    logger.debug('Rate limiting bypassed in development mode', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    return next();
  }
  
  return conditionalRateLimiter(req, res, next);
};

// Middleware pour obtenir des stats de rate limiting
const rateLimitStats = (req, res, next) => {
  const originalEnd = res.end;
  
  res.end = function(...args) {
    // Enregistrer les stats de rate limiting
    const limit = res.get('RateLimit-Limit');
    const remaining = res.get('RateLimit-Remaining');
    const reset = res.get('RateLimit-Reset');
    
    if (limit && remaining) {
      logger.debug('Rate limit stats', {
        ip: req.ip,
        path: req.path,
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: reset ? new Date(parseInt(reset) * 1000) : null,
        rateLimited: res.statusCode === 429
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

module.exports = {
  rateLimiter: developmentBypass,
  strictRateLimiter,
  metricsRateLimiter,
  businessApiRateLimiter,
  conditionalRateLimiter,
  createRateLimiter,
  rateLimitStats
};
