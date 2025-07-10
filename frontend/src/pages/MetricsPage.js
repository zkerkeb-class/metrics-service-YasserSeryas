import React, { useState } from 'react';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import MetricChart from '../components/MetricChart';
import { LoadingSpinner, ErrorMessage } from '../components/LoadingStates';
import { useMetrics } from '../hooks/useMetrics';
import { metricsAPI } from '../services/api';
import { 
  Plus, 
  BarChart3, 
  TrendingUp, 
  Activity,
  Timer,
  Gauge
} from 'lucide-react';
import toast from 'react-hot-toast';

const MetricsPage = () => {
  const { metrics, loading, error, refetch } = useMetrics();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMetric, setNewMetric] = useState({
    type: 'counter',
    category: 'application',
    data: { name: '', value: '', description: '' }
  });

  const handleCreateMetric = async (e) => {
    e.preventDefault();
    try {
      await metricsAPI.createCustomMetric(newMetric);
      toast.success('Métrique créée avec succès');
      setShowCreateForm(false);
      setNewMetric({
        type: 'counter',
        category: 'application',
        data: { name: '', value: '', description: '' }
      });
      refetch();
    } catch (error) {
      toast.error('Erreur lors de la création de la métrique');
    }
  };

  // Mock data pour la démo
  const mockMetrics = {
    custom: [
      { name: 'user_registrations', value: 1247, type: 'counter', category: 'business' },
      { name: 'average_session_duration', value: 342, type: 'gauge', category: 'application' },
      { name: 'api_response_time', value: 156, type: 'histogram', category: 'system' },
      { name: 'cache_hit_rate', value: 87.5, type: 'gauge', category: 'system' }
    ],
    trends: [
      { timestamp: '14:00', registrations: 45, sessions: 320 },
      { timestamp: '14:15', registrations: 52, sessions: 335 },
      { timestamp: '14:30', registrations: 38, sessions: 298 },
      { timestamp: '14:45', registrations: 61, sessions: 355 },
      { timestamp: '15:00', registrations: 47, sessions: 342 }
    ]
  };

  const displayMetrics = metrics || mockMetrics;

  if (loading) {
    return (
      <div className="flex-1 ml-64">
        <Header title="Métriques personnalisées" />
        <LoadingSpinner text="Chargement des métriques..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 ml-64">
        <Header title="Métriques personnalisées" />
        <ErrorMessage error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="flex-1 ml-64">
      <Header title="Métriques personnalisées" onRefresh={refetch} />
      
      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Métriques personnalisées</h2>
            <p className="text-sm text-gray-500">Gérez et visualisez vos métriques business et application</p>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle métrique</span>
          </button>
        </div>

        {/* Métriques actuelles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayMetrics.custom?.map((metric, index) => {
            const getIcon = () => {
              switch (metric.type) {
                case 'counter': return TrendingUp;
                case 'gauge': return Gauge;
                case 'histogram': return BarChart3;
                case 'timer': return Timer;
                default: return Activity;
              }
            };

            const getColor = () => {
              switch (metric.category) {
                case 'business': return 'primary';
                case 'application': return 'success';
                case 'system': return 'warning';
                default: return 'primary';
              }
            };

            return (
              <MetricCard
                key={index}
                title={metric.name.replace(/_/g, ' ').toUpperCase()}
                value={metric.value}
                unit={metric.type === 'timer' ? 'ms' : metric.name.includes('rate') ? '%' : ''}
                icon={getIcon()}
                color={getColor()}
              />
            );
          })}
        </div>

        {/* Graphiques des tendances */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricChart
            title="Enregistrements d'utilisateurs"
            data={displayMetrics.trends}
            dataKey="registrations"
            type="bar"
            color="#3b82f6"
          />
          
          <MetricChart
            title="Durée des sessions"
            data={displayMetrics.trends}
            dataKey="sessions"
            type="line"
            color="#22c55e"
          />
        </div>

        {/* Formulaire de création */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Créer une nouvelle métrique
              </h3>
              
              <form onSubmit={handleCreateMetric} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la métrique
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newMetric.data.name}
                    onChange={(e) => setNewMetric({
                      ...newMetric,
                      data: { ...newMetric.data, name: e.target.value }
                    })}
                    placeholder="ex: user_clicks"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newMetric.type}
                    onChange={(e) => setNewMetric({ ...newMetric, type: e.target.value })}
                  >
                    <option value="counter">Compteur</option>
                    <option value="gauge">Jauge</option>
                    <option value="histogram">Histogramme</option>
                    <option value="timer">Minuteur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newMetric.category}
                    onChange={(e) => setNewMetric({ ...newMetric, category: e.target.value })}
                  >
                    <option value="business">Business</option>
                    <option value="application">Application</option>
                    <option value="system">Système</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valeur initiale
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newMetric.data.value}
                    onChange={(e) => setNewMetric({
                      ...newMetric,
                      data: { ...newMetric.data, value: e.target.value }
                    })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="3"
                    value={newMetric.data.description}
                    onChange={(e) => setNewMetric({
                      ...newMetric,
                      data: { ...newMetric.data, description: e.target.value }
                    })}
                    placeholder="Description de la métrique..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
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

export default MetricsPage;
