import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MetricCard = ({ 
  title, 
  value, 
  unit = '', 
  change, 
  changeType = 'neutral',
  icon: Icon,
  color = 'primary',
  size = 'normal'
}) => {
  const getTrendIcon = () => {
    if (changeType === 'increase') return TrendingUp;
    if (changeType === 'decrease') return TrendingDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (changeType === 'increase') return 'text-success-600';
    if (changeType === 'decrease') return 'text-error-600';
    return 'text-gray-500';
  };

  const getCardSize = () => {
    if (size === 'large') return 'p-8';
    if (size === 'small') return 'p-4';
    return 'p-6';
  };

  const getValueSize = () => {
    if (size === 'large') return 'text-4xl';
    if (size === 'small') return 'text-xl';
    return 'text-2xl';
  };

  const TrendIcon = getTrendIcon();

  return (
    <div className={`metric-card ${getCardSize()}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <Icon className={`h-5 w-5 text-${color}-600`} />
            </div>
          )}
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
        
        {change !== undefined && (
          <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {Math.abs(change)}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-2">
        <span className={`font-bold text-gray-900 ${getValueSize()}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && (
          <span className="text-sm text-gray-500 font-medium">{unit}</span>
        )}
      </div>

      {change !== undefined && (
        <p className="text-xs text-gray-500 mt-2">
          {changeType === 'increase' ? 'Augmentation' : 
           changeType === 'decrease' ? 'Diminution' : 'Stable'} par rapport à la période précédente
        </p>
      )}
    </div>
  );
};

export default MetricCard;
