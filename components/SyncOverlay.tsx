import { RefreshCw, CheckCircle, AlertCircle, Cloud } from 'lucide-react';

export interface SyncOverlayProps {
  isVisible: boolean;
  message?: string;
  itemsTotal?: number;
  itemsSynced?: number;
  status?: 'syncing' | 'success' | 'error';
}

export function SyncOverlay({
  isVisible,
  message = 'A sincronizar...',
  itemsTotal = 0,
  itemsSynced = 0,
  status = 'syncing'
}: SyncOverlayProps) {
  if (!isVisible) return null;

  const progress = itemsTotal > 0 ? Math.round((itemsSynced / itemsTotal) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-2xl text-center min-w-[300px] max-w-[400px] mx-4">
        {/* Icon */}
        <div className="mb-6">
          {status === 'syncing' && (
            <div className="relative">
              <Cloud className="mx-auto text-blue-500 animate-pulse" size={56} />
              <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-spin" size={24} />
            </div>
          )}
          {status === 'success' && (
            <CheckCircle className="mx-auto text-green-500" size={56} />
          )}
          {status === 'error' && (
            <AlertCircle className="mx-auto text-red-500" size={56} />
          )}
        </div>

        {/* Message */}
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {status === 'syncing' && 'A Sincronizar'}
          {status === 'success' && 'Sincronizado!'}
          {status === 'error' && 'Erro na Sincronização'}
        </h2>
        <p className="text-gray-600 mb-4">{message}</p>

        {/* Progress */}
        {status === 'syncing' && itemsTotal > 0 && (
          <div className="mt-4">
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Progress text */}
            <p className="text-sm text-gray-500">
              {itemsSynced} de {itemsTotal} items ({progress}%)
            </p>
          </div>
        )}

        {/* Syncing indicator */}
        {status === 'syncing' && itemsTotal === 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Warning text */}
        {status === 'syncing' && (
          <p className="text-xs text-gray-400 mt-4">
            Por favor aguarde. Não feche a aplicação.
          </p>
        )}
      </div>
    </div>
  );
}
