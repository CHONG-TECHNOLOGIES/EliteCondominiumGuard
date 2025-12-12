import { SupabaseService } from './Supabase';
import { db } from './db';
import { Visit, VisitStatus, SyncStatus, Staff, UserRole, Unit, Incident, VisitTypeConfig, ServiceTypeConfig, Condominium, CondominiumStats, Device, Restaurant, Sport, AuditLog, Street } from '../types';
import bcrypt from 'bcryptjs';
import { getDeviceIdentifier, getDeviceMetadata } from './deviceUtils';

const MOCK_FALLBACK_ID = "00000000-0000-0000-0000-000000000001";

class DataService {
  private isOnline: boolean = navigator.onLine;
  private backendHealthScore: number = 3; // Health score
  private currentCondoId: number | null = null;
  private currentCondoDetails: Condominium | null = null;
  private currentDeviceId: string | null = null; // Track device ID (UUID) for visit tracking

  constructor() {
    window.addEventListener('online', () => this.setOnlineStatus(true));
    window.addEventListener('offline', () => this.setOnlineStatus(false));
    this.init();
  }

  private async init() {
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
   * Load device ID from backend for visit tracking
   */
  private async loadDeviceId() {
    try {
      const deviceIdentifier = getDeviceIdentifier();
      if (this.isBackendHealthy) {
        const device = await SupabaseService.getDeviceByIdentifier(deviceIdentifier);
        if (device && device.id) {
          this.currentDeviceId = device.id;
          console.log('[DataService] Device ID loaded for visit tracking:', device.id);
        }
      }
    } catch (error) {
      console.warn('[DataService] Could not load device ID, will track visits without device_id:', error);
    }
  }

  /**
   * Request persistent storage to prevent browser from auto-deleting IndexedDB
   * when disk space is low. Critical for kiosk tablets!
   */
  private async requestPersistentStorage() {
    if (!navigator.storage || !navigator.storage.persist) {
      console.warn('[DataService] Persistent storage API not supported');
      return;
    }

    try {
      const isPersisted = await navigator.storage.persisted();

      if (!isPersisted) {
        console.log('[DataService] Requesting persistent storage...');
        const granted = await navigator.storage.persist();

        if (granted) {
          console.log('[DataService] ✅ Persistent storage GRANTED - data won\'t be auto-deleted');
        } else {
          console.warn('[DataService] ⚠️ Persistent storage DENIED - data may be deleted if disk is low');
        }
      } else {
        console.log('[DataService] ✅ Persistent storage already granted');
      }

      // Log storage quota info
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage || 0) / 1024 / 1024;
      const quotaMB = (estimate.quota || 0) / 1024 / 1024;
      const percentUsed = ((estimate.usage || 0) / (estimate.quota || 1) * 100).toFixed(2);

      console.log('[DataService] Storage usage:', {
        used: `${usedMB.toFixed(2)} MB`,
        quota: `${quotaMB.toFixed(2)} MB`,
        percentage: `${percentUsed}%`
      });
    } catch (err) {
      console.error('[DataService] Error requesting persistent storage:', err);
    }
  }

  private setOnlineStatus(isOnline: boolean) {
    this.isOnline = isOnline;
    if (isOnline) this.backendHealthScore = 3; // Reset health on reconnect
  }

  private startHealthCheck() {
    setInterval(async () => {
      if (this.isOnline) {
        // Ping Supabase
        const success = await SupabaseService.getServiceTypes().then(res => res.length > 0);
        if (success) this.backendHealthScore = 3;
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

  // --- Device Configuration (Setup) ---

  async isDeviceConfigured(): Promise<boolean> {
    // PRIORITY 1: If ONLINE, central database is the source of truth
    if (this.isBackendHealthy) {
      console.log('[DataService] Online - checking central database first...');

      try {
        // Get local device identifier (or generate temporary one)
        let localDeviceId = localStorage.getItem('condo_guard_device_id');
        console.log('[DataService] Local device ID from localStorage:', localDeviceId || 'EMPTY');

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
            console.log('[DataService] No central device found by local ID, checking by condominium:', condoId);

            // Find active device for this condominium
            const devicesForCondo = await SupabaseService.getActiveDevicesByCondominium(condoId);
            if (devicesForCondo.length === 1) {
              centralDevice = devicesForCondo[0];
              console.log('[DataService] Found single active device for this condominium:', centralDevice.device_identifier);
            }
          }
        }

        if (!centralDevice) {
          console.warn('[DataService] No device found in central database - needs configuration');
          return false; // No device registered in central DB
        }

        if (centralDevice.status !== 'ACTIVE') {
          console.warn('[DataService] Device status is not ACTIVE:', centralDevice.status);
          return false; // Device is inactive
        }

        // SYNC: Get condominium details from central database
        const correctCondo = await SupabaseService.getCondominium(centralDevice.condominium_id);
        if (!correctCondo) {
          console.error('[DataService] Condominium not found in central database');
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

        console.log('[DataService] Synced from central DB → IndexedDB + localStorage:', {
          deviceId: centralDeviceId,
          condo: correctCondo.name
        });

        this.currentCondoDetails = correctCondo;
        this.currentCondoId = correctCondo.id;

        console.log('[DataService] ✓ Device configured from central database:', correctCondo.name);
        return true;

      } catch (err) {
        console.error('[DataService] Error checking central database:', err);
        // Fall through to offline checks
      }
    }

    // PRIORITY 2: OFFLINE - Check local cache (IndexedDB)
    console.log('[DataService] Offline or central check failed - checking local cache...');
    const localSetting = await db.settings.get('device_condo_details');

    if (localSetting) {
      console.log('[DataService] ✓ Local device configuration found for condo:', (localSetting.value as Condominium).name);

      // OFFLINE: Restore device ID from IndexedDB to localStorage if missing
      try {
        const localDeviceId = localStorage.getItem('condo_guard_device_id');
        if (!localDeviceId) {
          const storedDeviceId = await db.settings.get('device_id');
          if (storedDeviceId && storedDeviceId.value) {
            console.log('[DataService] [OFFLINE] Restoring device ID from IndexedDB to localStorage:', storedDeviceId.value);
            localStorage.setItem('condo_guard_device_id', storedDeviceId.value as string);
          } else {
            console.warn('[DataService] [OFFLINE] No device ID in IndexedDB - device will need to sync when online');
          }
        }

        // Save condominium data to localStorage as backup
        localStorage.setItem('device_condo_backup', JSON.stringify(localSetting.value));
      } catch (e) {
        console.warn('[DataService] Failed to sync localStorage:', e);
      }

      this.currentCondoDetails = localSetting.value as Condominium;
      this.currentCondoId = this.currentCondoDetails.id;
      return true;
    }

    // PRIORITY 3: Try localStorage backup as last resort
    console.log('[DataService] No IndexedDB configuration - checking localStorage backup');
    try {
      const backupData = localStorage.getItem('device_condo_backup');
      if (backupData) {
        const condoData = JSON.parse(backupData) as Condominium;
        console.log('[DataService] ✓ Restored from localStorage backup:', condoData.name);

        // SYNC: Restore to IndexedDB (keep them in sync)
        await db.settings.put({ key: 'device_condo_details', value: condoData });

        // Also restore device_id if available in localStorage
        const localDeviceId = localStorage.getItem('condo_guard_device_id');
        if (localDeviceId) {
          await db.settings.put({ key: 'device_id', value: localDeviceId });
          console.log('[DataService] Also restored device_id to IndexedDB:', localDeviceId);
        }

        this.currentCondoDetails = condoData;
        this.currentCondoId = condoData.id;
        return true;
      }
    } catch (e) {
      console.warn('[DataService] Failed to restore from localStorage:', e);
    }

    // No configuration found anywhere
    console.warn('[DataService] ✗ Device not configured - no data found');
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

        console.log(`[DataService] Found ${allCondos.length} active condos, ${assignedCondoIds.size} already assigned, ${availableCondos.length} available for setup`);

        // 5. Cache available condominiums for offline use
        if (availableCondos.length > 0) {
          await db.condominiums.bulkPut(availableCondos);
        }

        return availableCondos;
      } catch (e) {
        console.error('[DataService] Error fetching available condominiums:', e);
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
      console.warn(`[DataService] Condominium ${condo.name} is already assigned to ${existingDevices.length} active device(s)`);
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
      console.warn("Failed to register device with Supabase, but continuing with local setup");
    }

    // Save configuration locally (IndexedDB + localStorage sync)
    await db.settings.put({ key: 'device_condo_details', value: condo });
    await db.settings.put({ key: 'device_id', value: deviceId });

    // SYNC: Also save to localStorage for redundancy and fast access
    localStorage.setItem('condo_guard_device_id', deviceId);
    localStorage.setItem('device_condo_backup', JSON.stringify(condo));
    console.log('[DataService] Device configured - synced to IndexedDB + localStorage');

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

      console.log('[DataService] ⚠️ OFFLINE configuration saved - will sync when online:', {
        condoId,
        condoName,
        deviceId
      });

      return { success: true };
    } catch (error) {
      console.error('[DataService] Offline configuration failed:', error);
      return { success: false, error: "Falha ao configurar dispositivo offline" };
    }
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

      console.log('[DataService] Starting device decommission...', {
        deviceId,
        condominium: condoDetails?.name
      });

      // Step 1: Update backend if online
      if (this.isBackendHealthy) {
        try {
          await SupabaseService.decommissionDevice(deviceId);
          console.log('[DataService] ✓ Device marked as DECOMMISSIONED in backend');
        } catch (err) {
          console.error('[DataService] Failed to update backend (continuing with local cleanup):', err);
          // Continue with local cleanup even if backend fails
        }
      } else {
        console.warn('[DataService] Offline - skipping backend update. Device will remain in previous state in central database.');
      }

      // Step 2: Clear IndexedDB
      await db.clearAllData();
      console.log('[DataService] ✓ IndexedDB cleared');

      // Step 3: Clear localStorage
      localStorage.removeItem('condo_guard_device_id');
      localStorage.removeItem('device_condo_backup');
      localStorage.clear();
      console.log('[DataService] ✓ localStorage cleared');

      // Step 4: Unregister service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[DataService] ✓ Service worker unregistered');
        }
      }

      // Step 5: Clear cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[DataService] ✓ Cache storage cleared');
      }

      // Reset internal state
      this.currentCondoId = null;
      this.currentCondoDetails = null;
      this.backendHealthScore = 3;

      console.log('[DataService] ✅ Device decommission complete');

      return { success: true };
    } catch (error) {
      console.error('[DataService] Decommission failed:', error);
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
      console.log(`${staffList.length} staff members synced.`);
    } catch (e) {
      console.error("Staff sync failed", e);
      this.backendHealthScore--;
    }
  }

  async login(firstName: string, lastName: string, pin: string): Promise<Staff | null> {
    const deviceCondoId = (await this.getDeviceCondoDetails())?.id;
    if (!deviceCondoId) throw new Error("Dispositivo não configurado");

    if (this.isBackendHealthy) {
      try {
        const staff = await SupabaseService.verifyStaffLogin(firstName, lastName, pin);
        if (staff) {
          if (String(staff.condominium_id) !== String(deviceCondoId)) {
            throw new Error(`Acesso Negado: Utilizador pertence ao condomínio ${staff.condominium_id}, mas o tablet está no ${deviceCondoId}.`);
          }
          await this.syncStaff(deviceCondoId); // Sync all staff after a successful login
          await this.refreshConfigs(deviceCondoId);
          return staff;
        }
      } catch (e) {
        console.error("Login online falhou, tentando offline:", e);
        this.backendHealthScore--;
      }
    }

    // --- OFFLINE FALLBACK ---
    const localStaff = await db.staff.where({ first_name: firstName, last_name: lastName }).first();
    if (localStaff?.pin_hash) {
      const isValid = await bcrypt.compare(pin, localStaff.pin_hash);
      if (isValid) {
        console.warn("Login OFFLINE bem-sucedido.");
        return localStaff;
      }
    }

    throw new Error("Credenciais inválidas ou sem acesso offline.");
  }

  // --- Configurações (Cache-then-Network) ---
  private async refreshConfigs(condoId: number) {
    if (!this.isBackendHealthy) return;
    console.log('[DataService] refreshConfigs called for condo:', condoId);
    try {
      // Visit types are global (no condo filter needed)
      const vt = await SupabaseService.getVisitTypes();
      console.log('[DataService] Received visit types from Supabase:', vt.length, 'items', vt);
      if (vt.length) {
        await db.visitTypes.bulkPut(vt);
        console.log('[DataService] Visit types saved to IndexedDB');
      }

      const st = await SupabaseService.getServiceTypes();
      console.log('[DataService] Received service types from Supabase:', st.length, 'items');
      if (st.length) await db.serviceTypes.bulkPut(st);
    } catch (e) {
      console.error("[DataService] Config sync failed", e);
      this.backendHealthScore--;
    }
  }

  async getVisitTypes(): Promise<VisitTypeConfig[]> {
    const local = await db.visitTypes.toArray();
    console.log('[DataService] getVisitTypes - Local cache:', local.length, 'items');

    // If we have local data, return it and sync in background
    if (local.length > 0) {
      console.log('[DataService] Returning cached visit types');
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshConfigs(this.currentCondoId); // Fire-and-forget
      }
      return local;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      console.log('[DataService] Fetching visit types from backend for condo:', this.currentCondoId);
      await this.refreshConfigs(this.currentCondoId);
      const synced = await db.visitTypes.toArray();
      console.log('[DataService] Synced visit types:', synced.length, 'items');
      if (synced.length > 0) return synced;
    } else {
      console.warn('[DataService] Backend unhealthy or no condo ID. Health:', this.isBackendHealthy, 'CondoID:', this.currentCondoId);
    }

    // Fallback to hardcoded defaults
    console.warn('[DataService] Using hardcoded fallback visit types');
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
      console.error("[DataService] Restaurants/Sports sync failed", e);
      this.backendHealthScore--;
    }
  }

  // --- Units ---
  async getUnits(): Promise<Unit[]> {
    const local = await db.units.toArray();

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

  // Fetch units with residents (online only)
  async getUnitsWithResidents(): Promise<Unit[]> {
    if (!this.isBackendHealthy || !this.currentCondoId) {
      // Offline: Return units without residents
      return await this.getUnits();
    }

    try {
      const unitsWithResidents = await SupabaseService.getUnitsWithResidents(this.currentCondoId);

      // Cache units (without residents to save space)
      const unitsOnly = unitsWithResidents.map(u => {
        const { residents, ...unitWithoutResidents } = u;
        return unitWithoutResidents;
      });
      if (unitsOnly.length) await db.units.bulkPut(unitsOnly);

      return unitsWithResidents;
    } catch (e) {
      console.error("[DataService] Failed to fetch units with residents", e);
      this.backendHealthScore--;
      // Fallback to cached units without residents
      return await this.getUnits();
    }
  }

  private async refreshUnits(condoId: number) {
    if (!this.isBackendHealthy) return;
    try {
      const units = await SupabaseService.getUnitsWithResidents(condoId);
      // Save only unit data (without residents) to local DB
      const unitsOnly = units.map(u => {
        const { residents, ...unitWithoutResidents } = u;
        return unitWithoutResidents;
      });
      if (unitsOnly.length) await db.units.bulkPut(unitsOnly);
    } catch (e) {
      console.error("[DataService] Units sync failed", e);
      this.backendHealthScore--;
    }
  }

  // --- Visits ---
  async getTodaysVisits(): Promise<Visit[]> {
    const today = new Date().toISOString().split('T')[0];

    // PRIORITY 1: If ONLINE, fetch ONLY from central database (source of truth)
    if (this.isBackendHealthy && this.currentCondoId) {
      try {
        console.log('[DataService] ONLINE - fetching today\'s visits from Supabase (ignoring cache)...');
        const backendVisits = await SupabaseService.getTodaysVisits(this.currentCondoId);

        // Clear OLD local visits for today (to remove deleted ones)
        const localVisits = await db.visits
          .where('check_in_at')
          .between(`${today}T00:00:00`, `${today}T23:59:59`, true, true)
          .toArray();

        // Delete synced local visits (keep PENDING_SYNC ones for offline changes)
        const syncedLocalIds = localVisits
          .filter(v => v.sync_status === SyncStatus.SYNCED)
          .map(v => v.id);
        if (syncedLocalIds.length > 0) {
          await db.visits.bulkDelete(syncedLocalIds);
          console.log(`[DataService] Cleared ${syncedLocalIds.length} synced local visits`);
        }

        // Cache fresh backend data
        if (backendVisits.length > 0) {
          await db.visits.bulkPut(backendVisits);
          console.log(`[DataService] Cached ${backendVisits.length} visits from backend`);
        }

        // Merge: backend visits + any pending local changes
        const pendingLocalVisits = localVisits.filter(v => v.sync_status === SyncStatus.PENDING_SYNC);
        const allVisits = [...backendVisits, ...pendingLocalVisits];

        console.log(`[DataService] ✓ Returning ${backendVisits.length} backend visits + ${pendingLocalVisits.length} pending local`);

        return allVisits.sort((a, b) =>
          new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime()
        );
      } catch (e) {
        console.error("[DataService] Failed to fetch from backend, falling back to local cache", e);
        this.backendHealthScore--;
        // Fall through to offline mode
      }
    }

    // PRIORITY 2: OFFLINE - return only local cached visits
    console.log('[DataService] OFFLINE - fetching today\'s visits from local cache...');
    const localVisits = await db.visits
      .where('check_in_at')
      .between(`${today}T00:00:00`, `${today}T23:59:59`, true, true)
      .toArray();

    console.log(`[DataService] ✓ Returning ${localVisits.length} visits from local cache`);

    return localVisits.sort((a, b) =>
      new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime()
    );
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
      visit_type_id: visitData.visit_type_id,
      service_type_id: visitData.service_type_id,
      restaurant_id: visitData.restaurant_id,
      sport_id: visitData.sport_id,
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
          console.log("[DataService] Uploading visitor photo to Supabase Storage...");
          const photoUrl = await SupabaseService.uploadVisitorPhoto(
            visitData.photo_data_url,
            this.currentCondoId,
            visitData.visitor_name || 'visitor'
          );

          if (photoUrl) {
            visitPayload.photo_url = photoUrl;
            console.log("[DataService] Photo uploaded successfully:", photoUrl);
          } else {
            console.warn("[DataService] Photo upload failed, saving visit without photo URL");
          }
        }

        const createdVisit = await SupabaseService.createVisit(visitPayload);
        if (createdVisit) {
          createdVisit.sync_status = SyncStatus.SYNCED;
          await db.visits.put(createdVisit);
          console.log("[DataService] Visit saved to Supabase and cached locally:", createdVisit.id);
          return createdVisit;
        } else {
          throw new Error("Failed to save to Supabase");
        }
      } catch (e) {
        console.error("[DataService] Failed to save to Supabase, falling back to local:", e);
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
        console.warn("[DataService] Visit saved locally with temp ID, will sync later");
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
      console.warn("[DataService] Offline: Visit saved locally with temp ID, will sync when online");
      return tempVisit;
    }
  }

  async updateVisitStatus(visitId: number, status: VisitStatus): Promise<void> {
    const visit = await db.visits.get(visitId);
    if (!visit) throw new Error("Visit not found");

    visit.status = status;

    // Set check_out time when status changes to LEFT
    if (status === VisitStatus.LEFT && !visit.check_out_at) {
      visit.check_out_at = new Date().toISOString();
    }

    // Mark as pending sync
    visit.sync_status = SyncStatus.PENDING_SYNC;

    // Update locally
    await db.visits.put(visit);

    // Try to sync if online
    if (this.isBackendHealthy) {
      try {
        await SupabaseService.updateVisitStatus(visitId, status, visit.check_out_at);
        visit.sync_status = SyncStatus.SYNCED;
        await db.visits.put(visit);
      } catch (e) {
        console.warn("[DataService] Visit status updated locally, will sync later");
        this.backendHealthScore--;
      }
    }
  }

  async syncPendingItems(): Promise<number> {
    if (!this.isBackendHealthy) return 0;
    if (!this.currentCondoId) {
      console.warn("[DataService] Cannot sync: no condominium ID set");
      return 0;
    }

    let totalSynced = 0;

    // Sync pending visits
    const pendingVisits = await db.visits
      .where('sync_status')
      .equals(SyncStatus.PENDING_SYNC)
      .toArray();

    for (const visit of pendingVisits) {
      try {
        // Check if visit has offline photo data that needs to be uploaded
        const visitWithPhoto = visit as Visit & { photo_data_url?: string };

        if (visitWithPhoto.photo_data_url && !visitWithPhoto.photo_url) {
          console.log("[DataService] Uploading offline photo for visit:", visit.id);
          const photoUrl = await SupabaseService.uploadVisitorPhoto(
            visitWithPhoto.photo_data_url,
            this.currentCondoId,
            visit.visitor_name
          );

          if (photoUrl) {
            visit.photo_url = photoUrl;
            console.log("[DataService] Offline photo uploaded successfully:", photoUrl);
          } else {
            console.warn("[DataService] Failed to upload offline photo, syncing visit without photo");
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
          totalSynced++;
          console.log("[DataService] Synced pending visit:", visit.id, "-> new ID:", createdVisit.id);
        }
      } catch (e) {
        console.error("[DataService] Failed to sync visit:", visit.id, e);
        this.backendHealthScore--;
        break; // Stop on first failure
      }
    }

    // Sync pending incidents
    const incidentsSynced = await this.syncPendingIncidents();
    totalSynced += incidentsSynced;

    console.log(`[DataService] Sync complete: ${totalSynced} items synced (visits + incidents)`);
    return totalSynced;
  }

  // --- Incidents ---
  private async refreshIncidentConfigs() {
    if (!this.isBackendHealthy) return;
    try {
      const types = await SupabaseService.getIncidentTypes();
      if (types.length) await db.incidentTypes.bulkPut(types);

      const statuses = await SupabaseService.getIncidentStatuses();
      if (statuses.length) await db.incidentStatuses.bulkPut(statuses);

      console.log('[DataService] Incident types and statuses synced');
    } catch (e) {
      console.error("[DataService] Failed to sync incident configs", e);
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
        console.log('[DataService] Syncing incidents from backend...');

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
          console.log(`[DataService] Cleared ${idsToDelete.length} old incidents from local cache`);
        }

        // Insert fresh backend data
        if (backendIncidents.length > 0) {
          await db.incidents.bulkPut(backendIncidents);
          console.log(`[DataService] Synced ${backendIncidents.length} incidents from backend`);
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
        console.error("[DataService] Failed to sync incidents from backend, using local cache", e);
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

    // Update incident status to "acknowledged"
    incident.status = 'acknowledged';
    incident.acknowledged_by = staffId;
    incident.acknowledged_at = new Date().toISOString();
    incident.sync_status = SyncStatus.PENDING_SYNC;

    // Update locally
    await db.incidents.put(incident);

    // Try to sync if online
    if (this.isBackendHealthy) {
      try {
        const success = await SupabaseService.acknowledgeIncident(id, staffId);
        if (success) {
          incident.sync_status = SyncStatus.SYNCED;
          await db.incidents.put(incident);
        }
      } catch (e) {
        console.warn("[DataService] Incident acknowledged locally, will sync later");
        this.backendHealthScore--;
      }
    }
  }

  async reportIncidentAction(id: number, guardNotes: string, newStatus: string): Promise<void> {
    const incident = await db.incidents.get(id);
    if (!incident) throw new Error("Incident not found");

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

    // Try to sync if online
    if (this.isBackendHealthy) {
      try {
        const success = await SupabaseService.reportIncidentAction(id, guardNotes, newStatus);
        if (success) {
          incident.sync_status = SyncStatus.SYNCED;
          await db.incidents.put(incident);
        }
      } catch (e) {
        console.warn("[DataService] Incident action reported locally, will sync later");
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
            console.log("[DataService] Synced incident acknowledgment:", incident.id);
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
            console.log("[DataService] Synced incident action:", incident.id);
          }
        }
      } catch (e) {
        console.error("[DataService] Failed to sync incident:", incident.id, e);
        this.backendHealthScore--;
        break; // Stop on first failure
      }
    }

    return synced;
  }

  checkOnline(): boolean { return this.isOnline; }

  // --- ADMIN METHODS (Online-Only, Cross-Condominium Access) ---
  // NOTE: Admin users must be online. No offline fallback or caching.

  /**
   * Admin: Get all condominiums (not filtered by device)
   * ONLINE ONLY - Admin requires active internet connection
   */
  async adminGetAllCondominiums(): Promise<Condominium[]> {
    try {
      return await SupabaseService.listActiveCondominiums();
    } catch (e) {
      console.error('[Admin] Failed to fetch condominiums (online required):', e);
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
      return await SupabaseService.adminGetAllUnits(condominiumId);
    } catch (e) {
      console.error('[Admin] Failed to fetch units (online required):', e);
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
      return await SupabaseService.adminGetAllVisits(startDate, endDate, condominiumId);
    } catch (e) {
      console.error('[Admin] Failed to fetch visits (online required):', e);
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
      return await SupabaseService.adminGetAllIncidents(condominiumId);
    } catch (e) {
      console.error('[Admin] Failed to fetch incidents (online required):', e);
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
      return await SupabaseService.adminGetAllStaff(condominiumId);
    } catch (e) {
      console.error('[Admin] Failed to fetch staff (online required):', e);
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
      console.log('[Admin] Fetching dashboard stats from RPC...');
      const stats = await SupabaseService.adminGetDashboardStats();
      if (stats) {
        console.log('[Admin] Dashboard stats fetched successfully');
        return stats;
      }
      return null;
    } catch (error) {
      console.error('[Admin] Error fetching dashboard stats (online required):', error);
      return null;
    }
  }

  // --- ADMIN CRUD OPERATIONS ---

  /**
   * Admin: Create a new condominium
   */
  async adminCreateCondominium(condo: Partial<Condominium>): Promise<Condominium | null> {
    try {
      return await SupabaseService.adminCreateCondominium(condo);
    } catch (e) {
      console.error('[Admin] Failed to create condominium (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Update an existing condominium
   */
  async adminUpdateCondominium(id: number, updates: Partial<Condominium>): Promise<Condominium | null> {
    try {
      return await SupabaseService.adminUpdateCondominium(id, updates);
    } catch (e) {
      console.error('[Admin] Failed to update condominium (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Toggle condominium status (ACTIVE/INACTIVE)
   */
  async adminToggleCondominiumStatus(id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<boolean> {
    try {
      return await SupabaseService.adminToggleCondominiumStatus(id, status);
    } catch (e) {
      console.error('[Admin] Failed to toggle condominium status (online required):', e);
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
      console.error('[Admin] Failed to fetch streets (online required):', e);
      return [];
    }
  }

  /**
   * Admin: Add a street to a condominium
   */
  async adminAddStreet(condoId: number, name: string): Promise<any | null> {
    try {
      return await SupabaseService.addStreet(condoId, name);
    } catch (e) {
      console.error('[Admin] Failed to add street (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Remove a street from a condominium
   */
  async adminRemoveStreet(streetId: number): Promise<boolean> {
    try {
      return await SupabaseService.removeStreet(streetId);
    } catch (e) {
      console.error('[Admin] Failed to remove street (online required):', e);
      return false;
    }
  }

  /**
   * Admin: Get all devices (cross-condominium)
   */
  async adminGetAllDevices(condominiumId?: number): Promise<Device[]> {
    try {
      return await SupabaseService.adminGetAllDevices(condominiumId);
    } catch (e) {
      console.error('[Admin] Failed to fetch devices (online required):', e);
      return [];
    }
  }

  /**
   * Admin: Update a device
   */
  async adminUpdateDevice(id: string, updates: Partial<Device>): Promise<Device | null> {
    try {
      return await SupabaseService.adminUpdateDevice(id, updates);
    } catch (e) {
      console.error('[Admin] Failed to update device (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Decommission a device
   */
  async adminDecommissionDevice(id: string): Promise<boolean> {
    try {
      return await SupabaseService.adminDecommissionDevice(id);
    } catch (e) {
      console.error('[Admin] Failed to decommission device (online required):', e);
      return false;
    }
  }

  /**
   * Admin: Create a new staff member
   */
  async adminCreateStaff(staff: Partial<Staff>): Promise<Staff | null> {
    try {
      return await SupabaseService.adminCreateStaff(staff);
    } catch (e) {
      console.error('[Admin] Failed to create staff (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Update an existing staff member
   */
  async adminUpdateStaff(id: number, updates: Partial<Staff>): Promise<Staff | null> {
    try {
      return await SupabaseService.adminUpdateStaff(id, updates);
    } catch (e) {
      console.error('[Admin] Failed to update staff (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Delete a staff member
   */
  async adminDeleteStaff(id: number): Promise<boolean> {
    try {
      return await SupabaseService.adminDeleteStaff(id);
    } catch (e) {
      console.error('[Admin] Failed to delete staff (online required):', e);
      return false;
    }
  }

  // --- UNITS CRUD ---

  /**
   * Admin: Create a new unit
   */
  async adminCreateUnit(unit: Partial<Unit>): Promise<Unit | null> {
    try {
      return await SupabaseService.adminCreateUnit(unit);
    } catch (e) {
      console.error('[Admin] Failed to create unit (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Update an existing unit
   */
  async adminUpdateUnit(id: string, updates: Partial<Unit>): Promise<Unit | null> {
    try {
      return await SupabaseService.adminUpdateUnit(id, updates);
    } catch (e) {
      console.error('[Admin] Failed to update unit (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Delete a unit
   */
  async adminDeleteUnit(id: string): Promise<boolean> {
    try {
      return await SupabaseService.adminDeleteUnit(id);
    } catch (e) {
      console.error('[Admin] Failed to delete unit (online required):', e);
      return false;
    }
  }

  // --- RESIDENTS CRUD ---

  /**
   * Admin: Get all residents (cross-condominium)
   */
  async adminGetAllResidents(condominiumId?: number): Promise<any[]> {
    try {
      return await SupabaseService.adminGetAllResidents(condominiumId);
    } catch (e) {
      console.error('[Admin] Failed to fetch residents (online required):', e);
      return [];
    }
  }

  /**
   * Admin: Create a new resident
   */
  async adminCreateResident(resident: any): Promise<any | null> {
    try {
      return await SupabaseService.adminCreateResident(resident);
    } catch (e) {
      console.error('[Admin] Failed to create resident (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Update an existing resident
   */
  async adminUpdateResident(id: string, updates: any): Promise<any | null> {
    try {
      return await SupabaseService.adminUpdateResident(id, updates);
    } catch (e) {
      console.error('[Admin] Failed to update resident (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Delete a resident
   */
  async adminDeleteResident(id: string): Promise<boolean> {
    try {
      return await SupabaseService.adminDeleteResident(id);
    } catch (e) {
      console.error('[Admin] Failed to delete resident (online required):', e);
      return false;
    }
  }

  // --- RESTAURANTS CRUD ---

  /**
   * Admin: Get all restaurants (cross-condominium)
   */
  async adminGetAllRestaurants(condominiumId?: number): Promise<Restaurant[]> {
    try {
      return await SupabaseService.adminGetAllRestaurants(condominiumId);
    } catch (e) {
      console.error('[Admin] Failed to fetch restaurants (online required):', e);
      return [];
    }
  }

  /**
   * Admin: Create a new restaurant
   */
  async adminCreateRestaurant(restaurant: Partial<Restaurant>): Promise<Restaurant | null> {
    try {
      return await SupabaseService.adminCreateRestaurant(restaurant);
    } catch (e) {
      console.error('[Admin] Failed to create restaurant (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Update an existing restaurant
   */
  async adminUpdateRestaurant(id: string, updates: Partial<Restaurant>): Promise<Restaurant | null> {
    try {
      return await SupabaseService.adminUpdateRestaurant(id, updates);
    } catch (e) {
      console.error('[Admin] Failed to update restaurant (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Delete a restaurant
   */
  async adminDeleteRestaurant(id: string): Promise<boolean> {
    try {
      return await SupabaseService.adminDeleteRestaurant(id);
    } catch (e) {
      console.error('[Admin] Failed to delete restaurant (online required):', e);
      return false;
    }
  }

  // --- SPORTS CRUD ---

  /**
   * Admin: Get all sports facilities (cross-condominium)
   */
  async adminGetAllSports(condominiumId?: number): Promise<Sport[]> {
    try {
      return await SupabaseService.adminGetAllSports(condominiumId);
    } catch (e) {
      console.error('[Admin] Failed to fetch sports (online required):', e);
      return [];
    }
  }

  /**
   * Admin: Create a new sport facility
   */
  async adminCreateSport(sport: Partial<Sport>): Promise<Sport | null> {
    try {
      return await SupabaseService.adminCreateSport(sport);
    } catch (e) {
      console.error('[Admin] Failed to create sport (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Update an existing sport facility
   */
  async adminUpdateSport(id: string, updates: Partial<Sport>): Promise<Sport | null> {
    try {
      return await SupabaseService.adminUpdateSport(id, updates);
    } catch (e) {
      console.error('[Admin] Failed to update sport (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Delete a sport facility
   */
  async adminDeleteSport(id: string): Promise<boolean> {
    try {
      return await SupabaseService.adminDeleteSport(id);
    } catch (e) {
      console.error('[Admin] Failed to delete sport (online required):', e);
      return false;
    }
  }

  // --- VISIT OPERATIONS ---

  /**
   * Admin: Update visit status
   */
  async adminUpdateVisitStatus(id: number, status: VisitStatus): Promise<Visit | null> {
    try {
      return await SupabaseService.adminUpdateVisitStatus(id, status);
    } catch (e) {
      console.error('[Admin] Failed to update visit status (online required):', e);
      return null;
    }
  }

  // --- INCIDENT OPERATIONS ---

  /**
   * Admin: Acknowledge an incident
   */
  async adminAcknowledgeIncident(id: number, guardId: number, notes?: string): Promise<Incident | null> {
    try {
      return await SupabaseService.adminAcknowledgeIncident(id, guardId, notes);
    } catch (e) {
      console.error('[Admin] Failed to acknowledge incident (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Resolve an incident
   */
  async adminResolveIncident(id: number, guardId: number, notes?: string): Promise<Incident | null> {
    try {
      return await SupabaseService.adminResolveIncident(id, guardId, notes);
    } catch (e) {
      console.error('[Admin] Failed to resolve incident (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Update incident notes
   */
  async adminUpdateIncidentNotes(id: number, notes: string): Promise<Incident | null> {
    try {
      return await SupabaseService.adminUpdateIncidentNotes(id, notes);
    } catch (e) {
      console.error('[Admin] Failed to update incident notes (online required):', e);
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
      console.error('[Admin] Failed to fetch visit types (online required):', e);
      return [];
    }
  }

  /**
   * Admin: Create a new visit type
   */
  async adminCreateVisitType(visitType: Partial<VisitTypeConfig>): Promise<VisitTypeConfig | null> {
    try {
      return await SupabaseService.adminCreateVisitType(visitType);
    } catch (e) {
      console.error('[Admin] Failed to create visit type (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Update an existing visit type
   */
  async adminUpdateVisitType(id: number, updates: Partial<VisitTypeConfig>): Promise<VisitTypeConfig | null> {
    try {
      return await SupabaseService.adminUpdateVisitType(id, updates);
    } catch (e) {
      console.error('[Admin] Failed to update visit type (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Delete a visit type
   */
  async adminDeleteVisitType(id: number): Promise<boolean> {
    try {
      return await SupabaseService.adminDeleteVisitType(id);
    } catch (e) {
      console.error('[Admin] Failed to delete visit type (online required):', e);
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
      console.error('[Admin] Failed to fetch service types (online required):', e);
      return [];
    }
  }

  /**
   * Admin: Create a new service type
   */
  async adminCreateServiceType(serviceType: Partial<ServiceTypeConfig>): Promise<ServiceTypeConfig | null> {
    try {
      return await SupabaseService.adminCreateServiceType(serviceType);
    } catch (e) {
      console.error('[Admin] Failed to create service type (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Update an existing service type
   */
  async adminUpdateServiceType(id: number, updates: Partial<ServiceTypeConfig>): Promise<ServiceTypeConfig | null> {
    try {
      return await SupabaseService.adminUpdateServiceType(id, updates);
    } catch (e) {
      console.error('[Admin] Failed to update service type (online required):', e);
      return null;
    }
  }

  /**
   * Admin: Delete a service type
   */
  async adminDeleteServiceType(id: number): Promise<boolean> {
    try {
      return await SupabaseService.adminDeleteServiceType(id);
    } catch (e) {
      console.error('[Admin] Failed to delete service type (online required):', e);
      return false;
    }
  }

  /**
   * Admin: Get all condominiums with real-time statistics (visits today + open incidents)
   * For analytics dashboard map display
   */
  async adminGetCondominiumStats(): Promise<CondominiumStats[]> {
    try {
      return await SupabaseService.adminGetCondominiumStats();
    } catch (e) {
      console.error('[Admin] Failed to fetch condominium stats (online required):', e);
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
      return await SupabaseService.adminGetAuditLogs(filters, limit, offset);
    } catch (e) {
      console.error('[Admin] Failed to fetch audit logs (online required):', e);
      return { logs: [], total: 0 };
    }
  }
}

export const api = new DataService();
