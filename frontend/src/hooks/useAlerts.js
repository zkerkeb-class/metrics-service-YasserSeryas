import { useState, useEffect, useCallback, useRef } from 'react';
import { alertsAPI } from '../services/api';
import websocketService from '../services/websocket';
import toast from 'react-hot-toast';

export const useAlerts = (filters = {}) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ✅ Utiliser useRef pour stabiliser les filters
  const filtersRef = useRef(filters);
  const hasFiltersChanged = JSON.stringify(filtersRef.current) !== JSON.stringify(filters);
  
  if (hasFiltersChanged) {
    filtersRef.current = filters;
  }

  // ✅ Fonction fetch sans dépendances dans useCallback
  const fetchAlerts = useCallback(async (currentFilters = filtersRef.current) => {
    try {
      setLoading(true);
      const response = await alertsAPI.getAlerts(currentFilters);
      setAlerts(response.data.alerts || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Pas de dépendances

  // ✅ Fonctions d'action sans useCallback pour éviter les dépendances
  const createAlert = async (alertData) => {
    try {
      const response = await alertsAPI.createAlert(alertData);
      setAlerts(prev => [...prev, response.data]);
      toast.success('Alerte créée avec succès');
      return response.data;
    } catch (err) {
      toast.error('Erreur lors de la création de l\'alerte');
      throw err;
    }
  };

  const updateAlert = async (id, alertData) => {
    try {
      const response = await alertsAPI.updateAlert(id, alertData);
      setAlerts(prev => prev.map(alert => 
        alert.id === id ? response.data : alert
      ));
      toast.success('Alerte mise à jour');
      return response.data;
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
      throw err;
    }
  };

  const deleteAlert = async (id) => {
    try {
      await alertsAPI.deleteAlert(id);
      setAlerts(prev => prev.filter(alert => alert.id !== id));
      toast.success('Alerte supprimée');
    } catch (err) {
      toast.error('Erreur lors de la suppression');
      throw err;
    }
  };

  const toggleAlert = async (id) => {
    try {
      const response = await alertsAPI.toggleAlert(id);
      setAlerts(prev => prev.map(alert => 
        alert.id === id ? response.data : alert
      ));
      toast.success('Statut de l\'alerte modifié');
    } catch (err) {
      toast.error('Erreur lors du changement de statut');
      throw err;
    }
  };

  // ✅ Effet séparé pour le fetch initial - UNE SEULE FOIS
  useEffect(() => {
    fetchAlerts(filtersRef.current);
  }, []); // ✅ Tableau vide - exécute une seule fois

  // ✅ Effet séparé pour re-fetch quand les filters changent
  useEffect(() => {
    if (hasFiltersChanged) {
      fetchAlerts(filters);
    }
  }, [hasFiltersChanged, filters, fetchAlerts]);

  // ✅ Effet séparé pour WebSocket
  useEffect(() => {
    const unsubscribe = websocketService.subscribe('alert:triggered', (data) => {
      setAlerts(prev => [data, ...prev]);
      toast.error(`Nouvelle alerte: ${data.message}`, {
        duration: 5000,
      });
    });

    return unsubscribe;
  }, []); // ✅ Pas de dépendances

  return {
    alerts,
    loading,
    error,
    refetch: fetchAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert
  };
};
