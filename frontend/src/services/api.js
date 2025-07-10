import axios from 'axios';

// Configuration de base pour l'API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3011';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour les requêtes
apiClient.interceptors.request.use(
  (config) => {
    // Ajouter un ID de requête unique
    config.headers['X-Request-ID'] = crypto.randomUUID();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Services pour les métriques
export const metricsAPI = {
  // Obtenir toutes les métriques
  getMetrics: () => apiClient.get('/api/metrics/summary'),
  
  // Enregistrer une métrique personnalisée
  createCustomMetric: (data) => apiClient.post('/api/metrics/custom', data),
  
  // Enregistrer une métrique business
  createBusinessMetric: (data) => apiClient.post('/api/metrics/business', data),
  
  // Obtenir les métriques système
  getSystemMetrics: () => apiClient.get('/api/metrics/system'),
  
  // Obtenir les métriques d'application
  getApplicationMetrics: () => apiClient.get('/api/metrics/application'),
  
  // Obtenir les métriques Prometheus
  getPrometheusMetrics: () => apiClient.get('/metrics', {
    headers: { 'Accept': 'text/plain' }
  }),
};

// Services pour la santé
export const healthAPI = {
  // Obtenir le statut global
  getHealthStatus: () => apiClient.get('/api/health'),
  
  // Obtenir le statut d'un service spécifique
  getServiceHealth: (serviceName) => apiClient.get(`/api/health/${serviceName}`),
  
  // Obtenir l'historique de santé
  getHealthHistory: () => apiClient.get('/api/health/history'),
};

// Services pour les alertes
export const alertsAPI = {
  // Obtenir toutes les alertes
  getAlerts: (params = {}) => apiClient.get('/api/alerts', { params }),
  
  // Créer une nouvelle alerte
  createAlert: (data) => apiClient.post('/api/alerts/rules', data),
  
  // Mettre à jour une alerte
  updateAlert: (id, data) => apiClient.put(`/api/alerts/rules/${id}`, data),
  
  // Supprimer une alerte
  deleteAlert: (id) => apiClient.delete(`/api/alerts/rules/${id}`),
  
  // Activer/désactiver une alerte
  toggleAlert: (id) => apiClient.patch(`/api/alerts/rules/${id}/toggle`),
  
  // Obtenir l'historique des alertes
  getAlertHistory: () => apiClient.get('/api/alerts/rules/history'),
};

// Services pour le dashboard
export const dashboardAPI = {
  // Obtenir le résumé du dashboard
  getSummary: () => apiClient.get('/api/dashboard/summary'),
  
  // Obtenir les données en temps réel
  getRealTimeData: () => apiClient.get('/api/dashboard/realtime'),
  
  // Obtenir les statistiques sur une période
  getStatsForPeriod: (period) => apiClient.get('/api/dashboard/stats', {
    params: { period }
  }),
};

export default apiClient;
