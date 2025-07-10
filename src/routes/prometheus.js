const { getMetrics } = require('../config/metrics');

// Route pour exposer les métriques au format Prometheus
module.exports = async (req, res) => {
  try {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('# Error generating metrics\n');
  }
};
