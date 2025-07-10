const mongoose = require('mongoose');

/**
 * Schéma pour stocker l'historique des alertes
 */
const alertSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ruleName: {
    type: String,
    required: true,
    index: true
  },
  ruleId: {
    type: String,
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'acknowledged', 'suppressed'],
    default: 'active',
    index: true
  },
  message: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  metricName: {
    type: String,
    required: true,
    index: true
  },
  metricValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  threshold: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  condition: {
    type: String,
    enum: ['>', '<', '>=', '<=', '==', '!='],
    required: true
  },
  labels: {
    type: Map,
    of: String,
    default: new Map()
  },
  service: {
    type: String,
    default: 'metrics-service'
  },
  environment: {
    type: String,
    default: process.env.NODE_ENV || 'development'
  },
  startsAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  endsAt: {
    type: Date,
    index: true
  },
  acknowledgedAt: {
    type: Date,
    index: true
  },
  acknowledgedBy: {
    type: String
  },
  resolvedAt: {
    type: Date,
    index: true
  },
  resolvedBy: {
    type: String
  },
  suppressedAt: {
    type: Date
  },
  suppressedBy: {
    type: String
  },
  suppressedUntil: {
    type: Date
  },
  notificationsSent: [{
    type: {
      type: String,
      enum: ['webhook', 'slack', 'email', 'sms']
    },
    destination: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    success: {
      type: Boolean,
      default: true
    },
    error: String
  }],
  occurrenceCount: {
    type: Number,
    default: 1
  },
  lastOccurrenceAt: {
    type: Date,
    default: Date.now
  },
  annotations: {
    type: Map,
    of: String,
    default: new Map()
  },
  fingerprint: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  // TTL index pour l'expiration automatique des alertes anciennes
  expireAfterSeconds: parseInt(process.env.ALERTS_TTL) || 7776000 // 90 jours par défaut
});

// Index composés pour les requêtes fréquentes
alertSchema.index({ status: 1, severity: 1, startsAt: -1 });
alertSchema.index({ service: 1, status: 1, startsAt: -1 });
alertSchema.index({ ruleName: 1, status: 1, startsAt: -1 });
alertSchema.index({ metricName: 1, startsAt: -1 });

// Méthodes statiques
alertSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).sort({ startsAt: -1 });
};

alertSchema.statics.findBySeverity = function(severity) {
  return this.find({ severity, status: 'active' }).sort({ startsAt: -1 });
};

alertSchema.statics.findByRule = function(ruleName, limit = 100) {
  return this.find({ ruleName })
    .sort({ startsAt: -1 })
    .limit(limit);
};

alertSchema.statics.getStatistics = function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match.startsAt = {};
    if (startDate) match.startsAt.$gte = new Date(startDate);
    if (endDate) match.startsAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          }
        },
        resolved: {
          $sum: {
            $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
          }
        },
        acknowledged: {
          $sum: {
            $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0]
          }
        },
        suppressed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'suppressed'] }, 1, 0]
          }
        },
        critical: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0]
          }
        },
        high: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'high'] }, 1, 0]
          }
        },
        medium: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0]
          }
        },
        low: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'low'] }, 1, 0]
          }
        },
        avgResolutionTime: {
          $avg: {
            $cond: [
              { $ne: ['$resolvedAt', null] },
              { $subtract: ['$resolvedAt', '$startsAt'] },
              null
            ]
          }
        }
      }
    }
  ]);
};

alertSchema.statics.getTimeSeriesData = function(interval = '1h', startDate, endDate) {
  const intervalMs = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '1d': 86400000
  };

  const match = {};
  if (startDate || endDate) {
    match.startsAt = {};
    if (startDate) match.startsAt.$gte = new Date(startDate);
    if (endDate) match.startsAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          interval: {
            $subtract: [
              '$startsAt',
              { $mod: [{ $subtract: ['$startsAt', new Date(0)] }, intervalMs[interval] || 3600000] }
            ]
          },
          severity: '$severity'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.interval',
        timestamp: { $first: '$_id.interval' },
        total: { $sum: '$count' },
        critical: {
          $sum: {
            $cond: [{ $eq: ['$_id.severity', 'critical'] }, '$count', 0]
          }
        },
        high: {
          $sum: {
            $cond: [{ $eq: ['$_id.severity', 'high'] }, '$count', 0]
          }
        },
        medium: {
          $sum: {
            $cond: [{ $eq: ['$_id.severity', 'medium'] }, '$count', 0]
          }
        },
        low: {
          $sum: {
            $cond: [{ $eq: ['$_id.severity', 'low'] }, '$count', 0]
          }
        }
      }
    },
    { $sort: { '_id': 1 } },
    {
      $project: {
        _id: 0,
        timestamp: '$_id',
        total: 1,
        critical: 1,
        high: 1,
        medium: 1,
        low: 1
      }
    }
  ]);
};

// Méthodes d'instance
alertSchema.methods.acknowledge = function(acknowledgedBy) {
  this.status = 'acknowledged';
  this.acknowledgedAt = new Date();
  this.acknowledgedBy = acknowledgedBy;
  return this.save();
};

alertSchema.methods.resolve = function(resolvedBy) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.endsAt = new Date();
  return this.save();
};

alertSchema.methods.suppress = function(suppressedBy, suppressedUntil) {
  this.status = 'suppressed';
  this.suppressedAt = new Date();
  this.suppressedBy = suppressedBy;
  if (suppressedUntil) {
    this.suppressedUntil = new Date(suppressedUntil);
  }
  return this.save();
};

alertSchema.methods.addNotification = function(type, destination, success = true, error = null) {
  this.notificationsSent.push({
    type,
    destination,
    sentAt: new Date(),
    success,
    error
  });
  return this.save();
};

alertSchema.methods.incrementOccurrence = function() {
  this.occurrenceCount += 1;
  this.lastOccurrenceAt = new Date();
  return this.save();
};

alertSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Alert', alertSchema);
