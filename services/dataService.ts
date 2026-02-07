import { SupabaseService } from './Supabase';
import { db } from './db';
import { ApprovalMode, Visit, VisitEvent, VisitStatus, SyncStatus, Staff, UserRole, Unit, Incident, VisitTypeConfig, ServiceTypeConfig, Condominium, CondominiumStats, Device, Restaurant, Sport, AuditLog, DeviceRegistrationError, Street, PhotoQuality, Resident, ResidentQrCode, QrValidationResult, CondominiumNews, NewsCategory } from '../types';
import bcrypt from 'bcryptjs';
import { getDeviceIdentifier, getDeviceMetadata } from './deviceUtils';
import { logger, ErrorCategory } from '@/services/logger';

// Sync event types for UI integration
export type SyncEventType = 'sync:start' | 'sync:progress' | 'sync:complete' | 'sync:error';

export interface SyncEventDetail {
  total?: number;
  synced?: number;
  message?: string;
  error?: string;
}

class DataService {
  private isOnline: boolean = navigator.onLine;
  private backendHealthScore: number = 3; // Health score
  private currentCondoId: number | null = null;
  private currentCondoDetails: Condominium | null = null;
  private currentDeviceId: string | null = null; // Track device ID (UUID) for visit tracking
  private isSyncing: boolean = false; // Prevent concurrent syncs
  private readonly pendingAuditLogsKey = 'pending_audit_logs';

  constructor() {
    logger.setContext({ service: 'DataService' });
    window.addEventListener('online', () => this.setOnlineStatus(true));
    window.addEventListener('offline', () => this.setOnlineStatus(false));
    this.init();
  }

  /**
   * Emit sync events for UI integration
   * UI components can listen to these events to show sync overlay
   */
  private emitSyncEvent(type: SyncEventType, detail: SyncEventDetail = {}) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }

  private async init() {
    // Immediately verify actual connectivity on startup
    await this.verifyConnectivity();

    // Request persistent storage to prevent browser auto-deletion
    await this.requestPersistentStorage();

    const condoDetails = await this.getDeviceCondoDetails();
    if (condoDetails) {
      this.currentCondoId = condoDetails.id;
      this.currentCondoDetails = condoDetails;
    }

    // Load device ID for visit tracking
    await this.loadDeviceId();

    this.startHealthCheck();
    this.startHeartbeat();
  }

  /**
   * Verify actual connectivity to backend on startup
   * Don't trust navigator.onLine - do a real backend check
   */
  private async verifyConnectivity(): Promise<void> {
    if (!navigator.onLine) {
      logger.info('Browser reports offline - setting offline state');
      this.isOnline = false;
      this.backendHealthScore = 0;
      return;
    }

    logger.info('Verifying backend connectivity...');
    try {
      // Quick backend health check with 3 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nfuglaftnaohzacilike.supabase.co';
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const headers: Record<string, string> = {};
      if (SUPABASE_ANON_KEY) {
        headers.apikey = SUPABASE_ANON_KEY;
        headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
      }
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 401 || response.status === 404) {
        // Backend is reachable (401/404 are expected for HEAD requests)
        logger.info('Backend is reachable');
        this.isOnline = true;
        this.backendHealthScore = 3;
      } else {
        logger.warn('Backend returned non-OK status', { data: response.status });
        this.isOnline = false;
        this.backendHealthScore = 0;
      }
    } catch (error) {
      logger.warn('Backend unreachable - setting offline mode', { error: String(error) });
      this.isOnline = false;
      this.backendHealthScore = 0;
    }
  }

  /**
   * Load device ID from backend for visit tracking
   */
  private async loadDeviceId() {
    try {
      const deviceIdentifier = getDeviceIdentifier();
      if (this.isBackendHealthy) {
        const device = await SupabaseService.getDeviceByIdentifier(deviceIdentifier);
        if (device && device.id) {
          this.currentDeviceId = device.id;
          logger.info('Device ID loaded for visit tracking', { data: device.id });
        }
      }
    } catch (error) {
      logger.warn('Could not load device ID, will track visits without device_id', { error: String(error) });
    }
  }

  /**
   * Request persistent storage to prevent browser from auto-deleting IndexedDB
   * when disk space is low. Critical for kiosk tablets!
   */
  private async requestPersistentStorage() {
    if (!navigator.storage || !navigator.storage.persist) {
      logger.warn('Persistent storage API not supported');
      return;
    }

    try {
      const isPersisted = await navigator.storage.persisted();

      if (!isPersisted) {
        logger.info('Requesting persistent storage...');
        const granted = await navigator.storage.persist();

        if (granted) {
          logger.info('Persistent storage GRANTED - data will not be auto-deleted');
        } else {
          logger.warn('Persistent storage DENIED - data may be deleted if disk is low');
        }
      } else {
        logger.info('Persistent storage already granted');
      }

      // Log storage quota info
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage || 0) / 1024 / 1024;
      const quotaMB = (estimate.quota || 0) / 1024 / 1024;
      const percentUsed = ((estimate.usage || 0) / (estimate.quota || 1) * 100).toFixed(2);

      logger.info('Storage usage:', {
        used: `${usedMB.toFixed(2)} MB`,
        quota: `${quotaMB.toFixed(2)} MB`,
        percentage: `${percentUsed}%`
      });
    } catch (err) {
      logger.error('Error requesting persistent storage', err, ErrorCategory.STORAGE);
    }
  }

  private setOnlineStatus(isOnline: boolean) {
    this.isOnline = isOnline;
    if (isOnline) {
      this.backendHealthScore = 3; // Reset health on reconnect
      void this.flushPendingAuditLogs();
    } else {
      this.backendHealthScore = 0; // Immediately mark as unhealthy when offline
    }
  }

  private startHealthCheck() {
    setInterval(async () => {
      if (this.isOnline) {
        const wasUnhealthy = this.backendHealthScore === 0;

        // Ping Supabase
        const success = await SupabaseService.getServiceTypes().then(res => res.length > 0).catch(() => false);

        if (success) {
          this.backendHealthScore = 3;

          // If backend just recovered, sync pending items automatically
          if (wasUnhealthy) {
            void this.flushPendingAuditLogs();
            logger.info('Backend recovered - auto-syncing pending items...');
            // syncPendingItems already emits all necessary events
            this.syncPendingItems().then(count => {
              if (count > 0) {
                logger.info('Auto-synced pending items after recovery', { count: count });
              }
            }).catch(err => {
              logger.error('Auto-sync after recovery failed', err, ErrorCategory.SYNC);
            });
          }
        } else {
          this.backendHealthScore = Math.max(0, this.backendHealthScore - 1);
          logger.info('Health check failed, score', { data: this.backendHealthScore });
        }
      }
    }, 60000); // Check every minute
  }

  private startHeartbeat() {
    setInterval(async () => {
      if (this.isBackendHealthy && this.currentCondoId) {
        const deviceId = getDeviceIdentifier();
        await SupabaseService.updateDeviceHeartbeat(deviceId);
      }
    }, 300000); // Every 5 minutes
  }

  private get isBackendHealthy(): boolean {
    return this.isOnline && this.backendHealthScore > 0;
  }

  private async isLocalCacheEmpty(): Promise<boolean> {
    const counts = await Promise.all([
      db.condominiums.count(),
      db.devices.count(),
      db.staff.count(),
      db.units.count(),
      db.visitTypes.count(),
      db.serviceTypes.count(),
      db.restaurants.count(),
      db.sports.count(),
      db.incidentTypes.count(),
      db.incidentStatuses.count(),
      db.incidents.count(),
      db.visitEvents.count(),
      db.visits.count()
    ]);

    return counts.every(count => count === 0);
  }

  private async bootstrapSyncIfEmpty(): Promise<void> {
    if (!this.isBackendHealthy || !this.currentCondoId) return;

    const isEmpty = await this.isLocalCacheEmpty();
    if (!isEmpty) return;

    logger.info('Local cache empty - bootstrapping sync from backend...');

    try {
      if (this.currentCondoDetails) {
        await db.condominiums.put(this.currentCondoDetails);
      }

      const [staffList, devices] = await Promise.all([
        SupabaseService.getStaffForSync(this.currentCondoId),
        SupabaseService.getActiveDevicesByCondominium(this.currentCondoId)
      ]);

      if (staffList.length) await db.staff.bulkPut(staffList);
      if (devices.length) await db.devices.bulkPut(devices);

      await Promise.all([
        this.refreshConfigs(this.currentCondoId),
        this.refreshRestaurantsAndSports(this.currentCondoId),
        this.refreshUnits(this.currentCondoId),
        this.refreshIncidentConfigs()
      ]);

      await Promise.all([
        this.getIncidents(),
        this.getTodaysVisits()
      ]);

      logger.info('Bootstrap sync complete');
    } catch (error) {
      logger.error('Bootstrap sync failed', error, ErrorCategory.SYNC);
      this.backendHealthScore--;
    }
  }

  private getStoredUser(): Staff | null {
    try {
      const raw = localStorage.getItem('auth_user');
      if (!raw) return null;
      return JSON.parse(raw) as Staff;
    } catch {
      return null;
    }
  }

  private async getPendingAuditLogs(): Promise<any[]> {
    const setting = await db.settings.get(this.pendingAuditLogsKey);
    if (!setting || !Array.isArray(setting.value)) {
      return [];
    }
    return setting.value;
  }

  private async setPendingAuditLogs(entries: any[]): Promise<void> {
    await db.settings.put({ key: this.pendingAuditLogsKey, value: entries });
  }

  private async enqueueAuditLog(entry: any): Promise<void> {
    const pending = await this.getPendingAuditLogs();
    pending.push(entry);
    await this.setPendingAuditLogs(pending);
  }

  private async flushPendingAuditLogs(): Promise<void> {
    if (!this.isBackendHealthy) return;
    const pending = await this.getPendingAuditLogs();
    if (pending.length === 0) return;
    pending.forEach(entry => SupabaseService.logAudit(entry));
    await this.setPendingAuditLogs([]);
  }

  async logAudit(entry: {
    condominium_id?: number | null;
    actor_id?: number | null;
    action: string;
    target_table: string;
    target_id?: number | string | null;
    details?: any;
  }): Promise<void> {
    const payload = {
      condominium_id: entry.condominium_id ?? this.currentCondoId ?? 0,
      actor_id: entry.actor_id ?? this.getStoredUser()?.id ?? null,
      action: entry.action,
      target_table: entry.target_table,
      target_id: entry.target_id ?? null,
      details: entry.details ?? null
    };

    if (!payload.condominium_id || !payload.action || !payload.target_table) {
      return;
    }

    if (this.isBackendHealthy) {
      SupabaseService.logAudit(payload);
      return;
    }

    await this.enqueueAuditLog(payload);
  }

  async logCallInitiated(payload: {
    phone: string;
    source: 'resident' | 'visitor';
    unitId?: number;
    unitLabel?: string;
    visitId?: number;
    approvalMode?: ApprovalMode;
    context?: string;
    targetTable?: string;
    targetId?: number | null;
  }): Promise<void> {
    const user = this.getStoredUser();
    if (!user?.id || !user.condominium_id || !payload.phone) return;

    const targetTable = payload.targetTable
      || (payload.visitId ? 'visits' : payload.unitId ? 'units' : 'phone_calls');
    const targetId = payload.targetId ?? payload.visitId ?? payload.unitId ?? null;

    const entry = {
      condominium_id: user.condominium_id,
      actor_id: user.id,
      action: 'CALL_INITIATED',
      target_table: targetTable,
      target_id: targetId,
      details: {
        phone: payload.phone,
        source: payload.source,
        unit_id: payload.unitId,
        unit_label: payload.unitLabel,
        visit_id: payload.visitId,
        approval_mode: payload.approvalMode,
        context: payload.context
      }
    };

    if (this.isBackendHealthy) {
      SupabaseService.logAudit(entry);
      return;
    }

    await this.enqueueAuditLog(entry);
  }

  private getAdminScopeCondoId(): number | null {
    const user = this.getStoredUser();
    // SUPER_ADMIN can see all condominiums (returns null = no scope filter)
    // ADMIN can only see their own condominium
    if (user?.role === UserRole.SUPER_ADMIN) {
      return null;
    }
    if (user?.role === UserRole.ADMIN && user.condominium_id) {
      return user.condominium_id;
    }
    return null;
  }

  private getOnlineDeviceCount(devices: Device[]): number {
    const now = Date.now();
    return devices.reduce((count, device) => {
      if (device.status === 'DECOMMISSIONED') return count;
      if (!device.last_seen_at) return count;
      const lastSeen = new Date(device.last_seen_at).getTime();
      if (Number.isNaN(lastSeen)) return count;
      const diffMins = Math.floor((now - lastSeen) / 60000);
      return diffMins < 7 ? count + 1 : count;
    }, 0);
  }

  // --- Device Configuration (Setup) ---

  async isDeviceConfigured(): Promise<boolean> {
    // Quick check: If browser is offline, skip backend checks entirely
    if (!navigator.onLine) {
      logger.info('Browser offline - skipping backend checks');
      this.isOnline = false;
      this.backendHealthScore = 0;
    }

    // PRIORITY 1: If ONLINE, central database is the source of truth
    if (this.isBackendHealthy) {
      logger.info('Online - checking central database first...');

      try {
        // Get local device identifier (fallback to fingerprint if storage is empty)
        let localDeviceId = localStorage.getItem('condo_guard_device_id');
        if (!localDeviceId) {
          localDeviceId = getDeviceIdentifier();
          logger.info('Local device ID missing, using fingerprint', { data: localDeviceId });
        } else {
          logger.info('Local device ID from localStorage', { data: localDeviceId });
        }

        // Try to find device in central database by local device ID
        let centralDevice = null;
        if (localDeviceId) {
          centralDevice = await SupabaseService.getDeviceByIdentifier(localDeviceId);
        }

        // If no device found by local ID, check if there's a device configured for this browser
        // by checking IndexedDB for a previous condominium assignment
        if (!centralDevice) {
          const localSetting = await db.settings.get('device_condo_details');
          if (localSetting) {
            const condoId = (localSetting.value as Condominium).id;
            logger.info('No central device found by local ID, checking by condominium', { data: condoId });

            // Find active device for this condominium
            const devicesForCondo = await SupabaseService.getActiveDevicesByCondominium(condoId);
            if (devicesForCondo.length === 1) {
              centralDevice = devicesForCondo[0];
              logger.info('Found single active device for this condominium', { data: centralDevice.device_identifier });
            }
          }
        }

        if (!centralDevice) {
          logger.warn('No device found in central database - needs configuration');
          return false; // No device registered in central DB
        }

        if (centralDevice.status !== 'ACTIVE') {
          logger.warn('Device status is not ACTIVE', { data: centralDevice.status });
          return false; // Device is inactive
        }

        // SYNC: Get condominium details from central database
        const correctCondo = await SupabaseService.getCondominium(centralDevice.condominium_id);
        if (!correctCondo) {
          logger.error('Condominium not found in central database', null, ErrorCategory.NETWORK);
          return false;
        }

        // SYNC: Update ALL storage layers with central data (source of truth)
        const centralDeviceId = centralDevice.device_identifier;

        // Update IndexedDB (main database)
        await db.settings.put({ key: 'device_condo_details', value: correctCondo });
        await db.settings.put({ key: 'device_id', value: centralDeviceId });

        // Update localStorage (backup + fast access)
        localStorage.setItem('condo_guard_device_id', centralDeviceId);
        localStorage.setItem('device_condo_backup', JSON.stringify(correctCondo));

        logger.info('Synced from central DB → IndexedDB + localStorage:', {
          deviceId: centralDeviceId,
          condo: correctCondo.name
        });

        this.currentCondoDetails = correctCondo;
        this.currentCondoId = correctCondo.id;

        logger.info('Device configured from central database', { data: correctCondo.name });
        await this.bootstrapSyncIfEmpty();
        return true;

      } catch (err) {
        logger.error('Error checking central database', err, ErrorCategory.NETWORK);
        // Fall through to offline checks
      }
    }

    // PRIORITY 2: OFFLINE - Check local cache (IndexedDB)
    logger.info('Offline or central check failed - checking local cache...');
    const localSetting = await db.settings.get('device_condo_details');

    if (localSetting) {
      logger.info('Local device configuration found for condo', { detail: String((localSetting.value as Condominium).name) });

      // OFFLINE: Restore device ID from IndexedDB to localStorage if missing
      try {
        const localDeviceId = localStorage.getItem('condo_guard_device_id');
        if (!localDeviceId) {
          const storedDeviceId = await db.settings.get('device_id');
          if (storedDeviceId && storedDeviceId.value) {
            logger.info('[OFFLINE] Restoring device ID from IndexedDB to localStorage', { data: storedDeviceId.value });
            localStorage.setItem('condo_guard_device_id', storedDeviceId.value as string);
          } else {
            logger.warn('[OFFLINE] No device ID in IndexedDB - device will need to sync when online');
          }
        }

        // Save condominium data to localStorage as backup
        localStorage.setItem('device_condo_backup', JSON.stringify(localSetting.value));
      } catch (e) {
        logger.warn('Failed to sync localStorage', { error: String(e) });
      }

      this.currentCondoDetails = localSetting.value as Condominium;
      this.currentCondoId = this.currentCondoDetails.id;
      return true;
    }

    // PRIORITY 3: Try localStorage backup as last resort
    logger.info('No IndexedDB configuration - checking localStorage backup');
    try {
      const backupData = localStorage.getItem('device_condo_backup');
      if (backupData) {
        const condoData = JSON.parse(backupData) as Condominium;
        logger.info('Restored from localStorage backup', { data: condoData.name });

        // SYNC: Restore to IndexedDB (keep them in sync)
        await db.settings.put({ key: 'device_condo_details', value: condoData });

        // Also restore device_id if available in localStorage
        const localDeviceId = localStorage.getItem('condo_guard_device_id');
        if (localDeviceId) {
          await db.settings.put({ key: 'device_id', value: localDeviceId });
          logger.info('Also restored device_id to IndexedDB', { data: localDeviceId });
        }

        this.currentCondoDetails = condoData;
        this.currentCondoId = condoData.id;
        return true;
      }
    } catch (e) {
      logger.warn('Failed to restore from localStorage', { error: String(e) });
    }

    // No configuration found anywhere
    logger.warn('Device not configured - no data found');
    return false;
  }

  async getDeviceCondoDetails(): Promise<Condominium | null> {
    if (this.currentCondoDetails) return this.currentCondoDetails;
    const setting = await db.settings.get('device_condo_details');
    if (setting) {
      this.currentCondoDetails = setting.value as Condominium;
      this.currentCondoId = this.currentCondoDetails.id;
      return this.currentCondoDetails;
    }
    return null;
  }

  async getAvailableCondominiums(): Promise<Condominium[]> {
    if (this.isBackendHealthy) {
      try {
        // 1. Get all active condominiums
        const allCondos = await SupabaseService.listActiveCondominiums();

        // 2. Get all active devices to check which condos are already assigned
        const allDevices = await SupabaseService.adminGetAllDevices();

        // 3. Create a Set of condominium IDs that already have active devices
        const assignedCondoIds = new Set(
          allDevices
            .filter(d => d.status === 'ACTIVE')
            .map(d => d.condominium_id)
        );

        // 4. Filter out condominiums that are already assigned to active devices
        const availableCondos = allCondos.filter(c => !assignedCondoIds.has(c.id));

        logger.info('Found active condos, already assigned, available for setup', { totalCondos: allCondos.length, assignedCount: assignedCondoIds.size, availableCount: availableCondos.length });

        // 5. Cache available condominiums for offline use
        if (availableCondos.length > 0) {
          await db.condominiums.bulkPut(availableCondos);
        }

        return availableCondos;
      } catch (e) {
        logger.error('Error fetching available condominiums', e, ErrorCategory.NETWORK);
        this.backendHealthScore--;
      }
    }

    // Offline Fallback: Load from local DB
    const localList = await db.condominiums.toArray();
    if (localList.length > 0) {
      return localList;
    }

    return [];
  }

  async configureDevice(condoId: number): Promise<{ success: boolean; error?: string; existingDevices?: any[] }> {
    const condo = await SupabaseService.getCondominium(condoId);
    if (!condo) {
      return { success: false, error: "Condomínio não encontrado" };
    }

    // Check if condominium is already assigned to other active devices
    const deviceId = getDeviceIdentifier();
    const existingDevices = await SupabaseService.getActiveDevicesByCondominium(condo.id, deviceId);

    if (existingDevices.length > 0) {
      logger.warn(`Condominium ${condo.name} is already assigned to ${existingDevices.length} active device(s)`);
      return {
        success: false,
        error: `Este condomínio já está associado a ${existingDevices.length} dispositivo(s) ativo(s). Cada condomínio só pode ter um tablet configurado.`,
        existingDevices
      };
    }

    // Register device with Supabase
    const deviceRegistered = await SupabaseService.registerDevice({
      device_identifier: deviceId,
      device_name: `Tablet - ${condo.name}`,
      condominium_id: condo.id,
      metadata: getDeviceMetadata()
    });

    if (!deviceRegistered) {
      logger.warn('Failed to register device with Supabase, but continuing with local setup');
    }

    // Save configuration locally (IndexedDB + localStorage sync)
    await db.settings.put({ key: 'device_condo_details', value: condo });
    await db.settings.put({ key: 'device_id', value: deviceId });

    // SYNC: Also save to localStorage for redundancy and fast access
    localStorage.setItem('condo_guard_device_id', deviceId);
    localStorage.setItem('device_condo_backup', JSON.stringify(condo));
    logger.info('Device configured - synced to IndexedDB + localStorage');

    this.currentCondoDetails = condo;
    this.currentCondoId = condo.id;
    return { success: true };
  }

  async forceConfigureDevice(condoId: number, adminAuth: Staff): Promise<{ success: boolean; error?: string }> {
    if (!this.isBackendHealthy) {
      return { success: false, error: "Sem conexão com o servidor." };
    }

    // Verify admin role
    if (adminAuth.role !== UserRole.ADMIN && adminAuth.role !== UserRole.SUPER_ADMIN) {
      return { success: false, error: "Apenas administradores podem substituir dispositivos." };
    }

    // Deactivate old devices
    const deactivated = await SupabaseService.deactivateCondoDevices(condoId);
    if (!deactivated) {
      return { success: false, error: "Falha ao desativar dispositivos antigos." };
    }

    // Configure new device
    return this.configureDevice(condoId);
  }

  /**
   * OFFLINE EMERGENCY CONFIGURATION
   * Allows admin to manually configure device when offline by providing condominium ID
   * This creates a minimal local configuration that will sync when online
   */
  async configureDeviceOffline(condoId: number, condoName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deviceId = getDeviceIdentifier();

      // Create minimal condominium object for offline use
      const offlineCondo: Condominium = {
        id: condoId,
        name: condoName,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      };

      // Save to IndexedDB
      await db.settings.put({ key: 'device_condo_details', value: offlineCondo });
      await db.settings.put({ key: 'device_id', value: deviceId });
      await db.condominiums.put(offlineCondo);

      // Create device record in local IndexedDB (will sync to central DB when online)
      // Note: id will be auto-generated by Supabase when synced
      const deviceRecord: Device = {
        device_identifier: deviceId,
        device_name: `Tablet - ${condoName} (Offline Setup)`,
        condominium_id: condoId,
        configured_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        status: 'ACTIVE',
        metadata: getDeviceMetadata()
      };
      await db.devices.put(deviceRecord);

      // Save to localStorage
      localStorage.setItem('condo_guard_device_id', deviceId);
      localStorage.setItem('device_condo_backup', JSON.stringify(offlineCondo));

      this.currentCondoDetails = offlineCondo;
      this.currentCondoId = condoId;

      logger.info('⚠️ OFFLINE configuration saved - will sync when online:', {
        condoId,
        condoName,
        deviceId
      });

      return { success: true };
    } catch (error) {
      logger.error('Offline configuration failed', error, ErrorCategory.NETWORK);
      return { success: false, error: "Falha ao configurar dispositivo offline" };
    }
  }

  /**
   * DEVICE RECOVERY
   * Recovers device configuration when localStorage/IndexedDB is cleared
   * but the device still exists in the central database.
   * Requires admin authentication for security.
   */
  async recoverDeviceConfiguration(
    deviceIdentifier: string,
    adminFirstName: string,
    adminLastName: string,
    adminPin: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isBackendHealthy) {
      return { success: false, error: "Sem conexão com o servidor. Recuperação requer internet." };
    }

    try {
      // Step 1: Verify admin credentials
      const adminAuth = await SupabaseService.verifyStaffLogin(adminFirstName, adminLastName, adminPin);
      if (!adminAuth) {
        return { success: false, error: "Credenciais de administrador inválidas." };
      }

      if (adminAuth.role !== UserRole.ADMIN && adminAuth.role !== UserRole.SUPER_ADMIN) {
        return { success: false, error: "Apenas administradores podem recuperar dispositivos." };
      }

      // Step 2: Fetch device details from central database
      const device = await SupabaseService.getDeviceByIdentifier(deviceIdentifier);
      if (!device) {
        return { success: false, error: "Dispositivo não encontrado no banco central." };
      }

      if (device.status !== 'ACTIVE') {
        return { success: false, error: `Dispositivo está ${device.status}. Apenas dispositivos ATIVOS podem ser recuperados.` };
      }

      if (!device.condominium_id) {
        return { success: false, error: "Dispositivo não está associado a nenhum condomínio." };
      }

      // Step 3: Fetch condominium details
      const condo = await SupabaseService.getCondominium(device.condominium_id);
      if (!condo) {
        return { success: false, error: "Condomínio associado não encontrado." };
      }

      // Step 4: Update all storage layers with recovered data
      // Update IndexedDB
      await db.settings.put({ key: 'device_condo_details', value: condo });
      await db.settings.put({ key: 'device_id', value: deviceIdentifier });

      // Update localStorage
      localStorage.setItem('condo_guard_device_id', deviceIdentifier);
      localStorage.setItem('device_condo_backup', JSON.stringify(condo));

      // Update service state
      this.currentCondoDetails = condo;
      this.currentCondoId = condo.id;

      logger.info('✓ Device configuration recovered:', {
        deviceId: deviceIdentifier,
        condo: condo.name
      });

      // Step 5: Trigger initial data sync
      await this.bootstrapSyncIfEmpty();

      return { success: true };
    } catch (error) {
      logger.error('Device recovery failed', error, ErrorCategory.DEVICE);
      return { success: false, error: "Falha ao recuperar configuração do dispositivo." };
    }
  }

  /**
   * Get all active devices with condominium info (for recovery UI)
   */
  async getAllActiveDevicesForRecovery(): Promise<(Device & { condominium_name?: string })[]> {
    if (!this.isBackendHealthy) {
      return [];
    }
    return SupabaseService.getAllActiveDevicesWithCondoInfo();
  }

  async resetDevice() {
    await db.clearAllData();
    this.currentCondoId = null;
    this.currentCondoDetails = null;
    window.location.hash = '/setup';
  }

  /**
   * Decommissions the current device:
   * 1. Updates device status to DECOMMISSIONED in backend (if online)
   * 2. Clears all local data (IndexedDB + localStorage)
   * 3. Unregisters service worker
   * 4. Redirects to setup page
   */
  async decommissionDevice(): Promise<{ success: boolean; error?: string }> {
    try {
      const deviceId = getDeviceIdentifier();
      const condoDetails = await this.getDeviceCondoDetails();

      logger.info('Starting device decommission...', {
        deviceId,
        condominium: condoDetails?.name
      });

      // Step 1: Update backend if online
      if (this.isBackendHealthy) {
        try {
          await SupabaseService.decommissionDevice(deviceId);
          logger.info('Device marked as DECOMMISSIONED in backend');
        } catch (err) {
          logger.error('Failed to update backend (continuing with local cleanup)', err, ErrorCategory.NETWORK);
          // Continue with local cleanup even if backend fails
        }
      } else {
        logger.warn('Offline - skipping backend update. Device will remain in previous state in central database.');
      }

      // Step 2: Clear IndexedDB
      await db.clearAllData();
      logger.info('IndexedDB cleared');

      // Step 3: Clear localStorage
      localStorage.removeItem('condo_guard_device_id');
      localStorage.removeItem('device_condo_backup');
      localStorage.clear();
      logger.info('localStorage cleared');

      // Step 4: Unregister service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          logger.info('Service worker unregistered');
        }
      }

      // Step 5: Clear cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        logger.info('Cache storage cleared');
      }

      // Reset internal state
      this.currentCondoId = null;
      this.currentCondoDetails = null;
      this.backendHealthScore = 3;

      logger.info('Device decommission complete');

      return { success: true };
    } catch (error) {
      logger.error('Decommission failed', error, ErrorCategory.DEVICE);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // --- Auth & Staff ---
  private async syncStaff(condoId: number) {
    if (!this.isBackendHealthy) return;
    try {
      const staffList = await SupabaseService.getStaffForSync(condoId);
      await db.staff.bulkPut(staffList);
      logger.info('staff members synced.', { length: staffList.length });
    } catch (e) {
      logger.error('Staff sync failed', e, ErrorCategory.SYNC);
      this.backendHealthScore--;
    }
  }

  async login(firstName: string, lastName: string, pin: string): Promise<Staff | null> {
    const deviceCondoDetails = await this.getDeviceCondoDetails();
    const deviceCondoId = deviceCondoDetails?.id;
    if (!deviceCondoId) throw new Error("Dispositivo não configurado");

    let failureCode: string | null = null;
    let failureReason: string | null = null;
    let failureStage: 'online' | 'offline' | null = null;

    const setFailure = (code: string, reason: string, stage: 'online' | 'offline') => {
      if (!failureCode || failureCode === 'OFFLINE_MODE') {
        failureCode = code;
        failureReason = reason;
        failureStage = stage;
      }
    };

    if (this.isBackendHealthy) {
      try {
        const staff = await SupabaseService.verifyStaffLogin(firstName, lastName, pin);
        if (staff) {
          if (staff.role !== UserRole.SUPER_ADMIN) {
            if (String(staff.condominium_id) !== String(deviceCondoId)) {
              const staffCondoName = staff.condominium?.name
                || (await db.condominiums.get(staff.condominium_id))?.name;
              const deviceCondoName = deviceCondoDetails?.name
                || (deviceCondoId ? (await db.condominiums.get(deviceCondoId))?.name : undefined);
              const staffCondoLabel = staffCondoName || 'Desconhecido';
              const deviceCondoLabel = deviceCondoName || 'Desconhecido';

              setFailure(
                'CONDO_MISMATCH',
                `Acesso negado: utilizador é de ${staffCondoLabel}, dispositivo está em ${deviceCondoLabel}.`,
                'online'
              );
              throw new Error(`Acesso Negado: Utilizador pertence ao condomínio ${staffCondoLabel}, mas o tablet está no ${deviceCondoLabel}.`);
            }
          }
          await this.syncStaff(deviceCondoId); // Sync all staff after a successful login
          await this.refreshConfigs(deviceCondoId);
          await this.logAudit({
            condominium_id: staff.condominium_id ?? deviceCondoId,
            actor_id: staff.id,
            action: 'LOGIN',
            target_table: 'staff',
            target_id: staff.id,
            details: {
              method: 'pin',
              offline: false,
              device_identifier: getDeviceIdentifier()
            }
          });
          return staff;
        }
        setFailure('INVALID_CREDENTIALS', 'Credenciais inválidas.', 'online');
      } catch (e) {
        logger.error('Login online falhou, tentando offline', e, ErrorCategory.AUTH);
        if (!failureCode) {
          setFailure('ONLINE_ERROR', 'Falha ao autenticar online.', 'online');
        }
        this.backendHealthScore--;
      }
    } else {
      setFailure('OFFLINE_MODE', 'Sem ligação ao servidor.', 'offline');
    }

    // --- OFFLINE FALLBACK ---
    const localStaff = await db.staff.where({ first_name: firstName, last_name: lastName }).first();
    if (localStaff?.pin_hash) {
      const isValid = await bcrypt.compare(pin, localStaff.pin_hash);
      if (isValid) {
        logger.warn('Login OFFLINE bem-sucedido.');
        await this.logAudit({
          condominium_id: localStaff.condominium_id ?? deviceCondoId,
          actor_id: localStaff.id,
          action: 'LOGIN',
          target_table: 'staff',
          target_id: localStaff.id,
          details: {
            method: 'pin',
            offline: true,
            device_identifier: getDeviceIdentifier()
          }
        });
        return localStaff;
      }
      setFailure('OFFLINE_INVALID_PIN', 'PIN inválido (offline).', 'offline');
    } else {
      setFailure('OFFLINE_USER_NOT_FOUND', 'Utilizador não encontrado no cache offline.', 'offline');
    }

    await this.logAudit({
      condominium_id: deviceCondoId,
      actor_id: null,
      action: 'LOGIN_FAILED',
      target_table: 'staff',
      target_id: null,
      details: {
        first_name: firstName,
        last_name: lastName,
        offline: !this.isBackendHealthy,
        device_identifier: getDeviceIdentifier(),
        failure_code: failureCode,
        failure_reason: failureReason,
        failure_stage: failureStage
      }
    });
    throw new Error("Credenciais inválidas ou sem acesso offline.");
  }

  // --- QR Code Validation (Online Only) ---
  async validateQrCode(qrCode: string): Promise<QrValidationResult | null> {
    // QR validation REQUIRES online connection for security
    if (!this.isBackendHealthy) {
      logger.warn('QR validation requires online connection');
      return {
        is_valid: false,
        resident_id: null,
        unit_id: null,
        visitor_name: null,
        visitor_phone: null,
        purpose: null,
        notes: null,
        message: 'Validação de QR requer ligação à internet.'
      };
    }

    try {
      const result = await SupabaseService.validateQrCode(qrCode);

      if (result) {
        // Log the QR validation attempt for audit
        await this.logAudit({
          condominium_id: this.currentCondoId,
          actor_id: null,
          action: result.is_valid ? 'QR_VALIDATED' : 'QR_VALIDATION_FAILED',
          target_table: 'resident_qr_codes',
          target_id: null,
          details: {
            qr_code: qrCode,
            is_valid: result.is_valid,
            message: result.message,
            visitor_name: result.visitor_name,
            unit_id: result.unit_id
          }
        });
      }

      return result;
    } catch (error) {
      logger.error('QR validation failed', error, ErrorCategory.NETWORK);
      this.backendHealthScore--;
      return {
        is_valid: false,
        resident_id: null,
        unit_id: null,
        visitor_name: null,
        visitor_phone: null,
        purpose: null,
        notes: null,
        message: 'Erro ao validar código QR.'
      };
    }
  }

  // --- Configurações (Cache-then-Network) ---
  private async refreshConfigs(condoId: number) {
    if (!this.isBackendHealthy) return;
    logger.info('refreshConfigs called for condo', { data: condoId });
    try {
      const vt = await SupabaseService.getVisitTypes(condoId);
      logger.debug('Received visit types from Supabase', { count: vt.length, data: vt });
      if (vt.length) {
        await db.visitTypes.bulkPut(vt);
        logger.info('Visit types saved to IndexedDB');
      }

      const st = await SupabaseService.getServiceTypes();
      logger.debug('Received service types from Supabase', { arg1: st.length, arg2: 'items' });
      if (st.length) await db.serviceTypes.bulkPut(st);
    } catch (e) {
      logger.error('Config sync failed', e, ErrorCategory.SYNC);
      this.backendHealthScore--;
    }
  }

  async getVisitTypes(): Promise<VisitTypeConfig[]> {
    const local = await db.visitTypes.toArray();
    logger.debug('getVisitTypes - Local cache', { arg1: local.length, arg2: 'items' });

    // If we have local data, return it and sync in background
    if (local.length > 0) {
      logger.info('Returning cached visit types');
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshConfigs(this.currentCondoId); // Fire-and-forget
      }
      return local;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      logger.info('Fetching visit types from backend for condo', { data: this.currentCondoId });
      await this.refreshConfigs(this.currentCondoId);
      const synced = await db.visitTypes.toArray();
      logger.debug('Synced visit types', { arg1: synced.length, arg2: 'items' });
      if (synced.length > 0) return synced;
    } else {
      logger.warn('Backend unhealthy or no condo ID. Health', { detail: String(this.isBackendHealthy, 'CondoID:', this.currentCondoId) });
    }

    // Fallback to hardcoded defaults
    logger.warn('Using hardcoded fallback visit types');
    return [
      { id: 'vt1', name: 'Visitante', icon_key: 'USER', requires_service_type: false },
      { id: 'vt4', name: 'Serviço', icon_key: 'WRENCH', requires_service_type: true },
    ];
  }

  async getServiceTypes(): Promise<ServiceTypeConfig[]> {
    const local = await db.serviceTypes.toArray();

    // If we have local data, return it and sync in background
    if (local.length > 0) {
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshConfigs(this.currentCondoId); // Fire-and-forget
      }
      return local;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      await this.refreshConfigs(this.currentCondoId);
      const synced = await db.serviceTypes.toArray();
      if (synced.length > 0) return synced;
    }

    // Fallback to hardcoded default
    return [{ id: 'st1', name: 'Obras' }];
  }

  // --- Restaurants ---
  async getRestaurants(): Promise<Restaurant[]> {
    const local = await db.restaurants.toArray();

    // If we have local data, return it and sync in background
    if (local.length > 0) {
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshRestaurantsAndSports(this.currentCondoId); // Fire-and-forget
      }
      return local;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      await this.refreshRestaurantsAndSports(this.currentCondoId);
      const synced = await db.restaurants.toArray();
      if (synced.length > 0) return synced;
    }

    return [];
  }

  // --- Sports ---
  async getSports(): Promise<Sport[]> {
    const local = await db.sports.toArray();

    // If we have local data, return it and sync in background
    if (local.length > 0) {
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshRestaurantsAndSports(this.currentCondoId); // Fire-and-forget
      }
      return local;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      await this.refreshRestaurantsAndSports(this.currentCondoId);
      const synced = await db.sports.toArray();
      if (synced.length > 0) return synced;
    }

    return [];
  }

  private async refreshRestaurantsAndSports(condoId: number) {
    if (!this.isBackendHealthy) return;
    try {
      const restaurants = await SupabaseService.getRestaurants(condoId);
      if (restaurants.length) await db.restaurants.bulkPut(restaurants);

      const sports = await SupabaseService.getSports(condoId);
      if (sports.length) await db.sports.bulkPut(sports);
    } catch (e) {
      logger.error('Restaurants/Sports sync failed', e, ErrorCategory.SYNC);
      this.backendHealthScore--;
    }
  }

  // --- News ---
  async getNews(): Promise<CondominiumNews[]> {
    // Calculate 7 days ago for filtering
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get local news filtered by condominium and date
    const local = this.currentCondoId
      ? await db.news
          .where('condominium_id')
          .equals(this.currentCondoId)
          .toArray()
      : await db.news.toArray();

    // Filter by last 7 days
    const filteredLocal = local.filter(n =>
      n.created_at && new Date(n.created_at) >= sevenDaysAgo
    ).sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    // If we have local data, return it and sync in background
    if (filteredLocal.length > 0) {
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshNews(this.currentCondoId); // Fire-and-forget
      }
      return filteredLocal;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      await this.refreshNews(this.currentCondoId);
      const synced = await db.news
        .where('condominium_id')
        .equals(this.currentCondoId)
        .toArray();
      return synced.filter(n =>
        n.created_at && new Date(n.created_at) >= sevenDaysAgo
      ).sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }

    return [];
  }

  private async refreshNews(condoId: number) {
    if (!this.isBackendHealthy) return;
    try {
      const news = await SupabaseService.getNews(condoId, 7);
      if (news.length) {
        // Clear old news for this condo first, then add fresh
        await db.news.where('condominium_id').equals(condoId).delete();
        await db.news.bulkPut(news);
      }
    } catch (e) {
      logger.error('News sync failed', e, ErrorCategory.SYNC);
      this.backendHealthScore--;
    }
  }

  // --- Admin News Management ---
  async adminGetAllNews(condominiumId?: number): Promise<CondominiumNews[]> {
    const scopedCondoId = this.getAdminScopeCondoId();
    const effectiveCondoId = scopedCondoId ?? condominiumId;
    return await SupabaseService.adminGetAllNews(effectiveCondoId);
  }

  async adminCreateNews(news: Partial<CondominiumNews>): Promise<CondominiumNews | null> {
    const created = await SupabaseService.adminCreateNews(news);
    if (created) {
      await this.logAudit({
        action: 'CREATE',
        target_table: 'condominium_news',
        target_id: created.id,
        condominium_id: created.condominium_id,
        details: { title: created.title }
      });
    }
    return created;
  }

  async adminUpdateNews(id: number, news: Partial<CondominiumNews>, auditDetails?: any): Promise<CondominiumNews | null> {
    const updated = await SupabaseService.adminUpdateNews(id, news);
    if (updated) {
      await this.logAudit({
        action: 'UPDATE',
        target_table: 'condominium_news',
        target_id: id,
        condominium_id: updated.condominium_id,
        details: auditDetails ?? { title: updated.title }
      });
    }
    return updated;
  }

  async adminDeleteNews(id: number, newsTitle?: string): Promise<boolean> {
    const result = await SupabaseService.adminDeleteNews(id);
    if (result) {
      await this.logAudit({
        action: 'DELETE',
        target_table: 'condominium_news',
        target_id: id,
        details: { title: newsTitle }
      });
    }
    return result;
  }

  // --- News Categories ---
  async getNewsCategories(): Promise<NewsCategory[]> {
    return await SupabaseService.getNewsCategories();
  }

  async adminCreateNewsCategory(category: Partial<NewsCategory>): Promise<NewsCategory | null> {
    const created = await SupabaseService.adminCreateNewsCategory(category);
    if (created) {
      await this.logAudit({
        action: 'CREATE',
        target_table: 'news_categories',
        target_id: created.id,
        details: { name: created.name, label: created.label }
      });
    }
    return created;
  }

  async adminUpdateNewsCategory(id: number, category: Partial<NewsCategory>, auditDetails?: any): Promise<NewsCategory | null> {
    const updated = await SupabaseService.adminUpdateNewsCategory(id, category);
    if (updated) {
      await this.logAudit({
        action: 'UPDATE',
        target_table: 'news_categories',
        target_id: id,
        details: auditDetails ?? { name: updated.name, label: updated.label }
      });
    }
    return updated;
  }

  async adminDeleteNewsCategory(id: number, categoryName?: string): Promise<boolean> {
    const result = await SupabaseService.adminDeleteNewsCategory(id);
    if (result) {
      await this.logAudit({
        action: 'DELETE',
        target_table: 'news_categories',
        target_id: id,
        details: { name: categoryName }
      });
    }
    return result;
  }

  // --- News Image Upload ---
  async uploadNewsImage(file: File, condominiumId: number, newsId: number): Promise<string | null> {
    return await SupabaseService.uploadNewsImage(file, condominiumId, newsId);
  }

  async deleteNewsImage(imageUrl: string): Promise<boolean> {
    return await SupabaseService.deleteNewsImage(imageUrl);
  }

  // --- Units ---
  async getUnits(): Promise<Unit[]> {
    const local = this.currentCondoId
      ? await db.units.where('condominium_id').equals(this.currentCondoId).toArray()
      : await db.units.toArray();

    // If we have local data, return it and sync in background
    if (local.length > 0) {
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshUnits(this.currentCondoId); // Fire-and-forget
      }
      return local;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      await this.refreshUnits(this.currentCondoId);
      const synced = await db.units.toArray();
      if (synced.length > 0) return synced;
    }

    return [];
  }

  private async cacheResidentsFromUnits(units: Unit[]): Promise<void> {
    const residents = units.flatMap(unit => (unit.residents || []).map(resident => ({
      ...resident,
      // FORCE overwrite condominium_id from the unit to ensure consistency
      condominium_id: unit.condominium_id,
      unit_id: resident.unit_id ?? unit.id
    })));

    if (residents.length > 0) {
      await db.residents.bulkPut(residents);
      logger.info('Cached residents from units', { length: residents.length });
    }
  }

  // Fetch units with residents (online only)
  async getUnitsWithResidents(condoId?: number): Promise<Unit[]> {
    const targetCondoId = condoId ?? this.currentCondoId;
    if (!this.isBackendHealthy || !targetCondoId) {
      // Offline: Return units without residents
      return await this.getUnits();
    }

    try {
      const unitsWithResidents = await SupabaseService.getUnitsWithResidents(targetCondoId);
      const scopedUnits = unitsWithResidents.filter(unit => unit.condominium_id === targetCondoId);

      // Cache units (without residents to save space)
      const unitsOnly = scopedUnits.map(u => {
        const { residents, ...unitWithoutResidents } = u;
        return unitWithoutResidents;
      });
      if (unitsOnly.length) await db.units.bulkPut(unitsOnly);
      await this.cacheResidentsFromUnits(scopedUnits);

      return scopedUnits;
    } catch (e) {
      logger.error('Failed to fetch units with residents', e, ErrorCategory.NETWORK);
      this.backendHealthScore--;
      // RETHROW error so callers (like getResidentDirectory) can fallback to their own robust cache logic
      throw e;
    }
  }

  async getResidentDirectory(condoId?: number): Promise<{ residents: Resident[]; units: Unit[] }> {
    const targetCondoId = condoId ?? this.currentCondoId;

    logger.info('getResidentDirectory called. condoId arg: , currentCondoId: , target', { condoId: condoId, currentCondoId: this.currentCondoId, targetCondoId: targetCondoId });

    if (targetCondoId === null || targetCondoId === undefined) {
      logger.warn('getResidentDirectory called without targetCondoId. Returning empty.');
      return { residents: [], units: [] };
    }

    // 1. Try to fetch online first if possible (best data freshness)
    if (this.isBackendHealthy) {
      try {
        logger.info('Fetching online resident directory (RPC - admin) for condo', { targetCondoId: targetCondoId });

        const [residentsRaw, unitsRaw] = await Promise.all([
          SupabaseService.adminGetResidents(targetCondoId),
          SupabaseService.getUnitsWithResidents(targetCondoId)
        ]);

        // Strict filtering to prevent cross-contamination
        const residents = residentsRaw.filter(r => r.condominium_id === targetCondoId);
        const unitsOnly = unitsRaw
          .filter(u => u.condominium_id === targetCondoId)
          .map(u => {
            const { residents, ...rest } = u;
            return rest;
          });

        logger.info('RPC Success. Cached residents, units.', { residentsCount: residents.length, unitsCount: unitsOnly.length });

        if (unitsOnly.length) await db.units.bulkPut(unitsOnly);
        if (residents.length) await db.residents.bulkPut(residents);

        return { residents, units: unitsOnly };
      } catch (e) {
        logger.warn('Online resident fetch failed, falling back to cache', { error: String(e) });
      }
    }

    // 2. Offline/Fallback: efficient local query
    logger.info('Fetching resident directory from cache for condo', { targetCondoId: targetCondoId });

    const [cachedResidents, cachedUnits] = await Promise.all([
      db.residents.where('condominium_id').equals(targetCondoId).toArray(),
      db.units.where('condominium_id').equals(targetCondoId).toArray()
    ]);

    logger.info('Found cached: residents, units', { residentsCount: cachedResidents.length, unitsCount: cachedUnits.length });

    return {
      residents: cachedResidents,
      units: cachedUnits
    };
  }

  private async refreshUnits(condoId: number) {
    if (!this.isBackendHealthy) return;
    try {
      const units = await SupabaseService.getUnitsWithResidents(condoId);
      const scopedUnits = units.filter(unit => unit.condominium_id === condoId);
      // Save only unit data (without residents) to local DB
      const unitsOnly = scopedUnits.map(u => {
        const { residents, ...unitWithoutResidents } = u;
        return unitWithoutResidents;
      });
      if (unitsOnly.length) await db.units.bulkPut(unitsOnly);
      await this.cacheResidentsFromUnits(scopedUnits);
    } catch (e) {
      logger.error('Units sync failed', e, ErrorCategory.SYNC);
      this.backendHealthScore--;
    }
  }

  // --- Visits ---
  async getTodaysVisits(): Promise<Visit[]> {
    const today = new Date().toISOString().split('T')[0];

    // PRIORITY 1: If ONLINE, fetch ONLY from central database (source of truth)
    if (this.isBackendHealthy && this.currentCondoId) {
      try {
        logger.info('ONLINE - fetching today\'s visits from Supabase (ignoring cache)...');
        const backendVisits = await SupabaseService.getTodaysVisits(this.currentCondoId);

        const localVisits = await db.visits
          .where('check_in_at')
          .between(`${today}T00:00:00`, `${today}T23:59:59`, true, true)
          .toArray();

        // Cache fresh backend data
        if (backendVisits.length > 0) {
          await db.visits.bulkPut(backendVisits);
          logger.info('Cached visits from backend', { length: backendVisits.length });
        }

        // Merge: backend visits + any pending local changes + local-only synced visits not returned yet
        const pendingLocalVisits = localVisits.filter(v => v.sync_status === SyncStatus.PENDING_SYNC);
        const merged = new Map<number, Visit>();
        backendVisits.forEach(v => merged.set(v.id, v));
        pendingLocalVisits.forEach(v => merged.set(v.id, v));
        localVisits
          .filter(v => v.sync_status === SyncStatus.SYNCED && !merged.has(v.id))
          .forEach(v => merged.set(v.id, v));
        const allVisits = Array.from(merged.values());

        logger.info('Returning backend visits + pending local', { backendCount: backendVisits.length, pendingCount: pendingLocalVisits.length });

        return allVisits.sort((a, b) =>
          new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime()
        );
      } catch (e) {
        logger.error('Failed to fetch from backend, falling back to local cache', e, ErrorCategory.NETWORK);
        this.backendHealthScore--;
        // Fall through to offline mode
      }
    }

    // PRIORITY 2: OFFLINE - return only local cached visits
    logger.info('OFFLINE - fetching today\'s visits from local cache...');
    const localVisits = await db.visits
      .where('check_in_at')
      .between(`${today}T00:00:00`, `${today}T23:59:59`, true, true)
      .toArray();

    logger.info('Returning visits from local cache', { length: localVisits.length });

    return localVisits.sort((a, b) =>
      new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime()
    );
  }

  async getVisitEvents(visitId: number): Promise<VisitEvent[]> {
    const localEvents = await db.visitEvents
      .where('visit_id')
      .equals(visitId)
      .toArray();

    if (localEvents.length > 0) {
      if (this.isBackendHealthy && visitId > 0) {
        this.refreshVisitEvents(visitId);
      }
      return localEvents.sort((a, b) =>
        new Date(a.event_at).getTime() - new Date(b.event_at).getTime()
      );
    }

    if (this.isBackendHealthy && visitId > 0) {
      return await this.refreshVisitEvents(visitId);
    }

    return [];
  }

  private async refreshVisitEvents(visitId: number): Promise<VisitEvent[]> {
    if (!this.isBackendHealthy || visitId <= 0) return [];

    try {
      const events = await SupabaseService.getVisitEvents(visitId);
      if (events.length) {
        const normalized = events.map((event) => ({
          ...event,
          sync_status: SyncStatus.SYNCED
        }));
        await db.visitEvents.bulkPut(normalized);
      }
      return events.sort((a, b) =>
        new Date(a.event_at).getTime() - new Date(b.event_at).getTime()
      );
    } catch (e) {
      this.backendHealthScore--;
      return [];
    }
  }

  private getVisitEventActorId(explicitActorId?: number): number | undefined {
    if (explicitActorId) return explicitActorId;
    return this.getStoredUser()?.id;
  }

  private async createVisitEvent(
    visitId: number,
    status: VisitStatus,
    eventAt: string,
    actorId?: number
  ): Promise<void> {
    const event: VisitEvent = {
      visit_id: visitId,
      status,
      event_at: eventAt,
      actor_id: this.getVisitEventActorId(actorId),
      device_id: this.currentDeviceId || undefined,
      sync_status: SyncStatus.PENDING_SYNC
    };

    const localId = await db.visitEvents.add(event);

    if (!this.isBackendHealthy || visitId <= 0) return;

    try {
      const createdEvent = await SupabaseService.createVisitEvent(event);
      if (createdEvent) {
        createdEvent.sync_status = SyncStatus.SYNCED;
        await db.visitEvents.delete(localId);
        await db.visitEvents.put(createdEvent);
      }
    } catch (e) {
      this.backendHealthScore--;
    }
  }

  async createVisit(visitData: Partial<Visit> & { photo_data_url?: string }): Promise<Visit> {
    if (!visitData.visit_type_id) {
      throw new Error("visit_type_id is required");
    }

    // Validate based on visit type:
    // - Restaurant visits: require restaurant_id (unit_id optional)
    // - Sport visits: require sport_id (unit_id optional)
    // - Regular visits: require unit_id
    const isRestaurantVisit = !!visitData.restaurant_id;
    const isSportVisit = !!visitData.sport_id;
    const isRegularVisit = !isRestaurantVisit && !isSportVisit;

    if (isRegularVisit && !visitData.unit_id) {
      throw new Error("unit_id is required for regular visits");
    }

    if (!visitData.guard_id) {
      throw new Error("guard_id is required");
    }

    const visitPayload: Partial<Visit> = {
      condominium_id: this.currentCondoId || 0,
      visitor_name: visitData.visitor_name || '',
      visitor_doc: visitData.visitor_doc,
      visitor_phone: visitData.visitor_phone,
      vehicle_license_plate: visitData.vehicle_license_plate,
      visit_type_id: visitData.visit_type_id,
      service_type_id: visitData.service_type_id,
      restaurant_id: visitData.restaurant_id ? String(visitData.restaurant_id) : undefined,
      sport_id: visitData.sport_id ? String(visitData.sport_id) : undefined,
      unit_id: visitData.unit_id,
      reason: visitData.reason,
      photo_url: visitData.photo_url,
      qr_token: visitData.qr_token,
      check_in_at: new Date().toISOString(),
      status: visitData.status || VisitStatus.PENDING,
      approval_mode: visitData.approval_mode,
      guard_id: visitData.guard_id,
      device_id: this.currentDeviceId || undefined, // Track which device registered this visit
      sync_status: SyncStatus.PENDING_SYNC
    };

    // Check if we have internet connection
    if (this.isBackendHealthy) {
      // ONLINE: Upload photo first (if exists), then save visit to Supabase
      try {
        // Upload photo to Supabase Storage if provided
        if (visitData.photo_data_url && this.currentCondoId) {
          logger.info('Uploading visitor photo to Supabase Storage...');
          const photoUrl = await SupabaseService.uploadVisitorPhoto(
            visitData.photo_data_url,
            this.currentCondoId,
            visitData.visitor_name || 'visitor'
          );

          if (photoUrl) {
            visitPayload.photo_url = photoUrl;
            logger.info('Photo uploaded successfully', { data: photoUrl });
          } else {
            logger.warn('Photo upload failed, saving visit without photo URL');
          }
        }

        const createdVisit = await SupabaseService.createVisit(visitPayload);
        if (createdVisit) {
          createdVisit.sync_status = SyncStatus.SYNCED;
          await db.visits.put(createdVisit);
          if (visitData.qr_token) {
            await SupabaseService.markQrCodeUsed(visitData.qr_token);
          }
          await this.createVisitEvent(
            createdVisit.id,
            createdVisit.status,
            createdVisit.check_in_at,
            createdVisit.guard_id
          );
          logger.info('Visit saved to Supabase and cached locally', { data: createdVisit.id });
          return createdVisit;
        } else {
          throw new Error("Failed to save to Supabase");
        }
      } catch (e) {
        logger.error('Failed to save to Supabase, falling back to local', e, ErrorCategory.NETWORK);
        this.backendHealthScore--;
        // Fallback to local save with temporary negative ID
        const tempVisit: Visit & { photo_data_url?: string } = {
          id: -Date.now(), // Temporary negative ID (will be replaced when synced)
          created_at: new Date().toISOString(),
          ...visitPayload,
          visit_type_id: visitPayload.visit_type_id!,
          unit_id: visitPayload.unit_id!,
          guard_id: visitPayload.guard_id!,
          condominium_id: visitPayload.condominium_id!,
          visitor_name: visitPayload.visitor_name!,
          check_in_at: visitPayload.check_in_at!,
          status: visitPayload.status!,
          sync_status: SyncStatus.PENDING_SYNC,
          photo_data_url: visitData.photo_data_url // Store base64 for later upload
        };
        await db.visits.put(tempVisit);
        await this.createVisitEvent(
          tempVisit.id,
          tempVisit.status,
          tempVisit.check_in_at,
          tempVisit.guard_id
        );
        logger.warn('Visit saved locally with temp ID, will sync later');
        return tempVisit;
      }
    } else {
      // OFFLINE: Save locally with temporary negative ID and base64 photo data
      const tempVisit: Visit & { photo_data_url?: string } = {
        id: -Date.now(), // Temporary negative ID
        created_at: new Date().toISOString(),
        ...visitPayload,
        visit_type_id: visitPayload.visit_type_id!,
        unit_id: visitPayload.unit_id!,
        guard_id: visitPayload.guard_id!,
        condominium_id: visitPayload.condominium_id!,
        visitor_name: visitPayload.visitor_name!,
        check_in_at: visitPayload.check_in_at!,
        status: visitPayload.status!,
        sync_status: SyncStatus.PENDING_SYNC,
        photo_data_url: visitData.photo_data_url // Store base64 for later upload
      };
      await db.visits.put(tempVisit);
      await this.createVisitEvent(
        tempVisit.id,
        tempVisit.status,
        tempVisit.check_in_at,
        tempVisit.guard_id
      );
      logger.warn('Offline: Visit saved locally with temp ID, will sync when online');
      return tempVisit;
    }
  }

  async updateVisitStatus(visitId: number, status: VisitStatus): Promise<void> {
    const visit = await db.visits.get(visitId);
    if (!visit) throw new Error("Visit not found");

    const previousStatus = visit.status;
    if (previousStatus === status) {
      return;
    }

    visit.status = status;

    // Set check_out time when status changes to LEFT
    if (status === VisitStatus.LEFT && !visit.check_out_at) {
      visit.check_out_at = new Date().toISOString();
    }

    const eventAt = status === VisitStatus.LEFT && visit.check_out_at
      ? visit.check_out_at
      : new Date().toISOString();

    // Mark as pending sync
    visit.sync_status = SyncStatus.PENDING_SYNC;

    // Update locally
    await db.visits.put(visit);
    await this.createVisitEvent(visitId, status, eventAt);
    await this.logAudit({
      action: 'UPDATE',
      target_table: 'visits',
      target_id: visitId > 0 ? visitId : null,
      details: {
        field: 'status',
        old_value: previousStatus,
        new_value: status,
        temp_id: visitId < 0 ? visitId : null
      }
    });

    // Try to sync if online
    if (this.isBackendHealthy) {
      try {
        await SupabaseService.updateVisitStatus(visitId, status, visit.check_out_at);
        visit.sync_status = SyncStatus.SYNCED;
        await db.visits.put(visit);
      } catch (e) {
        logger.warn('Visit status updated locally, will sync later');
        this.backendHealthScore--;
      }
    }
  }

  async syncPendingItems(): Promise<number> {
    // Prevent concurrent syncs
    if (this.isSyncing) {
      logger.info('Sync already in progress, skipping');
      return 0;
    }

    if (!this.isBackendHealthy) return 0;
    if (!this.currentCondoId) {
      logger.warn('Cannot sync: no condominium ID set');
      return 0;
    }

    this.isSyncing = true;
    let totalSynced = 0;

    try {
      // Get all pending items to calculate total
      const pendingVisits = await db.visits
        .where('sync_status')
        .equals(SyncStatus.PENDING_SYNC)
        .toArray();

      const pendingIncidents = await db.incidents
        .where('sync_status')
        .equals(SyncStatus.PENDING_SYNC)
        .toArray();

      let pendingVisitEvents = await db.visitEvents
        .where('sync_status')
        .equals(SyncStatus.PENDING_SYNC)
        .toArray();

      const totalPending = pendingVisits.length + pendingIncidents.length + pendingVisitEvents.length;

      // Emit start event
      this.emitSyncEvent('sync:start', {
        total: totalPending,
        message: `A sincronizar ${totalPending} items...`
      });

      // If nothing to sync, complete immediately
      if (totalPending === 0) {
        this.emitSyncEvent('sync:complete', { synced: 0, message: 'Nada para sincronizar' });
        return 0;
      }

      // Sync pending visits
      for (const visit of pendingVisits) {
        try {
          // Check if visit has offline photo data that needs to be uploaded
          const visitWithPhoto = visit as Visit & { photo_data_url?: string };

          if (visitWithPhoto.photo_data_url && !visitWithPhoto.photo_url) {
            logger.info('Uploading offline photo for visit', { data: visit.id });
            const photoUrl = await SupabaseService.uploadVisitorPhoto(
              visitWithPhoto.photo_data_url,
              this.currentCondoId!,
              visit.visitor_name
            );

            if (photoUrl) {
              visit.photo_url = photoUrl;
              logger.info('Offline photo uploaded successfully', { data: photoUrl });
            } else {
              logger.warn('Failed to upload offline photo, syncing visit without photo');
            }

            // Remove photo_data_url before syncing to Supabase (not a DB column)
            delete visitWithPhoto.photo_data_url;
          }

          const createdVisit = await SupabaseService.createVisit(visit);
          if (createdVisit) {
            // Replace local temp visit with server version (has real ID)
            await db.visits.delete(visit.id); // Delete temp ID
            createdVisit.sync_status = SyncStatus.SYNCED;
            await db.visits.put(createdVisit); // Add server version
            await db.visitEvents
              .where('visit_id')
              .equals(visit.id)
              .modify({ visit_id: createdVisit.id });
            totalSynced++;
            logger.debug('Synced pending visit', { arg1: visit.id, arg2: "-> new ID:", arg3: createdVisit.id });

            // Emit progress event
            this.emitSyncEvent('sync:progress', {
              synced: totalSynced,
              total: totalPending,
              message: `Visita sincronizada (${totalSynced}/${totalPending})`
            });
          }
        } catch (e) {
          logger.error('Failed to sync visit', e, ErrorCategory.SYNC, { id: visit.id });
          this.backendHealthScore--;
          this.emitSyncEvent('sync:error', {
            error: `Erro ao sincronizar visita: ${e instanceof Error ? e.message : 'Erro desconhecido'}`
          });
          break; // Stop on first failure
        }
      }

      pendingVisitEvents = await db.visitEvents
        .where('sync_status')
        .equals(SyncStatus.PENDING_SYNC)
        .toArray();

      // Sync pending visit events
      for (const visitEvent of pendingVisitEvents) {
        try {
          const createdEvent = await SupabaseService.createVisitEvent(visitEvent);
          if (createdEvent) {
            createdEvent.sync_status = SyncStatus.SYNCED;
            if (visitEvent.id != null) {
              await db.visitEvents.delete(visitEvent.id);
            }
            await db.visitEvents.put(createdEvent);
            totalSynced++;

            this.emitSyncEvent('sync:progress', {
              synced: totalSynced,
              total: totalPending,
              message: `Evento de visita sincronizado (${totalSynced}/${totalPending})`
            });
          }
        } catch (e) {
          logger.error('Failed to sync visit event', e, ErrorCategory.SYNC, { id: visitEvent.id });
          this.backendHealthScore--;
          this.emitSyncEvent('sync:error', {
            error: `Erro ao sincronizar evento da visita: ${e instanceof Error ? e.message : 'Erro desconhecido'}`
          });
          break;
        }
      }

      // Sync pending incidents
      for (const incident of pendingIncidents) {
        try {
          let success = false;

          // Determine what kind of update needs to be synced
          if (incident.status === 'acknowledged' && incident.acknowledged_at) {
            success = await SupabaseService.acknowledgeIncident(
              incident.id,
              incident.acknowledged_by!
            );
          } else if ((incident.status === 'inprogress' || incident.status === 'resolved') && incident.guard_notes) {
            const lastNote = incident.guard_notes.split('\n---\n').pop() || incident.guard_notes;
            success = await SupabaseService.reportIncidentAction(
              incident.id,
              lastNote,
              incident.status
            );
          }

          if (success) {
            incident.sync_status = SyncStatus.SYNCED;
            await db.incidents.put(incident);
            totalSynced++;
            logger.info('Synced incident', { data: incident.id });

            // Emit progress event
            this.emitSyncEvent('sync:progress', {
              synced: totalSynced,
              total: totalPending,
              message: `Incidente sincronizado (${totalSynced}/${totalPending})`
            });
          }
        } catch (e) {
          logger.error('Failed to sync incident', e, ErrorCategory.SYNC, { id: incident.id });
          this.backendHealthScore--;
          this.emitSyncEvent('sync:error', {
            error: `Erro ao sincronizar incidente: ${e instanceof Error ? e.message : 'Erro desconhecido'}`
          });
          break;
        }
      }

      logger.info('Sync complete: items synced', { totalSynced: totalSynced });

      // Emit complete event
      this.emitSyncEvent('sync:complete', {
        synced: totalSynced,
        total: totalPending,
        message: totalSynced > 0
          ? `${totalSynced} items sincronizados com sucesso`
          : 'Sincronização concluída'
      });

      return totalSynced;
    } finally {
      this.isSyncing = false;
    }
  }

  // --- Incidents ---
  private async refreshIncidentConfigs() {
    if (!this.isBackendHealthy) return;
    try {
      const types = await SupabaseService.getIncidentTypes();
      if (types.length) await db.incidentTypes.bulkPut(types);

      const statuses = await SupabaseService.getIncidentStatuses();
      if (statuses.length) await db.incidentStatuses.bulkPut(statuses);

      logger.info('Incident types and statuses synced');
    } catch (e) {
      logger.error('Failed to sync incident configs', e, ErrorCategory.SYNC);
      this.backendHealthScore--;
    }
  }

  async getIncidents(): Promise<Incident[]> {
    // Sync incident types and statuses if needed (fire-and-forget)
    if (this.isBackendHealthy) {
      this.refreshIncidentConfigs();
    }

    // If online, fetch from backend and replace local cache (proper bidirectional sync)
    if (this.isBackendHealthy && this.currentCondoId) {
      try {
        logger.info('Syncing incidents from backend...');

        // Fetch ALL incidents from backend (including acknowledged, resolved, etc.)
        const backendIncidents = await SupabaseService.getIncidents(this.currentCondoId);

        // Get local incidents that have pending changes (sync_status = PENDING_SYNC)
        const pendingLocalIncidents = await db.incidents
          .where('sync_status')
          .equals(SyncStatus.PENDING_SYNC)
          .toArray();

        // Clear ALL local incidents for this condominium to ensure deleted ones are removed
        const allLocalIncidents = await db.incidents.toArray();
        const incidentsToDelete = allLocalIncidents.filter(inc => {
          // Delete if belongs to this condominium
          if (inc.resident && inc.resident.condominium_id === this.currentCondoId) {
            // Keep if has pending sync status (local changes not yet synced)
            return inc.sync_status !== SyncStatus.PENDING_SYNC;
          }
          return false;
        });

        // Delete old incidents for this condo (excluding pending ones)
        if (incidentsToDelete.length > 0) {
          const idsToDelete = incidentsToDelete.map(inc => inc.id);
          await db.incidents.bulkDelete(idsToDelete);
          logger.info('Cleared old incidents from local cache', { length: idsToDelete.length });
        }

        // Insert fresh backend data
        if (backendIncidents.length > 0) {
          await db.incidents.bulkPut(backendIncidents);
          logger.info('Synced incidents from backend', { length: backendIncidents.length });
        }

        // Merge backend incidents with pending local changes
        const mergedIncidents = [...backendIncidents];

        // Add back any pending local incidents that weren't in backend response
        pendingLocalIncidents.forEach(localInc => {
          if (!backendIncidents.find(backendInc => backendInc.id === localInc.id)) {
            mergedIncidents.push(localInc);
          }
        });

        // Sort by reported_at descending
        return mergedIncidents.sort((a, b) =>
          new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime()
        );
      } catch (e) {
        logger.error('Failed to sync incidents from backend, using local cache', e, ErrorCategory.SYNC);
        this.backendHealthScore--;
      }
    }

    // Offline: return only local cached incidents for this condominium
    const localIncidents = await db.incidents
      .orderBy('reported_at')
      .reverse()
      .toArray();

    return localIncidents.filter(inc => {
      // If resident info is cached and condominium_id matches, include it
      if (inc.resident && inc.resident.condominium_id === this.currentCondoId) {
        return true;
      }
      // If no resident info, include it (will show all cached incidents)
      return !inc.resident;
    });
  }

  async acknowledgeIncident(id: number, staffId: number): Promise<void> {
    const incident = await db.incidents.get(id);
    if (!incident) throw new Error("Incident not found");

    const previousStatus = incident.status;
    const previousNotes = incident.guard_notes ?? null;

    // Update incident status to "acknowledged"
    incident.status = 'acknowledged';
    incident.acknowledged_by = staffId;
    incident.acknowledged_at = new Date().toISOString();
    incident.sync_status = SyncStatus.PENDING_SYNC;

    // Update locally
    await db.incidents.put(incident);
    await this.logAudit({
      action: 'UPDATE',
      target_table: 'incidents',
      target_id: id,
      actor_id: staffId,
      details: {
        changes: {
          status: { from: previousStatus ?? null, to: incident.status },
          guard_notes: { from: previousNotes, to: incident.guard_notes ?? null }
        }
      }
    });

    // Try to sync if online
    if (this.isBackendHealthy) {
      try {
        const success = await SupabaseService.acknowledgeIncident(id, staffId);
        if (success) {
          incident.sync_status = SyncStatus.SYNCED;
          await db.incidents.put(incident);
        }
      } catch (e) {
        logger.warn('Incident acknowledged locally, will sync later');
        this.backendHealthScore--;
      }
    }
  }

  async reportIncidentAction(id: number, guardNotes: string, newStatus: string): Promise<void> {
    const incident = await db.incidents.get(id);
    if (!incident) throw new Error("Incident not found");

    const previousStatus = incident.status;
    const previousNotes = incident.guard_notes ?? null;

    // Concatenate new notes with existing notes to preserve history
    const timestamp = new Date().toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const formattedNewNote = `[${timestamp}] ${guardNotes}`;

    if (incident.guard_notes && incident.guard_notes.trim()) {
      incident.guard_notes = `${incident.guard_notes}\n---\n${formattedNewNote}`;
    } else {
      incident.guard_notes = formattedNewNote;
    }

    incident.status = newStatus;

    // Add resolved timestamp if resolving
    if (newStatus === 'resolved') {
      incident.resolved_at = new Date().toISOString();
    }

    incident.sync_status = SyncStatus.PENDING_SYNC;

    // Update locally
    await db.incidents.put(incident);
    await this.logAudit({
      action: 'UPDATE',
      target_table: 'incidents',
      target_id: id,
      actor_id: incident.acknowledged_by ?? this.getStoredUser()?.id ?? null,
      details: {
        changes: {
          status: { from: previousStatus ?? null, to: newStatus },
          guard_notes: { from: previousNotes, to: incident.guard_notes ?? null },
          resolved_at: { from: null, to: incident.resolved_at ?? null }
        }
      }
    });

    // Try to sync if online
    if (this.isBackendHealthy) {
      try {
        const success = await SupabaseService.reportIncidentAction(id, guardNotes, newStatus);
        if (success) {
          incident.sync_status = SyncStatus.SYNCED;
          await db.incidents.put(incident);
        }
      } catch (e) {
        logger.warn('Incident action reported locally, will sync later');
        this.backendHealthScore--;
      }
    }
  }

  async syncPendingIncidents(): Promise<number> {
    if (!this.isBackendHealthy) return 0;

    const pendingIncidents = await db.incidents
      .where('sync_status')
      .equals(SyncStatus.PENDING_SYNC)
      .toArray();

    let synced = 0;
    for (const incident of pendingIncidents) {
      try {
        // Determine what kind of update needs to be synced
        if (incident.status === 'acknowledged' && incident.acknowledged_at) {
          // Sync acknowledgment
          const success = await SupabaseService.acknowledgeIncident(
            incident.id,
            incident.acknowledged_by!
          );

          if (success) {
            incident.sync_status = SyncStatus.SYNCED;
            await db.incidents.put(incident);
            synced++;
            logger.info('Synced incident acknowledgment', { data: incident.id });
          }
        } else if ((incident.status === 'inprogress' || incident.status === 'resolved') && incident.guard_notes) {
          // Sync action report
          // Extract the last note (most recent) to avoid re-sending all history
          const lastNote = incident.guard_notes.split('\n---\n').pop() || incident.guard_notes;

          const success = await SupabaseService.reportIncidentAction(
            incident.id,
            lastNote,
            incident.status
          );

          if (success) {
            incident.sync_status = SyncStatus.SYNCED;
            await db.incidents.put(incident);
            synced++;
            logger.info('Synced incident action', { data: incident.id });
          }
        }
      } catch (e) {
        logger.error('Failed to sync incident', e, ErrorCategory.SYNC, { id: incident.id });
        this.backendHealthScore--;
        break; // Stop on first failure
      }
    }

    return synced;
  }

  checkOnline(): boolean { return this.isOnline; }

  // --- PHOTO QUALITY SETTINGS (Data Saving) ---

  private readonly photoQualityKey = 'photo_quality';

  /**
   * Get current photo quality setting
   * Returns MEDIUM as default if not set
   */
  async getPhotoQuality(): Promise<PhotoQuality> {
    try {
      const setting = await db.settings.get(this.photoQualityKey);
      if (setting?.value && Object.values(PhotoQuality).includes(setting.value)) {
        return setting.value as PhotoQuality;
      }
      return PhotoQuality.MEDIUM; // Default
    } catch {
      return PhotoQuality.MEDIUM;
    }
  }

  /**
   * Set photo quality setting
   * Stored in IndexedDB for offline persistence
   */
  async setPhotoQuality(quality: PhotoQuality): Promise<void> {
    await db.settings.put({ key: this.photoQualityKey, value: quality });
  }

  // --- ADMIN METHODS (Online-Only, Cross-Condominium Access) ---
  // NOTE: Admin users must be online. No offline fallback or caching.

  /**
   * Admin: Get all condominiums (not filtered by device)
   * ONLINE ONLY - Admin requires active internet connection
   */
  async adminGetAllCondominiums(): Promise<Condominium[]> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      if (scopedCondoId) {
        const condo = await SupabaseService.getCondominium(scopedCondoId);
        return condo ? [condo] : [];
      }
      return await SupabaseService.adminGetAllCondominiums();
    } catch (e) {
      logger.error('Failed to fetch condominiums (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Get all units across all condominiums
   * ONLINE ONLY - Admin requires active internet connection
   * @param condominiumId - Optional filter by specific condominium
   */
  async adminGetAllUnits(condominiumId?: number): Promise<Unit[]> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      const effectiveCondoId = scopedCondoId ?? condominiumId;
      return await SupabaseService.adminGetAllUnits(effectiveCondoId);
    } catch (e) {
      logger.error('Failed to fetch units (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Get all visits across all condominiums
   * ONLINE ONLY - Admin requires active internet connection
   * @param startDate - Start date filter (ISO string)
   * @param endDate - End date filter (ISO string)
   * @param condominiumId - Optional filter by specific condominium
   */
  async adminGetAllVisits(startDate?: string, endDate?: string, condominiumId?: number): Promise<Visit[]> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      const effectiveCondoId = scopedCondoId ?? condominiumId;
      return await SupabaseService.adminGetAllVisits(startDate, endDate, effectiveCondoId);
    } catch (e) {
      logger.error('Failed to fetch visits (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Get all visits with full filtering (for long date ranges >= 6 months)
   * ONLINE ONLY - Admin requires active internet connection
   * Uses backend filtering for better performance with large datasets
   * @param startDate - Start date filter (ISO string)
   * @param endDate - End date filter (ISO string)
   * @param condominiumId - Optional filter by specific condominium
   * @param visitType - Optional filter by visit type name
   * @param serviceType - Optional filter by service type name
   * @param status - Optional filter by status
   */
  async adminGetAllVisitsFiltered(
    startDate?: string,
    endDate?: string,
    condominiumId?: number,
    visitType?: string,
    serviceType?: string,
    status?: string
  ): Promise<Visit[]> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      const effectiveCondoId = scopedCondoId ?? condominiumId;
      return await SupabaseService.adminGetAllVisitsFiltered(
        startDate,
        endDate,
        effectiveCondoId,
        visitType,
        serviceType,
        status
      );
    } catch (e) {
      logger.error('Failed to fetch filtered visits (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Get all incidents across all condominiums
   * ONLINE ONLY - Admin requires active internet connection
   * @param condominiumId - Optional filter by specific condominium
   */
  async adminGetAllIncidents(condominiumId?: number): Promise<Incident[]> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      const effectiveCondoId = scopedCondoId ?? condominiumId;
      return await SupabaseService.adminGetAllIncidents(effectiveCondoId);
    } catch (e) {
      logger.error('Failed to fetch incidents (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Get all staff across all condominiums
   * ONLINE ONLY - Admin requires active internet connection
   * @param condominiumId - Optional filter by specific condominium
   */
  async adminGetAllStaff(condominiumId?: number): Promise<Staff[]> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      const effectiveCondoId = scopedCondoId ?? condominiumId;
      return await SupabaseService.adminGetAllStaff(effectiveCondoId);
    } catch (e) {
      logger.error('Failed to fetch staff (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Get aggregated dashboard statistics across all condominiums
   * ONLINE ONLY - Admin requires active internet connection
   * Uses efficient RPC function for single-query aggregation
   */
  async adminGetDashboardStats(): Promise<{
    totalCondominiums: number;
    activeCondominiums: number;
    totalDevices: number;
    activeDevices: number;
    totalStaff: number;
    totalUnits: number;
    totalResidents: number;
    todayVisits: number;
    pendingVisits: number;
    insideVisits: number;
    activeIncidents: number;
    totalIncidents: number;
    resolvedIncidents: number;
  } | null> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      if (scopedCondoId) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const [
          condo,
          devices,
          staff,
          units,
          residents,
          incidents,
          visits
        ] = await Promise.all([
          SupabaseService.getCondominium(scopedCondoId),
          SupabaseService.adminGetAllDevices(scopedCondoId),
          SupabaseService.adminGetAllStaff(scopedCondoId),
          SupabaseService.adminGetAllUnits(scopedCondoId),
          SupabaseService.adminGetAllResidents(scopedCondoId, null, null, null, null),
          SupabaseService.adminGetAllIncidents(scopedCondoId),
          SupabaseService.adminGetAllVisits(
            startOfDay.toISOString(),
            endOfDay.toISOString(),
            scopedCondoId
          )
        ]);

        const pendingVisits = visits.filter(visit => visit.status === VisitStatus.PENDING).length;
        const insideVisits = visits.filter(visit => visit.status === VisitStatus.INSIDE).length;
        const activeIncidents = incidents.filter(incident => incident.status?.toUpperCase() !== 'RESOLVED').length;
        const resolvedIncidents = incidents.filter(incident => incident.status?.toUpperCase() === 'RESOLVED').length;
        const onlineDevices = this.getOnlineDeviceCount(devices);

        return {
          totalCondominiums: condo ? 1 : 0,
          activeCondominiums: condo?.status === 'ACTIVE' ? 1 : 0,
          totalDevices: devices.length,
          activeDevices: onlineDevices,
          totalStaff: staff.length,
          totalUnits: units.length,
          totalResidents: residents.length,
          todayVisits: visits.length,
          pendingVisits,
          insideVisits,
          activeIncidents,
          totalIncidents: incidents.length,
          resolvedIncidents
        };
      }

      const stats = await SupabaseService.adminGetDashboardStats();
      if (!stats) return null;

      const devices = await SupabaseService.adminGetAllDevices();
      const onlineDevices = this.getOnlineDeviceCount(devices);

      return {
        ...stats,
        totalDevices: devices.length,
        activeDevices: onlineDevices
      };
    } catch (error) {
      logger.error('Error fetching dashboard stats (online required)', error, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Subscribe to device status changes for realtime dashboard counts
   * @param onChange - Callback triggered on status-relevant changes
   * @returns Unsubscribe function
   */
  subscribeToDeviceStatusChanges(onChange: () => void): () => void {
    const user = this.getStoredUser();
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return () => { };
    }

    const scopedCondoId = this.getAdminScopeCondoId();
    let debounceId: ReturnType<typeof setTimeout> | null = null;

    const handleChange = () => {
      if (debounceId) return;
      debounceId = setTimeout(() => {
        debounceId = null;
        onChange();
      }, 800);
    };

    const unsubscribe = SupabaseService.subscribeToDeviceChanges(scopedCondoId, handleChange);
    return () => {
      if (debounceId) {
        clearTimeout(debounceId);
        debounceId = null;
      }
      unsubscribe();
    };
  }

  // --- ADMIN CRUD OPERATIONS ---

  /**
   * Admin: Create a new condominium
   */
  async adminCreateCondominium(condo: Partial<Condominium>): Promise<Condominium | null> {
    try {
      const created = await SupabaseService.adminCreateCondominium(condo);
      if (created) {
        await this.logAudit({
          action: 'CREATE',
          target_table: 'condominiums',
          target_id: created.id,
          condominium_id: created.id,
          details: {
            name: created.name ?? condo.name ?? null,
            status: created.status ?? condo.status ?? null
          }
        });
      }
      return created;
    } catch (e) {
      logger.error('Failed to create condominium (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Update an existing condominium
   */
  async adminUpdateCondominium(
    id: number,
    updates: Partial<Condominium>,
    auditDetails?: any
  ): Promise<Condominium | null> {
    try {
      const updated = await SupabaseService.adminUpdateCondominium(id, updates);
      if (updated) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'condominiums',
          target_id: id,
          condominium_id: updated.id ?? id,
          details: auditDetails ?? { updates }
        });
      }
      return updated;
    } catch (e) {
      logger.error('Failed to update condominium (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Toggle condominium status (ACTIVE/INACTIVE)
   */
  async adminToggleCondominiumStatus(
    id: number,
    status: 'ACTIVE' | 'INACTIVE',
    previousStatus?: 'ACTIVE' | 'INACTIVE'
  ): Promise<boolean> {
    try {
      const success = await SupabaseService.adminToggleCondominiumStatus(id, status);
      if (success) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'condominiums',
          target_id: id,
          condominium_id: id,
          details: {
            field: 'status',
            new_value: status,
            old_value: previousStatus ?? null
          }
        });
      }
      return success;
    } catch (e) {
      logger.error('Failed to toggle condominium status (online required)', e, ErrorCategory.ADMIN);
      return false;
    }
  }

  /**
   * Admin: Deactivate all devices for a condominium
   */
  async adminDeactivateCondoDevices(condoId: number): Promise<boolean> {
    try {
      const devices = await SupabaseService.adminGetAllDevices(condoId);
      if (devices.length === 0) return true;
      const statusCounts = devices.reduce((acc: Record<string, number>, device) => {
        const key = device.status || 'UNKNOWN';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      for (const device of devices) {
        if (!device.id) {
          logger.error('Device missing id, cannot deactivate', null, ErrorCategory.ADMIN, { data: device });
          return false;
        }

        const updated = await SupabaseService.adminUpdateDevice(device.id, {
          status: 'INACTIVE',
          condominium_id: null
        });
        if (!updated) return false;
      }

      await this.logAudit({
        action: 'UPDATE',
        target_table: 'devices',
        target_id: null,
        condominium_id: condoId,
        details: {
          field: 'status',
          new_value: 'INACTIVE',
          device_count: devices.length,
          old_statuses: statusCounts
        }
      });
      return true;
    } catch (e) {
      logger.error('Failed to deactivate condominium devices (online required)', e, ErrorCategory.ADMIN);
      return false;
    }
  }

  /**
   * Admin: Get streets for a condominium
   */
  async adminGetStreets(condoId: number): Promise<any[]> {
    try {
      return await SupabaseService.getStreets(condoId);
    } catch (e) {
      logger.error('Failed to fetch streets (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Add a street to a condominium
   */
  async adminAddStreet(condoId: number, name: string): Promise<any | null> {
    try {
      const created = await SupabaseService.addStreet(condoId, name);
      if (created) {
        await this.logAudit({
          action: 'CREATE',
          target_table: 'streets',
          target_id: created.id ?? null,
          condominium_id: condoId,
          details: {
            name
          }
        });
      }
      return created;
    } catch (e) {
      logger.error('Failed to add street (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Remove a street from a condominium
   */
  async adminRemoveStreet(streetId: number): Promise<boolean> {
    try {
      const success = await SupabaseService.removeStreet(streetId);
      if (success) {
        await this.logAudit({
          action: 'DELETE',
          target_table: 'streets',
          target_id: streetId,
          condominium_id: this.getAdminScopeCondoId() ?? this.currentCondoId ?? null,
          details: {}
        });
      }
      return success;
    } catch (e) {
      logger.error('Failed to remove street (online required)', e, ErrorCategory.ADMIN);
      return false;
    }
  }

  /**
   * Admin: Upload condominium logo
   */
  async adminUploadCondoLogo(file: File, condoName?: string): Promise<string | null> {
    try {
      return await SupabaseService.uploadCondoLogo(file, condoName);
    } catch (e) {
      logger.error('Failed to upload condominium logo (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Get all devices (cross-condominium)
   */
  async adminGetAllDevices(condominiumId?: number): Promise<Device[]> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      const effectiveCondoId = scopedCondoId ?? condominiumId;
      return await SupabaseService.adminGetAllDevices(effectiveCondoId);
    } catch (e) {
      logger.error('Failed to fetch devices (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Update a device
   */
  async adminUpdateDevice(id: string, updates: Partial<Device>, auditDetails?: any): Promise<Device | null> {
    try {
      const updated = await SupabaseService.adminUpdateDevice(id, updates);
      if (updated) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'devices',
          target_id: null,
          condominium_id: updated.condominium_id ?? null,
          details: auditDetails ?? {
            device_id: id,
            updates
          }
        });
      }
      return updated;
    } catch (e) {
      logger.error('Failed to update device (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Decommission a device
   */
  async adminDecommissionDevice(id: string, previousStatus?: string | null): Promise<boolean> {
    try {
      const success = await SupabaseService.adminDecommissionDevice(id);
      if (success) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'devices',
          target_id: null,
          condominium_id: this.getAdminScopeCondoId() ?? this.currentCondoId ?? null,
          details: {
            device_id: id,
            field: 'status',
            new_value: 'DECOMMISSIONED',
            old_value: previousStatus ?? null
          }
        });
      }
      return success;
    } catch (e) {
      logger.error('Failed to decommission device (online required)', e, ErrorCategory.ADMIN);
      return false;
    }
  }

  /**
   * Admin: Create a new staff member
   */
  async adminCreateStaff(staff: Partial<Staff>): Promise<Staff | null> {
    try {
      const created = await SupabaseService.adminCreateStaff(staff);
      if (created) {
        await this.logAudit({
          action: 'CREATE',
          target_table: 'staff',
          target_id: created.id,
          condominium_id: created.condominium_id ?? null,
          details: {
            first_name: created.first_name ?? staff.first_name ?? null,
            last_name: created.last_name ?? staff.last_name ?? null,
            role: created.role ?? staff.role ?? null
          }
        });
      }
      return created;
    } catch (e) {
      logger.error('Failed to create staff (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Create a new staff member with server-side PIN hashing
   */
  async adminCreateStaffWithPin(
    first_name: string,
    last_name: string,
    condominium_id: number | null,
    role: string,
    plainPin: string,
    photo_url?: string
  ): Promise<Staff | null> {
    try {
      const created = await SupabaseService.adminCreateStaffWithPin(
        first_name,
        last_name,
        condominium_id,
        role,
        plainPin,
        photo_url
      );
      if (created) {
        await this.logAudit({
          action: 'CREATE',
          target_table: 'staff',
          target_id: created.id,
          condominium_id: created.condominium_id ?? condominium_id ?? null,
          details: {
            first_name,
            last_name,
            role,
            photo_url: photo_url ?? null
          }
        });
      }
      return created;
    } catch (e) {
      logger.error('Failed to create staff (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Update staff PIN with server-side hashing
   */
  async adminUpdateStaffPin(staffId: number, plainPin: string): Promise<Staff | null> {
    try {
      const updated = await SupabaseService.adminUpdateStaffPin(staffId, plainPin);
      if (updated) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'staff',
          target_id: staffId,
          condominium_id: updated.condominium_id ?? null,
          details: {
            field: 'pin',
            reset: true
          }
        });
      }
      return updated;
    } catch (e) {
      logger.error('Failed to update staff PIN (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Update an existing staff member
   */
  async adminUpdateStaff(id: number, updates: Partial<Staff>, auditDetails?: any): Promise<Staff | null> {
    try {
      const updated = await SupabaseService.adminUpdateStaff(id, updates);
      if (updated) {
        const { pin_hash, ...safeUpdates } = updates as Partial<Staff> & { pin_hash?: unknown };
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'staff',
          target_id: id,
          condominium_id: updated.condominium_id ?? null,
          details: auditDetails ?? { updates: safeUpdates }
        });
      }
      return updated;
    } catch (e) {
      logger.error('Failed to update staff (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Delete a staff member
   */
  async adminDeleteStaff(
    id: number,
    photoUrl?: string
  ): Promise<{ success: boolean; error?: { message?: string; code?: string; details?: string; hint?: string } }> {
    try {
      if (photoUrl) {
        const photoDeleted = await SupabaseService.deleteStaffPhotoByUrl(photoUrl);
        if (!photoDeleted) {
          logger.error('Failed to delete staff photo from storage', null, ErrorCategory.ADMIN);
        }
      }
      const result = await SupabaseService.adminDeleteStaff(id);
      if (result.success) {
        await this.logAudit({
          action: 'DELETE',
          target_table: 'staff',
          target_id: id,
          condominium_id: this.getAdminScopeCondoId() ?? this.currentCondoId ?? null,
          details: {
            photo_deleted: !!photoUrl
          }
        });
      }
      return result;
    } catch (e) {
      logger.error('Failed to delete staff (online required)', e, ErrorCategory.ADMIN);
      return { success: false, error: { message: 'Failed to delete staff' } };
    }
  }

  // --- UNITS CRUD ---

  /**
   * Admin: Create a new unit
   */
  async adminCreateUnit(unit: Partial<Unit>): Promise<Unit | null> {
    try {
      const created = await SupabaseService.adminCreateUnit(unit);
      if (created) {
        await this.logAudit({
          action: 'CREATE',
          target_table: 'units',
          target_id: created.id as number,
          condominium_id: (created as any).condominium_id ?? (unit as any).condominium_id ?? null,
          details: {
            code_block: (created as any).code_block ?? (unit as any).code_block ?? null,
            number: (created as any).number ?? (unit as any).number ?? null
          }
        });
      }
      return created;
    } catch (e) {
      logger.error('Failed to create unit (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Update an existing unit
   */
  async adminUpdateUnit(id: string, updates: Partial<Unit>, auditDetails?: any): Promise<Unit | null> {
    try {
      const updated = await SupabaseService.adminUpdateUnit(id, updates);
      if (updated) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'units',
          target_id: Number.isFinite(Number(id)) ? Number(id) : null,
          condominium_id: (updated as any).condominium_id ?? null,
          details: auditDetails ?? { updates }
        });
      }
      return updated;
    } catch (e) {
      logger.error('Failed to update unit (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Delete a unit
   */
  async adminDeleteUnit(id: string): Promise<boolean> {
    try {
      const success = await SupabaseService.adminDeleteUnit(id);
      if (success) {
        await this.logAudit({
          action: 'DELETE',
          target_table: 'units',
          target_id: Number.isFinite(Number(id)) ? Number(id) : null,
          condominium_id: this.getAdminScopeCondoId() ?? this.currentCondoId ?? null,
          details: {}
        });
      }
      return success;
    } catch (e) {
      logger.error('Failed to delete unit (online required)', e, ErrorCategory.ADMIN);
      return false;
    }
  }

  // --- RESIDENTS CRUD ---

  /**
   * Admin: Get all residents (cross-condominium)
   */
  async adminGetAllResidents(
    condominiumId?: number,
    limit?: number | null,
    search?: string | null,
    afterName?: string | null,
    afterId?: number | null
  ): Promise<any[]> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      const effectiveCondoId = scopedCondoId ?? condominiumId;
      return await SupabaseService.adminGetAllResidents(
        effectiveCondoId,
        limit ?? null,
        search ?? null,
        afterName ?? null,
        afterId ?? null
      );
    } catch (e) {
      logger.error('Failed to fetch residents (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Create a new resident
   */
  async adminCreateResident(resident: any): Promise<any | null> {
    try {
      const created = await SupabaseService.adminCreateResident(resident);
      if (created) {
        const { pin_hash, pin, plainPin, ...safeResident } = resident ?? {};
        await this.logAudit({
          action: 'CREATE',
          target_table: 'residents',
          target_id: created.id,
          condominium_id: created.condominium_id ?? resident?.condominium_id ?? null,
          details: {
            name: created.name ?? resident?.name ?? null,
            unit_id: created.unit_id ?? resident?.unit_id ?? null,
            data: safeResident
          }
        });
      }
      return created;
    } catch (e) {
      logger.error('Failed to create resident (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Update an existing resident
   */
  async adminUpdateResident(id: string, updates: any, auditDetails?: any): Promise<any | null> {
    try {
      const updated = await SupabaseService.adminUpdateResident(id, updates);
      if (updated) {
        const { pin_hash, pin, plainPin, ...safeUpdates } = updates ?? {};
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'residents',
          target_id: Number.isFinite(Number(id)) ? Number(id) : null,
          condominium_id: updated.condominium_id ?? null,
          details: auditDetails ?? { updates: safeUpdates }
        });
      }
      return updated;
    } catch (e) {
      logger.error('Failed to update resident (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Delete a resident
   */
  async adminDeleteResident(id: string): Promise<boolean> {
    try {
      const success = await SupabaseService.adminDeleteResident(id);
      if (success) {
        await this.logAudit({
          action: 'DELETE',
          target_table: 'residents',
          target_id: Number.isFinite(Number(id)) ? Number(id) : null,
          condominium_id: this.getAdminScopeCondoId() ?? this.currentCondoId ?? null,
          details: {}
        });
      }
      return success;
    } catch (e) {
      logger.error('Failed to delete resident (online required)', e, ErrorCategory.ADMIN);
      return false;
    }
  }

  /**
   * Admin: Get all QR codes for a resident
   */
  async adminGetResidentQrCodes(residentId: number): Promise<ResidentQrCode[]> {
    try {
      return await SupabaseService.adminGetResidentQrCodes(residentId);
    } catch (e) {
      logger.error('Failed to fetch resident QR codes (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  // --- RESTAURANTS CRUD ---

  /**
   * Admin: Get all restaurants (cross-condominium)
   */
  async adminGetAllRestaurants(condominiumId?: number): Promise<Restaurant[]> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      const effectiveCondoId = scopedCondoId ?? condominiumId;
      return await SupabaseService.adminGetAllRestaurants(effectiveCondoId);
    } catch (e) {
      logger.error('Failed to fetch restaurants (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Create a new restaurant
   */
  async adminCreateRestaurant(restaurant: Partial<Restaurant>): Promise<Restaurant | null> {
    try {
      const created = await SupabaseService.adminCreateRestaurant(restaurant);
      if (created) {
        await this.logAudit({
          action: 'CREATE',
          target_table: 'restaurants',
          target_id: created.id ?? null,
          condominium_id: created.condominium_id ?? restaurant.condominium_id ?? null,
          details: {
            name: created.name ?? restaurant.name ?? null,
            status: created.status ?? restaurant.status ?? null
          }
        });
      }
      return created;
    } catch (e) {
      logger.error('Failed to create restaurant (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Update an existing restaurant
   */
  async adminUpdateRestaurant(id: string, updates: Partial<Restaurant>, auditDetails?: any): Promise<Restaurant | null> {
    try {
      const updated = await SupabaseService.adminUpdateRestaurant(id, updates);
      if (updated) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'restaurants',
          target_id: id ?? null,
          condominium_id: updated.condominium_id ?? null,
          details: auditDetails ?? { updates }
        });
      }
      return updated;
    } catch (e) {
      logger.error('Failed to update restaurant (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Delete a restaurant
   */
  async adminDeleteRestaurant(id: string): Promise<boolean> {
    try {
      const success = await SupabaseService.adminDeleteRestaurant(id);
      if (success) {
        await this.logAudit({
          action: 'DELETE',
          target_table: 'restaurants',
          target_id: id ?? null,
          condominium_id: this.getAdminScopeCondoId() ?? this.currentCondoId ?? null,
          details: {}
        });
      }
      return success;
    } catch (e) {
      logger.error('Failed to delete restaurant (online required)', e, ErrorCategory.ADMIN);
      return false;
    }
  }

  // --- SPORTS CRUD ---

  /**
   * Admin: Get all sports facilities (cross-condominium)
   */
  async adminGetAllSports(condominiumId?: number): Promise<Sport[]> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      const effectiveCondoId = scopedCondoId ?? condominiumId;
      return await SupabaseService.adminGetAllSports(effectiveCondoId);
    } catch (e) {
      logger.error('Failed to fetch sports (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Create a new sport facility
   */
  async adminCreateSport(sport: Partial<Sport>): Promise<Sport | null> {
    try {
      const created = await SupabaseService.adminCreateSport(sport);
      if (created) {
        await this.logAudit({
          action: 'CREATE',
          target_table: 'sports',
          target_id: created.id ?? null,
          condominium_id: created.condominium_id ?? sport.condominium_id ?? null,
          details: {
            name: created.name ?? sport.name ?? null,
            status: created.status ?? sport.status ?? null
          }
        });
      }
      return created;
    } catch (e) {
      logger.error('Failed to create sport (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Update an existing sport facility
   */
  async adminUpdateSport(id: string, updates: Partial<Sport>, auditDetails?: any): Promise<Sport | null> {
    try {
      const updated = await SupabaseService.adminUpdateSport(id, updates);
      if (updated) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'sports',
          target_id: id ?? null,
          condominium_id: updated.condominium_id ?? null,
          details: auditDetails ?? { updates }
        });
      }
      return updated;
    } catch (e) {
      logger.error('Failed to update sport (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Delete a sport facility
   */
  async adminDeleteSport(id: string): Promise<boolean> {
    try {
      const success = await SupabaseService.adminDeleteSport(id);
      if (success) {
        await this.logAudit({
          action: 'DELETE',
          target_table: 'sports',
          target_id: id ?? null,
          condominium_id: this.getAdminScopeCondoId() ?? this.currentCondoId ?? null,
          details: {}
        });
      }
      return success;
    } catch (e) {
      logger.error('Failed to delete sport (online required)', e, ErrorCategory.ADMIN);
      return false;
    }
  }

  // --- VISIT OPERATIONS ---

  /**
   * Admin: Update visit status
   */
  async adminUpdateVisitStatus(id: number, status: VisitStatus): Promise<Visit | null> {
    try {
      const existing = await db.visits.get(id);
      const visit = await SupabaseService.adminUpdateVisitStatus(id, status);
      if (visit) {
        const eventAt = status === VisitStatus.LEFT && visit.check_out_at
          ? visit.check_out_at
          : new Date().toISOString();
        await this.createVisitEvent(visit.id, status, eventAt);
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'visits',
          target_id: id,
          details: {
            field: 'status',
            old_value: existing?.status ?? null,
            new_value: status,
            source: 'AdminVisits'
          }
        });
      }
      return visit;
    } catch (e) {
      logger.error('Failed to update visit status (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  // --- INCIDENT OPERATIONS ---

  /**
   * Admin: Acknowledge an incident
   */
  async adminAcknowledgeIncident(
    id: number,
    guardId: number,
    notes?: string,
    auditDetails?: any
  ): Promise<Incident | null> {
    try {
      const incident = await SupabaseService.adminAcknowledgeIncident(id, guardId, notes);
      if (incident) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'incidents',
          target_id: id,
          actor_id: guardId,
          details: auditDetails ?? {
            field: 'status',
            new_value: incident.status,
            note: notes || null,
            source: 'AdminIncidents'
          }
        });
      }
      return incident;
    } catch (e) {
      logger.error('Failed to acknowledge incident (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Resolve an incident
   */
  async adminResolveIncident(
    id: number,
    guardId: number,
    notes?: string,
    auditDetails?: any
  ): Promise<Incident | null> {
    try {
      const incident = await SupabaseService.adminResolveIncident(id, guardId, notes);
      if (incident) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'incidents',
          target_id: id,
          actor_id: guardId,
          details: auditDetails ?? {
            field: 'status',
            new_value: incident.status,
            note: notes || null,
            source: 'AdminIncidents'
          }
        });
      }
      return incident;
    } catch (e) {
      logger.error('Failed to resolve incident (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Update incident notes
   */
  async adminUpdateIncidentNotes(id: number, notes: string, auditDetails?: any): Promise<Incident | null> {
    try {
      const incident = await SupabaseService.adminUpdateIncidentNotes(id, notes);
      if (incident) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'incidents',
          target_id: id,
          actor_id: this.getStoredUser()?.id ?? null,
          details: auditDetails ?? {
            field: 'guard_notes',
            new_value: notes,
            source: 'AdminIncidents'
          }
        });
      }
      return incident;
    } catch (e) {
      logger.error('Failed to update incident notes (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  // --- VISIT TYPES CONFIGURATION ---

  /**
   * Admin: Get all visit types
   */
  async adminGetAllVisitTypes(): Promise<VisitTypeConfig[]> {
    try {
      return await SupabaseService.adminGetAllVisitTypes();
    } catch (e) {
      logger.error('Failed to fetch visit types (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Create a new visit type
   */
  async adminCreateVisitType(visitType: Partial<VisitTypeConfig>): Promise<VisitTypeConfig | null> {
    try {
      const created = await SupabaseService.adminCreateVisitType(visitType);
      if (created) {
        await this.logAudit({
          action: 'CREATE',
          target_table: 'visit_types',
          target_id: created.id,
          details: {
            name: created.name ?? visitType.name ?? null,
            icon_key: created.icon_key ?? visitType.icon_key ?? null
          }
        });
      }
      return created;
    } catch (e) {
      logger.error('Failed to create visit type (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Update an existing visit type
   */
  async adminUpdateVisitType(
    id: number,
    updates: Partial<VisitTypeConfig>,
    auditDetails?: any
  ): Promise<VisitTypeConfig | null> {
    try {
      const updated = await SupabaseService.adminUpdateVisitType(id, updates);
      if (updated) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'visit_types',
          target_id: id,
          details: auditDetails ?? { updates }
        });
      }
      return updated;
    } catch (e) {
      logger.error('Failed to update visit type (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Delete a visit type
   */
  async adminDeleteVisitType(id: number): Promise<boolean> {
    try {
      const success = await SupabaseService.adminDeleteVisitType(id);
      if (success) {
        await this.logAudit({
          action: 'DELETE',
          target_table: 'visit_types',
          target_id: id,
          condominium_id: this.getAdminScopeCondoId() ?? this.currentCondoId ?? null,
          details: {}
        });
      }
      return success;
    } catch (e) {
      logger.error('Failed to delete visit type (online required)', e, ErrorCategory.ADMIN);
      return false;
    }
  }

  // --- SERVICE TYPES CONFIGURATION ---

  /**
   * Admin: Get all service types
   */
  async adminGetAllServiceTypes(): Promise<ServiceTypeConfig[]> {
    try {
      return await SupabaseService.adminGetAllServiceTypes();
    } catch (e) {
      logger.error('Failed to fetch service types (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Create a new service type
   */
  async adminCreateServiceType(serviceType: Partial<ServiceTypeConfig>): Promise<ServiceTypeConfig | null> {
    try {
      const created = await SupabaseService.adminCreateServiceType(serviceType);
      if (created) {
        await this.logAudit({
          action: 'CREATE',
          target_table: 'service_types',
          target_id: created.id,
          details: {
            name: created.name ?? serviceType.name ?? null
          }
        });
      }
      return created;
    } catch (e) {
      logger.error('Failed to create service type (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Update an existing service type
   */
  async adminUpdateServiceType(
    id: number,
    updates: Partial<ServiceTypeConfig>,
    auditDetails?: any
  ): Promise<ServiceTypeConfig | null> {
    try {
      const updated = await SupabaseService.adminUpdateServiceType(id, updates);
      if (updated) {
        await this.logAudit({
          action: 'UPDATE',
          target_table: 'service_types',
          target_id: id,
          details: auditDetails ?? { updates }
        });
      }
      return updated;
    } catch (e) {
      logger.error('Failed to update service type (online required)', e, ErrorCategory.ADMIN);
      return null;
    }
  }

  /**
   * Admin: Delete a service type
   */
  async adminDeleteServiceType(id: number): Promise<boolean> {
    try {
      const success = await SupabaseService.adminDeleteServiceType(id);
      if (success) {
        await this.logAudit({
          action: 'DELETE',
          target_table: 'service_types',
          target_id: id,
          condominium_id: this.getAdminScopeCondoId() ?? this.currentCondoId ?? null,
          details: {}
        });
      }
      return success;
    } catch (e) {
      logger.error('Failed to delete service type (online required)', e, ErrorCategory.ADMIN);
      return false;
    }
  }

  /**
   * Admin: Get all condominiums with real-time statistics (visits today + open incidents)
   * For analytics dashboard map display
   */
  async adminGetCondominiumStats(): Promise<CondominiumStats[]> {
    try {
      const stats = await SupabaseService.adminGetCondominiumStats();
      const scopedCondoId = this.getAdminScopeCondoId();
      if (scopedCondoId) {
        return stats.filter(stat => stat.id === scopedCondoId);
      }
      return stats;
    } catch (e) {
      logger.error('Failed to fetch condominium stats (online required)', e, ErrorCategory.ADMIN);
      return [];
    }
  }

  /**
   * Admin: Get audit logs with optional filters and pagination
   */
  async adminGetAuditLogs(filters?: {
    startDate?: string;
    endDate?: string;
    condominiumId?: number;
    actorId?: number;
    action?: string;
    targetTable?: string;
  }, limit: number = 100, offset: number = 0): Promise<{ logs: AuditLog[], total: number }> {
    try {
      const scopedCondoId = this.getAdminScopeCondoId();
      const effectiveFilters = scopedCondoId ? { ...filters, condominiumId: scopedCondoId } : filters;
      return await SupabaseService.adminGetAuditLogs(effectiveFilters, limit, offset);
    } catch (e) {
      logger.error('Failed to fetch audit logs (online required)', e, ErrorCategory.ADMIN);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Admin: Get device registration errors with optional filters and pagination
   */
  async adminGetDeviceRegistrationErrors(filters?: {
    startDate?: string;
    endDate?: string;
    deviceIdentifier?: string;
  }, limit: number = 100, offset: number = 0): Promise<{ errors: DeviceRegistrationError[], total: number }> {
    try {
      return await SupabaseService.adminGetDeviceRegistrationErrors(filters, limit, offset);
    } catch (e) {
      logger.error('Failed to fetch device registration errors (online required)', e, ErrorCategory.ADMIN);
      return { errors: [], total: 0 };
    }
  }

  /**
   * Get count of items pending synchronization in local IndexedDB
   * Used to determine if sync button should be active
   */
  async getPendingSyncCount(): Promise<number> {
    try {
      const pendingVisits = await db.visits
        .where('sync_status')
        .equals(SyncStatus.PENDING_SYNC)
        .count();

      const pendingIncidents = await db.incidents
        .where('sync_status')
        .equals(SyncStatus.PENDING_SYNC)
        .count();

      return pendingVisits + pendingIncidents;
    } catch (e) {
      return 0;
    }
  }
}

export const api = new DataService();
