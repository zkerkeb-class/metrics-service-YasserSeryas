import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import websocketService from '../services/websocket';

export const useDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    try {
      const response = await dashboardAPI.getSummary();
      setSummary(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      const response = await dashboardAPI.getRealTimeData();
      setRealTimeData(response.data);
    } catch (err) {
      console.error('Error fetching real-time data:', err);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchRealTimeData()]);
      setLoading(false);
    };

    loadInitialData();

    // Mise à jour en temps réel via WebSocket
    const unsubscribeMetrics = websocketService.subscribe('metrics:update', (data) => {
      setRealTimeData(prev => ({
        ...prev,
        ...data
      }));
    });

    // Refresh périodique du résumé
    const summaryInterval = setInterval(fetchSummary, 300000); // 5 minutes
    
    // Refresh périodique des données temps réel
    const realTimeInterval = setInterval(fetchRealTimeData, 10000); // 10 secondes

    return () => {
      unsubscribeMetrics();
      clearInterval(summaryInterval);
      clearInterval(realTimeInterval);
    };
  }, []);

  return {
    summary,
    realTimeData,
    loading,
    error,
    refetchSummary: fetchSummary,
    refetchRealTime: fetchRealTimeData
  };
};
