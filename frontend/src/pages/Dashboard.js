import React from 'react';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import MetricChart from '../components/MetricChart';
import StatusIndicator from '../components/StatusIndicator';
import { LoadingSpinner, ErrorMessage } from '../components/LoadingStates';
import { useDashboard } from '../hooks/useDashboard';
import { useHealth } from '../hooks/useHealth';
import { 
  Activity, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Cpu,
  HardDrive,
  Server
} from 'lucide-react';

const Dashboard = () => {
  const { summary, realTimeData, loading, error, refetchSummary } = useDashboard();
  const { healthStatus } = useHealth();

  if (loading) {
    return (
      <div className="flex-1 ml-64">
        <Header title="Dashboard" />
        <LoadingSpinner text="Chargement du dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 ml-64">
        <Header title="Dashboard" />
        <ErrorMessage error={error} onRetry={refetchSummary} />
      </div>
    );
  }

  // ✅ Utilisation correcte des données temps réel
  const actualSummary = summary || {};
  const dashboardData = actualSummary.dashboard || {};
  const realTimeMetrics = realTimeData?.data || {}; // Données temps réel

  const formatBytes = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1) + ' GB';
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  console.log('Dashboard Data:', dashboardData);
  console.log('Real-Time Metrics:', realTimeMetrics); // ✅ Debug des données temps réel

  return (
    <div className="flex-1 ml-64">
      <Header title="Dashboard" onRefresh={refetchSummary} />
      
      <div className="p-6 space-y-6">
        {/* Métriques principales - Utilisation des données temps réel pour système */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Services actifs"
            value={dashboardData.health?.healthyServices || 0}
            change={dashboardData.health?.healthPercentage || 0}
            changeType="neutral"
            icon={Activity}
            color={dashboardData.overview?.status === 'healthy' ? 'success' : 'warning'}
          />
          
          <MetricCard
            title="Services total"
            value={dashboardData.health?.totalServices || 0}
            change={0}
            changeType="neutral"
            icon={Users}
            color="primary"
          />
          
          {/* ✅ Utilisation des données temps réel pour CPU */}
          <MetricCard
            title="CPU"
            value={realTimeMetrics.system?.cpu?.usage?.toFixed(1) || 0}
            unit="%"
            change={0}
            changeType="neutral"
            icon={Cpu}
            color={realTimeMetrics.system?.cpu?.usage > 80 ? 'warning' : 'success'}
          />
          
          {/* ✅ Utilisation des données temps réel pour mémoire */}
          <MetricCard
            title="Mémoire"
            value={realTimeMetrics.system?.memory?.usagePercent?.toFixed(1) || 0}
            unit="%"
            change={0}
            changeType="neutral"
            icon={HardDrive}
            color={realTimeMetrics.system?.memory?.usagePercent > 80 ? 'warning' : 'success'}
          />
        </div>

        {/* ✅ Métriques système détaillées - Utilisation des données temps réel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Système (Temps réel)</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CPU ({realTimeMetrics.system?.cpu?.cores} cœurs)</span>
                <span className="font-medium">{realTimeMetrics.system?.cpu?.usage?.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Mémoire</span>
                <span className="font-medium">
                  {formatBytes(realTimeMetrics.system?.memory?.used)} / {formatBytes(realTimeMetrics.system?.memory?.total)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uptime App</span>
                <span className="font-medium">{formatUptime(realTimeMetrics.application?.uptime)}</span>
              </div>
            </div>
          </div>

          {/* ✅ Stockage temps réel */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Stockage (Temps réel)</h3>
            </div>
            <div className="space-y-3">
              {realTimeMetrics.system?.disk?.map((disk, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Disque {disk.mount}</span>
                  <span className="font-medium">{disk.usagePercent?.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* ✅ Business temps réel */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Business (Temps réel)</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Réservations</span>
                <span className="font-medium">{realTimeMetrics.business?.dailyStats?.reservations}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Utilisateurs actifs</span>
                <span className="font-medium">{realTimeMetrics.business?.dailyStats?.activeUsers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Revenus</span>
                <span className="font-medium">{realTimeMetrics.business?.dailyStats?.revenue}€</span>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Section mixte : Services (dashboard) + Alertes (temps réel) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">État des services</h3>
            </div>
            
            <div className="space-y-4">
              {dashboardData.health?.services && Object.entries(dashboardData.health.services).map(([serviceName, service]) => (
                <StatusIndicator
                  key={serviceName}
                  status={service.healthy ? 'healthy' : 'error'}
                  label={service.name}
                  details={
                    service.healthy 
                      ? `Temps de réponse: ${service.responseTime}ms`
                      : service.error || `Erreur ${service.statusCode}`
                  }
                />
              ))}
              
              {!dashboardData.health?.services && (
                <div className="text-gray-500 text-sm">
                  Aucun service détecté
                </div>
              )}
            </div>
          </div>

          {/* ✅ Alertes système - Utilisation des données temps réel */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Alertes système (Temps réel)</h3>
            </div>
            
            <div className="space-y-3">
              {/* Alertes temps réel */}
              {realTimeMetrics.alerts?.active > 0 ? (
                <div className="flex items-center space-x-3 p-3 bg-warning-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-warning-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-warning-800">
                      {realTimeMetrics.alerts.active} alerte(s) active(s)
                    </p>
                    <p className="text-xs text-warning-600">
                      Critiques: {realTimeMetrics.alerts.critical}, 
                      Avertissements: {realTimeMetrics.alerts.warning}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3 p-3 bg-success-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-success-800">
                      Aucune alerte active
                    </p>
                    <p className="text-xs text-success-600">
                      Système surveillé normalement
                    </p>
                  </div>
                </div>
              )}

              {/* Alertes récentes temps réel */}
              {realTimeMetrics.alerts?.recent?.map((alert, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-error-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-error-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-error-800">
                      {alert.message}
                    </p>
                    <p className="text-xs text-error-600">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}

              {/* Statut général dégradé - Dashboard data */}
              {dashboardData.overview?.status === 'degraded' && (
                <div className="flex items-center space-x-3 p-3 bg-warning-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-warning-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-warning-800">
                      Services dégradés
                    </p>
                    <p className="text-xs text-warning-600">
                      {dashboardData.health?.unhealthyServices}/{dashboardData.health?.totalServices} services indisponibles
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ Section bonus : Connexions actives temps réel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Connexions actives</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">HTTP</span>
                <span className="font-medium">{realTimeMetrics.application?.activeConnections?.http || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">WebSocket</span>
                <span className="font-medium">{realTimeMetrics.application?.activeConnections?.websocket || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base de données</span>
                <span className="font-medium">{realTimeMetrics.application?.activeConnections?.database || 0}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Mémoire Application</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">RSS</span>
                <span className="font-medium">{Math.round(realTimeMetrics.application?.memoryUsage?.rss / 1024 / 1024)} MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Heap utilisé</span>
                <span className="font-medium">{Math.round(realTimeMetrics.application?.memoryUsage?.heapUsed / 1024 / 1024)} MB</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Performances</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Requêtes en attente</span>
                <span className="font-medium">{realTimeMetrics.application?.pendingRequests || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Temps CPU (ms)</span>
                <span className="font-medium">{realTimeMetrics.application?.cpuUsage?.user + realTimeMetrics.application?.cpuUsage?.system || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
