import * as Sentry from '@sentry/react';

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.DEV ? 'development' : 'production',
    release: `eliteaccesscontrol@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

    // Send default PII data (e.g., automatic IP address collection)
    sendDefaultPii: true,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true, // Mask PIN keypad inputs
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of transactions
    tracePropagationTargets: ['localhost', /^https:\/\/.*\.supabase\.co/],

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% in production
    replaysOnErrorSampleRate: 1.0, // 100% on error sessions

    // Enable Sentry logs
    _experiments: {
      enableLogs: true,
    },

    // Release Health
    autoSessionTracking: true,
    attachStacktrace: true,

    // Filter sensitive data (PINs, tokens)
    beforeSend(event) {
      const scrubKeys = ['pin', 'pin_hash', 'password', 'token', 'device_token'];

      if (event.extra) {
        for (const key of scrubKeys) {
          delete event.extra[key];
        }
      }

      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(crumb => {
          if (crumb.data) {
            for (const key of scrubKeys) {
              delete crumb.data[key];
            }
          }
          return crumb;
        });
      }

      return event;
    },
  });

  // Track network status
  setupNetworkTracking();

  // Track Service Worker errors
  setupServiceWorkerTracking();
}

function setupNetworkTracking() {
  let offlineStartTime: number | null = null;

  window.addEventListener('offline', () => {
    offlineStartTime = Date.now();
    Sentry.setTag('network_status', 'offline');
  });

  window.addEventListener('online', () => {
    if (offlineStartTime) {
      const offlineDuration = Date.now() - offlineStartTime;
      Sentry.setMeasurement('offline_duration_ms', offlineDuration, 'millisecond');
      offlineStartTime = null;
    }
    Sentry.setTag('network_status', 'online');
  });
}

function setupServiceWorkerTracking() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('error', (event) => {
      Sentry.captureException((event as ErrorEvent).error, {
        tags: { error_category: 'pwa' },
      });
    });
  }
}
