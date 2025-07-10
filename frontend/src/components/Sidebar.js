import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Heart, 
  AlertTriangle, 
  Monitor,
  Activity,
  Server,
  Database
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    {
      path: '/',
      icon: Monitor,
      label: 'Dashboard',
      description: 'Vue d\'ensemble'
    },
    {
      path: '/metrics',
      icon: BarChart3,
      label: 'Métriques',
      description: 'Métriques personnalisées'
    },
    {
      path: '/system',
      icon: Server,
      label: 'Système',
      description: 'Métriques système'
    },
    // {
    //   path: '/application',
    //   icon: Activity,
    //   label: 'Application',
    //   description: 'Métriques d\'application'
    // },
    {
      path: '/health',
      icon: Heart,
      label: 'Santé',
      description: 'État des services'
    },
    {
      path: '/alerts',
      icon: AlertTriangle,
      label: 'Alertes',
      description: 'Gestion des alertes'
    },
    // {
    //   path: '/prometheus',
    //   icon: Database,
    //   label: 'Prometheus',
    //   description: 'Métriques Prometheus'
    // }
  ];

  return (
    <div className="bg-white h-screen w-64 shadow-lg border-r border-gray-200 fixed left-0 top-0 z-30">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-600 p-2 rounded-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Metrics</h1>
            <p className="text-sm text-gray-500">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="h-5 w-5" />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Status indicator */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="status-dot status-healthy animate-pulse-slow"></div>
            <span className="text-sm text-gray-600">Service en ligne</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Dernière mise à jour: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
