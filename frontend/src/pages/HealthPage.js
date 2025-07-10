import React from 'react';
import Header from '../components/Header';
import StatusIndicator from '../components/StatusIndicator';
import MetricCard from '../components/MetricCard';
import { LoadingSpinner, ErrorMessage } from '../components/LoadingStates';
import { useHealth } from '../hooks/useHealth';
import { 
  Server, 
  Database, 
  Activity, 
  Globe,
  Shield,
  Zap,
  AlertTriangle
} from 'lucide-react';

const HealthPage = () => {
  const { healthStatus, loading, error, refetch } = useHealth();

  // Mock data adapté au nouveau format
  const mockHealthData = {
    success: true,
    overall: {
      status: "degraded",
      totalServices: 4,
      healthyServices: 1,
      unhealthyServices: 3,
      healthPercentage: 25,
      timestamp: "2025-06-16T23:32:14.651Z",
      services: {
        "reservation-service": {
          name: "reservation-service",
          healthy: false,
          responseTime: 5,
          statusCode: 200,
          timestamp: "2025-06-16T23:32:14.650Z",
          url: "http://localhost:3000",
          details: {
            status: "OK",
            timestamp: "2025-06-16T23:32:14.648Z",
            services: {
              mongodb: "connected",
              redis: "checked"
            }
          }
        },
        "user-service": {
          name: "user-service",
          healthy: false,
          responseTime: 3,
          error: "connect ECONNREFUSED ::1:3002",
          errorType: "connection_refused",
          statusCode: null,
          timestamp: "2025-06-16T23:32:14.649Z",
          url: "http://localhost:3002"
        },
        "payment-service": {
          name: "payment-service",
          healthy: false,
          responseTime: 3,
          error: "connect ECONNREFUSED ::1:3003",
          errorType: "connection_refused",
          statusCode: null,
          timestamp: "2025-06-16T23:32:14.649Z",
          url: "http://localhost:3003"
        },
        "notification-service": {
          name: "notification-service",
          healthy: false,
          responseTime: 4,
          error: "connect ECONNREFUSED ::1:3004",
          errorType: "connection_refused",
          statusCode: null,
          timestamp: "2025-06-16T23:32:14.650Z",
          url: "http://localhost:3004"
        }
      }
    },
    statistics: {
      averageResponseTime: 5,
      minResponseTime: 5,
      maxResponseTime: 5,
      successRate: 25,
      totalChecks: 4,
      lastCheckTime: "2025-06-16T23:32:14.650Z"
    },
    timestamp: "2025-06-16T23:32:14.651Z"
  };

  const displayHealthData = healthStatus || mockHealthData;

  if (loading) {
    return (
      <div className="flex-1 ml-64">
        <Header title="État de santé" />
        <LoadingSpinner text="Vérification de l'état des services..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 ml-64">
        <Header title="État de santé" />
        <ErrorMessage error={error} onRetry={refetch} />
      </div>
    );
  }

  // Null safety check
  if (!displayHealthData || !displayHealthData.success || !displayHealthData.overall) {
    return (
      <div className="flex-1 ml-64">
        <Header title="État de santé" />
        <div className="p-6">
          <div className="text-center text-gray-500">Aucune donnée de santé disponible</div>
        </div>
      </div>
    );
  }

  const { overall, statistics } = displayHealthData;

  // Conversion des services object en array
  const servicesArray = Object.values(overall.services || {});

  // Fonction pour déterminer l'icône du service
  const getServiceIcon = (serviceName) => {
    if (serviceName.includes('user')) return Globe;
    if (serviceName.includes('payment')) return Shield;
    if (serviceName.includes('notification')) return Zap;
    if (serviceName.includes('reservation')) return Database;
    return Server;
  };

  // Fonction pour convertir healthy en status
  const getServiceStatus = (service) => {
    if (service.healthy) return 'healthy';
    if (service.errorType === 'connection_refused') return 'error';
    return 'warning';
  };

  // Fonction pour obtenir la couleur du statut global
  const getOverallStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'primary';
    }
  };

  // Génération des contrôles système basés sur les services
  const systemChecks = [
    {
      name: 'Services disponibles',
      status: overall.healthPercentage > 75 ? 'healthy' : overall.healthPercentage > 25 ? 'warning' : 'error',
      message: `${overall.healthyServices}/${overall.totalServices} services opérationnels`,
      timestamp: overall.timestamp
    },
    {
      name: 'Temps de réponse',
      status: statistics.averageResponseTime < 100 ? 'healthy' : statistics.averageResponseTime < 500 ? 'warning' : 'error',
      message: `${statistics.averageResponseTime}ms moyen (min: ${statistics.minResponseTime}ms, max: ${statistics.maxResponseTime}ms)`,
      timestamp: statistics.lastCheckTime
    },
    {
      name: 'Taux de succès',
      status: statistics.successRate > 90 ? 'healthy' : statistics.successRate > 50 ? 'warning' : 'error',
      message: `${statistics.successRate}% de réussite`,
      timestamp: statistics.lastCheckTime
    }
  ];

  return (
    <div className="flex-1 ml-64">
      <Header title="État de santé" onRefresh={refetch} />
      
      <div className="p-6 space-y-6">
        {/* Alerte de statut global */}
        {overall.status !== 'healthy' && (
          <div className={`border-l-4 p-4 ${overall.status === 'degraded' ? 'bg-warning-50 border-warning-400' : 'bg-error-50 border-error-400'}`}>
            <div className="flex items-center">
              <AlertTriangle className={`h-5 w-5 ${overall.status === 'degraded' ? 'text-warning-600' : 'text-error-600'} mr-3`} />
              <div>
                <h3 className={`font-medium ${overall.status === 'degraded' ? 'text-warning-800' : 'text-error-800'}`}>
                  Système {overall.status === 'degraded' ? 'dégradé' : 'en panne'}
                </h3>
                <p className={`text-sm ${overall.status === 'degraded' ? 'text-warning-700' : 'text-error-700'}`}>
                  {overall.unhealthyServices} service(s) non opérationnel(s) sur {overall.totalServices}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vue d'ensemble */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Statut global"
            value={overall.status.charAt(0).toUpperCase() + overall.status.slice(1)}
            icon={Server}
            color={getOverallStatusColor(overall.status)}
          />
          
          <MetricCard
            title="Services en ligne"
            value={`${overall.healthyServices}/${overall.totalServices}`}
            icon={Activity}
            color={overall.healthPercentage > 75 ? 'success' : overall.healthPercentage > 25 ? 'warning' : 'error'}
          />
          
          <MetricCard
            title="Temps de réponse moyen"
            value={statistics.averageResponseTime}
            unit="ms"
            icon={Zap}
            color={statistics.averageResponseTime < 100 ? 'success' : 'warning'}
          />
          
          <MetricCard
            title="Taux de disponibilité"
            value={overall.healthPercentage}
            unit="%"
            icon={Shield}
            color={overall.healthPercentage > 75 ? 'success' : overall.healthPercentage > 25 ? 'warning' : 'error'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* État des services */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Services</h3>
              <span className="text-sm text-gray-500">
                Dernière vérification: {new Date(overall.timestamp).toLocaleTimeString('fr-FR')}
              </span>
            </div>
            
            <div className="space-y-4">
              {servicesArray.map((service, index) => {
                const Icon = getServiceIcon(service.name);
                const status = getServiceStatus(service);
                
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-gray-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{service.name}</h4>
                          <p className="text-sm text-gray-500">
                            {service.url}
                            {service.healthy && service.details?.services && (
                              <span className="ml-2 text-xs text-success-600">
                                {Object.entries(service.details.services).map(([key, value]) => 
                                  `${key}: ${value}`
                                ).join(', ')}
                              </span>
                            )}
                          </p>
                          {!service.healthy && service.error && (
                            <p className="text-sm text-error-600 mt-1">
                              {service.error}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <StatusIndicator
                        status={status}
                        label=""
                        size="small"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <span className="text-xs text-gray-500">Temps de réponse</span>
                        <p className="text-sm font-medium">{service.responseTime}ms</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Code de statut</span>
                        <p className="text-sm font-medium">
                          {service.statusCode || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Dernière vérification</span>
                        <p className="text-sm font-medium">
                          {new Date(service.timestamp).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contrôles système */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Contrôles système</h3>
            </div>
            
            <div className="space-y-4">
              {systemChecks.map((check, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <StatusIndicator
                      status={check.status}
                      label=""
                      size="small"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{check.name}</h4>
                      <p className="text-sm text-gray-500">{check.message}</p>
                    </div>
                  </div>
                  
                  <span className="text-xs text-gray-400">
                    {new Date(check.timestamp).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Statistiques détaillées */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Statistiques détaillées</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{statistics.totalChecks}</p>
              <p className="text-sm text-gray-500">Vérifications totales</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-success-600">{overall.healthyServices}</p>
              <p className="text-sm text-gray-500">Services sains</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-error-600">{overall.unhealthyServices}</p>
              <p className="text-sm text-gray-500">Services en erreur</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{statistics.successRate}%</p>
              <p className="text-sm text-gray-500">Taux de réussite</p>
            </div>
          </div>
        </div>

        {/* Incidents récents générés automatiquement */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Incidents détectés</h3>
          </div>
          
          <div className="space-y-3">
            {servicesArray
              .filter(service => !service.healthy)
              .map((service, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-error-50 rounded-lg">
                  <div className="status-dot status-error"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-error-800">
                      Service {service.name} non disponible
                    </p>
                    <p className="text-xs text-error-600">
                      {service.error} - {new Date(service.timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))
            }
            
            {overall.healthyServices === overall.totalServices && (
              <div className="flex items-center space-x-3 p-3 bg-success-50 rounded-lg">
                <div className="status-dot status-healthy"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-success-800">
                    Tous les services sont opérationnels
                  </p>
                  <p className="text-xs text-success-600">
                    Dernière vérification : {new Date(overall.timestamp).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthPage;
