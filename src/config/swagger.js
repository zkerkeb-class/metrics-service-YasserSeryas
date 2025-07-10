const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Metrics Service API',
      version: '1.0.0',
      description: 'API complète pour le microservice de métriques et monitoring',
      contact: {
        name: 'Support API',
        url: 'https://github.com/your-org/metrics-service',
        email: 'support@metrics-service.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement'
      },
      {
        url: 'https://api.metrics-service.com',
        description: 'Serveur de production'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Metric: {
          type: 'object',
          required: ['name', 'type', 'value'],
          properties: {
            name: {
              type: 'string',
              description: 'Nom unique de la métrique',
              example: 'http_requests_total'
            },
            type: {
              type: 'string',
              enum: ['counter', 'gauge', 'histogram', 'summary'],
              description: 'Type de métrique Prometheus',
              example: 'counter'
            },
            category: {
              type: 'string',
              enum: ['system', 'application', 'business', 'health'],
              description: 'Catégorie de la métrique',
              example: 'application'
            },
            value: {
              type: 'number',
              description: 'Valeur de la métrique',
              example: 1
            },
            labels: {
              type: 'object',
              additionalProperties: {
                type: 'string'
              },
              description: 'Labels associés à la métrique',
              example: { method: 'GET', status: '200' }
            },
            unit: {
              type: 'string',
              description: 'Unité de mesure',
              example: 'bytes'
            },
            description: {
              type: 'string',
              description: 'Description de la métrique',
              example: 'Nombre total de requêtes HTTP'
            }
          }
        },
        Alert: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Identifiant unique de l\'alerte'
            },
            ruleName: {
              type: 'string',
              description: 'Nom de la règle qui a déclenché l\'alerte'
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Niveau de sévérité'
            },
            status: {
              type: 'string',
              enum: ['active', 'resolved', 'acknowledged', 'suppressed'],
              description: 'État de l\'alerte'
            },
            message: {
              type: 'string',
              description: 'Message de l\'alerte'
            },
            metricName: {
              type: 'string',
              description: 'Nom de la métrique concernée'
            },
            metricValue: {
              type: 'number',
              description: 'Valeur actuelle de la métrique'
            },
            threshold: {
              type: 'number',
              description: 'Seuil de déclenchement'
            },
            startsAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date de début de l\'alerte'
            },
            endsAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date de fin de l\'alerte'
            }
          }
        },
        AlertRule: {
          type: 'object',
          required: ['name', 'metricName', 'condition', 'threshold', 'severity'],
          properties: {
            name: {
              type: 'string',
              description: 'Nom de la règle d\'alerting'
            },
            description: {
              type: 'string',
              description: 'Description de la règle'
            },
            enabled: {
              type: 'boolean',
              description: 'Règle activée ou non',
              default: true
            },
            metricName: {
              type: 'string',
              description: 'Nom de la métrique à surveiller'
            },
            condition: {
              type: 'string',
              enum: ['>', '<', '>=', '<=', '==', '!='],
              description: 'Condition de comparaison'
            },
            threshold: {
              type: 'number',
              description: 'Seuil de déclenchement'
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Niveau de sévérité'
            },
            evaluationInterval: {
              type: 'integer',
              description: 'Intervalle d\'évaluation en secondes',
              default: 60
            },
            notificationChannels: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['webhook', 'slack', 'email', 'sms']
                  },
                  destination: {
                    type: 'string'
                  },
                  enabled: {
                    type: 'boolean',
                    default: true
                  }
                }
              }
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Nom du service'
            },
            serviceUrl: {
              type: 'string',
              description: 'URL de health check du service'
            },
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy', 'degraded', 'unknown'],
              description: 'État de santé du service'
            },
            responseTime: {
              type: 'number',
              description: 'Temps de réponse en millisecondes'
            },
            statusCode: {
              type: 'integer',
              description: 'Code de statut HTTP'
            },
            checkedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date du dernier check'
            }
          }
        },
        Service: {
          type: 'object',
          required: ['name', 'url'],
          properties: {
            name: {
              type: 'string',
              description: 'Nom unique du service'
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'URL de health check'
            },
            interval: {
              type: 'integer',
              description: 'Intervalle de vérification en millisecondes',
              default: 30000
            },
            timeout: {
              type: 'integer',
              description: 'Timeout de la requête en millisecondes',
              default: 5000
            },
            retries: {
              type: 'integer',
              description: 'Nombre de tentatives en cas d\'échec',
              default: 3
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Message d\'erreur'
            },
            code: {
              type: 'string',
              description: 'Code d\'erreur'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Message de succès'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
