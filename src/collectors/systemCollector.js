const si = require('systeminformation');
const { metrics } = require('../config/metrics');
const { loggers } = require('../utils/logger');
const logger = loggers.main;

class SystemMetricsCollector {
  constructor() {
    this.interval = null;
    this.collectInterval = 5000; // 5 secondes
  }

  async start() {
    logger.info('Starting system metrics collection...');
    
    // Collecte immédiate
    await this.collectMetrics();
    
    // Collecte périodique
    this.interval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Error collecting system metrics:', error);
      }
    }, this.collectInterval);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('System metrics collection stopped');
    }
  }

  async collectMetrics() {
    try {
      // Collecte parallèle de toutes les métriques
      const [cpu, memory, disk, network] = await Promise.all([
        this.collectCPUMetrics(),
        this.collectMemoryMetrics(),
        this.collectDiskMetrics(),
        this.collectNetworkMetrics()
      ]);

      logger.debug('System metrics collected successfully');
    } catch (error) {
      logger.error('Error in system metrics collection:', error);
      throw error;
    }
  }

  async collectCPUMetrics() {
    try {
      const cpuData = await si.currentLoad();
      
      // CPU global
      metrics.cpuUsage.labels('total').set(cpuData.currentLoad);
      
      // CPU par core
      if (cpuData.cpus) {
        cpuData.cpus.forEach((core, index) => {
          metrics.cpuUsage.labels(`core_${index}`).set(core.load);
        });
      }
      
      // Température CPU si disponible
      try {
        const temp = await si.cpuTemperature();
        if (temp.main !== -1) {
          metrics.cpuUsage.labels('temperature').set(temp.main);
        }
      } catch (tempError) {
        // Ignorer les erreurs de température (pas toujours disponible)
      }
      
    } catch (error) {
      logger.error('Error collecting CPU metrics:', error);
    }
  }

  async collectMemoryMetrics() {
    try {
      const memData = await si.mem();
      
      metrics.memoryUsage.labels('total').set(memData.total);
      metrics.memoryUsage.labels('used').set(memData.used);
      metrics.memoryUsage.labels('free').set(memData.free);
      metrics.memoryUsage.labels('available').set(memData.available);
      metrics.memoryUsage.labels('cached').set(memData.cached || 0);
      metrics.memoryUsage.labels('buffers').set(memData.buffcache || 0);
      
      // Swap
      metrics.memoryUsage.labels('swap_total').set(memData.swaptotal);
      metrics.memoryUsage.labels('swap_used').set(memData.swapused);
      metrics.memoryUsage.labels('swap_free').set(memData.swapfree);
      
    } catch (error) {
      logger.error('Error collecting memory metrics:', error);
    }
  }

  async collectDiskMetrics() {
    try {
      const diskData = await si.fsSize();
      
      diskData.forEach(disk => {
        if (disk.mount) {
          metrics.diskUsage.labels(disk.mount, 'total').set(disk.size);
          metrics.diskUsage.labels(disk.mount, 'used').set(disk.used);
          metrics.diskUsage.labels(disk.mount, 'free').set(disk.available);
        }
      });
      
      // IO statistics
      try {
        const ioData = await si.disksIO();
        if (ioData.rIO !== -1 && ioData.wIO !== -1) {
          metrics.diskUsage.labels('system', 'read_io').set(ioData.rIO);
          metrics.diskUsage.labels('system', 'write_io').set(ioData.wIO);
          metrics.diskUsage.labels('system', 'read_time').set(ioData.tIO_r || 0);
          metrics.diskUsage.labels('system', 'write_time').set(ioData.tIO_w || 0);
        }
      } catch (ioError) {
        // Ignorer les erreurs IO (pas toujours disponible)
      }
      
    } catch (error) {
      logger.error('Error collecting disk metrics:', error);
    }
  }

  async collectNetworkMetrics() {
    try {
      const networkData = await si.networkStats();
      
      networkData.forEach(iface => {
        if (iface.iface && iface.iface !== 'lo') { // Ignorer loopback
          metrics.networkTraffic.labels(iface.iface, 'rx').inc(iface.rx_bytes || 0);
          metrics.networkTraffic.labels(iface.iface, 'tx').inc(iface.tx_bytes || 0);
        }
      });
      
    } catch (error) {
      logger.error('Error collecting network metrics:', error);
    }
  }

  // Méthode pour obtenir un résumé des métriques système
  async getSystemSummary() {
    try {
      const [cpu, memory, disk] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize()
      ]);

      return {
        cpu: {
          usage: Math.round(cpu.currentLoad * 100) / 100,
          cores: cpu.cpus?.length || 0
        },
        memory: {
          total: memory.total,
          used: memory.used,
          free: memory.free,
          usagePercent: Math.round((memory.used / memory.total) * 10000) / 100
        },
        disk: disk.map(d => ({
          mount: d.mount,
          total: d.size,
          used: d.used,
          free: d.available,
          usagePercent: Math.round((d.used / d.size) * 10000) / 100
        }))
      };
    } catch (error) {
      logger.error('Error getting system summary:', error);
      return null;
    }
  }
}

module.exports = SystemMetricsCollector;
