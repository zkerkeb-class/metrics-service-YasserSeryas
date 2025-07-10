const { loggers } = require('../utils/logger');
const logger = loggers;
const { metrics } = require('../config/metrics');

// Gestionnaire d'erreurs principal
const errorHandler = (err, req, res, next) => {
  // Logger l'erreur avec contexte complet
  logger.logError('Unhandled error occurred', err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'],
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Incrémenter les métriques d'erreur
  const statusCode = err.statusCode || err.status || 500;
  const errorType = getErrorType(err);
  const severity = getErrorSeverity(statusCode, err);

  metrics.applicationErrors.labels(errorType, 'metrics-service', severity).inc();
  metrics.httpErrors.labels(statusCode.toString(), req.method, req.route?.path || req.path, 'metrics-service').inc();

  // Préparer la réponse d'erreur
  const errorResponse = buildErrorResponse(err, req);

  // Envoyer la réponse
  res.status(statusCode).json(errorResponse);
};

// Fonction pour déterminer le type d'erreur
function getErrorType(error) {
  if (error.name === 'ValidationError') return 'validation';
  if (error.name === 'CastError') return 'cast';
  if (error.name === 'MongoError' || error.name === 'MongooseError') return 'database';
  if (error.code === 'ECONNREFUSED') return 'connection';
  if (error.code === 'ETIMEDOUT') return 'timeout';
  if (error.name === 'JsonWebTokenError') return 'authentication';
  if (error.name === 'TokenExpiredError') return 'token_expired';
  if (error.code === 'LIMIT_FILE_SIZE') return 'file_size';
  if (error.type === 'entity.parse.failed') return 'parse_error';
  if (error.statusCode >= 400 && error.statusCode < 500) return 'client_error';
  if (error.statusCode >= 500) return 'server_error';
  return 'unknown';
}

// Fonction pour déterminer la gravité de l'erreur
function getErrorSeverity(statusCode, error) {
  if (statusCode >= 500) return 'critical';
  if (statusCode === 429) return 'warning';
  if (statusCode >= 400 && statusCode < 500) return 'info';
  if (error.name === 'ValidationError') return 'info';
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') return 'critical';
  return 'warning';
}

// Fonction pour construire la réponse d'erreur
function buildErrorResponse(error, req) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = error.statusCode || error.status || 500;

  const baseResponse = {
    error: true,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id']
  };

  // Erreurs spécifiques avec messages personnalisés
  switch (error.name) {
    case 'ValidationError':
      return {
        ...baseResponse,
        status: 400,
        message: 'Validation failed',
        details: formatValidationErrors(error),
        ...(isDevelopment && { stack: error.stack })
      };

    case 'CastError':
      return {
        ...baseResponse,
        status: 400,
        message: 'Invalid data format',
        details: `Invalid ${error.path}: ${error.value}`,
        ...(isDevelopment && { stack: error.stack })
      };

    case 'JsonWebTokenError':
      return {
        ...baseResponse,
        status: 401,
        message: 'Invalid token',
        details: 'Authentication token is invalid'
      };

    case 'TokenExpiredError':
      return {
        ...baseResponse,
        status: 401,
        message: 'Token expired',
        details: 'Authentication token has expired'
      };

    case 'MongoError':
      if (error.code === 11000) {
        return {
          ...baseResponse,
          status: 409,
          message: 'Duplicate entry',
          details: 'Resource already exists',
          ...(isDevelopment && { duplicateKey: error.keyValue })
        };
      }
      break;
  }

  // Erreurs par code de statut
  switch (statusCode) {
    case 400:
      return {
        ...baseResponse,
        status: 400,
        message: error.message || 'Bad request',
        details: 'The request could not be understood or was missing required parameters',
        ...(isDevelopment && { stack: error.stack })
      };

    case 401:
      return {
        ...baseResponse,
        status: 401,
        message: 'Unauthorized',
        details: 'Authentication is required to access this resource'
      };

    case 403:
      return {
        ...baseResponse,
        status: 403,
        message: 'Forbidden',
        details: 'You do not have permission to access this resource'
      };

    case 404:
      return {
        ...baseResponse,
        status: 404,
        message: 'Not found',
        details: 'The requested resource could not be found'
      };

    case 409:
      return {
        ...baseResponse,
        status: 409,
        message: 'Conflict',
        details: error.message || 'The request conflicts with the current state of the resource'
      };

    case 422:
      return {
        ...baseResponse,
        status: 422,
        message: 'Unprocessable entity',
        details: error.message || 'The request was well-formed but contains semantic errors'
      };

    case 429:
      return {
        ...baseResponse,
        status: 429,
        message: 'Too many requests',
        details: 'Rate limit exceeded. Please try again later.',
        retryAfter: error.retryAfter || 60
      };

    case 500:
    default:
      return {
        ...baseResponse,
        status: statusCode >= 400 ? statusCode : 500,
        message: statusCode >= 500 ? 'Internal server error' : (error.message || 'An error occurred'),
        details: statusCode >= 500 
          ? 'An unexpected error occurred. Please try again later.' 
          : (error.message || 'Please check your request and try again'),
        ...(isDevelopment && { 
          stack: error.stack,
          originalError: error.message
        })
      };
  }
}

// Formater les erreurs de validation
function formatValidationErrors(validationError) {
  if (validationError.details) {
    // Erreurs Joi
    return validationError.details.map(detail => ({
      field: detail.path?.join('.') || detail.context?.key,
      message: detail.message,
      value: detail.context?.value
    }));
  } else if (validationError.errors) {
    // Erreurs Mongoose
    return Object.keys(validationError.errors).map(field => ({
      field,
      message: validationError.errors[field].message,
      value: validationError.errors[field].value
    }));
  }
  
  return validationError.message || 'Validation failed';
}

// Middleware pour capturer les erreurs async
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware pour les erreurs 404
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  error.statusCode = 404;
  next(error);
};

// Middleware pour logger toutes les requêtes avec erreurs
const requestErrorLogger = (req, res, next) => {
  const originalEnd = res.end;
  
  res.end = function(...args) {
    if (res.statusCode >= 400) {
      logger.warn('HTTP Error Response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        responseTime: Date.now() - req.startTime
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  req.startTime = Date.now();
  next();
};

// Gestionnaire spécialisé pour les erreurs de métriques
const metricsErrorHandler = (err, req, res, next) => {
  if (req.path.startsWith('/api/metrics') || req.path === '/metrics') {
    logger.logError('Metrics endpoint error', err, {
      endpoint: req.path,
      method: req.method,
      query: req.query,
      body: req.body
    });

    // Métriques spécifiques aux erreurs de métriques
    metrics.applicationErrors.labels('metrics_error', 'metrics-service', 'warning').inc();

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: true,
      message: 'Error processing metrics request',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal error',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next(err);
};

// Gestionnaire pour les erreurs de santé
const healthErrorHandler = (err, req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/api/health')) {
    logger.logError('Health check error', err);

    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? err.message : 'Service unavailable'
    });
    return;
  }
  
  next(err);
};

// Fonction pour créer une erreur personnalisée
const createError = (message, statusCode = 500, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
};

// Classes d'erreurs personnalisées
class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

module.exports = {
  errorHandler,
  asyncErrorHandler,
  notFoundHandler,
  requestErrorLogger,
  metricsErrorHandler,
  healthErrorHandler,
  createError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError
};
