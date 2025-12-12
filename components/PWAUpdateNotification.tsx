import React, { useState, useEffect } from 'react';
import { RefreshCw, X, AlertTriangle, Clock } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_REMINDER_INTERVAL = 30 * 60 * 1000; // 30 minutes
const UPDATE_CRITICAL_TIME = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'pwa_update_detected_at';
const DISMISS_COUNT_KEY = 'pwa_update_dismiss_count';

export const PWAUpdateNotification: React.FC = () => {
  const [showReload, setShowReload] = useState(false);
  const [updateDetectedAt, setUpdateDetectedAt] = useState<number | null>(null);
  const [isCritical, setIsCritical] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('[PWA Update] ✅ Service Worker registered:', registration);

      // Check for updates every 5 minutes
      if (registration) {
        console.log('[PWA Update] 🔄 Update checker initialized (checking every 5 minutes)');
        setInterval(() => {
          console.log('[PWA Update] 🔍 Checking for updates...');
          registration.update().then(() => {
            console.log('[PWA Update] ✓ Update check completed');
          }).catch((error) => {
            console.error('[PWA Update] ❌ Update check failed:', error);
          });
        }, 5 * 60 * 1000); // 5 minutes
      }
    },
    onRegisterError(error) {
      console.error('[PWA Update] ❌ Service Worker registration error:', error);
    },
    onNeedRefresh() {
      console.log('[PWA Update] 🎉 NEW VERSION AVAILABLE! Showing update prompt...');
      const now = Date.now();
      setUpdateDetectedAt(now);
      setShowReload(true);

      // Store in localStorage to persist across page reloads
      localStorage.setItem(STORAGE_KEY, now.toString());

      // Reset dismiss count for new update
      localStorage.setItem(DISMISS_COUNT_KEY, '0');
      setDismissCount(0);
    },
    onOfflineReady() {
      console.log('[PWA Update] 📱 App ready to work offline');
    }
  });

  // Restore state from localStorage on mount
  useEffect(() => {
    console.log('[PWA Update] Component mounted, needRefresh state:', needRefresh);

    // Restore update timestamp from localStorage
    const storedTimestamp = localStorage.getItem(STORAGE_KEY);
    const storedDismissCount = localStorage.getItem(DISMISS_COUNT_KEY);

    if (storedTimestamp) {
      const timestamp = parseInt(storedTimestamp);
      setUpdateDetectedAt(timestamp);

      // Restore dismiss count
      if (storedDismissCount) {
        setDismissCount(parseInt(storedDismissCount));
      }

      // Check if update is now critical (>24h old)
      const age = Date.now() - timestamp;
      if (age > UPDATE_CRITICAL_TIME) {
        console.log('[PWA Update] ⚠️ Update is CRITICAL (>24h old)');
        setIsCritical(true);
      }
    }

    if (needRefresh) {
      console.log('[PWA Update] ⚡ Setting showReload to true');
      setShowReload(true);
    }
  }, [needRefresh]);

  // Update time remaining display
  useEffect(() => {
    if (!updateDetectedAt) return;

    const updateTimer = setInterval(() => {
      const age = Date.now() - updateDetectedAt;
      const remaining = UPDATE_CRITICAL_TIME - age;

      if (remaining <= 0) {
        setTimeRemaining('CRÍTICO - Atualize agora!');
        if (!isCritical) {
          setIsCritical(true);
        }
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m até se tornar obrigatório`);
      }
    }, 1000 * 60); // Update every minute

    return () => clearInterval(updateTimer);
  }, [updateDetectedAt, isCritical]);

  // Reminder system: show notification again after 30 minutes
  useEffect(() => {
    if (!showReload && updateDetectedAt && needRefresh) {
      console.log('[PWA Update] ⏰ Setting up reminder (will show again in 30 minutes)');

      const reminderTimeout = setTimeout(() => {
        const age = Date.now() - updateDetectedAt;

        console.log('[PWA Update] ⏰ Reminder triggered - Update age:', Math.round(age / 1000 / 60), 'minutes');

        // Mark as critical after 24h
        if (age > UPDATE_CRITICAL_TIME && !isCritical) {
          console.log('[PWA Update] ⚠️ Update is now CRITICAL');
          setIsCritical(true);
        }

        // Show reminder
        console.log('[PWA Update] 🔔 Showing update reminder (dismissed', dismissCount, 'times)');
        setShowReload(true);

      }, UPDATE_REMINDER_INTERVAL);

      return () => clearTimeout(reminderTimeout);
    }
  }, [showReload, updateDetectedAt, needRefresh, isCritical, dismissCount]);

  const handleUpdate = () => {
    console.log('[PWA Update] 🔄 User clicked "Atualizar Agora" - reloading app...');
    // Clear stored data
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DISMISS_COUNT_KEY);
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    if (isCritical) {
      console.log('[PWA Update] ⚠️ Update is CRITICAL - cannot fully dismiss, only hide temporarily');
      // In critical mode, only allow hiding via X button, not "Mais Tarde"
      return;
    }

    const newDismissCount = dismissCount + 1;
    console.log('[PWA Update] ⏭️ User dismissed update notification (count:', newDismissCount, ')');

    setDismissCount(newDismissCount);
    localStorage.setItem(DISMISS_COUNT_KEY, newDismissCount.toString());

    setShowReload(false);
    // Don't reset needRefresh - we want to show reminder later
  };

  const handleClose = () => {
    console.log('[PWA Update] ❌ User closed notification via X button');
    setShowReload(false);
    // Don't reset needRefresh - will show again based on reminder interval
  };

  if (!showReload) {
    return null;
  }

  return (
    <div className="fixed top-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-down">
      <div className={`rounded-xl shadow-2xl p-4 text-white ${
        isCritical
          ? 'bg-gradient-to-r from-red-600 to-red-700'
          : 'bg-gradient-to-r from-blue-600 to-blue-700'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            isCritical ? 'bg-white/30 animate-pulse' : 'bg-white/20'
          }`}>
            {isCritical ? (
              <AlertTriangle className="text-white" size={24} />
            ) : (
              <RefreshCw className="text-white" size={24} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              {isCritical ? 'Atualização Crítica!' : 'Nova Versão Disponível'}
              {dismissCount > 0 && !isCritical && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  Lembrete {dismissCount}
                </span>
              )}
            </h3>
            <p className="text-sm text-blue-50 mb-2">
              {isCritical
                ? 'Esta atualização deve ser aplicada imediatamente para garantir segurança e funcionalidade.'
                : 'Uma atualização da aplicação está disponível. Atualize agora para obter as últimas funcionalidades e melhorias.'}
            </p>
            {timeRemaining && !isCritical && (
              <div className="flex items-center gap-1 text-xs text-blue-100 mb-3 opacity-80">
                <Clock size={12} />
                <span>{timeRemaining}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                  isCritical
                    ? 'bg-white text-red-600 hover:bg-red-50'
                    : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
              >
                {isCritical ? 'Atualizar Agora!' : 'Atualizar Agora'}
              </button>
              {!isCritical && (
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
                >
                  Mais Tarde
                </button>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
            aria-label="Fechar"
            title={isCritical ? "Ocultar temporariamente (reaparecerá em 30 min)" : "Fechar"}
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
