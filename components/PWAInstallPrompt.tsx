import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { logger } from '@/services/logger';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    logger.info('Initializing install prompt component...');

    // Debug helper - expose reset function globally
    (window as any).resetPWAInstall = () => {
      localStorage.removeItem('pwa-install-dismissed');
      logger.info('Reset complete! Reload page to see install prompt.');
    };

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    logger.info('Running in standalone mode', { data: isStandalone });

    if (isStandalone) {
      setIsInstalled(true);
      logger.info('App already installed, hiding prompt');
      return;
    }

    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      logger.info('Days since dismissed', { detail: String(daysSinceDismissed.toFixed(1)) });

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        logger.info('Recently dismissed, not showing prompt yet');
        return;
      }
    }

    logger.info('Waiting for beforeinstallprompt event...');

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      logger.info('beforeinstallprompt event fired!');

      // Show prompt after 10 seconds
      setTimeout(() => {
        logger.info('Showing install prompt');
        setShowPrompt(true);
      }, 10000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      logger.info('PWA installation accepted');
    } else {
      logger.info('PWA installation dismissed');
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-blue-50 rounded-lg shrink-0">
            <Download className="text-blue-600" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Instalar Elite AccesControl
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Instale a aplicação no seu dispositivo para acesso rápido e funcionamento offline completo.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Instalar Agora
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                Mais Tarde
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-slate-100 rounded transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
