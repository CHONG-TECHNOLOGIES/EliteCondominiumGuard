import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Chrome, Info } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    console.log('[PWA Install] Initializing install prompt component...');

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    console.log('[PWA Install] Running in standalone mode:', isStandalone || isIOSStandalone);

    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true);
      console.log('[PWA Install] App already installed, hiding prompt');
      return;
    }

    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      console.log('[PWA Install] Days since dismissed:', daysSinceDismissed.toFixed(1));

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        console.log('[PWA Install] Recently dismissed, not showing prompt yet');
        return;
      }
    }

    // Show manual prompt immediately if browser event doesn't fire quickly
    const earlyPromptTimer = setTimeout(() => {
      if (!deferredPrompt) {
        console.log('[PWA Install] Browser event not fired yet, showing manual instructions');
        setShowPrompt(true);
      }
    }, 3000); // Show after 3 seconds if no browser event

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      clearTimeout(earlyPromptTimer);

      console.log('[PWA Install] beforeinstallprompt event fired!');

      // Show prompt immediately
      setTimeout(() => {
        console.log('[PWA Install] Showing native install prompt');
        setShowPrompt(true);
      }, 1000);
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
      clearTimeout(earlyPromptTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // No browser API available, show manual instructions
      setShowManualInstructions(true);
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA installation accepted');
      } else {
        console.log('PWA installation dismissed');
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error prompting install:', error);
      setShowManualInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowManualInstructions(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return {
        browser: 'Chrome',
        icon: <Chrome size={20} className="text-blue-500" />,
        steps: [
          'Clique no menu (⋮) no canto superior direito',
          'Selecione "Instalar aplicação" ou "Adicionar ao ecrã inicial"',
          'Clique em "Instalar" na janela que aparecer'
        ]
      };
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      return {
        browser: 'Safari (iOS)',
        icon: <Smartphone size={20} className="text-gray-600" />,
        steps: [
          'Toque no ícone de partilha (□↑) na parte inferior',
          'Role para baixo e selecione "Adicionar ao Ecrã Início"',
          'Toque em "Adicionar" no canto superior direito'
        ]
      };
    } else if (userAgent.includes('edg')) {
      return {
        browser: 'Edge',
        icon: <Download size={20} className="text-blue-600" />,
        steps: [
          'Clique no menu (⋯) no canto superior direito',
          'Selecione "Aplicações" → "Instalar este site como aplicação"',
          'Clique em "Instalar"'
        ]
      };
    }

    return {
      browser: 'Seu navegador',
      icon: <Info size={20} className="text-slate-500" />,
      steps: [
        'Procure a opção "Instalar" ou "Adicionar ao ecrã inicial" no menu do navegador',
        'Confirme a instalação quando solicitado'
      ]
    };
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  const instructions = getBrowserInstructions();

  // Show manual instructions
  if (showManualInstructions || !deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-blue-50 rounded-lg shrink-0">
              {instructions.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Download size={18} />
                Instalar Elite AccesControl
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Para instalar no <strong>{instructions.browser}</strong>:
              </p>
              <ol className="text-sm text-slate-700 space-y-2 mb-3 list-decimal list-inside">
                {instructions.steps.map((step, idx) => (
                  <li key={idx} className="leading-snug">{step}</li>
                ))}
              </ol>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-xs text-blue-800">
                <strong>Dica:</strong> A instalação permite acesso rápido e funcionamento offline completo.
              </div>
              <div className="mt-3">
                <button
                  onClick={handleDismiss}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Fechar
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
  }

  // Show native install prompt
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
