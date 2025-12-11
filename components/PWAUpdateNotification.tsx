import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdateNotification: React.FC = () => {
  const [showReload, setShowReload] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('Service Worker registered:', registration);

      // Check for updates every 5 minutes
      if (registration) {
        setInterval(() => {
          console.log('Checking for updates...');
          registration.update();
        }, 5 * 60 * 1000); // 5 minutes
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
    onNeedRefresh() {
      console.log('New version available!');
      setShowReload(true);
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    }
  });

  useEffect(() => {
    if (needRefresh) {
      setShowReload(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setShowReload(false);
    setNeedRefresh(false);
  };

  if (!showReload) {
    return null;
  }

  return (
    <div className="fixed top-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-2xl p-4 text-white">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white/20 rounded-lg shrink-0">
            <RefreshCw className="text-white" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-1">
              Nova Versão Disponível
            </h3>
            <p className="text-sm text-blue-50 mb-3">
              Uma atualização da aplicação está disponível. Atualize agora para obter as últimas funcionalidades e melhorias.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
              >
                Atualizar Agora
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
              >
                Mais Tarde
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Add animation styles to global CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }

  .animate-slide-down {
    animation: slide-down 0.3s ease-out;
  }
`;
document.head.appendChild(style);
