import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import websocketService from './services/websocket';

// Components
import Sidebar from './components/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import MetricsPage from './pages/MetricsPage';
import HealthPage from './pages/HealthPage';
import SystemPage from './pages/SystemPage';
import AlertsPage from './pages/AlertsPage';

function App() {
  useEffect(() => {
    // Connexion WebSocket au démarrage
    websocketService.connect();
    
    return () => {
      // Nettoyage à la fermeture
      websocketService.disconnect();
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        
        <main className="flex-1">          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/system" element={<SystemPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
          </Routes>
        </main>

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#374151',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
