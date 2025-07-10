import React, { useState, useCallback, useMemo } from 'react';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import { LoadingSpinner, ErrorMessage } from '../components/LoadingStates';
import { useAlerts } from '../hooks/useAlerts';
import { 
  Plus, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  Bell,
  X
} from 'lucide-react';

const AlertsPage = () => {
  const { alerts, loading, error, refetch, createAlert, deleteAlert, toggleAlert } = useAlerts();
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // État initial mémorisé pour éviter les re-créations
  const initialAlertState = useMemo(() => ({
    name: '',
    condition: '',
    threshold: '',
    severity: 'warning',
    enabled: true
  }), []);

  const [newAlert, setNewAlert] = useState(initialAlertState);

  // Handler mémorisé pour éviter les re-renders
  const handleCreateAlert = useCallback(async (e) => {
    e.preventDefault();
    try {
      await createAlert(newAlert);
      setShowCreateForm(false);
      setNewAlert(initialAlertState);
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  }, [createAlert, newAlert, initialAlertState]);

  // Handlers mémorisés
  const handleDeleteAlert = useCallback((alertId) => {
    deleteAlert(alertId);
  }, [deleteAlert]);

  const handleToggleAlert = useCallback((alertId) => {
    toggleAlert(alertId);
  }, [toggleAlert]);

  const handleCloseForm = useCallback(() => {
    setShowCreateForm(false);
    setNewAlert(initialAlertState);
  }, [initialAlertState]);

  // Mock data pour la démo
  const mockAlerts = useMemo(() => [
    {
      id: '1',
      name: 'CPU Usage High',
      condition: 'cpu_usage > 80',
      threshold: '80%',
      severity: 'critical',
      enabled: true,
      status: 'triggered',
      lastTriggered: new Date(Date.now() - 300000),
      triggerCount: 3
    },
    {
      id: '2',
      name: 'Response Time Slow',
      condition: 'response_time > 500',
      threshold: '500ms',
      severity: 'warning',
      enabled: true,
      status: 'ok',
      lastTriggered: new Date(Date.now() - 3600000),
      triggerCount: 1
    },
    {
      id: '3',
      name: 'Error Rate High',
      condition: 'error_rate > 5',
      threshold: '5%',
      severity: 'critical',
      enabled: false,
      status: 'disabled',
      lastTriggered: null,
      triggerCount: 0
    }
  ], []);

  const displayAlerts = alerts?.length > 0 ? alerts : mockAlerts;

  const getSeverityColor = useCallback((severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'primary';
      default: return 'gray';
    }
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'triggered': return 'error';
      case 'ok': return 'success';
      case 'disabled': return 'gray';
      default: return 'gray';
    }
  }, []);

  // Statistiques calculées de manière mémorisée
  const alertStats = useMemo(() => {
    const activeAlerts = displayAlerts.filter(a => a.status === 'triggered').length;
    const totalAlerts = displayAlerts.length;
    const enabledAlerts = displayAlerts.filter(a => a.enabled).length;
    
    return { activeAlerts, totalAlerts, enabledAlerts };
  }, [displayAlerts]);

  if (loading) {
    return (
      <div className="flex-1 ml-64">
        <Header title="Alertes" />
        <LoadingSpinner text="Chargement des alertes..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 ml-64">
        <Header title="Alertes" />
        <ErrorMessage error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="flex-1 ml-64">
      <Header title="Gestion des alertes" onRefresh={refetch} />
      
      <div className="p-6 space-y-6">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Alertes actives"
            value={alertStats.activeAlerts}
            icon={AlertTriangle}
            color="error"
          />
          
          <MetricCard
            title="Alertes configurées"
            value={alertStats.totalAlerts}
            icon={Settings}
            color="primary"
          />
          
          <MetricCard
            title="Alertes activées"
            value={alertStats.enabledAlerts}
            icon={CheckCircle}
            color="success"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configuration des alertes</h2>
            <p className="text-sm text-gray-500">Gérez vos règles d'alerte et notifications</p>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle alerte</span>
          </button>
        </div>

        {/* Liste des alertes */}
        <div className="card">
          <div className="divide-y divide-gray-200">
            {displayAlerts.map((alert) => (
              <div key={alert.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg bg-${getSeverityColor(alert.severity)}-100`}>
                      <AlertTriangle className={`h-5 w-5 text-${getSeverityColor(alert.severity)}-600`} />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{alert.name}</h3>
                      <p className="text-sm text-gray-500">{alert.condition}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getStatusColor(alert.status)}-100 text-${getStatusColor(alert.status)}-800`}>
                          {alert.status === 'triggered' ? 'Déclenchée' : 
                           alert.status === 'ok' ? 'OK' : 'Désactivée'}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getSeverityColor(alert.severity)}-100 text-${getSeverityColor(alert.severity)}-800`}>
                          {alert.severity === 'critical' ? 'Critique' : 
                           alert.severity === 'warning' ? 'Attention' : 'Info'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right text-sm">
                      <p className="text-gray-900">Seuil: {alert.threshold}</p>
                      <p className="text-gray-500">
                        {alert.lastTriggered ? 
                          `Dernière: ${alert.lastTriggered.toLocaleString()}` :
                          'Jamais déclenchée'}
                      </p>
                      <p className="text-gray-500">{alert.triggerCount} déclenchements</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleAlert(alert.id)}
                        className={`p-2 rounded-lg ${alert.enabled ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-600'}`}
                        title={alert.enabled ? 'Désactiver' : 'Activer'}
                      >
                        <Bell className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="p-2 rounded-lg bg-error-100 text-error-600 hover:bg-error-200"
                        title="Supprimer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulaire de création */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Créer une nouvelle alerte
              </h3>
              
              <form onSubmit={handleCreateAlert} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'alerte
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newAlert.name}
                    onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                    placeholder="ex: CPU Usage High"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newAlert.condition}
                    onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value })}
                    placeholder="ex: cpu_usage > 80"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seuil
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newAlert.threshold}
                    onChange={(e) => setNewAlert({ ...newAlert, threshold: e.target.value })}
                    placeholder="ex: 80%"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sévérité
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newAlert.severity}
                    onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}
                  >
                    <option value="info">Information</option>
                    <option value="warning">Attention</option>
                    <option value="critical">Critique</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enabled"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={newAlert.enabled}
                    onChange={(e) => setNewAlert({ ...newAlert, enabled: e.target.checked })}
                  />
                  <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                    Activer l'alerte
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="btn-secondary flex-1"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
