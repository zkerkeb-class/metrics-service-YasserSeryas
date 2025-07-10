import React, { useState } from 'react';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import MetricChart from '../components/MetricChart';
import { LoadingSpinner, ErrorMessage } from '../components/LoadingStates';
import { useSystemMetrics } from '../hooks/useMetrics';
import { 
  Cpu, 
  HardDrive, 
  MemoryStick,
  Network
} from 'lucide-react';

const SystemPage = () => {
  const { systemMetrics, loading, error, refetch } = useSystemMetrics();
  const [timeRange, setTimeRange] = useState('1h');

  // Fonction pour convertir bytes en GB
  const bytesToGB = (bytes) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1);
  };

  // Mock data adapté au nouveau format
  const mockSystemMetrics = {
    success: true,
    system: {
      cpu: {
        usage: 79.18,
        cores: 12
      },
      memory: {
        total: 33460838400,
        used: 23257825280,
        free: 10203013120,
        usagePercent: 69.51
      },
      disk: [
        {
          mount: "C:",
          total: 999261466624,
          used: 918466535424,
          free: 80794931200,
          usagePercent: 91.91
        },
        {
          mount: "E:",
          total: 499896020992,
          used: 407316156416,
          free: 92579864576,
          usagePercent: 81.48
        }
      ]
    },
    timestamp: "2025-06-16T23:27:43.170Z",
    history: {
      cpu: [
        { timestamp: '14:00', value: 75.2 },
        { timestamp: '14:05', value: 77.1 },
        { timestamp: '14:10', value: 79.8 },
        { timestamp: '14:15', value: 82.3 },
        { timestamp: '14:20', value: 79.18 },
        { timestamp: '14:25', value: 76.7 }
      ],
      memory: [
        { timestamp: '14:00', used: 21.8, usagePercent: 65.2 },
        { timestamp: '14:05', used: 22.1, usagePercent: 66.1 },
        { timestamp: '14:10', used: 22.8, usagePercent: 68.1 },
        { timestamp: '14:15', used: 22.5, usagePercent: 67.2 },
        { timestamp: '14:20', used: 23.3, usagePercent: 69.51 },
        { timestamp: '14:25', used: 23.1, usagePercent: 69.0 }
      ]
    }
  };

  const displayMetrics = systemMetrics || mockSystemMetrics;

  if (loading) {
    return (
      <div className="flex-1 ml-64">
        <Header title="Métriques système" />
        <LoadingSpinner text="Chargement des métriques système..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 ml-64">
        <Header title="Métriques système" />
        <ErrorMessage error={error} onRetry={refetch} />
      </div>
    );
  }

  // Null safety check
  if (!displayMetrics || !displayMetrics.success || !displayMetrics.system) {
    return (
      <div className="flex-1 ml-64">
        <Header title="Métriques système" />
        <div className="p-6">
          <div className="text-center text-gray-500">Aucune donnée disponible</div>
        </div>
      </div>
    );
  }

  const { system } = displayMetrics;

  // Calcul du disque principal (plus utilisé ou C:)
  const primaryDisk = system.disk?.find(d => d.mount === "C:") || system.disk?.[0];
  const totalDiskSpace = system.disk?.reduce((sum, disk) => sum + disk.total, 0) || 0;
  const totalDiskUsed = system.disk?.reduce((sum, disk) => sum + disk.used, 0) || 0;

  return (
    <div className="flex-1 ml-64">
      <Header title="Métriques système" onRefresh={refetch} />
      
      <div className="p-6 space-y-6">
        {/* Sélecteur de période */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Surveillance système</h2>
            <p className="text-sm text-gray-500">
              Monitoring en temps réel des ressources système - 
              Dernière mise à jour : {new Date(displayMetrics.timestamp).toLocaleTimeString('fr-FR')}
            </p>
          </div>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="15m">15 minutes</option>
            <option value="1h">1 heure</option>
            <option value="6h">6 heures</option>
            <option value="24h">24 heures</option>
          </select>
        </div>

        {/* Métriques actuelles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Utilisation CPU"
            value={system.cpu?.usage || 0}
            unit="%"
            changeType={(system.cpu?.usage || 0) > 70 ? 'increase' : 'neutral'}
            icon={Cpu}
            color={(system.cpu?.usage || 0) > 80 ? 'error' : (system.cpu?.usage || 0) > 70 ? 'warning' : 'success'}
          />
          
          <MetricCard
            title="Mémoire utilisée"
            value={`${bytesToGB(system.memory?.used || 0)}/${bytesToGB(system.memory?.total || 0)}`}
            unit="GB"
            changeType="neutral"
            icon={MemoryStick}
            color={(system.memory?.usagePercent || 0) > 80 ? 'error' : 'primary'}
          />
          
          <MetricCard
            title="Disque principal"
            value={primaryDisk?.usagePercent || 0}
            unit="%"
            icon={HardDrive}
            color={(primaryDisk?.usagePercent || 0) > 90 ? 'error' : (primaryDisk?.usagePercent || 0) > 80 ? 'warning' : 'primary'}
          />
          
          <MetricCard
            title="Cœurs CPU"
            value={system.cpu?.cores || 0}
            unit="cœurs"
            icon={Cpu}
            color="success"
          />
        </div>

        {/* Détails CPU et Mémoire */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Processeur</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Utilisation actuelle</span>
                <span className="font-medium">{system.cpu.usage}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${system.cpu.usage > 80 ? 'bg-error-500' : system.cpu.usage > 70 ? 'bg-warning-500' : 'bg-success-500'}`}
                  style={{ width: `${system.cpu.usage}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Cœurs</span>
                  <p className="font-medium">{system.cpu.cores}</p>
                </div>
                <div>
                  <span className="text-gray-600">Architecture</span>
                  <p className="font-medium">x64</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Mémoire</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Utilisée</span>
                  <p className="font-medium">{bytesToGB(system.memory.used)} GB</p>
                </div>
                <div>
                  <span className="text-gray-600">Libre</span>
                  <p className="font-medium">{bytesToGB(system.memory.free)} GB</p>
                </div>
                <div>
                  <span className="text-gray-600">Pourcentage</span>
                  <p className="font-medium">{system.memory.usagePercent}%</p>
                </div>
                <div>
                  <span className="text-gray-600">Total</span>
                  <p className="font-medium">{bytesToGB(system.memory.total)} GB</p>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-500 h-2 rounded-full"
                  style={{ width: `${system.memory.usagePercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Graphiques historiques */}
        {displayMetrics.history && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricChart
              title="Utilisation CPU (%)"
              data={displayMetrics.history.cpu || []}
              dataKey="value"
              type="area"
              color="#ef4444"
            />
            
            <MetricChart
              title="Utilisation Mémoire (%)"
              data={displayMetrics.history.memory || []}
              dataKey="usagePercent"
              type="line"
              color="#3b82f6"
            />
          </div>
        )}

        {/* Informations disques */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Stockage</h3>
          </div>
          
          <div className="space-y-4">
            {system.disk?.map((disk, index) => (
              <div key={disk.mount} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">Lecteur {disk.mount}</h4>
                  <span className={`text-sm font-medium ${disk.usagePercent > 90 ? 'text-error-600' : disk.usagePercent > 80 ? 'text-warning-600' : 'text-success-600'}`}>
                    {disk.usagePercent}% utilisé
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${disk.usagePercent > 90 ? 'bg-error-500' : disk.usagePercent > 80 ? 'bg-warning-500' : 'bg-primary-500'}`}
                    style={{ width: `${disk.usagePercent}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Utilisé</span>
                    <p className="font-medium">{bytesToGB(disk.used)} GB</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Libre</span>
                    <p className="font-medium">{bytesToGB(disk.free)} GB</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total</span>
                    <p className="font-medium">{bytesToGB(disk.total)} GB</p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Résumé total */}
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Capacité totale</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Utilisé total</span>
                  <p className="font-medium">{bytesToGB(totalDiskUsed)} GB</p>
                </div>
                <div>
                  <span className="text-gray-600">Espace libre</span>
                  <p className="font-medium">{bytesToGB(totalDiskSpace - totalDiskUsed)} GB</p>
                </div>
                <div>
                  <span className="text-gray-600">Capacité totale</span>
                  <p className="font-medium">{bytesToGB(totalDiskSpace)} GB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemPage;
