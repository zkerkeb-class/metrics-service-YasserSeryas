import { useState, useEffect } from 'react';
import { metricsAPI } from '../services/api';

export const useMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await metricsAPI.getMetrics();
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return { metrics, loading, error, refetch: fetchMetrics };
};

export const useSystemMetrics = () => {
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSystemMetrics = async () => {
    try {
      setLoading(true);
      const response = await metricsAPI.getSystemMetrics();
      setSystemMetrics(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return { systemMetrics, loading, error, refetch: fetchSystemMetrics };
};

export const useApplicationMetrics = () => {
  const [applicationMetrics, setApplicationMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApplicationMetrics = async () => {
    try {
      setLoading(true);
      const response = await metricsAPI.getApplicationMetrics();
      setApplicationMetrics(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationMetrics();
    const interval = setInterval(fetchApplicationMetrics, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return { applicationMetrics, loading, error, refetch: fetchApplicationMetrics };
};
