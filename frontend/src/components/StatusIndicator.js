import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

const StatusIndicator = ({ status, label, details, size = 'normal' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
      case 'success':
      case 'up':
        return {
          icon: CheckCircle,
          color: 'text-success-600',
          bgColor: 'bg-success-100',
          dotColor: 'status-healthy'
        };
      case 'warning':
      case 'degraded':
        return {
          icon: AlertCircle,
          color: 'text-warning-600',
          bgColor: 'bg-warning-100',
          dotColor: 'status-warning'
        };
      case 'error':
      case 'critical':
      case 'down':
        return {
          icon: XCircle,
          color: 'text-error-600',
          bgColor: 'bg-error-100',
          dotColor: 'status-error'
        };
      case 'unknown':
      case 'pending':
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          dotColor: 'bg-gray-400'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          dotColor: 'bg-gray-400'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getSize = () => {
    if (size === 'small') return 'h-4 w-4';
    if (size === 'large') return 'h-8 w-8';
    return 'h-5 w-5';
  };

  const getDotSize = () => {
    if (size === 'small') return 'w-2 h-2';
    if (size === 'large') return 'w-4 h-4';
    return 'w-3 h-3';
  };

  return (
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-full ${config.bgColor}`}>
        <Icon className={`${getSize()} ${config.color}`} />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className={`status-dot ${config.dotColor} ${getDotSize()}`}></span>
          <span className="font-medium text-gray-900">{label}</span>
        </div>
        
        {details && (
          <p className="text-sm text-gray-500 mt-1">{details}</p>
        )}
      </div>
    </div>
  );
};

export default StatusIndicator;
