const { loggers } = require('../utils/logger');
const logger = loggers.main;

let sdk = null;

function initializeTracing() {
  try {
    // Vérifier si OpenTelemetry est activé
    if (process.env.OTEL_ENABLED === 'false') {
      logger.info('OpenTelemetry tracing is disabled');
      return;
    }

    logger.info('Initializing OpenTelemetry tracing...');

    // Import dynamique pour éviter les erreurs si les modules ne sont pas disponibles
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    const { Resource } = require('@opentelemetry/resources');
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');    // Configuration de la ressource
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'metrics-service',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'reservation-system',
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'localhost',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    // Configuration du SDK (sans Prometheus exporter pour éviter les conflits)
    sdk = new NodeSDK({
      resource,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Désactiver certaines instrumentations si nécessaire
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
            requestHook: (span, info) => {
              // Ajouter des attributs personnalisés à la span
              span.setAttributes({
                'http.route': info.route,
                'user.id': info.req.user?.id,
                'request.id': info.req.headers['x-request-id'],
              });
            },
            responseHook: (span, info) => {
              // Ajouter des attributs de réponse
              span.setAttributes({
                'http.response.size': info.res.get('content-length'),
              });
            },
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span, request) => {
              span.setAttributes({
                'http.request.header.user-agent': request.getHeader('user-agent'),
                'http.request.header.x-forwarded-for': request.getHeader('x-forwarded-for'),
              });
            },
          },
          '@opentelemetry/instrumentation-mongodb': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },        }),
      ],
      // Pas de metricReader pour éviter les conflits avec Prometheus
    });

    // Initialiser le SDK
    sdk.start();

    logger.info('OpenTelemetry tracing initialized successfully');

    // Gestion de l'arrêt propre
    process.on('SIGTERM', () => {
      sdk?.shutdown()
        .then(() => logger.info('OpenTelemetry terminated'))
        .catch((error) => logger.error('Error terminating OpenTelemetry', error))
        .finally(() => process.exit(0));
    });
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry:', error.message);
    logger.info('Continuing without OpenTelemetry tracing...');
    // Le service peut fonctionner sans tracing
  }
}

// Fonction pour obtenir le tracer
function getTracer(name = 'metrics-service') {
  const { trace } = require('@opentelemetry/api');
  return trace.getTracer(name, process.env.npm_package_version || '1.0.0');
}

// Fonction pour créer une span personnalisée
function createSpan(tracer, name, attributes = {}) {
  return tracer.startSpan(name, {
    attributes,
  });
}

// Middleware pour tracer les requêtes HTTP
function tracingMiddleware(req, res, next) {
  const tracer = getTracer();
  const span = createSpan(tracer, `${req.method} ${req.route?.path || req.path}`, {
    'http.method': req.method,
    'http.url': req.url,
    'http.route': req.route?.path,
    'http.user_agent': req.get('User-Agent'),
    'user.id': req.user?.id,
    'request.id': req.headers['x-request-id'],
  });

  // Ajouter la span au contexte de la requête
  req.span = span;

  // Finaliser la span à la fin de la réponse
  res.on('finish', () => {
    span.setAttributes({
      'http.status_code': res.statusCode,
      'http.response.size': res.get('content-length'),
    });

    if (res.statusCode >= 400) {
      span.recordException(new Error(`HTTP ${res.statusCode}`));
      span.setStatus({
        code: 2, // ERROR
        message: `HTTP ${res.statusCode}`,
      });
    }

    span.end();
  });

  next();
}

// Fonction pour instrumenter une fonction asynchrone
function instrumentAsync(name, fn, attributes = {}) {
  return async (...args) => {
    const tracer = getTracer();
    const span = createSpan(tracer, name, attributes);

    try {
      const result = await fn(...args);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: 2, // ERROR
        message: error.message,
      });
      throw error;
    } finally {
      span.end();
    }
  };
}

// Décorateur pour instrumenter les méthodes de classe
function instrument(name, attributes = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args) {
      const tracer = getTracer();
      const span = createSpan(tracer, name || `${target.constructor.name}.${propertyKey}`, attributes);
      
      try {
        const result = originalMethod.apply(this, args);
        
        if (result && typeof result.then === 'function') {
          // Méthode asynchrone
          return result
            .then((res) => {
              span.setStatus({ code: 1 }); // OK
              span.end();
              return res;
            })
            .catch((error) => {
              span.recordException(error);
              span.setStatus({
                code: 2, // ERROR
                message: error.message,
              });
              span.end();
              throw error;
            });
        } else {
          // Méthode synchrone
          span.setStatus({ code: 1 }); // OK
          span.end();
          return result;
        }
      } catch (error) {
        span.recordException(error);
        span.setStatus({
          code: 2, // ERROR
          message: error.message,
        });
        span.end();
        throw error;
      }
    };
    
    return descriptor;
  };
}

module.exports = {
  initializeTracing,
  getTracer,
  createSpan,
  tracingMiddleware,
  instrumentAsync,
  instrument
};
