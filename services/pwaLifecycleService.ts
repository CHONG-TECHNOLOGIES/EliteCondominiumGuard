/**
 * PWA Lifecycle Service
 * Handles installation, uninstallation detection, and lifecycle events
 */

import { getDeviceIdentifier } from './deviceUtils';
import { SupabaseService } from './Supabase';

import { db } from './db';

class PWALifecycleService {
  private isInstalled: boolean = false;

  /**
   * Initialize PWA lifecycle tracking
   */
  init() {
    this.detectInstallation();
    this.setupInstallListeners();
    this.setupUninstallDetection();
    this.setupVisibilityTracking();
  }

  /**
   * Detect if app is running as installed PWA
   */
  private detectInstallation() {
    // Check if running in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;

    this.isInstalled = isStandalone || isIOSStandalone;

    if (this.isInstalled) {
      console.log('[PWA Lifecycle] App is running as installed PWA');
      this.markAsInstalled();
    } else {
      console.log('[PWA Lifecycle] App is running in browser');
    }
  }

  /**
   * Listen for PWA installation events
   */
  private setupInstallListeners() {
    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      console.log('[PWA Lifecycle] App was installed');
      this.isInstalled = true;
      this.markAsInstalled();

      // CRITICAL: Clear all old data on first install to ensure a clean state
      void this.clearAllDataOnInstall();
    });

    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      if (e.matches) {
        console.log('[PWA Lifecycle] App entered standalone mode');
        this.isInstalled = true;
        this.markAsInstalled();
      } else {
        console.log('[PWA Lifecycle] App left standalone mode');
        // This could indicate uninstallation
        this.handlePotentialUninstall();
      }
    });
  }

  /**
   * Setup uninstall detection strategies
   * Note: There's no direct "uninstall" event, so we use heuristics
   */
  private setupUninstallDetection() {
    // Strategy 1: Track app launches
    // If the app hasn't been launched in a long time, it might be uninstalled
    this.trackAppLaunch();

    // Strategy 2: Use beforeunload to detect final closure
    window.addEventListener('beforeunload', () => {
      if (this.isInstalled) {
        // Store timestamp of last use
        localStorage.setItem('pwa_last_active', new Date().toISOString());
      }
    });

    // Strategy 3: Service Worker unregistration detection
    this.detectServiceWorkerUnregistration();
  }

  /**
   * Track visibility changes to detect if app is being used
   */
  private setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isInstalled) {
        console.log('[PWA Lifecycle] App became visible');
        this.updateLastSeen();
      }
    });
  }

  /**
   * Mark device as installed in localStorage
   */
  private markAsInstalled() {
    localStorage.setItem('pwa_installed', 'true');
    localStorage.setItem('pwa_install_date', new Date().toISOString());
    this.updateLastSeen();
  }

  /**
   * Track app launch
   */
  private trackAppLaunch() {
    const launchCount = parseInt(localStorage.getItem('pwa_launch_count') || '0', 10);
    localStorage.setItem('pwa_launch_count', (launchCount + 1).toString());
    localStorage.setItem('pwa_last_launch', new Date().toISOString());

    console.log(`[PWA Lifecycle] App launched ${launchCount + 1} times`);
  }

  /**
   * Update last seen timestamp in backend
   */
  private async updateLastSeen() {
    try {
      const deviceId = getDeviceIdentifier();
      await SupabaseService.updateDeviceHeartbeat(deviceId);
      console.log('[PWA Lifecycle] Updated last_seen in backend');
    } catch (err) {
      console.error('[PWA Lifecycle] Failed to update last_seen:', err);
    }
  }

  /**
   * Handle potential uninstallation
   * This is called when we detect the app left standalone mode
   */
  private async handlePotentialUninstall() {
    console.warn('[PWA Lifecycle] Potential uninstall detected!');

    // Check if this is a real uninstall or just the user opening in browser
    const wasInstalled = localStorage.getItem('pwa_installed') === 'true';

    if (wasInstalled) {
      // The app was installed but is no longer in standalone mode
      // This could mean uninstallation
      console.warn('[PWA Lifecycle] App was previously installed but is no longer in standalone mode');

      // We can't immediately decommission because the user might just be testing
      // Instead, we mark this state and wait
      localStorage.setItem('pwa_potential_uninstall', new Date().toISOString());
    }
  }

  /**
   * Detect if service worker was unregistered (strong signal of uninstall)
   */
  private async detectServiceWorkerUnregistration() {
    if (!('serviceWorker' in navigator)) return;

    // Check periodically if service worker is still registered
    setInterval(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();

      if (registrations.length === 0 && this.isInstalled) {
        console.error('[PWA Lifecycle] Service worker unregistered while app is installed!');
        console.error('[PWA Lifecycle] This may indicate app uninstallation');

        // Try to decommission device in background
        await this.attemptBackgroundDecommission();
      }
    }, 60000); // Check every minute
  }

  /**
   * Attempt to decommission device in background
   * This runs when we detect the app might have been uninstalled
   */
  private async attemptBackgroundDecommission() {
    try {
      const deviceId = getDeviceIdentifier();
      console.log('[PWA Lifecycle] Attempting background decommission for:', deviceId);

      // Try to update backend
      const success = await SupabaseService.decommissionDevice(deviceId);

      if (success) {
        console.log('[PWA Lifecycle] ✅ Device decommissioned successfully');
        localStorage.setItem('pwa_decommissioned', 'true');
      } else {
        console.warn('[PWA Lifecycle] ⚠️ Failed to decommission device in backend');
      }
    } catch (err) {
      console.error('[PWA Lifecycle] Error during background decommission:', err);
    }
  }

  /**
   * Clear all local storage and IndexedDB data
   * Used on fresh installations to prevent data carry-over
   */
  private async clearAllDataOnInstall() {
    console.warn('[PWA Lifecycle] Performing fresh install data cleanup...');

    try {
      // 1. Clear IndexedDB
      await db.clearAllData();

      // 2. Clear localStorage (except PWA metadata)
      const pwaInstalled = localStorage.getItem('pwa_installed');
      const pwaInstallDate = localStorage.getItem('pwa_install_date');

      localStorage.clear();

      // Restore PWA metadata
      if (pwaInstalled) localStorage.setItem('pwa_installed', pwaInstalled);
      if (pwaInstallDate) localStorage.setItem('pwa_install_date', pwaInstallDate);

      // 3. Clear session storage
      sessionStorage.clear();

      console.log('[PWA Lifecycle] ✅ Fresh install cleanup complete');
    } catch (err) {
      console.error('[PWA Lifecycle] Failed to clear data on install:', err);
    }
  }

  /**
   * Check if device should be decommissioned based on inactivity
   * Call this on app startup
   */
  async checkInactivityDecommission() {
    const lastActive = localStorage.getItem('pwa_last_active');
    const potentialUninstall = localStorage.getItem('pwa_potential_uninstall');

    if (!lastActive || !potentialUninstall) return;

    const daysSinceActive = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24);

    // If app hasn't been active for 30+ days and we detected potential uninstall
    if (daysSinceActive > 30) {
      console.warn(`[PWA Lifecycle] Device inactive for ${daysSinceActive.toFixed(0)} days`);
      console.warn('[PWA Lifecycle] Decommissioning due to extended inactivity');

      await this.attemptBackgroundDecommission();
    }
  }

  /**
   * Get installation status
   */
  getInstallationStatus() {
    return {
      isInstalled: this.isInstalled,
      installDate: localStorage.getItem('pwa_install_date'),
      lastLaunch: localStorage.getItem('pwa_last_launch'),
      launchCount: parseInt(localStorage.getItem('pwa_launch_count') || '0', 10),
      potentialUninstall: localStorage.getItem('pwa_potential_uninstall'),
      decommissioned: localStorage.getItem('pwa_decommissioned') === 'true'
    };
  }
}

export const pwaLifecycleService = new PWALifecycleService();
