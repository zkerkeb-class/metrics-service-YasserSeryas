import React from 'react';
import { Loader2, XCircle, Database } from 'lucide-react';

const LoadingSpinner = ({ size = 'normal', text = 'Chargement...' }) => {
  const getSize = () => {
    if (size === 'small') return 'h-4 w-4';
    if (size === 'large') return 'h-8 w-8';
    return 'h-5 w-5';
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className={`${getSize()} animate-spin text-primary-600 mb-2`} />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
};

const ErrorMessage = ({ error, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-error-100 p-3 rounded-full mb-4">
        <XCircle className="h-6 w-6 text-error-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
      <p className="text-sm text-gray-500 mb-4">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Réessayer
        </button>
      )}
    </div>
  );
};

const EmptyState = ({ title = 'Aucune donnée', message = 'Aucune donnée disponible pour le moment.', action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-gray-100 p-3 rounded-full mb-4">
        <Database className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {action}
    </div>
  );
};

export { LoadingSpinner, ErrorMessage, EmptyState };
