const mongoose = require('mongoose');

/**
 * Schéma pour stocker l'historique de santé des services
 */
const healthCheckSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: true,
    index: true
  },
  serviceUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['healthy', 'unhealthy', 'degraded', 'unknown'],
    required: true,
    index: true
  },
  responseTime: {
    type: Number, // en millisecondes
    required: true
  },
  statusCode: {
    type: Number
  },
  errorMessage: {
    type: String
  },
  checkType: {
    type: String,
    enum: ['http', 'tcp', 'custom'],
    default: 'http'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  environment: {
    type: String,
    default: process.env.NODE_ENV || 'development'
  },
  checkedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  // TTL index pour l'expiration automatique des données anciennes
  expireAfterSeconds: parseInt(process.env.HEALTH_CHECKS_TTL) || 2592000 // 30 jours par défaut
});

// Index composés pour les requêtes fréquentes
healthCheckSchema.index({ serviceName: 1, checkedAt: -1 });
healthCheckSchema.index({ status: 1, checkedAt: -1 });
healthCheckSchema.index({ serviceName: 1, status: 1, checkedAt: -1 });

// Méthodes statiques
healthCheckSchema.statics.getLatestStatus = function(serviceName) {
  return this.findOne({ serviceName }).sort({ checkedAt: -1 });
};

healthCheckSchema.statics.getServiceHistory = function(serviceName, limit = 100) {
  return this.find({ serviceName })
    .sort({ checkedAt: -1 })
    .limit(limit);
};

healthCheckSchema.statics.getOverallStatus = function() {
  return this.aggregate([
    {
      $sort: { checkedAt: -1 }
    },
    {
      $group: {
        _id: '$serviceName',
        latestStatus: { $first: '$status' },
        latestCheck: { $first: '$checkedAt' },
        avgResponseTime: { $avg: '$responseTime' }
      }
    },
    {
      $group: {
        _id: null,
        totalServices: { $sum: 1 },
        healthy: {
          $sum: {
            $cond: [{ $eq: ['$latestStatus', 'healthy'] }, 1, 0]
          }
        },
        unhealthy: {
          $sum: {
            $cond: [{ $eq: ['$latestStatus', 'unhealthy'] }, 1, 0]
          }
        },
        degraded: {
          $sum: {
            $cond: [{ $eq: ['$latestStatus', 'degraded'] }, 1, 0]
          }
        },
        unknown: {
          $sum: {
            $cond: [{ $eq: ['$latestStatus', 'unknown'] }, 1, 0]
          }
        },
        avgResponseTime: { $avg: '$avgResponseTime' }
      }
    }
  ]);
};

healthCheckSchema.statics.getUptimeStats = function(serviceName, startDate, endDate) {
  const match = { serviceName };
  if (startDate || endDate) {
    match.checkedAt = {};
    if (startDate) match.checkedAt.$gte = new Date(startDate);
    if (endDate) match.checkedAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalChecks: { $sum: 1 },
        healthyChecks: {
          $sum: {
            $cond: [{ $eq: ['$status', 'healthy'] }, 1, 0]
          }
        },
        unhealthyChecks: {
          $sum: {
            $cond: [{ $eq: ['$status', 'unhealthy'] }, 1, 0]
          }
        },
        degradedChecks: {
          $sum: {
            $cond: [{ $eq: ['$status', 'degraded'] }, 1, 0]
          }
        },
        avgResponseTime: { $avg: '$responseTime' },
        minResponseTime: { $min: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' }
      }
    },
    {
      $project: {
        _id: 0,
        totalChecks: 1,
        healthyChecks: 1,
        unhealthyChecks: 1,
        degradedChecks: 1,
        uptimePercentage: {
          $multiply: [
            { $divide: ['$healthyChecks', '$totalChecks'] },
            100
          ]
        },
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
        minResponseTime: 1,
        maxResponseTime: 1
      }
    }
  ]);
};

healthCheckSchema.statics.getTimeSeriesData = function(serviceName, interval = '1h', startDate, endDate) {
  const intervalMs = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '1d': 86400000
  };

  const match = {};
  if (serviceName) match.serviceName = serviceName;
  if (startDate || endDate) {
    match.checkedAt = {};
    if (startDate) match.checkedAt.$gte = new Date(startDate);
    if (endDate) match.checkedAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          interval: {
            $subtract: [
              '$checkedAt',
              { $mod: [{ $subtract: ['$checkedAt', new Date(0)] }, intervalMs[interval] || 3600000] }
            ]
          },
          status: '$status'
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' }
      }
    },
    {
      $group: {
        _id: '$_id.interval',
        timestamp: { $first: '$_id.interval' },
        totalChecks: { $sum: '$count' },
        healthy: {
          $sum: {
            $cond: [{ $eq: ['$_id.status', 'healthy'] }, '$count', 0]
          }
        },
        unhealthy: {
          $sum: {
            $cond: [{ $eq: ['$_id.status', 'unhealthy'] }, '$count', 0]
          }
        },
        degraded: {
          $sum: {
            $cond: [{ $eq: ['$_id.status', 'degraded'] }, '$count', 0]
          }
        },
        avgResponseTime: { $avg: '$avgResponseTime' }
      }
    },
    { $sort: { '_id': 1 } },
    {
      $project: {
        _id: 0,
        timestamp: '$_id',
        totalChecks: 1,
        healthy: 1,
        unhealthy: 1,
        degraded: 1,
        uptimePercentage: {
          $cond: [
            { $gt: ['$totalChecks', 0] },
            { $multiply: [{ $divide: ['$healthy', '$totalChecks'] }, 100] },
            0
          ]
        },
        avgResponseTime: { $round: ['$avgResponseTime', 2] }
      }
    }
  ]);
};

// Méthodes d'instance
healthCheckSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('HealthCheck', healthCheckSchema);
