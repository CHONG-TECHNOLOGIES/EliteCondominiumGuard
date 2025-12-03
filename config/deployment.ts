/**
 * Deployment Configuration
 *
 * This allows the app to work regardless of where it's deployed.
 * The backend (Supabase) URL is independent of where the frontend is hosted.
 */

export interface DeploymentConfig {
  appUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey: string;
  environment: 'development' | 'staging' | 'production';
}

// Get the current app URL dynamically
const getAppUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

// Environment variables with fallbacks
const getConfig = (): DeploymentConfig => {
  // In development
  if (import.meta.env.DEV) {
    return {
      appUrl: getAppUrl(),
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
      environment: 'development'
    };
  }

  // In production (Vercel, Netlify, or any hosting)
  return {
    appUrl: getAppUrl(),
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    environment: 'production'
  };
};

export const config = getConfig();

/**
 * Important:
 * - The app URL (where frontend is hosted) can change
 * - The Supabase URL (backend) stays the same
 * - Users don't need to reinstall if you change frontend hosting
 * - They only need to reinstall if you change the domain name
 */

export const isLocalhost = config.appUrl.includes('localhost') || config.appUrl.includes('127.0.0.1');
export const isDevelopment = config.environment === 'development';
export const isProduction = config.environment === 'production';
