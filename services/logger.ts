import * as Sentry from '@sentry/react';

export enum ErrorCategory {
  AUTH = 'auth',
  SYNC = 'sync',
  DEVICE = 'device',
  NETWORK = 'network',
  CAMERA = 'camera',
  STORAGE = 'storage',
  PWA = 'pwa',
  ADMIN = 'admin',
}

export interface LogContext {
  service?: string;
  operation?: string;
  userId?: number;
  condominiumId?: number;
  deviceId?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};
  private isDev = import.meta.env.DEV;

  setContext(ctx: Partial<LogContext>) {
    this.context = { ...this.context, ...ctx };

    if (ctx.service) Sentry.setTag('service', ctx.service);
    if (ctx.userId) Sentry.setUser({ id: String(ctx.userId) });
    if (ctx.condominiumId) Sentry.setTag('condominium_id', String(ctx.condominiumId));
    if (ctx.deviceId) Sentry.setTag('device_id', ctx.deviceId);
  }

  clearContext() {
    this.context = {};
    Sentry.setUser(null);
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (this.isDev) {
      console.log(`[${this.context.service || 'App'}] ${message}`, data || '');
    }

    Sentry.addBreadcrumb({
      category: this.context.service || 'app',
      message,
      level: 'debug',
      data,
    });
  }

  info(message: string, data?: Record<string, unknown>) {
    if (this.isDev) {
      console.log(`[${this.context.service || 'App'}] ${message}`, data || '');
    }

    Sentry.addBreadcrumb({
      category: this.context.service || 'app',
      message,
      level: 'info',
      data,
    });
  }

  warn(message: string, data?: Record<string, unknown>) {
    if (this.isDev) {
      console.warn(`[${this.context.service || 'App'}] ${message}`, data || '');
    }

    Sentry.addBreadcrumb({
      category: this.context.service || 'app',
      message,
      level: 'warning',
      data,
    });
  }

  error(
    message: string,
    error?: Error | unknown,
    category?: ErrorCategory,
    data?: Record<string, unknown>
  ) {
    if (this.isDev) {
      console.error(`[${this.context.service || 'App'}] ${message}`, error, data || '');
    }

    const errorObj = error instanceof Error ? error : new Error(String(error || message));

    Sentry.withScope(scope => {
      scope.setContext('additional', { ...this.context, ...data });
      if (category) scope.setTag('error_category', category);
      Sentry.captureException(errorObj, {
        extra: { message, ...data },
      });
    });
  }

  trackSync(operation: string, status: 'start' | 'progress' | 'success' | 'error', data?: { total?: number; synced?: number; error?: string }) {
    Sentry.addBreadcrumb({
      category: 'sync',
      message: `Sync ${operation}: ${status}`,
      level: status === 'error' ? 'error' : 'info',
      data,
    });

    if (data?.total) {
      Sentry.setMeasurement('sync_total_items', data.total, 'none');
    }
    if (data?.synced) {
      Sentry.setMeasurement('sync_completed_items', data.synced, 'none');
    }
  }

  trackOfflineOperation(operation: string, status: 'queued' | 'synced' | 'failed', data?: Record<string, unknown>) {
    Sentry.addBreadcrumb({
      category: 'offline',
      message: `${operation}: ${status}`,
      level: status === 'failed' ? 'error' : 'info',
      data: { ...data, syncStatus: status },
    });

    if (status === 'failed') {
      Sentry.captureMessage(`Offline operation failed: ${operation}`, 'warning');
    }
  }

  trackAction(action: string, data?: Record<string, unknown>) {
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: action,
      level: 'info',
      data,
    });
  }

  trackHealthScore(score: number) {
    Sentry.setTag('backend_health', String(score));
    Sentry.setMeasurement('backend_health_score', score, 'none');
  }
}

export const logger = new Logger();
