const mongoose = require('mongoose');

/**
 * Schéma pour les configurations des règles d'alerting
 */
const alertRuleSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  enabled: {
    type: Boolean,
    default: true,
    index: true
  },
  metricName: {
    type: String,
    required: true,
    index: true
  },
  condition: {
    type: String,
    enum: ['>', '<', '>=', '<=', '==', '!='],
    required: true
  },
  threshold: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  evaluationInterval: {
    type: Number, // en secondes
    default: 60,
    min: 10
  },
  evaluationWindow: {
    type: Number, // en secondes
    default: 300,
    min: 60
  },
  labels: {
    type: Map,
    of: String,
    default: new Map()
  },
  annotations: {
    type: Map,
    of: String,
    default: new Map()
  },
  notificationChannels: [{
    type: {
      type: String,
      enum: ['webhook', 'slack', 'email', 'sms'],
      required: true
    },
    destination: {
      type: String,
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    config: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map()
    }
  }],
  silencePeriod: {
    type: Number, // en secondes
    default: 0
  },
  maxOccurrences: {
    type: Number,
    default: 0 // 0 = pas de limite
  },
  environment: {
    type: String,
    default: process.env.NODE_ENV || 'development'
  },
  service: {
    type: String,
    default: 'metrics-service'
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  lastTriggered: {
    type: Date
  },
  triggerCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index composés pour les requêtes fréquentes
alertRuleSchema.index({ enabled: 1, metricName: 1 });
alertRuleSchema.index({ service: 1, enabled: 1 });
alertRuleSchema.index({ severity: 1, enabled: 1 });

// Méthodes statiques
alertRuleSchema.statics.findEnabled = function() {
  return this.find({ enabled: true });
};

alertRuleSchema.statics.findByMetric = function(metricName) {
  return this.find({ metricName, enabled: true });
};

alertRuleSchema.statics.findBySeverity = function(severity) {
  return this.find({ severity, enabled: true });
};

alertRuleSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        enabled: {
          $sum: {
            $cond: [{ $eq: ['$enabled', true] }, 1, 0]
          }
        },
        disabled: {
          $sum: {
            $cond: [{ $eq: ['$enabled', false] }, 1, 0]
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
        totalTriggers: { $sum: '$triggerCount' },
        avgTriggers: { $avg: '$triggerCount' }
      }
    }
  ]);
};

// Méthodes d'instance
alertRuleSchema.methods.evaluate = function(metricValue) {
  const { condition, threshold } = this;
  
  switch (condition) {
    case '>':
      return metricValue > threshold;
    case '<':
      return metricValue < threshold;
    case '>=':
      return metricValue >= threshold;
    case '<=':
      return metricValue <= threshold;
    case '==':
      return metricValue == threshold;
    case '!=':
      return metricValue != threshold;
    default:
      return false;
  }
};

alertRuleSchema.methods.incrementTrigger = function() {
  this.triggerCount += 1;
  this.lastTriggered = new Date();
  return this.save();
};

alertRuleSchema.methods.enable = function() {
  this.enabled = true;
  return this.save();
};

alertRuleSchema.methods.disable = function() {
  this.enabled = false;
  return this.save();
};

alertRuleSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('AlertRule', alertRuleSchema);
