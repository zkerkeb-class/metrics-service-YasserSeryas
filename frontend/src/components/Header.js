import React from 'react';
import { Bell, RefreshCw, Settings, User } from 'lucide-react';

const Header = ({ title, onRefresh, showRefresh = true }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoring et métriques en temps réel
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Refresh Button */}
          {showRefresh && onRefresh && (            <button
              onClick={onRefresh}
              className="btn-secondary flex items-center space-x-2"
              title="Actualiser les données"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualiser</span>
            </button>
          )}

          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-error-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              3
            </span>
          </button>

          {/* Settings */}
          <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
            <Settings className="h-5 w-5" />
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="bg-primary-600 p-2 rounded-full">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">Admin</p>
              <p className="text-xs text-gray-500">Administrateur</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
