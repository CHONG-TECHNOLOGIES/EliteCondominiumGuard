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

const MAX_SERIALIZATION_DEPTH = 5;
const MAX_STRING_LENGTH = 5000;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const truncateString = (value: string): string => (
  value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated ${value.length - MAX_STRING_LENGTH} chars]`
    : value
);

const normalizeValue = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return truncateString(value);
  }

  if (typeof value === 'bigint' || typeof value === 'symbol') {
    return String(value);
  }

  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`;
  }

  if (value instanceof Response) {
    return {
      ok: value.ok,
      redirected: value.redirected,
      status: value.status,
      statusText: value.statusText,
      type: value.type,
      url: value.url
    };
  }

  if (value instanceof Error) {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    const errorDetails: Record<string, unknown> = {
      name: value.name,
      message: value.message,
      stack: value.stack ? truncateString(value.stack) : undefined
    };

    for (const [key, nestedValue] of Object.entries(value)) {
      errorDetails[key] = normalizeValue(nestedValue, depth + 1, seen);
    }

    return errorDetails;
  }

  if (depth >= MAX_SERIALIZATION_DEPTH) {
    return '[MaxDepthExceeded]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, depth + 1, seen));
  }

  if (isRecord(value)) {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    const normalizedEntries = Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeValue(nestedValue, depth + 1, seen)])
    );

    const constructorName = value.constructor?.name;
    if (constructorName && constructorName !== 'Object') {
      return { __type: constructorName, ...normalizedEntries };
    }

    return normalizedEntries;
  }

  return truncateString(String(value));
};

const normalizeContext = (ctx?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!ctx) return undefined;
  return Object.fromEntries(
    Object.entries(ctx).map(([key, value]) => [key, normalizeValue(value)])
  );
};

const getErrorMessage = (error: Error | unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (isRecord(error)) {
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error.details === 'string' && error.details.trim()) {
      return error.details;
    }
  }

  if (error !== null && error !== undefined) {
    return String(error);
  }

  return fallbackMessage;
};

const toErrorInstance = (error: Error | unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) {
    return error;
  }

  const normalizedError = new Error(getErrorMessage(error, fallbackMessage));
  if (isRecord(error) && typeof error.name === 'string' && error.name.trim()) {
    normalizedError.name = error.name;
  }

  return normalizedError;
};

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
    const normalizedContext = normalizeContext({ ...this.context, ...(data ?? {}) });
    const normalizedError = normalizeValue(error);
    const errorObj = toErrorInstance(error, message);

    if (this.isDev) {
      console.error(`[${this.context.service || 'App'}] ${message}`, normalizedError, normalizedContext || '');
    }

    Sentry.withScope(scope => {
      if (normalizedContext) {
        scope.setContext('additional', normalizedContext);
      }

      if (isRecord(normalizedError)) {
        scope.setContext('error_details', normalizedError);
      } else if (normalizedError !== undefined) {
        scope.setExtra('error_details', normalizedError);
      }

      if (category) scope.setTag('error_category', category);
      Sentry.captureException(errorObj, {
        extra: {
          error_details: normalizedError,
          log_message: message,
          ...normalizedContext
        },
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
