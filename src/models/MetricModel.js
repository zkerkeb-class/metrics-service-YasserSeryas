const mongoose = require('mongoose');

/**
 * Schéma pour stocker les métriques historiques
 */
const metricSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['counter', 'gauge', 'histogram', 'summary'],
    required: true
  },
  category: {
    type: String,
    enum: ['system', 'application', 'business', 'health'],
    required: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  labels: {
    type: Map,
    of: String,
    default: new Map()
  },
  unit: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  service: {
    type: String,
    default: 'metrics-service'
  },
  environment: {
    type: String,
    default: process.env.NODE_ENV || 'development'
  }
}, {
  timestamps: true,
  // TTL index pour l'expiration automatique des données anciennes
  expireAfterSeconds: parseInt(process.env.METRICS_TTL) || 2592000 // 30 jours par défaut
});

// Index composé pour les requêtes fréquentes
metricSchema.index({ category: 1, name: 1, timestamp: -1 });
metricSchema.index({ service: 1, timestamp: -1 });
metricSchema.index({ environment: 1, timestamp: -1 });

// Méthodes statiques
metricSchema.statics.findByCategory = function(category, startDate, endDate) {
  const query = { category };
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  return this.find(query).sort({ timestamp: -1 });
};

metricSchema.statics.findByName = function(name, limit = 100) {
  return this.find({ name })
    .sort({ timestamp: -1 })
    .limit(limit);
};

metricSchema.statics.getLatestMetrics = function(categories = []) {
  const match = categories.length > 0 ? { category: { $in: categories } } : {};
  
  return this.aggregate([
    { $match: match },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: { name: '$name', category: '$category' },
        latestValue: { $first: '$value' },
        latestTimestamp: { $first: '$timestamp' },
        labels: { $first: '$labels' },
        unit: { $first: '$unit' },
        description: { $first: '$description' }
      }
    },
    {
      $project: {
        _id: 0,
        name: '$_id.name',
        category: '$_id.category',
        value: '$latestValue',
        timestamp: '$latestTimestamp',
        labels: '$labels',
        unit: '$unit',
        description: '$description'
      }
    }
  ]);
};

metricSchema.statics.getAggregatedData = function(name, aggregation = 'avg', interval = '1h', startDate, endDate) {
  const intervalMs = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '1d': 86400000
  };

  const match = { name };
  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) match.timestamp.$gte = new Date(startDate);
    if (endDate) match.timestamp.$lte = new Date(endDate);
  }

  const groupStage = {
    _id: {
      interval: {
        $subtract: [
          '$timestamp',
          { $mod: [{ $subtract: ['$timestamp', new Date(0)] }, intervalMs[interval] || 3600000] }
        ]
      }
    },
    timestamp: { $first: '$_id.interval' }
  };

  switch (aggregation) {
    case 'avg':
      groupStage.value = { $avg: '$value' };
      break;
    case 'sum':
      groupStage.value = { $sum: '$value' };
      break;
    case 'min':
      groupStage.value = { $min: '$value' };
      break;
    case 'max':
      groupStage.value = { $max: '$value' };
      break;
    case 'count':
      groupStage.value = { $sum: 1 };
      break;
    default:
      groupStage.value = { $avg: '$value' };
  }

  return this.aggregate([
    { $match: match },
    { $group: groupStage },
    { $sort: { '_id.interval': 1 } },
    {
      $project: {
        _id: 0,
        timestamp: '$_id.interval',
        value: 1
      }
    }
  ]);
};

// Méthodes d'instance
metricSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Metric', metricSchema);
