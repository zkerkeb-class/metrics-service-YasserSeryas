import { useState, useEffect, useCallback } from 'react';
import { healthAPI } from '../services/api';
import websocketService from '../services/websocket';

export const useHealth = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchHealthStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await healthAPI.getHealthStatus();
      setHealthStatus(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchHealthStatus();

    // Écouter les changements de santé via WebSocket
    const unsubscribe = websocketService.subscribe('health:change', (data) => {
      setHealthStatus(prevStatus => ({
        ...prevStatus,
        ...data
      }));
    });

    // Refresh périodique
    const interval = setInterval(fetchHealthStatus, 60000); // Refresh every minute

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchHealthStatus]);

  return { healthStatus, loading, error, refetch: fetchHealthStatus };
};

export const useServiceHealth = (serviceName) => {
  const [serviceHealth, setServiceHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServiceHealth = async () => {
      if (!serviceName) return;

      try {
        setLoading(true);
        const response = await healthAPI.getServiceHealth(serviceName);
        setServiceHealth(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceHealth();
    const interval = setInterval(fetchServiceHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [serviceName]);

  return { serviceHealth, loading, error };
};
